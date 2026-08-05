// Server half of the server function runtime ABI. Compiled server output
// calls `registerServerReference(id, fn)` for every server function
// (registering it for HTTP dispatch) and `createServerReference(ref)` where
// the function was referenced — during SSR the original function runs
// in-process under a per-call request event.
//
// The HTTP handler is web-standard (Request -> Response); platform adapters
// (h3, express, ...) and framework policies layer on through the exposed
// hooks. The line between them is the one the single-flight header already
// draws: core owns the wire shapes both peers must agree on — the flight
// envelope, the flash cookie, folding cookies for work re-run after a
// mutation — and never what they carry. Which data a mutation invalidates,
// and how an outcome reaches the UI, stay with the integration.
import { REVALIDATE_HEADER, isResponseEnvelope } from "../response.js";
import { RequestContext, getRequestEvent } from "../server.js";
import { encodeFlashCookie } from "./flash.js";
import {
  BODY_FORMAT_HEADER,
  BodyFormat,
  ERROR_HEADER,
  FUNCTION_HEADER,
  INSTANCE_HEADER,
  SERVER_FUNCTION_METADATA,
  SINGLE_FLIGHT_HEADER,
  configureServerFunctionsCodec,
  deserializeString,
  encodeErrorHeaderValue,
  extractBody,
  getHeadersAndBody,
  getServerFunctionsCodec,
  isServerFunction,
  serializeStream,
  withMeta
} from "./shared.js";

export {
  ERROR_HEADER,
  FLASH_COOKIE,
  FUNCTION_HEADER,
  INSTANCE_HEADER,
  SINGLE_FLIGHT_HEADER,
  clearFlashCookie,
  decodeErrorHeaderValue,
  decodeResponse,
  decodeResponsePayload,
  encodeErrorHeaderValue,
  getServerFunctionMetadata,
  hasFlashCookie,
  isServerFunction,
  subscribeFlightData,
  withMeta
} from "./shared.js";
export { decodeFlashCookie, encodeFlashCookie } from "./flash.js";

const config = {
  provideEvent: undefined,
  wrapInvocation: undefined,
  collectFlightData: undefined,
  transformResult: undefined,
  transformFlightResult: undefined,
  transformDirectResult: undefined,
  handleNoJS: undefined,
  endpoint: "/_server"
};

/**
 * Configures the server runtime: `provideEvent(event, fn)` establishes the
 * request-event scope for a call (e.g. @solidjs/web/storage's
 * provideRequestEvent), `wrapInvocation(run, context)` wraps every server
 * function execution — HTTP dispatch and direct SSR calls alike — with the
 * invocation identity established (see `handleServerFunctionRequest`),
 * `collectFlightData` is the single-flight hook (see
 * `handleServerFunctionRequest`), `transformResult` is the server-wide
 * default for the handler's result transform (per-request options override;
 * this is how frames installs `frameTransformResult` once for generic
 * dispatchers), `transformFlightResult` is the same seam for the single-flight
 * payload (frames installs `frameTransformFlightResult` to carry invalidated
 * markup), `transformDirectResult` is `transformResult`'s in-process mirror
 * for direct SSR calls, `endpoint` is where the handler is mounted (used for
 * the `url` of SSR'd references, e.g. form actions — must match the
 * client's), and `codec` must match the client's (stored in the shared
 * layer).
 */
export function configureServerFunctionsServer({
  provideEvent,
  wrapInvocation,
  collectFlightData,
  transformResult,
  transformFlightResult,
  transformDirectResult,
  handleNoJS,
  endpoint,
  codec
} = {}) {
  if (provideEvent !== undefined) config.provideEvent = provideEvent;
  if (wrapInvocation !== undefined) config.wrapInvocation = wrapInvocation;
  if (collectFlightData !== undefined) config.collectFlightData = collectFlightData;
  if (transformResult !== undefined) config.transformResult = transformResult;
  if (transformFlightResult !== undefined) config.transformFlightResult = transformFlightResult;
  if (transformDirectResult !== undefined) config.transformDirectResult = transformDirectResult;
  if (handleNoJS !== undefined) config.handleNoJS = handleNoJS;
  if (endpoint !== undefined) config.endpoint = endpoint;
  if (codec !== undefined) configureServerFunctionsCodec(codec);
}

