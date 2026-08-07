// Shared half of the server function transport: the pieces both peers must
// agree on byte-for-byte. Hoisted from SolidStart's fns/shared.ts and
// fns/serialization.ts with neutral header names.
//
// Two layers live here:
// - body negotiation: single arguments with a natural HTTP encoding (string,
//   FormData, Blob, ...) skip the serializer entirely; everything else goes
//   through the JSON codec from ../serializer.js.
// - chunk framing: length-prefixed chunks so the receiver knows how much to
//   buffer before parsing, which lets async values (promises, streams)
//   arrive incrementally on one connection.
import { createJSONDeserializer, serializeJSON } from "../serializer.js";

// Codec options must match across peers, and decoding happens in more
// places than the fetch transport (routers decode integration responses
// themselves), so the config lives here in the universal layer — the
// client/server modules write through to it.
const codecConfig = { codec: undefined };

/** Configures the codec options (extra plugins etc. — must match the peer). */
export function configureServerFunctionsCodec(codec) {
  codecConfig.codec = codec;
}

/** The currently configured codec options. */
export function getServerFunctionsCodec() {
  return codecConfig.codec;
}

// The single-flight consumer also lives in the universal layer: routers are
// universal code, so the registration must be importable from any build
// (the server side simply never delivers to it).
const flightConfig = { consumer: undefined };

/**
 * Registers the consumer the client transport delivers single-flight data
 * to: `consumer(data, { response })` — the integration-produced payload
 * plus the response as envelope context (redirect location, revalidation
 * keys, status). What the data means and what to do with it (seed caches,
 * navigate, ...) is entirely the consumer's business. One active consumer
 * at a time (a later registration replaces the current one); returns an
 * unsubscribe function. With no consumer registered, single-flight
 * responses pass through to the caller whole, exactly like other
 * integration responses.
 */
export function subscribeFlightData(consumer) {
  flightConfig.consumer = consumer;
  return () => {
    if (flightConfig.consumer === consumer) flightConfig.consumer = undefined;
  };
}

/** The currently registered single-flight consumer. */
export function getFlightDataConsumer() {
  return flightConfig.consumer;
}

/**
 * The wire address of a server-component call: its function id and the
 * arguments it was called with.
 *
 * A mutation answering with fresh markup for something it invalidated has to
 * name the region it is replacing, and both peers have to arrive at the same
 * name independently — the client never told the server which boundaries it
 * is showing. A call's identity is the one thing they always share: the
 * client dispatched `(id, args)` and the server's collection pass calls
 * `(id, args)` again. So the protocol derives the address itself rather than
 * asking an integration to declare one, and a cache-backed router gets this
 * without writing anything.
 *
 * This is an ADDRESS, not a boundary identity: which DOM boundary is
 * currently showing a given call is a client-side lookup (see
 * `createServerComponentHandler`), so a call site whose arguments change
 * still morphs in place instead of remounting.
 */
export function frameAddress(id, args) {
  return args && args.length ? id + ":" + hashArguments(args) : id;
}

// A structural digest, stable across peers: key order is normalized so two
// equal argument lists always agree, and anything the codec would have to
// think about (class instances, cycles) degrades to its shape rather than
// throwing. Collisions cost a mis-routed region, not correctness — an
// unaddressed region simply finds no boundary.
function hashArguments(args) {
  let hash = 0;
  const text = stableString(args);
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(36);
}

function stableString(value, seen) {
  if (value === null || typeof value !== "object") {
    return typeof value === "bigint" ? value + "n" : String(value);
  }
  // Realm-stable forms for the codec's rich argument types: `String(value)`
  // for these is implementation-defined (a Date stringifies with the local
  // timezone, differently in Node and a browser) and the two peers hash
  // INDEPENDENTLY — the client from the args it dispatched, the server from
  // the args its collection pass calls with. A digest that diverges routes
  // the region nowhere, which degrades to a refetch invisibly.
  if (value instanceof Date) return "Date:" + value.getTime();
  seen || (seen = new Set());
  if (seen.has(value)) return "~";
  seen.add(value);
  if (value instanceof Map) {
    const entries = [];
    for (const [k, v] of value) {
      entries.push(stableString(k, seen) + "=>" + stableString(v, seen));
    }
    return "Map{" + entries.sort().join(",") + "}";
  }
  if (value instanceof Set) {
    const members = [];
    for (const v of value) members.push(stableString(v, seen));
    return "Set{" + members.sort().join(",") + "}";
  }
  if (Array.isArray(value)) {
    let out = "[";
    for (let i = 0; i < value.length; i++) out += (i ? "," : "") + stableString(value[i], seen);
    return out + "]";
  }
  const keys = Object.keys(value).sort();
  let out = "{";
  for (let i = 0; i < keys.length; i++) {
    out += (i ? "," : "") + keys[i] + ":" + stableString(value[keys[i]], seen);
  }
  return out + "}";
}

