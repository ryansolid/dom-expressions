// Client half of the server function runtime ABI. Compiled client output
// calls `createServerReference(id)` where a server function was referenced;
// the function body never reaches this bundle. Hoisted from SolidStart's
// fns/client.ts with neutral header names and a configurable endpoint.
import { REVALIDATE_HEADER } from "../response.js";
import {
  BODY_FORMAT_HEADER,
  BodyFormat,
  ERROR_HEADER,
  FUNCTION_HEADER,
  INSTANCE_HEADER,
  SERVER_FUNCTION_METADATA,
  SINGLE_FLIGHT_HEADER,
  configureServerFunctionsCodec,
  decodeResponse,
  getFlightDataConsumer,
  getHeadersAndBody,
  getServerFunctionMetadata,
  isJSONSafe,
  isServerFunction,
  provideServerFunctionRPC,
  withMeta
} from "./shared.js";

// The flash cookie's name, detection and clearing are re-exported here so
// isomorphic integration code imports them from one specifier; the codec
// that fills the cookie is server-only and stays behind the server entry.
export {
  // Wire-protocol utilities re-exported for the frame transport: an
  // integration whose bundling would otherwise give the transport a private
  // copy of this module (solid-web's frames client) resolves its shared.js
  // import HERE instead — one copy of the framing/addressing code in the
  // app, and the codec/flight-consumer config the transport reads is the
  // shared built instance by construction.
  ChunkReader,
  ERROR_HEADER,
  FLASH_COOKIE,
  FUNCTION_HEADER,
  INSTANCE_HEADER,
  SINGLE_FLIGHT_HEADER,
  clearFlashCookie,
  createChunk,
  decodeErrorHeaderValue,
  decodeResponse,
  decodeResponsePayload,
  deserializeStream,
  encodeErrorHeaderValue,
  frameAddress,
  getFlightDataConsumer,
  getServerFunctionMetadata,
  getServerFunctionsCodec,
  hasFlashCookie,
  isServerFunction,
  // the rich-args entry's codec write half: its bundled form (solid-web's
  // server-functions/dist/rich-args.js) resolves shared.js imports here so
  // the codec config it reads is the shared built instance
  serializeString,
  subscribeFlightData,
  withMeta
} from "./shared.js";
export { REVALIDATE_HEADER } from "../response.js";

const config = {
  endpoint: "/_server",
  prepareRequest: undefined,
  responseHandler: undefined,
  serializeArgs: undefined
};

function serializeArguments(args) {
  if (!config.serializeArgs) {
    throw new Error(
      "Server function arguments are sent as JSON by default and these " +
        "arguments are not JSON-serializable. Call enableRichArguments() " +
        '(from "@solidjs/web/server-functions/rich-args") once at startup ' +
        "to send Dates, Maps, Sets, typed arrays, etc. through the codec — " +
        "or pass a single Blob/FormData/File argument, which has a native " +
        "HTTP encoding."
    );
  }
  return config.serializeArgs(args);
}

/**
 * Configures the transport before any server function is called: the
 * endpoint the server handler is mounted on, the codec options (extra
 * plugins etc. — must match the server's; stored in the shared layer so
 * `decodeResponse` sees them too), and the `prepareRequest` hook applied
 * to every outgoing server-function fetch (session-dynamic transport
 * policy — bearer tokens, tracing headers).
 *
 * `responseHandler` is the response-side integration seam — the client
 * mirror of the handler's `transformResult`. `handle(response, ctx)` sees
 * every response before the transport decodes it; returning anything but
 * undefined resolves the call with that value instead. `capture(info)`
 * runs synchronously at the call site, before any await, and its return
 * arrives as `ctx.context` — ambient per-call state (e.g. a reactive
 * owner) survives to response time even though handling is async.
 */
export function configureServerFunctionsClient({
  endpoint,
  codec,
  prepareRequest,
  responseHandler,
  serializeArgs
} = {}) {
  if (endpoint !== undefined) config.endpoint = endpoint;
  if (codec !== undefined) configureServerFunctionsCodec(codec);
  if (prepareRequest !== undefined) config.prepareRequest = prepareRequest;
  if (responseHandler !== undefined) config.responseHandler = responseHandler;
  if (serializeArgs !== undefined) config.serializeArgs = serializeArgs;
}

let INSTANCE = 0;

// Fills the late-bound RPC seam (registry.js) with this transport's
// surface. Called from createServerReference/GET — the code compiled
// `'use server'` output invokes at module scope — NOT at this module's own
// scope: routers import codec-free helpers from the same built entry, and a
// top-level registration would be an unshakeable side effect pinning `GET`,
// `decodeResponse` and the codec behind them into every such bundle. Hung
// off the reference constructors, the whole transport (seroval included)
// tree-shakes away unless a reference actually exists — and when one does,
// the seam is filled before any integration code can hold it.
let rpcProvided = false;
function provideRPC() {
  if (rpcProvided) return;
  rpcProvided = true;
  provideServerFunctionRPC({ GET, decodeResponse });
}

