import { Plugin, Serializer, SerovalNode } from "seroval";

export type { SerovalNode };

/** A Seroval plugin usable with the web serializers. */
export type SerializerPlugin = Plugin<any, any>;

/**
 * Baseline plugin set for serializing web-platform values (AbortSignal,
 * Event, FormData, Headers, ReadableStream, Request, Response, URL, ...).
 */
export const DEFAULT_WEB_PLUGINS: readonly SerializerPlugin[];

/**
 * Composes custom plugins with `DEFAULT_WEB_PLUGINS`. Custom plugins come
 * first so they can shadow a default for values both would match. Returns a
 * fresh array; the defaults are never mutated.
 */
export function resolveSerializerPlugins(customPlugins?: SerializerPlugin[]): SerializerPlugin[];

export interface WebSerializerOptions {
  /** Name of the global object the emitted scripts write resolved values into. */
  globalIdentifier: string;
  scopeId?: string;
  /**
   * Seroval feature bitflags to exclude from output. Defaults to disabling
   * post-ES2017 features (AggregateError, BigInt typed arrays).
   */
  disabledFeatures?: number;
  /** Extra plugins, composed ahead of `DEFAULT_WEB_PLUGINS`. */
  plugins?: SerializerPlugin[];
  onData: (result: string) => void;
  onError?: (error: unknown) => void;
  onDone?: () => void;
}

/**
 * Creates a streaming Seroval serializer preconfigured with the web plugin
 * set and the default feature policy.
 */
export function createSerializer(options: WebSerializerOptions): Serializer;

export type HydrationSerializerOptions = Omit<
  WebSerializerOptions,
  "globalIdentifier" | "disabledFeatures"
>;

/**
 * Serializer for SSR hydration output. Pins the hydration global (`_$HY.r`)
 * and feature policy — only the wiring options (callbacks, scope, extra
 * plugins) are configurable.
 */
export function createHydrationSerializer(options: HydrationSerializerOptions): Serializer;

/** Returns the cross-reference bootstrap script for a render scope. */
export function getLocalHeaderScript(id?: string): string;

// ---- JSON codec (server function transports) ----

export interface JSONCodecOptions {
  /** Extra plugins, composed ahead of `DEFAULT_WEB_PLUGINS`. Must match on both peers. */
  plugins?: SerializerPlugin[];
  /**
   * Seroval feature bitflags to exclude. Defaults to disabling `RegExp`
   * (payloads may come from an untrusted peer). Must match on both peers.
   */
  disabledFeatures?: number;
  /** Maximum parse/deserialize depth. Defaults to 64. Must match on both peers. */
  depthLimit?: number;
}

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
 * Serializes `value` as SerovalNode chunks delivered through `onParse`.
 * Wire framing of the nodes is the transport's concern. Returns a cancel
 * function that aborts pending async serialization.
 */
export function serializeJSON(value: unknown, options: JSONSerializeOptions): () => void;

/**
 * Creates the decoding counterpart of `serializeJSON`. Cross-references
 * between chunks resolve through state shared across calls, so all chunks
 * from one stream must go through the same deserializer instance. The first
 * chunk's return value is the decoded source value.
 */
export function createJSONDeserializer(options?: JSONCodecOptions): <T>(node: SerovalNode) => T;
