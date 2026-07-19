import { JSONCodecOptions } from "../serializer.js";

export type { JSONCodecOptions };

/**
 * Configures the codec options for the server function wire format (extra
 * Seroval plugins, feature policy, depth limit). Both peers must configure
 * identical options or payloads will not round-trip. Usually called
 * indirectly through `configureServerFunctionsClient` /
 * `configureServerFunctionsServer` (their `codec` option writes through to
 * here); call it directly only from universal code configuring both sides
 * at once.
 */
export function configureServerFunctionsCodec(codec: JSONCodecOptions | undefined): void;

/**
 * The currently configured codec options (set through
 * `configureServerFunctionsCodec` or the client/server `codec` option), or
 * undefined when running on the defaults. Integrations pass this to
 * lower-level codec helpers so custom plugins configured by the app apply.
 */
export function getServerFunctionsCodec(): JSONCodecOptions | undefined;

/**
 * Request header carrying the server function id (`"X-Server-Function-Id"`).
 * Integrations can read it to identify which function a request targets;
 * the id also arrives as the `id` query parameter for GET calls and no-JS
 * form posts.
 */
export const FUNCTION_HEADER: string;

/**
 * Request header carrying a per-call instance id
 * (`"X-Server-Function-Instance"`). Its presence tells the server the call
 * came through the client runtime — its absence marks a no-JS form post or
 * direct HTTP call, which receive plain responses instead of codec-encoded
 * ones.
 */
export const INSTANCE_HEADER: string;

/**
 * Header driving the single-flight protocol on both legs
 * (`"X-Single-Flight"`). On the request it opts the call into data
 * collection — the transport sends it automatically on non-GET calls while
 * a flight-data consumer is subscribed (subscribing IS the opt-in). On the
 * response it marks a body carrying the standardized `SingleFlightPayload`.
 * How the data is produced (a data-only render, running route preloads,
 * anything else) and what it means is entirely the integration's business —
 * the protocol only standardizes the wire shape and the delivery.
 */
export const SINGLE_FLIGHT_HEADER: string;

/**
 * The standardized body of a single-flight response (a response tagged with
 * `SINGLE_FLIGHT_HEADER`): the function's return `value` plus the
 * integration-produced `data` payload, folded into one round trip by the
 * HTTP handler. Integrations decoding passthrough responses themselves (no
 * registered consumer) see this shape from `decodeResponse`. The top level
 * is reserved for the protocol — integration payload lives entirely under
 * `data`, which can be any codec-serializable value.
 */
export interface SingleFlightPayload<T = unknown, D = unknown> {
  /** The server function's return (or thrown) value. */
  value: T;
  /** The integration-produced data payload. */
  data: D;
}

/**
 * Envelope context delivered alongside single-flight data: the transport
 * response, whose headers carry the integration metadata (`Location` for
 * redirect-with-data, `X-Revalidate` keys) and status. The body is already
 * consumed — read `data` and `value` from the delivery, not from here.
 */
export interface FlightDataContext {
  /** The HTTP response the data arrived on (metadata only). */
  response: Response;
}

/**
 * Consumer receiving single-flight data on the client: `data` is the
 * integration-produced payload (opaque to the protocol), `context` carries
 * the envelope metadata. Async consumers are awaited before the function
 * value is returned to the caller, so caches are seeded first.
 */
export type FlightDataConsumer<D = unknown> = (
  data: D,
  context: FlightDataContext
) => void | Promise<void>;

/**
 * Registers the consumer the client transport delivers single-flight data
 * to. Subscribing is the single-flight opt-in: while a consumer is
 * registered the transport sends the request-leg `SINGLE_FLIGHT_HEADER` on
 * non-GET calls (GET reads stay plain and cacheable), asking the server's
 * collection hook to fold data into the response. When a single-flight
 * response arrives, the transport decodes the standardized
 * `{ value, data }` payload, delivers `data` (with the response as
 * envelope context — redirect location, revalidation keys), and returns
 * `value` to the caller as if the call were plain. What to do with the
 * data (seed caches, navigate, ...) is entirely the consumer's business.
 * One active consumer at a time — a later registration replaces the
 * current one; returns an unsubscribe function. With no consumer
 * registered, no header is sent and the server does no collection work;
 * responses an integration opted in manually still pass through to the
 * caller whole, exactly like other integration responses.
 */
