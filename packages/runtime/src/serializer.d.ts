// Serialization surface (published as `@solidjs/web/serialization`): the
// runtime's Seroval machinery, exposed for the runtime's own entries and
// for integrations building transports on the same codec. This is
// INTEGRATION-FACING plumbing, not application API — it is exempt from the
// 2.0 stability guarantee and may change between releases. Application and
// router code should configure `codec` on the server-function entries
// instead of importing from here.
import { Serializer, SerovalNode } from "seroval";

/**
 * Seroval's node shape — the intermediate representation `serializeJSON`
 * emits and `createJSONDeserializer` consumes. Safe to `JSON.stringify`.
 *
 * Integration-facing; may change (see the entry banner).
 */
export type { SerovalNode };

// ---- Plugin authoring ----
//
// Unlike the rest of this entry, plugin authoring is APPLICATION-FACING —
// it is the supported way to feed the serializers' `plugins` options and
// the server-function entries' `codec.plugins`. The values re-export
// seroval's own (`createPlugin`, `OpaqueReference` — see serializer.js);
// the TYPES are declared here by hand, like everything else in this file,
// because seroval's published d.ts use extensionless ESM-relative imports
// that `moduleResolution: "nodenext"` cannot follow — a bare type
// re-export would silently degrade the whole authoring surface to `any`
// under skipLibCheck. The declarations mirror seroval ~1.5 exactly; the
// `~` pin is what makes mirroring safe.

/** Per-plugin bookkeeping seroval hands each plugin callback. */
export interface PluginData {
  id: number;
}

/**
 * The shape of a plugin's parsed payload: a map of `SerovalNode`s produced
 * by the parse contexts, consumed by `serialize`/`deserialize`.
 */
export type PluginInfo = { [key: string]: SerovalNode };

/** Parse context for `parse.sync`: turns child values into nodes. */
export interface SyncParsePluginContext {
  parse<T>(current: T): SerovalNode;
}

/** Parse context for `parse.async`: like sync, but child parses await. */
export interface AsyncParsePluginContext {
  parse<T>(current: T): Promise<SerovalNode>;
}

/**
 * Parse context for `parse.stream`: sync parsing plus the streaming
 * lifecycle (pending-state tracking, late node emission, cleanup).
 */
export interface StreamParsePluginContext {
  parse<T>(current: T): SerovalNode;
  parseWithError<T>(current: T): SerovalNode | undefined;
  isAlive(): boolean;
  pushPendingState(): void;
  popPendingState(): void;
  onParse(node: SerovalNode): void;
  onError(error: unknown): void;
  addCleanup(callback: () => void): void;
}

/** Serialize context: renders child nodes to JS source. */
export interface SerializePluginContext {
  serialize(node: SerovalNode): string;
}

/** Deserialize context: revives child nodes to runtime values. */
export interface DeserializePluginContext {
  deserialize<T>(node: SerovalNode): T;
}

/**
 * A Seroval plugin usable with the web serializers — teaches the codec how
 * to encode/decode a custom value type (`Value` is the value it matches,
 * `Info` its parsed payload). Supply matching plugins on both peers of a
 * transport. Bare `SerializerPlugin` (both parameters defaulted to `any`)
 * is the list-element type every `plugins` option accepts.
 *
 * Integration-facing; may change (see the entry banner).
 */
export interface SerializerPlugin<Value = any, Info extends PluginInfo = any> {
  /** A unique string identifying the plugin — namespace it (`"app/Thing"`). */
  tag: string;
  /** Dependency plugins, resolved ahead of this one. */
  extends?: SerializerPlugin[];
  /** Whether `value` is this plugin's to encode. */
  test(value: unknown): boolean;
  /** Parsing modes — provide the ones the transports you target use. */
  parse: {
    sync?: (value: Value, ctx: SyncParsePluginContext, data: PluginData) => Info;
    async?: (value: Value, ctx: AsyncParsePluginContext, data: PluginData) => Promise<Info>;
    stream?: (value: Value, ctx: StreamParsePluginContext, data: PluginData) => Info;
  };
  /** Renders the parsed payload as JS source (script-injection form). */
  serialize(node: Info, ctx: SerializePluginContext, data: PluginData): string;
  /** Revives the parsed payload back into the runtime value. */
  deserialize(node: Info, ctx: DeserializePluginContext, data: PluginData): Value;
}