// The declaration-metadata channel. `GET(fn)` (and any future
// declaration-static capability) brands references with a metadata object
// under a registered symbol — surviving duplicated module instances, the
// same trick as the ResponseEnvelope brand — and routers/integrations read
// it back through the typed accessors instead of property sniffing. The
// channel lives in the universal layer because detection is universal code:
// the same accessor works on client proxies and server references alike.
export const SERVER_FUNCTION_METADATA = Symbol.for("solid.ServerFunctionMetadata");

/**
 * Reads a server function reference's declaration metadata (e.g.
 * `method: "GET"` for `GET(fn)` references). Returns undefined when `fn`
 * is not a server function reference; plain references carry an empty
 * metadata object.
 */
export function getServerFunctionMetadata(fn) {
  if (typeof fn !== "function") return undefined;
  return fn[SERVER_FUNCTION_METADATA] || undefined;
}

/**
 * Whether `fn` is a server function reference (a client proxy or a
 * server-side registered callable). Detection is by the registered-symbol
 * metadata brand, so it holds across duplicated module instances.
 */
export function isServerFunction(fn) {
  return typeof fn === "function" && !!fn[SERVER_FUNCTION_METADATA];
}

/**
 * Attaches user-declared transport metadata to a server function reference
 * (client proxy or server-registered callable) and returns the reference.
 * Writes ride the same channel `GET` uses: later writes shallow-merge over
 * earlier ones, and `getServerFunctionMetadata(fn)` reads the merged bag —
 * so `withMeta` composes with `GET` in either order.
 *
 * The pattern is declare-on-function, react-in-hook: metadata declared
 * here is what `prepareRequest` receives as `context.meta`, letting
 * session-dynamic transport policy key on declarations instead of
 * comparing function ids:
 *
 * ```ts
 * export const chargeCard = withMeta(async (amount: number) => {
 *   "use server";
 *   // ...
 * }, { requiresAuth: true });
 *
 * configureServerFunctionsClient({
 *   prepareRequest(init, { meta }) {
 *     if (meta?.requiresAuth) {
 *       return {
 *         ...init,
 *         headers: { ...init.headers, Authorization: `Bearer ${session.token()}` }
 *       };
 *     }
 *     return init;
 *   }
 * });
 * ```
 */
export function withMeta(fn, meta) {
  const metadata = getServerFunctionMetadata(fn);
  if (!metadata) {
    throw new Error("withMeta expects a server function reference");
  }
  Object.assign(metadata, meta);
  return fn;
}

/** Header carrying the server function id. */
export const FUNCTION_HEADER = "X-Server-Function-Id";

/**
 * Response header marking a thrown server-function error. The value is the
 * error's message (the structured error itself travels in the body); `"true"`
 * for thrown control-flow responses and non-Error values.
 */
export const ERROR_HEADER = "X-Server-Function-Error";

// HTTP header values are ByteStrings (latin1): Headers.set throws on code
// points above U+00FF (or corrupts them, per platform), which used to turn a
// thrown error with a CJK/emoji message into a bare 500 with nothing for the
// client to decode (solidjs/solid-start#1874). Messages that cannot ride a
// header verbatim travel percent-encoded behind this marker; verbatim
// messages that happen to start with the marker are encoded too, so
// `decodeErrorHeaderValue(encodeErrorHeaderValue(x)) === x` exactly —
// astral-plane characters included.
const ERROR_HEADER_MARKER = "=?1?";
// Anything outside printable latin1 (controls, DEL, > U+00FF) forces the
// encoded form; CR/LF never survive (header injection) and are stripped
// before the check, matching SolidStart's original `toHeaderValue` guard.
const NEEDS_ENCODING = /[^\x20-\x7e\xa0-\xff]/;