async function createRequest(base, id, instance, options, meta) {
  const headers = {
    ...options.headers,
    [FUNCTION_HEADER]: id,
    [INSTANCE_HEADER]: instance
  };
  // Subscribing to flight data IS the single-flight opt-in: with a consumer
  // registered the transport asks the server for collection on every
  // mutation call; a consumer-less app never asks the server to do
  // collection work. GET-encoded calls are reads (cacheable URLs) and stay
  // plain — folding per-request flight data into them would defeat caching.
  if (getFlightDataConsumer() && (!options.method || options.method.toUpperCase() !== "GET")) {
    headers[SINGLE_FLIGHT_HEADER] = "true";
  }
  let init = {
    method: "POST",
    ...options,
    headers
  };
  // The session-dynamic transport hook runs last, over the final
  // RequestInit (transport headers included), so session policy can adjust
  // anything the transport is about to send.
  if (config.prepareRequest) {
    init = (await config.prepareRequest(init, { id, meta })) || init;
  }
  return fetch(base, init);
}

async function initializeResponse(base, id, instance, options, args, meta) {
  // No args, skip serialization
  if (args.length === 0) {
    return createRequest(base, id, instance, options, meta);
  }
  // A single argument with a natural HTTP encoding goes as-is
  if (args.length === 1) {
    const result = getHeadersAndBody(args[0]);
    if (result) {
      return createRequest(
        base,
        id,
        instance,
        {
          ...options,
          body: result.body,
          headers: {
            ...options.headers,
            ...result.headers
          }
        },
        meta
      );
    }
  }
  // JSON-safe argument lists go as plain JSON — no codec on the wire, and
  // (because nothing else here references the serializer) no serialize-half
  // of the codec in the bundle.
  if (isJSONSafe(args)) {
    return createRequest(
      base,
      id,
      instance,
      {
        ...options,
        body: JSON.stringify(args),
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
          [BODY_FORMAT_HEADER]: BodyFormat.Json
        }
      },
      meta
    );
  }
  // Bound calls ending in a natural HTTP encoding — `action.with(id)`
  // posting FormData/URLSearchParams — reuse the server-rendered form-post
  // convention: JSON-safe leading arguments ride the url's `?args` (the
  // handler prepends url arguments before natural-encoding bodies) and the
  // trailing argument IS the body. The same wire shape the no-JS fallback
  // produces, so bound form actions need no codec. `undefined` coerces to
  // null exactly as it does in a rendered action url (JSON has none).
  if (args.length > 1) {
    const trailing = getHeadersAndBody(args[args.length - 1]);
    const leading = args.slice(0, -1).map(arg => (arg === undefined ? null : arg));
    if (trailing && isJSONSafe(leading)) {
      const target =
        base +
        (base.includes("?") ? "&" : "?") +
        "args=" +
        encodeURIComponent(JSON.stringify(leading));
      return createRequest(
        target,
        id,
        instance,
        {
          ...options,
          body: trailing.body,
          headers: {
            ...options.headers,
            ...trailing.headers
          }
        },
        meta
      );
    }
  }
  // Everything else needs the codec, which is opt-in (enableRichArguments).
  return createRequest(
    base,
    id,
    instance,
    {
      ...options,
      body: await serializeArguments(args),
      headers: {
        ...options.headers,
        "Content-Type": "text/plain",
        [BODY_FORMAT_HEADER]: BodyFormat.Serialized
      }
    },
    meta
  );
}

// `args` is the wire encoding's argument list; `callArgs` is the call's REAL
// arguments for the handler's context. They differ for GET calls, whose
// arguments ride pre-encoded in the url (wire args empty) — a handler keying
// state by the call (function + arguments) must still see the real ones.
async function fetchServerFunction(base, id, options, args, meta, callArgs = args) {
  const instance = `server-function:${INSTANCE++}`;
  // Captured synchronously at the call site (an async function body runs
  // sync up to its first await), so ambient call context is still live.
  const handler = config.responseHandler;
  const context = handler && handler.capture ? handler.capture({ id, meta }) : undefined;

  const response = await initializeResponse(base, id, instance, options, args, meta);

  // The integration seam sees the response first: a handler that claims it
  // (returns non-undefined) owns the call's result.
  if (handler) {
    const handled = handler.handle(response, { id, meta, args: callArgs, context });
    if (handled !== undefined) return handled;
  }

  // Single-flight responses: with a registered consumer the transport owns
  // the unwrap — the standardized `{ value, data }` body is decoded, `data`
  // is delivered to the consumer (with the response as envelope context:
  // redirect location, revalidation keys, status), and `value` returns to
  // the caller as if the call were plain. Error semantics mirror the
  // passthrough path below: responses carrying integration metadata
  // (Location/X-Revalidate) are control flow for the consumer to interpret,
  // bare error-tagged ones throw the value.
  if (response.headers.has(SINGLE_FLIGHT_HEADER)) {
    const consumer = getFlightDataConsumer();
    if (consumer) {
      const payload = await decodeResponse(response);
      await consumer(payload.data, { response });
      if (
        response.headers.has(ERROR_HEADER) &&
        !response.headers.has("Location") &&
        !response.headers.has(REVALIDATE_HEADER)
      ) {
        throw payload.value;
      }
      return payload.value;
    }
  }

  // Responses the caller's integration needs to see whole (redirects,
  // revalidation, single-flight payloads without a registered consumer)
  // pass through untouched — the integration decodes the body itself with
  // `decodeResponse`.
  if (
    response.headers.has("Location") ||
    response.headers.has(REVALIDATE_HEADER) ||
    response.headers.has(SINGLE_FLIGHT_HEADER)
  ) {
    return response;
  }

  const result = await decodeResponse(response.clone());
  if (response.headers.has(ERROR_HEADER)) {
    throw result;
  }
  return result;
}