export function subscribeFlightData<D = unknown>(consumer: FlightDataConsumer<D>): () => void;

/**
 * The currently registered single-flight consumer.
 *
 * Transport building block; not meant for hand-written code.
 * @internal
 */
export function getFlightDataConsumer(): FlightDataConsumer | undefined;

/**
 * Header carrying the body format tag (a `BodyFormat` value) —
 * `"X-Server-Function-Format"`.
 *
 * Transport wire detail; not meant for hand-written code.
 * @internal
 */
export const BODY_FORMAT_HEADER: string;

/**
 * FormData key used when a lone File is sent as the argument.
 *
 * Transport wire detail; not meant for hand-written code.
 * @internal
 */
export const FILE_FORM_KEY: string;

/**
 * Wire tags naming how a request/response body was encoded, carried in
 * `BODY_FORMAT_HEADER`.
 *
 * Transport wire detail; not meant for hand-written code.
 * @internal
 */
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

/**
 * Transport wire detail; not meant for hand-written code.
 * @internal
 */
export type BodyFormatValue = (typeof BodyFormat)[keyof typeof BodyFormat];

/**
 * Picks a direct HTTP encoding (headers + BodyInit) for values that have
 * one — strings, FormData, URLSearchParams, File, Blob, ArrayBuffer,
 * Uint8Array. Returns undefined when the value needs the serializer.
 *
 * Transport building block used by the fetch transport and the HTTP
 * handler; not meant for hand-written code.
 * @internal
 */
export function getHeadersAndBody(
  body: unknown
): { headers?: Record<string, string>; body: BodyInit } | undefined;

/**
 * Decodes a Request/Response body according to its `BODY_FORMAT_HEADER`
 * tag (falling back to content-type sniffing for form posts that never saw
 * the client runtime). The inverse of `getHeadersAndBody` + the serialized
 * stream. Resolves undefined for bodies without a recognized encoding.
 *
 * Transport building block; use `decodeResponse` from integration code.
 * @internal
 */
export function extractBody(
  source: Request | Response,
  codecOptions?: JSONCodecOptions
): Promise<unknown>;

/**
 * Serializes a value as a stream of length-prefixed SerovalNode chunks.
 * Async values (promises, streams) keep the stream open until they settle,
 * so one connection carries incremental results. Codec options must match
 * the deserializing peer.
 *
 * Transport building block; not meant for hand-written code.
 * @internal
 */
export function serializeStream(
  value: unknown,
  codecOptions?: JSONCodecOptions
): ReadableStream<Uint8Array>;

/**
 * `serializeStream` drained to a string (async values fully awaited).
 *
 * Transport building block; not meant for hand-written code.
 * @internal
 */
export function serializeString(value: unknown, codecOptions?: JSONCodecOptions): Promise<string>;

/**
 * Decodes a framed chunk stream from a Request/Response body. Resolves with
 * the first chunk's value (the source value); later chunks settle the async
 * values referenced inside it as they arrive.
 *
 * Transport building block; use `decodeResponse` from integration code.
 * @internal
 */
export function deserializeStream<T = unknown>(
  source: Request | Response,
  codecOptions?: JSONCodecOptions
): Promise<T>;

/**
 * `deserializeStream` for an already-buffered string.
 *
 * Transport building block; not meant for hand-written code.
 * @internal
 */
export function deserializeString<T = unknown>(
  text: string,
  codecOptions?: JSONCodecOptions
): Promise<T>;

/**
 * Decodes a server function response body using the configured codec. This
 * is the integration-facing decoder: routers call it on responses the
 * transport hands over whole — redirects, revalidation, single-flight
 * payloads — to recover the structured value inside. Resolves undefined for
 * empty bodies and bodies without a recognized encoding (e.g. a raw user
 * Response). Renderer- and platform-neutral: safe to use from universal
 * code.
 *
 * @param response the transport response; its body is read from a clone,
 * so the original stays readable
 * @param codecOptions overrides the configured codec for this call
 */
export function decodeResponse<T = unknown>(
  response: Response,
  codecOptions?: JSONCodecOptions
): Promise<T | undefined>;
