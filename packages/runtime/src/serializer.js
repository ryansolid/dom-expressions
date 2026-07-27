import {
  Feature,
  Serializer,
  fromCrossJSON,
  getCrossReferenceHeader,
  toCrossJSONStream
} from "seroval";
import {
  AbortSignalPlugin,
  CustomEventPlugin,
  DOMExceptionPlugin,
  EventPlugin,
  FormDataPlugin,
  HeadersPlugin,
  ReadableStreamPlugin,
  RequestPlugin,
  ResponsePlugin,
  URLPlugin,
  URLSearchParamsPlugin
} from "seroval-plugins/web";

// Features excluded from emitted scripts so output stays runnable on ~ES2017
// targets (AggregateError is ES2021, BigInt typed arrays are ES2020).
const DEFAULT_DISABLED_FEATURES = Feature.AggregateError | Feature.BigIntTypedArray;

// A serialized Error's `.stack` leaks server file paths, internal function
// names and the shape of the deployment to anyone who can trigger a throw,
// so it's stripped from everything serialized outside development — there
// the paths are the developer's own and the stack is actually useful.
// Serialize-side only and applied on top of any `disabledFeatures` override
// (compat tuning shouldn't silently reopen the leak); the decode side stays
// permissive so a payload that does carry a stack (e.g. from a development
// peer) still deserializes. Read at call time so the policy tracks NODE_ENV.
const serializeOnlyDisabledFeatures = () =>
  process.env.NODE_ENV === "development" ? 0 : Feature.ErrorPrototypeStack;

// Part of the hydration wire protocol since the streaming serializer landed
// (#275): the bootstrap from `generateHydrationScript` creates it and the
// client runtime reads resolved values out of it. Terse on purpose — it ships
// in every SSR payload.
const HYDRATION_GLOBAL = "_$HY.r";

/**
 * Baseline plugin set for serializing web-platform values. Shared by the
 * hydration serializer and any consumer building its own serializer (e.g.
 * server function transports).
 */
export const DEFAULT_WEB_PLUGINS = Object.freeze([
  AbortSignalPlugin,
  // BlobPlugin,
  CustomEventPlugin,
  DOMExceptionPlugin,
  EventPlugin,
  // FilePlugin,
  FormDataPlugin,
  HeadersPlugin,
  ReadableStreamPlugin,
  RequestPlugin,
  ResponsePlugin,
  URLSearchParamsPlugin,
  URLPlugin
]);

/**
 * Composes user plugins with the default web set. Custom plugins come first
 * so they can shadow a default for values both would match.
 */
export function resolveSerializerPlugins(customPlugins) {
  return customPlugins ? [...customPlugins, ...DEFAULT_WEB_PLUGINS] : [...DEFAULT_WEB_PLUGINS];
}

/**
 * Creates a streaming Seroval serializer preconfigured with the web plugin
 * set and the default feature policy. `globalIdentifier` is required and
 * names the object the emitted scripts write resolved values into.
 */
export function createSerializer(options) {
  return new Serializer({
    ...options,
    plugins: resolveSerializerPlugins(options.plugins),
    disabledFeatures:
      (options.disabledFeatures === undefined
        ? DEFAULT_DISABLED_FEATURES
        : options.disabledFeatures) | serializeOnlyDisabledFeatures()
  });
}

/**
 * Serializer for SSR hydration output. Pins the hydration global (`_$HY.r`)
 * and feature policy — only the wiring options (callbacks, scope, extra
 * plugins) are configurable.
 */
export function createHydrationSerializer({ onData, onDone, scopeId, onError, plugins }) {
  return createSerializer({
    scopeId,
    plugins,
    globalIdentifier: HYDRATION_GLOBAL,
    onData,
    onDone,
    onError
  });
}

export function getLocalHeaderScript(id) {
  return getCrossReferenceHeader(id) + ";";
}

// ---- JSON codec (server function transports) ----
//
// Unlike hydration output (executable JS targeting a global), the JSON codec
// streams SerovalNode values that a peer decodes without eval. Framing the
// nodes on the wire (chunk delimiting, HTTP plumbing) is the transport's
// concern; this layer only guarantees both sides agree on plugins and
// feature policy.

// Codec payloads may come from an untrusted peer, so the defaults protect
// the decoding side: RegExp is disabled (ReDoS via deserialized patterns)
// and parse depth is capped well below Seroval's own limit.
const JSON_CODEC_DISABLED_FEATURES = Feature.RegExp;
const JSON_CODEC_DEPTH_LIMIT = 64;