/**
 * Encodes an error message for the `ERROR_HEADER` value: plain printable
 * latin1 rides verbatim (the fast path — ASCII messages are byte-identical
 * on the wire), everything else is percent-encoded behind a marker.
 */
export function encodeErrorHeaderValue(value) {
  let stripped = String(value).replace(/[\r\n]+/g, "");
  // leading/trailing whitespace would be trimmed by Headers.set
  if (
    !NEEDS_ENCODING.test(stripped) &&
    !stripped.startsWith(ERROR_HEADER_MARKER) &&
    stripped === stripped.trim()
  ) {
    return stripped;
  }
  // encodeURIComponent throws on lone surrogates; well-form first (they
  // cannot round-trip through UTF-8 anywhere in the protocol anyway)
  if (typeof stripped.toWellFormed === "function") {
    stripped = stripped.toWellFormed();
  } else {
    stripped = stripped.replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      "\uFFFD"
    );
  }
  return ERROR_HEADER_MARKER + encodeURIComponent(stripped);
}

/**
 * Decodes an `ERROR_HEADER` value produced by `encodeErrorHeaderValue`:
 * marked values are percent-decoded, everything else passes through
 * (including values from peers that never encode).
 */
export function decodeErrorHeaderValue(value) {
  if (typeof value !== "string" || !value.startsWith(ERROR_HEADER_MARKER)) {
    return value;
  }
  try {
    return decodeURIComponent(value.slice(ERROR_HEADER_MARKER.length));
  } catch {
    // not produced by our encoder after all — hand it over untouched
    return value;
  }
}

/**
 * Header carrying a per-call instance id. Its presence tells the server a
 * scripted client is on the other end (vs. a no-JS form post).
 */
export const INSTANCE_HEADER = "X-Server-Function-Instance";

/** Header carrying the body format tag (a `BodyFormat` value). */
export const BODY_FORMAT_HEADER = "X-Server-Function-Format";

/**
 * Header driving the single-flight protocol on both legs: on the request it
 * opts the call into flight-data collection (the integration sends it on
 * calls whose response should fold in data), on the response it marks a
 * body carrying the standardized `{ value, data }` payload. How the data
 * is produced (and what it means) is entirely the integration's business —
 * core only owns the wire shape and the delivery.
 */
export const SINGLE_FLIGHT_HEADER = "X-Single-Flight";

/** FormData key used when a lone File is sent as the argument. */
export const FILE_FORM_KEY = "__server_function_file__";

/**
 * Cookie carrying the outcome of a call made without the client runtime, so
 * the page rendered after the redirect can show what happened.
 *
 * The name and its one-shot clearing live here rather than beside the codec
 * (flash.js, server-only) because integrations consume the cookie eagerly
 * from isomorphic code — the clear has to be appended before streaming
 * flushes the response headers, and an unread outcome must not haunt a
 * later request — and that must not drag the encode/decode machinery into
 * client bundles.
 */
export const FLASH_COOKIE = "flash";

const FLASH_MATCHER = new RegExp(`(?:^|;\\s*)${FLASH_COOKIE}=([^;]+)`);

/** Whether a Cookie header carries a flash cookie (readable or not). */
export function hasFlashCookie(cookieHeader) {
  return !!cookieHeader && FLASH_MATCHER.test(cookieHeader);
}

/** The raw encoded flash payload out of a Cookie header, if present. */
export function matchFlashCookie(cookieHeader) {
  const match = cookieHeader && cookieHeader.match(FLASH_MATCHER);
  return match ? match[1] : undefined;
}

/** The Set-Cookie value clearing the flash cookie after it has been read. */
export function clearFlashCookie() {
  return `${FLASH_COOKIE}=; Max-Age=0; Path=/`;
}

export const BodyFormat = {
  Serialized: "0",
  String: "1",
  FormData: "2",
  URLSearchParams: "3",
  Blob: "4",
  File: "5",
  ArrayBuffer: "6",
  Uint8Array: "7",
  /** Plain `JSON.stringify(args)` — the fast path for JSON-safe arguments. */
  Json: "8"
};

