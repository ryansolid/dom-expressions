import { Plugin, Serializer, SerovalNode } from "seroval";

/**
 * Seroval's node shape — the intermediate representation `serializeJSON`
 * emits and `createJSONDeserializer` consumes. Safe to `JSON.stringify`.
 */
export type { SerovalNode };

/**
 * A Seroval plugin usable with the web serializers — teaches the codec how
 * to encode/decode a custom value type. Supply matching plugins on both
 * peers of a transport.
 */
export type SerializerPlugin = Plugin<any, any>;

/**
 * Baseline plugin set for serializing web-platform values (AbortSignal,
 * Event, FormData, Headers, ReadableStream, Request, Response, URL, ...).
 * Applied by every serializer in this module; custom plugins compose ahead
 * of it via `resolveSerializerPlugins`.
 */
export const DEFAULT_WEB_PLUGINS: readonly SerializerPlugin[];

/**
 * Composes custom plugins with `DEFAULT_WEB_PLUGINS`. Custom plugins come
 * first so they can shadow a default for values both would match. Returns a
 * fresh array; the defaults are never mutated. Useful when handing a full
 * plugin list to another serialization layer.
 */
export function resolveSerializerPlugins(customPlugins?: SerializerPlugin[]): SerializerPlugin[];

/** Options for `createSerializer`. */
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

/** Options for `serializeJSON`. */
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
 */
export function serializeJSON(value: unknown, options: JSONSerializeOptions): () => void;

/**
 * Creates the decoding counterpart of `serializeJSON`. Cross-references
 * between chunks resolve through state shared across calls, so all chunks
 * from one stream must go through the same deserializer instance. The first
 * chunk's return value is the decoded source value; feeding later chunks
 * settles the async values referenced inside it.
 */
export function createJSONDeserializer(options?: JSONCodecOptions): <T>(node: SerovalNode) => T;

/**
 * A resident, response-scoped decode table over the keyed JSON codec: apply
 * each frame `data` chunk with `apply`, resolve `{ $ref }` slot args with
 * `resolve`. The frames client host wires one per response
 * (`applyData: c => table.apply(c)`).
 */
export interface JSONDataTable {
  apply(chunk: { key?: string; node?: unknown; initial?: boolean }): void;
  resolve<T = unknown>(ref: { $ref: string }): T;
}
export function createJSONDataTable(options?: JSONCodecOptions): JSONDataTable;