// Single source of truth for codec defaults — encode and decode must agree
// on plugins and feature policy or payloads won't roundtrip.
function resolveCodecOptions({ plugins, disabledFeatures, depthLimit } = {}) {
  return {
    plugins: resolveSerializerPlugins(plugins),
    disabledFeatures:
      disabledFeatures === undefined ? JSON_CODEC_DISABLED_FEATURES : disabledFeatures,
    depthLimit: depthLimit === undefined ? JSON_CODEC_DEPTH_LIMIT : depthLimit
  };
}

/**
 * Serializes `value` as SerovalNode chunks delivered through
 * `onParse(node, initial)`. Async values (promises, streams) produce
 * additional chunks as they resolve; `onDone` fires when everything has
 * settled. Returns a cancel function that aborts any pending async
 * serialization.
 */
export function serializeJSON(value, { onParse, onDone, onError, ...codecOptions }) {
  const resolved = resolveCodecOptions(codecOptions);
  return toCrossJSONStream(value, {
    onParse,
    onDone,
    onError,
    ...resolved,
    disabledFeatures: resolved.disabledFeatures | serializeOnlyDisabledFeatures()
  });
}

/**
 * Creates the decoding counterpart of `serializeJSON`. The returned function
 * deserializes one SerovalNode chunk at a time; cross-references between
 * chunks resolve through a map shared across calls, so all chunks from one
 * stream must go through the same deserializer instance.
 */
export function createJSONDeserializer(options) {
  const refs = new Map();
  const resolved = resolveCodecOptions(options);
  return function deserializeJSONChunk(node) {
    return fromCrossJSON(node, { refs, ...resolved });
  };
}

/**
 * Keyed streaming variant of the JSON codec, matching the hydration
 * serializer's contract (`write(id, value)` / `flush()`) so the render core
 * can drive either through the same serializer seam. Every write shares one
 * parse-refs map, so a value referenced from multiple writes dedupes on the
 * wire and decodes to a single instance; async values (promises, streams)
 * keep emitting patch nodes after their initial keyed node.
 *
 * `onData` receives `{ key, node, initial }` records — passive data, no eval
 * on the consumer (see `createJSONDataTable`). `onDone` fires once `flush()`
 * has been called and every pending value has settled. Writes after flush
 * are dropped, mirroring the hydration serializer.
 */
export function createJSONSerializer({
  onData,
  onDone,
  onError,
  plugins,
  disabledFeatures,
  depthLimit
}) {
  const resolved = resolveCodecOptions({ plugins, disabledFeatures, depthLimit });
  const refs = new Map();
  const cancels = new Set();
  let pendingWrites = 0;
  let flushed = false;
  let done = false;
  const maybeDone = () => {
    if (flushed && pendingWrites === 0 && !done) {
      done = true;
      onDone && onDone();
    }
  };
  return {
    write(key, value) {
      if (flushed) return;
      pendingWrites++;
      // Sync values settle inside the toCrossJSONStream call, before the
      // cancel function exists — track with a flag instead of the handle.
      let settled = false;
      let cancel = null;
      const stream = toCrossJSONStream(value, {
        refs,
        plugins: resolved.plugins,
        disabledFeatures: resolved.disabledFeatures | serializeOnlyDisabledFeatures(),
        onParse(node, initial) {
          onData({ key, node, initial });
        },
        onError,
        onDone() {
          settled = true;
          if (cancel) cancels.delete(cancel);
          pendingWrites--;
          maybeDone();
        }
      });
      if (!settled) {
        cancel = stream;
        cancels.add(cancel);
      }
    },
    flush() {
      flushed = true;
      maybeDone();
    },
    close() {
      flushed = true;
      for (const cancel of cancels) cancel();
      cancels.clear();
    }
  };
}

/**
 * Keyed decode table for `createJSONSerializer` output. Feed every data
 * record to `apply`: initial nodes land in the table under their key; later
 * nodes patch pending values (promise/stream resolutions) through the shared
 * deserializer refs. `resolve` reads a `{ $ref }` back out — the record ids
 * double as the reference namespace.
 */
export function createJSONDataTable(options) {
  const deserialize = createJSONDeserializer(options);
  const table = new Map();
  return {
    apply(record) {
      const value = deserialize(record.node);
      if (record.initial) table.set(record.key, value);
    },
    get(key) {
      return table.get(key);
    },
    resolve(ref) {
      return table.get(ref.$ref);
    }
  };
}