function provideEvent(event, fn) {
  if (config.provideEvent) return config.provideEvent(event, fn);
  // Fall back to the AsyncLocalStorage instance provideRequestEvent parks on
  // the global — present whenever a request scope has been established.
  const ctx = globalThis[RequestContext];
  if (ctx) return ctx.run(event, fn);
  throw new Error(
    "No request event provider. Configure one with configureServerFunctionsServer({ provideEvent })."
  );
}

const REGISTRATIONS = new Map();
// Declared-method bookkeeping keyed by function id (internal, not public
// API): the server half of `GET` records entries here so the HTTP handler
// can gate GET dispatch — a GET request to a function that never declared
// it answers 405. Declaring GET grants GET without revoking POST.
const METHODS = new Map();
// In-flight invocation state, keyed by the request event the call runs
// under — the derived event a direct SSR call creates, or the handler's own
// event for HTTP dispatch. Deliberately NOT `event.locals`: locals is
// user/integration space, and derived events shallow-copy the event while
// SHARING locals, so a locals write from a nested or concurrent call would
// leak into (and overwrite) the outer scope's state.
const INVOCATIONS = new WeakMap();

export function registerServerFunction(id, callback) {
  REGISTRATIONS.set(id, callback);
  return callback;
}

export function getServerFunction(id) {
  const fn = REGISTRATIONS.get(id);
  if (fn) {
    return fn;
  }
  throw new Error("invalid server function: " + id);
}

/**
 * Registers a compiled server function under its id. Development output
 * passes the function's source name as the trailing argument; it rides the
 * reference into `createServerReference`, which seeds the metadata channel
 * with it.
 */
export function registerServerReference(id, fn, name) {
  registerServerFunction(id, fn);
  return { id, fn, name };
}

/**
 * Produces the server-side callable for a reference: calling it during SSR
 * runs the original function in-process, under a request event derived from
 * the current one (marked server-only, carrying the function's meta).
 */
export function createServerReference({ id, fn, name }) {
  if (typeof fn !== "function")
    throw new Error("Export from a 'use server' module must be a function");

  // the metadata lives in a closure (not on the user's function) so
  // registering the raw implementation never mutates it. The compiler's
  // dev-only source name seeds it as a default — explicit `withMeta`/`GET`
  // writes shallow-merge over it like any other write.
  const metadata = name === undefined ? {} : { name };
  return new Proxy(fn, {
    get(target, prop) {
      if (prop === "id") return id;
      if (prop === "url") {
        return `${config.endpoint}?id=${encodeURIComponent(id)}`;
      }
      if (prop === SERVER_FUNCTION_METADATA) return metadata;
      return target[prop];
    },
    apply(target, thisArg, args) {
      const ogEvt = getRequestEvent();
      if (!ogEvt) throw new Error("Cannot call server function outside of a request");
      const evt = { ...ogEvt };
      // Keyed on the derived event (locals is shared with the outer event —
      // see INVOCATIONS): the invocation is visible exactly within this
      // call's provideEvent scope and evaporates with the derived event.
      INVOCATIONS.set(evt, { id });
      evt.serverOnly = true;
      const result = provideEvent(evt, () => {
        const run = () => fn.apply(thisArg, args);
        // Per-invocation wrap (see configureServerFunctionsServer): direct
        // SSR calls run through the same policy as HTTP dispatch, so
        // per-function middleware built on it can't be bypassed by calling
        // the function during a render. The wrapper must return run()'s
        // value (this path stays synchronous for synchronous functions).
        return config.wrapInvocation
          ? config.wrapInvocation(run, { id, args, event: evt, direct: true })
          : run();
      });
      // In-process mirror of the handler's transformResult: direct SSR calls
      // pass their settled value through the configured policy (e.g. frames
      // wrapping a function result as an inline-renderable server component).
      // `args` rides along so a policy can derive the call's wire address
      // (`frameAddress`) — the same one the client derives for the same call.
      const transform = config.transformDirectResult;
      if (transform && result && typeof result.then === "function") {
        return result.then(value => transform(value, { id, args, event: evt }));
      }
      return transform ? transform(result, { id, args, event: evt }) : result;
    }
  });
}