/**
 * Builds a `SerializerPlugin` — seroval's `createPlugin`, re-exported so
 * plugin authors stay on the exact seroval instance/version the runtime
 * serializes with. Import it from HERE, not from your own `seroval`
 * dependency: a plugin built against a different copy/version would not
 * fail the build — it would emit nodes the other peer can't interpret.
 *
 * Application-facing (see the plugin-authoring banner above).
 */
export function createPlugin<Value, Info extends PluginInfo>(
  plugin: SerializerPlugin<Value, Info>
): SerializerPlugin<Value, Info>;

/**
 * Seroval's `OpaqueReference`, re-exported from the runtime's own instance
 * (an `OpaqueReference` from another seroval copy fails the serializer's
 * instanceof check and serializes as a plain value): wraps a value so it
 * crosses the wire as its `replacement` (default `undefined`) while
 * staying readable in-process through `.value`.
 *
 * Application-facing (see the plugin-authoring banner above).
 */
export class OpaqueReference<V, R = undefined> {
  readonly value: V;
  readonly replacement?: R;
  constructor(value: V, replacement?: R);
}

/**
 * Baseline plugin set for serializing web-platform values (AbortSignal,
 * Event, FormData, Headers, ReadableStream, Request, Response, URL, ...).
 * Applied by every serializer in this module; custom plugins compose ahead
 * of it via `resolveSerializerPlugins`.
 *
 * Integration-facing; may change (see the entry banner).
 */
export const DEFAULT_WEB_PLUGINS: readonly SerializerPlugin[];

/**
 * Composes custom plugins with `DEFAULT_WEB_PLUGINS`. Custom plugins come
 * first so they can shadow a default for values both would match. Returns a
 * fresh array; the defaults are never mutated. Useful when handing a full
 * plugin list to another serialization layer.
 *
 * Integration-facing; may change (see the entry banner).
 */
export function resolveSerializerPlugins(customPlugins?: SerializerPlugin[]): SerializerPlugin[];

/**
 * Options for `createSerializer`.
 *
 * Integration-facing; may change (see the entry banner).
 */
export interface WebSerializerOptions {
  /** Name of the global object the emitted scripts write resolved values into. */
  globalIdentifier: string;
  /** Cross-reference scope id, for isolating multiple streams on one page. */
  scopeId?: string;
  /**
   * Seroval feature bitflags to exclude from output. Defaults to disabling
   * post-ES2017 features (AggregateError, BigInt typed arrays). Outside
   * development, `Error.prototype.stack` is additionally stripped on top of
   * any override — serialized stacks leak server paths to the client.
   */
  disabledFeatures?: number;
  /** Extra plugins, composed ahead of `DEFAULT_WEB_PLUGINS`. */
  plugins?: SerializerPlugin[];
  /** Receives each emitted script chunk. */
  onData: (result: string) => void;
  onError?: (error: unknown) => void;
  /** Fires once all async values have settled. */
  onDone?: () => void;
}

/**
 * Creates a streaming Seroval serializer preconfigured with the web plugin
 * set and the default feature policy. Emits JavaScript chunks (through
 * `onData`) that reconstruct the values under `globalIdentifier` when
 * evaluated — the script-injection form of serialization renderers build
 * on. For a JSON-based wire codec (no eval on the receiving side), use
 * `serializeJSON` / `createJSONDeserializer` instead.
 *
 * Integration-facing; may change (see the entry banner).
 */
export function createSerializer(options: WebSerializerOptions): Serializer;

/**
 * Options for `createHydrationSerializer` — `WebSerializerOptions` minus
 * the knobs hydration pins (`globalIdentifier`, `disabledFeatures`).
 * @internal
 */
export type HydrationSerializerOptions = Omit<
  WebSerializerOptions,
  "globalIdentifier" | "disabledFeatures"
>;

/**
 * Renderer primitive — the serializer SSR uses for hydration output. Pins
 * the hydration global (`_$HY.r`) and feature policy; only the wiring
 * options (callbacks, scope, extra plugins) are configurable. Not meant
 * for hand-written code — custom serialization should use
 * `createSerializer` or the JSON codec.
 * @internal
 */
export function createHydrationSerializer(options: HydrationSerializerOptions): Serializer;