/**
 * Picks a direct HTTP encoding for values that have one. Returns undefined
 * when the value needs the serializer (the caller then uses the codec).
 */
export function getHeadersAndBody(body) {
  switch (true) {
    case typeof body === "string":
      return {
        headers: {
          "Content-Type": "text/plain",
          [BODY_FORMAT_HEADER]: BodyFormat.String
        },
        body
      };
    case body instanceof FormData:
      return {
        headers: {
          [BODY_FORMAT_HEADER]: BodyFormat.FormData
        },
        body
      };
    case body instanceof URLSearchParams:
      return {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          [BODY_FORMAT_HEADER]: BodyFormat.URLSearchParams
        },
        body
      };
    case typeof File !== "undefined" && body instanceof File: {
      const formData = new FormData();
      formData.append(FILE_FORM_KEY, body, body.name);
      return {
        headers: {
          [BODY_FORMAT_HEADER]: BodyFormat.File
        },
        body: formData
      };
    }
    case body instanceof Blob:
      return {
        headers: {
          [BODY_FORMAT_HEADER]: BodyFormat.Blob
        },
        body
      };
    case body instanceof ArrayBuffer:
      return {
        headers: {
          [BODY_FORMAT_HEADER]: BodyFormat.ArrayBuffer
        },
        body
      };
    case body instanceof Uint8Array:
      return {
        headers: {
          [BODY_FORMAT_HEADER]: BodyFormat.Uint8Array
        },
        body: new Uint8Array(body)
      };
    default:
      return undefined;
  }
}

/**
 * Decodes a Request/Response body according to its format tag (falling back
 * to content-type sniffing for form posts that never saw the client
 * runtime). The inverse of `getHeadersAndBody` + the serialized stream.
 */
export async function extractBody(source, codecOptions) {
  const contentType = source.headers.get("content-type");
  const format = source.headers.get(BODY_FORMAT_HEADER);
  const clone = source.clone();

  switch (true) {
    case format === BodyFormat.Serialized:
      return await deserializeStream(clone, codecOptions);
    case format === BodyFormat.Json:
      return JSON.parse(await clone.text());
    case format === BodyFormat.String:
      return await clone.text();
    case format === BodyFormat.File: {
      const formData = await clone.formData();
      return formData.get(FILE_FORM_KEY);
    }
    case format === BodyFormat.FormData:
    case contentType && contentType.startsWith("multipart/form-data"):
      return await clone.formData();
    case format === BodyFormat.URLSearchParams:
    case contentType && contentType.startsWith("application/x-www-form-urlencoded"):
      return new URLSearchParams(await clone.text());
    case format === BodyFormat.Blob:
      return await clone.blob();
    case format === BodyFormat.ArrayBuffer:
      return await clone.arrayBuffer();
    case format === BodyFormat.Uint8Array:
      return new Uint8Array(await clone.arrayBuffer());
  }

  return undefined;
}

/*
 * Chunk framing (originally by Alexis):
 *
 * A "chunk" is a piece of data emitted by the streaming serializer.
 * Each chunk is a 12-byte header — `;0x` + 32-bit byte length in hex + `;` —
 * followed by the UTF-8 encoded payload. The length prefix tells the reader
 * how much data to buffer before parsing, so multiple chunks (async values
 * resolving over time) can share one connection.
 */
// Exported for other framed transports over the same wire convention (frame
// streams frame their chunks identically — see frame-transport.js) so there
// is exactly one framing implementation.
export function createChunk(data) {
  const encoder = new TextEncoder();
  const encodeData = encoder.encode(data);
  const bytes = encodeData.length;
  const chunk = new Uint8Array(12 + bytes);
  chunk.set(encoder.encode(`;0x${bytes.toString(16).padStart(8, "0")};`)); // 32-bit
  chunk.set(encodeData, 12);
  return chunk;
}

export class ChunkReader {
  constructor(stream) {
    this.reader = stream.getReader();
    this.buffer = new Uint8Array(0);
    this.done = false;
  }

  async readChunk() {
    const chunk = await this.reader.read();
    if (!chunk.done) {
      const newBuffer = new Uint8Array(this.buffer.length + chunk.value.length);
      newBuffer.set(this.buffer);
      newBuffer.set(chunk.value, this.buffer.length);
      this.buffer = newBuffer;
    } else {
      this.done = true;
    }
  }