/**
 * Declares a server function callable over HTTP GET. The server half is
 * identity-flavored — SSR calls stay in-process — but it brands the
 * declaration on the reference's metadata channel
 * (`getServerFunctionMetadata(fn).method === "GET"`) and records the
 * declared method for the function's id so `handleServerFunctionRequest`
 * honors it: GET-declared functions accept GET requests in addition to the
 * default POST transport (declaring GET grants, it does not revoke);
 * functions that never declared GET answer GET requests with 405.
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
  if (!isServerFunction(fn) || typeof fn.id !== "string") {
    throw new Error("GET expects a server function reference");
  }
  METHODS.set(fn.id, "GET");
  // the declaration itself is a metadata write like any other
  return withMeta(fn, { method: "GET" });
}

/**
 * Reads the in-flight server function invocation off the current request
 * event. Distinct from `getServerFunctionMetadata(fn)`, which reads a
 * reference's static declaration metadata — this describes the call
 * currently executing.
 */
export function getServerFunctionInvocation() {
  return getEventServerFunctionInvocation(getRequestEvent());
}

/**
 * The event-keyed half of `getServerFunctionInvocation`, for callers handed
 * an event outside its provideEvent scope (the handler's result transforms
 * run after the scope has exited). Integration plumbing — application code
 * reads the ambient accessor instead.
 * @internal
 */
export function getEventServerFunctionInvocation(event) {
  return event && INVOCATIONS.get(event);
}

function resolveFunctionId(request, url) {
  const reference = request.headers.get(FUNCTION_HEADER);
  if (reference) {
    return reference.split("#")[0];
  }
  return url.searchParams.get("id");
}

async function parseArguments(request, url, instance, codec) {
  const parsed = [];
  // Bound arguments arrive on the url for GET calls, no-JS form posts, and
  // instance-carrying POSTs whose body is a natural HTTP encoding (FormData,
  // urlencoded) — e.g. a router intercepting a form whose action url was
  // rendered by the server. Codec-serialized bodies are the exception:
  // client stubs with bound arguments serialize the full argument array in
  // the body and never put arguments in the url.
  const bodyFormat = request.method === "POST" ? request.headers.get(BODY_FORMAT_HEADER) : null;
  if (!instance || request.method === "GET" || bodyFormat !== BodyFormat.Serialized) {
    const args = url.searchParams.get("args");
    if (args) {
      // framed codec output (from the client runtime) or plain JSON (from
      // integrations building no-JS urls by hand)
      const result = args.startsWith(";0x")
        ? await deserializeString(args, codec)
        : JSON.parse(args);
      for (const arg of result) {
        parsed.push(arg);
      }
    }
  }
  if (request.method === "POST" && request.body !== null) {
    const decoded = await extractBody(request.clone(), codec);
    // Both argument-array encodings: codec-framed and plain JSON.
    if (bodyFormat === BodyFormat.Serialized || bodyFormat === BodyFormat.Json) {
      return decoded;
    }
    parsed.push(decoded);
  }
  return parsed;
}

