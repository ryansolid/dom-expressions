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
      options.disabledFeatures === undefined ? DEFAULT_DISABLED_FEATURES : options.disabledFeatures
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
  return toCrossJSONStream(value, {
    onParse,
    onDone,
    onError,
    ...resolveCodecOptions(codecOptions)
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