/**
 * Renderer primitive — returns the cross-reference bootstrap script SSR
 * emits ahead of hydration data for a render scope. Not meant for
 * hand-written code.
 * @internal
 */
export function getLocalHeaderScript(id?: string): string;

// ---- JSON codec (server function transports) ----

/**
 * Options shared by both halves of the JSON codec. All of them must match
 * on the serializing and deserializing peer or payloads will not
 * round-trip — for server functions, set them once through the
 * client/server `codec` config option.
 *
 * Integration-facing; may change (see the entry banner).
 */
export interface JSONCodecOptions {
  /** Extra plugins, composed ahead of `DEFAULT_WEB_PLUGINS`. Must match on both peers. */
  plugins?: SerializerPlugin[];
  /**
   * Seroval feature bitflags to exclude. Defaults to disabling `RegExp`
   * (payloads may come from an untrusted peer). Must match on both peers.
   * Outside development, the encoding side additionally strips
   * `Error.prototype.stack` on top of any override — serialized stacks leak
   * server paths to the client. Decoding stays permissive, so payloads from
   * a development peer still round-trip.
   */
  disabledFeatures?: number;
  /** Maximum parse/deserialize depth. Defaults to 64. Must match on both peers. */
  depthLimit?: number;
}

/**
 * Options for `serializeJSON`.
 *
 * Integration-facing; may change (see the entry banner).
 */
export interface JSONSerializeOptions extends JSONCodecOptions {
  /**
   * Receives each serialized node; `initial` is true for the first chunk
   * (the source value itself). Async values produce additional chunks as
   * they resolve.
   */
  onParse: (node: SerovalNode, initial: boolean) => void;
  onError?: (error: unknown) => void;
  /** Fires once all async values have settled. */
  onDone?: () => void;
}

/**
 * Serializes `value` as SerovalNode chunks delivered through `onParse` —
 * the encoding half of the eval-free JSON codec (RPC-style transports;
 * the deserializing peer needs no script evaluation, so CSP-safe). Wire
 * framing of the nodes is the transport's concern. Returns a cancel
 * function that aborts pending async serialization.
 *
 * Integration-facing; may change (see the entry banner).
 */
export function serializeJSON(value: unknown, options: JSONSerializeOptions): () => void;

/**
 * Creates the decoding counterpart of `serializeJSON`. Cross-references
 * between chunks resolve through state shared across calls, so all chunks
 * from one stream must go through the same deserializer instance. The first
 * chunk's return value is the decoded source value; feeding later chunks
 * settles the async values referenced inside it.
 *
 * Integration-facing; may change (see the entry banner).
 */
export function createJSONDeserializer(options?: JSONCodecOptions): <T>(node: SerovalNode) => T;

/** Options for `createJSONSerializer`. */
export interface JSONSerializerOptions extends JSONCodecOptions {
  /**
   * Receives each keyed record — `initial` is true for a key's first node
   * (the written value itself); async values patch through later records
   * under the same key. The decoding peer is `createJSONDataTable`.
   */
  onData: (record: { key: string; node: SerovalNode; initial: boolean }) => void;
  onError?: (error: unknown) => void;
  /** Fires once `flush()` has been called and every pending value settled. */
  onDone?: () => void;
}

/**
 * The keyed, streaming encoder of the eval-free JSON codec — the render
 * stream's data serializer (frames default to it). Each `write(key, value)`
 * shares one reference space, so cross-record identity holds; `flush()`
 * marks the write set complete (writes after it are dropped, mirroring the
 * hydration serializer); `close()` aborts pending async serialization.
 */
export function createJSONSerializer(options: JSONSerializerOptions): {
  write(key: string, value: unknown): void;
  flush(): void;
  close(): void;
};

/**
 * A resident, response-scoped decode table over the keyed JSON codec: apply
 * each frame `data` chunk with `apply`, resolve `{ $ref }` slot args with
 * `resolve`. The frames client host wires one per response
 * (`applyData: c => table.apply(c)`).
 *
 * Integration-facing; may change (see the entry banner). This serialization
 * entry is the single home of the data table — the frames client consumes
 * it internally rather than re-exporting it.
 */
export interface JSONDataTable {
  apply(chunk: { key?: string; node?: unknown; initial?: boolean }): void;
  resolve<T = unknown>(ref: { $ref: string }): T;
}
export function createJSONDataTable(options?: JSONCodecOptions): JSONDataTable;