/**
 * Produces the client-side callable for a server function id. The returned
 * proxy exposes `id` (the build-stable function id) and `url` (direct HTTP
 * invocation — form actions, progressive enhancement) and carries the
 * declaration-metadata brand so `isServerFunction` recognizes it.
 *
 * Development output passes the function's source name as the trailing
 * argument; it seeds the metadata channel as a default — explicit
 * `withMeta`/`GET` writes shallow-merge over it like any other write.
 */
export function createServerReference(id, name, base) {
  provideRPC();
  const metadata = name === undefined ? {} : { name };
  // An explicit base targets that url verbatim — integrations reconstructing
  // a callable from a server-rendered action url (`?id=...&args=...`) keep
  // its bound arguments in the query string, where the server reads them
  // for natural-encoding bodies. Default calls derive from the configured
  // endpoint (lazily — it may be configured after module scope runs).
  const fn = (...args) => {
    // Local-answer seam, SYNCHRONOUS on purpose: an integration that already
    // holds this call's result (e.g. a document-SSR'd server-component
    // boundary at hydration time) answers without a promise — so async
    // consumers (dynamic under a hydrating Loading) never observe a pending
    // beat that would commit them to a fallback and discard SSR'd content.
    const handler = config.responseHandler;
    if (handler && handler.intercept) {
      const hit = handler.intercept({ id, meta: metadata, args });
      if (hit !== undefined) return hit;
    }
    return fetchServerFunction(base || config.endpoint, id, {}, args, metadata);
  };
  fn[SERVER_FUNCTION_METADATA] = metadata;

  return new Proxy(fn, {
    get(target, prop) {
      if (prop === "id") return id;
      if (prop === "url") {
        return base || `${config.endpoint}?id=${encodeURIComponent(id)}`;
      }
      return target[prop];
    }
  });
}

/**
 * Declares a server function callable over HTTP GET: calls to the returned
 * reference go out as GET requests with the arguments codec-encoded in the
 * query string — cacheable by HTTP infrastructure. The declaration is
 * recorded on the metadata channel (`getServerFunctionMetadata(fn).method
 * === "GET"`) for routers and integrations to read, and the server half
 * honors it: the declaration grants GET dispatch without revoking the
 * default POST transport, while GET requests to undeclared functions
 * answer 405.
 *
 * Wrap the reference at its declaration; the compiler round-trips the call
 * in both builds:
 *
 * ```ts
 * export const getUser = GET(async (id: string) => {
 *   "use server";
 *   return db.users.find(id);
 * });
 * ```
 */
export function GET(fn) {
  if (!isServerFunction(fn)) {
    throw new Error("GET expects a server function reference");
  }
  provideRPC();
  const id = fn.id;
  // the GET-transport callable inherits the source reference's declared
  // metadata (withMeta composes with GET in either order)
  const metadata = { ...getServerFunctionMetadata(fn) };
  const wrapped = async (...args) => {
    const handler = config.responseHandler;
    if (handler && handler.intercept) {
      const hit = handler.intercept({ id, meta: metadata, args });
      if (hit !== undefined) return hit;
    }
    let base = `${config.endpoint}?id=${encodeURIComponent(id)}`;
    if (args.length) {
      // The handler's GET path accepts both encodings: plain JSON and the
      // codec's framed string (distinguished by the `;0x` frame prefix).
      const encoded = isJSONSafe(args) ? JSON.stringify(args) : await serializeArguments(args);
      base += `&args=${encodeURIComponent(encoded)}`;
    }
    return fetchServerFunction(base, id, { method: "GET" }, [], metadata, args);
  };
  wrapped[SERVER_FUNCTION_METADATA] = metadata;
  wrapped.id = id;
  // lazy like the base proxy's: the endpoint may be configured after the
  // module-scope GET(...) call runs
  Object.defineProperty(wrapped, "url", {
    get: () => `${config.endpoint}?id=${encodeURIComponent(id)}`,
    configurable: true
  });
  // the declaration itself is a metadata write like any other
  return withMeta(wrapped, { method: "GET" });
}

// Only ever referenced by server-mode compiler output; present so a
// misconfigured build fails loudly instead of with a missing-export error.
export function registerServerReference() {
  throw new Error("registerServerReference must not be called in the client build");
}

// Client no-op mirror of the server entry's accessor: there is never a
// server function call in flight on the client, so this answers undefined.
// Present so `"use server"` modules that import it stay import-stable in
// client builds before dead-code elimination.
export function getServerFunctionInvocation() {
  return undefined;
}