  async next() {
    // A network read boundary can land anywhere — inside the 12-byte header
    // just as easily as inside a payload — so buffer until the whole header
    // is present before parsing it. Parsing a truncated header used to
    // mis-read the length (or throw) whenever a proxy/TLS record split a
    // frame, which no localhost test ever produces.
    while (this.buffer.length < 12) {
      if (this.done) {
        if (this.buffer.length === 0) return { done: true, value: undefined };
        throw new Error("Malformed server function stream.");
      }
      await this.readChunk();
    }
    // `;0x00000000;` — the hex length names how many payload bytes to wait for
    const decoder = new TextDecoder();
    const bytes = Number.parseInt(decoder.decode(this.buffer.subarray(1, 11)), 16);
    if (Number.isNaN(bytes)) {
      throw new Error("Malformed server function stream.");
    }
    while (bytes > this.buffer.length - 12) {
      if (this.done) {
        throw new Error("Malformed server function stream.");
      }
      await this.readChunk();
    }
    const partial = decoder.decode(this.buffer.subarray(12, 12 + bytes));
    this.buffer = this.buffer.subarray(12 + bytes);
    return { done: false, value: partial };
  }

  async drain(interpret) {
    while (true) {
      const result = await this.next();
      if (result.done) {
        break;
      }
      interpret(result.value);
    }
  }
}

/**
 * Serializes a value as a stream of framed SerovalNode chunks. Async values
 * keep the stream open until they settle. Codec options (plugins, feature
 * policy, depth limit) must match the deserializing peer.
 */
export function serializeStream(value, codecOptions) {
  return new ReadableStream({
    start(controller) {
      serializeJSON(value, {
        ...codecOptions,
        onParse(node) {
          controller.enqueue(createChunk(JSON.stringify(node)));
        },
        onDone() {
          controller.close();
        },
        onError(error) {
          controller.error(error);
        }
      });
    }
  });
}

/** `serializeStream` drained to a string (async values fully awaited). */
export async function serializeString(value, codecOptions) {
  const response = new Response(serializeStream(value, codecOptions));
  return await response.text();
}

/**
 * Decodes a framed stream from a Request/Response body. Resolves with the
 * first chunk's value (the source value); later chunks settle the async
 * values referenced inside it.
 */
export async function deserializeStream(source, codecOptions) {
  if (!source.body) {
    throw new Error("missing body");
  }
  const reader = new ChunkReader(source.body);
  const result = await reader.next();
  if (!result.done) {
    // Cross-references between chunks resolve through state inside the
    // deserializer, so one instance handles the whole stream.
    const deserializeChunk = createJSONDeserializer(codecOptions);

    function interpretChunk(chunk) {
      return deserializeChunk(JSON.parse(chunk));
    }

    void reader.drain(interpretChunk);

    return interpretChunk(result.value);
  }
  return undefined;
}

/** `deserializeStream` for an already-buffered string. */
export async function deserializeString(text, codecOptions) {
  return await deserializeStream(new Response(text), codecOptions);
}

/**
 * Decodes a server function response body using the configured codec.
 * Integrations (routers) call this on responses the transport hands over
 * whole — redirects, revalidation, single-flight payloads. Renderer- and
 * platform-neutral: safe to use from universal code.
 */
export async function decodeResponse(response, codecOptions) {
  if (!response.body) return undefined;
  return await extractBody(response, codecOptions === undefined ? codecConfig.codec : codecOptions);
}

/**
 * `decodeResponse` plus the single-flight envelope split: when the response
 * carries the single-flight header the decoded `{ value, data }` payload is
 * unwrapped into `{ value, flightData }`; otherwise the decoded body (or
 * undefined for body-less responses) rides as `{ value }`. Integrations
 * that apply response metadata themselves use this so the payload shape
 * stays core's own.
 */
export async function decodeResponsePayload(response, codecOptions) {
  const decoded = await decodeResponse(response, codecOptions);
  if (decoded !== undefined && response.headers.has(SINGLE_FLIGHT_HEADER)) {
    return { value: decoded.value, flightData: decoded.data };
  }
  return { value: decoded };
}