/**
 * Runs the single-flight hook and standardizes its contribution: when the
 * hook returns data, the body becomes the `{ value, data }` payload and the
 * response is tagged with the single-flight header; when it returns
 * undefined the response is byte-identical to a call without the hook.
 * Data production is the hook's black box — core never sees how the
 * integration computed it, but the generic halves of the protocol are
 * pre-digested onto the outcome (see `digestOutcome`) so integrations only
 * supply the data strategy. A raw body-carrying `Response` value is the
 * caller's verbatim payload — there is no envelope to fold data into, so
 * the hook never runs for one.
 */
async function foldFlightData(hook, event, headers, outcome, context = {}) {
  if (outcome.value instanceof Response && outcome.value.body) return outcome.value;
  digestOutcome(event, outcome);
  const data = await hook(event, outcome);
  if (data === undefined) return outcome.value;
  headers.set(SINGLE_FLIGHT_HEADER, "true");
  // A payload can be partly markup — an invalidated region the integration
  // answered with a server component. That needs a body only the frame
  // policy knows how to build, so it gets first refusal on the fold;
  // declining (or not being installed) keeps the serialized envelope.
  if (context.transformFlightResult) {
    const transformed = await context.transformFlightResult(
      event,
      { value: outcome.value, data },
      context
    );
    if (transformed !== undefined) {
      // Headers accumulated during the call (the mutation's cookies, an
      // envelope's metadata) belong on whatever body carries the outcome.
      for (const cookie of headers.getSetCookie()) transformed.headers.append("Set-Cookie", cookie);
      headers.forEach((value, key) => {
        if (key !== "set-cookie" && !transformed.headers.has(key)) {
          transformed.headers.set(key, value);
        }
      });
      return transformed;
    }
  }
  return { value: outcome.value, data };
}

// The generic halves of flight-data collection, computed by core so every
// integration doesn't re-derive them from raw headers:
// - `revalidateKeys`: the outcome's `X-Revalidate` keys, split.
// - `foldedHeaders`: the request headers with the mutation's cookie effects
//   applied — the event response's `Set-Cookie`s (set during the call),
//   then the outcome's own (e.g. `redirect(to, { headers })`, which never
//   reach the event response but a browser round trip would have sent
//   back), later winning on conflict. Re-run reads observe post-mutation
//   cookie state, deletions included.
// - `targetUrl`: the URL the client will show after the mutation — the
//   redirect `Location` when the outcome carries one (resolved against the
//   request URL, as a browser would), the referring page otherwise.
//   Undefined without a usable referer (a non-browser caller has no page to
//   produce data for) and for redirects leaving the app's origin.
function digestOutcome(event, outcome) {
  const { request, response } = outcome;
  outcome.revalidateKeys = response?.headers.get(REVALIDATE_HEADER)?.split(",");
  outcome.foldedHeaders = foldSetCookies(request.headers, [
    ...(event.response?.headers?.getSetCookie() ?? []),
    ...(response?.headers?.getSetCookie() ?? [])
  ]);
  try {
    const referrer = request.headers.get("referer");
    if (referrer) {
      const location = response?.headers.get("Location");
      const target = location ? new URL(location, request.url) : new URL(referrer);
      if (target.origin === new URL(request.url).origin) outcome.targetUrl = target.toString();
    }
  } catch {
    // unparseable referer — same as no referer
  }
}

function parseSetCookie(setCookie) {
  const [pair, ...attributes] = setCookie.split(";");
  const eq = pair.indexOf("=");
  if (eq < 0) return undefined;
  const parsed = { name: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim() };
  for (const attribute of attributes) {
    const attrEq = attribute.indexOf("=");
    const key = (attrEq < 0 ? attribute : attribute.slice(0, attrEq)).trim().toLowerCase();
    const value = attrEq < 0 ? "" : attribute.slice(attrEq + 1).trim();
    if (key === "max-age") parsed.maxAge = Number(value);
    else if (key === "expires") parsed.expires = new Date(value);
  }
  return parsed;
}

