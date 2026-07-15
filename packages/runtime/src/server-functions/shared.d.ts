import { JSONCodecOptions } from "../serializer.js";

export type { JSONCodecOptions };

/**
 * Configures the codec options (extra plugins etc. — must match the peer).
 * Shared by the client and server modules; both write through to here.
 */
export function configureServerFunctionsCodec(codec: JSONCodecOptions | undefined): void;

/** The currently configured codec options. */
export function getServerFunctionsCodec(): JSONCodecOptions | undefined;

/** Header carrying the server function id. */
export const FUNCTION_HEADER: string;

/**
 * Header carrying a per-call instance id. Its presence tells the server a
 * scripted client is on the other end (vs. a no-JS form post).
 */
export const INSTANCE_HEADER: string;

/** Header carrying the body format tag (a `BodyFormat` value). */
export const BODY_FORMAT_HEADER: string;

/** FormData key used when a lone File is sent as the argument. */
export const FILE_FORM_KEY: string;

export const BodyFormat: {
  readonly Serialized: "0";
  readonly String: "1";
  readonly FormData: "2";
  readonly URLSearchParams: "3";
  readonly Blob: "4";
  readonly File: "5";
  readonly ArrayBuffer: "6";
  readonly Uint8Array: "7";
};

export type BodyFormatValue = (typeof BodyFormat)[keyof typeof BodyFormat];

/**
 * Picks a direct HTTP encoding for values that have one. Returns undefined
 * when the value needs the serializer.
 */
export function getHeadersAndBody(
  body: unknown
): { headers?: Record<string, string>; body: BodyInit } | undefined;

/**
 * Decodes a Request/Response body according to its format tag. The inverse
 * of `getHeadersAndBody` + the serialized stream.
 */
export function extractBody(
  source: Request | Response,
  codecOptions?: JSONCodecOptions
): Promise<unknown>;

/**
 * Serializes a value as a stream of framed SerovalNode chunks. Async values
 * keep the stream open until they settle. Codec options must match the
 * deserializing peer.
 */
export function serializeStream(
  value: unknown,
  codecOptions?: JSONCodecOptions
): ReadableStream<Uint8Array>;

/** `serializeStream` drained to a string (async values fully awaited). */
export function serializeString(value: unknown, codecOptions?: JSONCodecOptions): Promise<string>;

/**
 * Decodes a framed stream from a Request/Response body. Resolves with the
 * first chunk's value (the source value); later chunks settle the async
 * values referenced inside it.
 */
export function deserializeStream<T = unknown>(
  source: Request | Response,
  codecOptions?: JSONCodecOptions
): Promise<T>;

/** `deserializeStream` for an already-buffered string. */
export function deserializeString<T = unknown>(
  text: string,
  codecOptions?: JSONCodecOptions
): Promise<T>;

/**
 * Decodes a server function response body using the configured codec.
 * Integrations (routers) call this on responses the transport hands over
 * whole — redirects, revalidation, single-flight payloads. Renderer- and
 * platform-neutral: safe to use from universal code.
 */
export function decodeResponse<T = unknown>(
  response: Response,
  codecOptions?: JSONCodecOptions
): Promise<T | undefined>;