/**
 * Request headers with a set of `Set-Cookie` values folded into the
 * `Cookie` header, as the browser would have applied them before its next
 * request. Later entries win on conflict, and deletions are honored
 * (`Max-Age` at or below zero, `Expires` in the past).
 *
 * Work re-run on the server after a mutation — collecting single-flight
 * data, for instance — starts from the request that triggered the mutation,
 * whose cookies are by definition pre-mutation. Reads that depend on a
 * session the mutation just established would otherwise see the old state.
 * Which responses contribute (the request event's, the outcome's, both) is
 * the caller's decision.
 */
export function foldSetCookies(headers, setCookies) {
  const folded = new Headers(headers);
  if (!setCookies.length) return folded;

  const cookies = {};
  for (const pair of folded.get("cookie")?.split(";") ?? []) {
    const eq = pair.indexOf("=");
    if (eq > -1) cookies[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  for (const setCookie of setCookies) {
    const parsed = parseSetCookie(setCookie);
    if (!parsed) continue;
    if (
      (parsed.maxAge != null && parsed.maxAge <= 0) ||
      (parsed.expires != null && parsed.expires.getTime() <= Date.now())
    ) {
      delete cookies[parsed.name];
    } else {
      cookies[parsed.name] = parsed.value;
    }
  }
  folded.delete("cookie");
  const serialized = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  if (serialized) folded.set("cookie", serialized);
  return folded;
}

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages
const validRedirectStatuses = new Set([301, 302, 303, 307, 308]);

/**
 * Builds the `handleNoJS` implementation for the no-JS form convention: a
 * form posted without the client runtime redirects back to the referring
 * page (or to the result's own `Location`) with the outcome riding a
 * one-shot flash cookie, for the render that follows to pick up.
 *
 * `base` is the app's mount path, used to resolve a relative `Location`.
 * The handler is unconditional — every call it receives redirects — so
 * wiring it explicitly opts every non-scripted call into the convention,
 * including direct HTTP ones.
 */
export function createNoJSHandler({ base = "" } = {}) {
  return function handleNoJS(result, request, args, thrown) {
    const url = new URL(request.url);
    // an unusable referer (no-referrer policy, garbage) still beats leaving
    // the browser sitting on the server function endpoint
    let back = new URL(base || "/", url.origin).toString();
    try {
      const referer = request.headers.get("referer");
      if (referer) back = new URL(referer).toString();
    } catch {}
    // form post -> GET: 303 See Other unless the result names a redirect status
    let status = 303;
    let headers;
    if (result instanceof Response) {
      headers = new Headers(result.headers);
      if (result.headers.has("Location")) {
        headers.set(
          "Location",
          new URL(result.headers.get("Location"), url.origin + base).toString()
        );
        if (validRedirectStatuses.has(result.status)) status = result.status;
      } else {
        headers.set("Location", back);
      }
      // any body is dropped from the redirect we build — don't advertise it
      headers.delete("Content-Type");
      headers.delete("Content-Length");
    } else {
      headers = new Headers({ Location: back });
    }
    // Responses carry their meaning in their metadata; anything else flashes
    // the outcome for the next render to read.
    if (result && !(result instanceof Response)) {
      headers.append(
        "Set-Cookie",
        encodeFlashCookie(url.pathname + url.search, result, args, thrown)
      );
    }
    return new Response(null, { status, headers });
  };
}

let defaultNoJSHandler;

/**
 * Whether a request is a browser form post — the case the redirect
 * convention exists for. A real form sets its own content type and carries
 * no `BODY_FORMAT_HEADER`, which only the client runtime sends. Direct HTTP
 * callers (curl, a fetch from a script) fall outside it and keep the plain
 * response: redirecting them would be nonsense.
 */
function isFormPost(request) {
  if (request.method !== "POST" || request.headers.has(BODY_FORMAT_HEADER)) return false;
  const type = request.headers.get("content-type") || "";
  return (
    type.startsWith("application/x-www-form-urlencoded") || type.startsWith("multipart/form-data")
  );
}

function serializedResponse(value, headers, codec) {
  headers.set(BODY_FORMAT_HEADER, BodyFormat.Serialized);
  headers.set("Content-Type", "text/plain");
  return new Response(serializeStream(value, codec), { headers });
}

function encodeResult(value, headers, status, codec) {
  const direct = getHeadersAndBody(value);
  if (direct) {
    for (const [key, val] of Object.entries(direct.headers || {})) {
      headers.set(key, val);
    }
    return new Response(direct.body, { status, headers });
  }
  const response = serializedResponse(value, headers, codec);
  return status === 200 ? response : new Response(response.body, { status, headers });
}

/**
 * Web-standard HTTP handler for server function calls. Mount it on the
 * endpoint the client transport targets (default `/_server`).
 *
 * Options:
 * - `createEvent(request)`: builds the request event (default: bare
 *   `{ request, locals: {} }`). Integrations supply their richer event.
 * - `provideEvent(event, fn)`: overrides the configured provider per call.
 * - `wrapInvocation(run, context)`: wraps the function execution itself —
 *   the per-invocation seam for framework policies (per-function
 *   middleware, auth, logging, error mapping). Called inside the event
 *   scope with the invocation identity already established
 *   (`getServerFunctionInvocation()` answers before, during and after
 *   `run()`); the context carries `{ id, args, event, request, direct }`.
 *   Must return (or resolve to) `run()`'s result — replacing it replaces
 *   the function's result. The configured hook (see
 *   `configureServerFunctionsServer`) also wraps direct SSR calls, where
 *   `context.direct` is `true` and `request` is absent.
 * - `transformResult(event, result, context)`: observes/replaces the result
 *   before encoding — the extension point for response metadata policies.
 *   The context carries the call's identity (`id`, parsed `args`) alongside
 *   the transport fields, matching `transformDirectResult`'s. Return a
 *   `ResponseEnvelope` (from ../response.js) to send HTTP metadata +
 *   payload.
 * - `collectFlightData(event, outcome)`: overrides the configured
 *   single-flight hook for this handler. Runs after `transformResult`,
 *   for scripted calls that sent the single-flight request header, on
 *   returned results and thrown Response/envelope signals alike (plain
 *   thrown errors never collect). The outcome carries the unwrapped
 *   `value`, the HTTP-metadata `response` (redirect location, revalidation
 *   keys), the `request`, the function `id`, and `thrown`. Whatever data
 *   payload it returns (undefined for none) is folded into the body as
 *   `{ value, data }` under the single-flight response header — the
 *   handler owns the enveloping, the hook owns the data.
 * - `transformFlightResult(event, outcome, context)`: overrides the
 *   configured single-flight fold policy for this handler. When the flight
 *   payload needs a body only a policy knows how to build (frames — an
 *   invalidated entry is markup), it gets first refusal on the
 *   `{ value, data }` outcome; returning a Response carries the outcome
 *   (call headers and cookies copied on), returning undefined keeps the
 *   plain serialized envelope.
 * - `handleNoJS(result, request, args)`: response for calls made without
 *   the client runtime (no instance header) — the override for the no-JS
 *   form convention. Falls back to the configured hook, then to
 *   `createNoJSHandler()` for browser form posts (redirect back with the
 *   outcome in a flash cookie); other no-instance callers, such as direct
 *   HTTP requests, get the normal serialized response.
 * - `codec`: overrides the configured codec options for this handler.
 */
export async function handleServerFunctionRequest(request, options = {}) {
  const codec = options.codec !== undefined ? options.codec : getServerFunctionsCodec();
  const url = new URL(request.url);
  const instance = request.headers.get(INSTANCE_HEADER);
  const functionId = resolveFunctionId(request, url);

  if (!functionId) {
    return new Response(
      process.env.NODE_ENV === "development" ? "Server function not found" : null,
      { status: 404 }
    );
  }

  let serverFunction;
  try {
    serverFunction = getServerFunction(functionId);
  } catch {
    return new Response(
      process.env.NODE_ENV === "development" ? `Unknown server function: ${functionId}` : null,
      { status: 404 }
    );
  }

  // method enforcement: GET requests only dispatch to functions that
  // declared GET (the server half of `GET` records them) — no crafted GET
  // URLs against functions that never opted in. Declaring GET grants GET
  // without revoking POST: the same function stays callable over the
  // default transport (e.g. a query()-wrapped function also called
  // directly).
  if (request.method === "GET" && METHODS.get(functionId) !== "GET") {
    return new Response(
      process.env.NODE_ENV === "development"
        ? `Method not allowed for server function: ${functionId}`
        : null,
      { status: 405, headers: { Allow: "POST" } }
    );
  }

  const event = options.createEvent ? options.createEvent(request) : { request, locals: {} };
  const provide = options.provideEvent || provideEvent;
  const flightHook =
    options.collectFlightData !== undefined ? options.collectFlightData : config.collectFlightData;
  // Same fallback pattern: a generic dispatcher calling
  // handleServerFunctionRequest(request) with no options still gets the
  // configured transform (frames installs itself here once, server-wide).
  const transformResult =
    options.transformResult !== undefined ? options.transformResult : config.transformResult;
  const wrapInvocation =
    options.wrapInvocation !== undefined ? options.wrapInvocation : config.wrapInvocation;
  const transformFlightResult =
    options.transformFlightResult !== undefined
      ? options.transformFlightResult
      : config.transformFlightResult;
  // Same fallback, then the built-in convention: an unconfigured app still
  // gets working progressive enhancement for real form posts, while direct
  // HTTP calls keep the plain response.
  const handleNoJS =
    options.handleNoJS !== undefined
      ? options.handleNoJS
      : config.handleNoJS !== undefined
        ? config.handleNoJS
        : isFormPost(request)
          ? defaultNoJSHandler || (defaultNoJSHandler = createNoJSHandler())
          : undefined;
  // single-flight is scripted-client opt-in: the caller sends the request
  // header, the server must have a hook to produce the data
  const collectsFlight = !!(flightHook && instance && request.headers.has(SINGLE_FLIGHT_HEADER));

  const parsed = await parseArguments(request, url, instance, codec);

  // What the fold needs to build a body itself, and what a result transform
  // needs to know to leave one for it. The call's identity (`id`, parsed
  // `args`) rides along, mirroring `transformDirectResult`'s context — a
  // policy keying state by the call (deriving a wire address, capturing a
  // prerender artifact) sees the same shape over either dispatch path.
  const flightContext = {
    id: functionId,
    args: parsed,
    instance,
    request,
    collectsFlight,
    codec,
    transformFlightResult
  };

  const headers = new Headers();
  try {
    let result = await provide(event, async () => {
      // Identity is established BEFORE the wrapper runs, so
      // getServerFunctionInvocation() answers throughout the wrap — code
      // ahead of run() (auth, logging) included.
      INVOCATIONS.set(event, { id: functionId });
      const run = () => serverFunction(...parsed);
      return wrapInvocation
        ? wrapInvocation(run, { id: functionId, args: parsed, event, request, direct: false })
        : run();
    });

    if (transformResult) {
      result = await transformResult(event, result, flightContext);
    }

    let status = 200;
    let metadata;
    // envelope (from `respond()` or transformResult): HTTP metadata + value
    if (isResponseEnvelope(result)) {
      const { response, value } = result;
      // consumers without the client runtime get the carried response
      // whole — e.g. respond()'s real JSON body (invisible PE)
      if (!instance && !handleNoJS && response && response.body) {
        return response;
      }
      if (response && response.headers) {
        response.headers.forEach((val, key) => headers.append(key, val));
      }
      if (response && response.status && (response.status < 300 || response.status >= 400)) {
        status = response.status;
      }
      metadata = response;
      result = value;
    } else if (result instanceof Response) {
      // raw responses pass through untouched
      if (result.headers && result.headers.has("X-Content-Raw")) return result;
      if (instance) {
        // forward headers
        if (result.headers) {
          result.headers.forEach((value, key) => headers.append(key, value));
        }
        // forward non-redirect statuses (redirect handling is the client
        // integration's job — the fetch call must not follow it)
        if (result.status && (result.status < 300 || result.status >= 400)) {
          status = result.status;
        }
        metadata = result;
        if (result.body == null) {
          result = null;
        }
      }
    }

    if (collectsFlight) {
      result = await foldFlightData(
        flightHook,
        event,
        headers,
        {
          id: functionId,
          value: result,
          response: metadata,
          request,
          thrown: false
        },
        flightContext
      );
      // The fold built the body itself (markup in the payload) — it already
      // carries the accumulated headers.
      if (result instanceof Response && result.headers.has("X-Content-Raw")) return result;
    }

    // calls made without the client runtime (no-JS form posts)
    if (!instance) {
      if (handleNoJS) return handleNoJS(result, request, parsed);
      if (result instanceof Response) return result;
      return encodeResult(result, headers, 200, codec);
    }

    return encodeResult(result, headers, status, codec);
  } catch (x) {
    if (x instanceof Response || isResponseEnvelope(x)) {
      if (transformResult) {
        x = await transformResult(event, x, { ...flightContext, thrown: true });
      }
      let status = 200;
      let metadata;
      if (isResponseEnvelope(x)) {
        const { response, value } = x;
        if (response && response.headers) {
          response.headers.forEach((val, key) => headers.append(key, val));
        }
        if (
          response &&
          response.status &&
          (!instance || response.status < 300 || response.status >= 400)
        ) {
          status = response.status;
        }
        metadata = response;
        x = value;
      } else if (x instanceof Response) {
        if (x.headers) {
          x.headers.forEach((value, key) => headers.append(key, value));
        }
        if (x.status && (!instance || x.status < 300 || x.status >= 400)) {
          status = x.status;
        }
        metadata = x;
        if (x.body == null) {
          x = null;
        }
      }

      // thrown control-flow signals collect too — a thrown redirect carries
      // flight data for the destination route
      if (collectsFlight) {
        x = await foldFlightData(
          flightHook,
          event,
          headers,
          {
            id: functionId,
            value: x,
            response: metadata,
            request,
            thrown: true
          },
          flightContext
        );
        // A thrown redirect is the common single-flight mutation shape, so
        // this is the path that carries markup for the destination — it still
        // has to be flagged as thrown for the client to re-throw it.
        if (x instanceof Response && x.headers.has("X-Content-Raw")) {
          x.headers.set(ERROR_HEADER, "true");
          return x;
        }
      }

      headers.set(ERROR_HEADER, "true");
      if (!instance) {
        // `x` was nulled when the thrown Response had no body, but the no-JS
        // handler reads redirect metadata off the result — hand it the
        // original Response, matching what the returned path passes.
        if (handleNoJS) return handleNoJS(x ?? metadata, request, parsed, true);
        if (x instanceof Response) return x;
      }
      return encodeResult(x, headers, status, codec);
    }

    if (!instance) {
      if (handleNoJS) return handleNoJS(x, request, parsed, true);
      const message = x instanceof Error ? x.message : String(x);
      return new Response(process.env.NODE_ENV === "development" ? message : null, { status: 500 });
    }

    const error = x instanceof Error ? x.message : typeof x === "string" ? x : "true";
    // header values are latin1 ByteStrings — Headers.set throws on anything
    // above U+00FF, so non-latin1 messages ride percent-encoded (the client
    // decodes symmetrically; the structured error still travels in the body)
    headers.set(ERROR_HEADER, encodeErrorHeaderValue(error));
    return encodeResult(x, headers, 200, codec);
  }
}
