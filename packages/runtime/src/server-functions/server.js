// Server half of the server function runtime ABI. Compiled server output
// calls `registerServerReference(id, fn)` for every server function
// (registering it for HTTP dispatch) and `createServerReference(ref)` where
// the function was referenced — during SSR the original function runs
// in-process under a per-call request event.
//
// The HTTP handler is web-standard (Request -> Response); platform adapters
// (h3, express, ...) and framework policies (single-flight collection,
// no-JS form conventions) layer on through the exposed hooks.
import { isResponseEnvelope } from "../response.js";
import { RequestContext, getRequestEvent } from "../server.js";
import {
  BODY_FORMAT_HEADER,
  BodyFormat,
  FUNCTION_HEADER,
  INSTANCE_HEADER,
  SERVER_FUNCTION_METADATA,
  SINGLE_FLIGHT_HEADER,
  configureServerFunctionsCodec,
  deserializeString,
  extractBody,
  getHeadersAndBody,
  getServerFunctionsCodec,
  isServerFunction,
  serializeStream,
  withMeta
} from "./shared.js";

export {
  FUNCTION_HEADER,
  INSTANCE_HEADER,
  SINGLE_FLIGHT_HEADER,
  decodeResponse,
  getServerFunctionMetadata,
  isServerFunction,
  subscribeFlightData,
  withMeta
} from "./shared.js";

const config = {
  provideEvent: undefined,
  collectFlightData: undefined,
  endpoint: "/_server"
};

/**
 * Configures the server runtime: `provideEvent(event, fn)` establishes the
 * request-event scope for a call (e.g. @solidjs/web/storage's
 * provideRequestEvent), `collectFlightData` is the single-flight hook (see
 * `handleServerFunctionRequest`), `endpoint` is where the handler is mounted
 * (used for the `url` of SSR'd references, e.g. form actions — must match
 * the client's), and `codec` must match the client's (stored in the shared
 * layer).
 */
export function configureServerFunctionsServer({
  provideEvent,
  collectFlightData,
  endpoint,
  codec
} = {}) {
  if (provideEvent !== undefined) config.provideEvent = provideEvent;
  if (collectFlightData !== undefined) config.collectFlightData = collectFlightData;
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
// can enforce the declaration — 405 for a POST to a GET-declared function,
// and for a GET to one that never declared it.
const METHODS = new Map();

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

/** Registers a compiled server function under its id. */
export function registerServerReference(id, fn) {
  registerServerFunction(id, fn);
  return { id, fn };
}

/**
 * Produces the server-side callable for a reference: calling it during SSR
 * runs the original function in-process, under a request event derived from
 * the current one (marked server-only, carrying the function's meta).
 */
export function createServerReference({ id, fn }) {
  if (typeof fn !== "function")
    throw new Error("Export from a 'use server' module must be a function");

  // the metadata lives in a closure (not on the user's function) so
  // registering the raw implementation never mutates it
  const metadata = {};
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
      evt.locals.serverFunctionMeta = { id };
      evt.serverOnly = true;
      return provideEvent(evt, () => {
        return fn.apply(thisArg, args);
      });
    }
  });
}

/**
 * Declares a server function callable over HTTP GET. The server half is
 * identity-flavored — SSR calls stay in-process — but it brands the
 * declaration on the reference's metadata channel
 * (`getServerFunctionMetadata(fn).method === "GET"`) and records the
 * declared method for the function's id so `handleServerFunctionRequest`
 * enforces it: GET-declared functions accept GET requests (and only GET),
 * everything else answers 405.
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

/** Reads the calling server function's meta off the current request event. */
export function getServerFunctionMeta() {
  const event = getRequestEvent();
  return event && event.locals.serverFunctionMeta;
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
  // bound arguments arrive on the url for GET calls and no-JS form posts
  if (!instance || request.method === "GET") {
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
    const format = request.headers.get(BODY_FORMAT_HEADER);
    const decoded = await extractBody(request.clone(), codec);
    if (format === BodyFormat.Serialized) {
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
 * integration computed it.
 */
async function foldFlightData(hook, event, headers, outcome) {
  const data = await hook(event, outcome);
  if (data === undefined) return outcome.value;
  headers.set(SINGLE_FLIGHT_HEADER, "true");
  return { value: outcome.value, data };
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
 * - `transformResult(event, result, context)`: observes/replaces the result
 *   before encoding — the extension point for response metadata policies.
 *   Return a `ResponseEnvelope` (from ../response.js) to send HTTP
 *   metadata + payload.
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
 * - `handleNoJS(result, request, args)`: response for calls made without
 *   the client runtime (no instance header) — the extension point for
 *   no-JS form conventions. Defaults to the normal serialized response.
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

  // method enforcement: GET-declared functions (the server half of `GET`
  // records them) accept only GET; undeclared functions never accept GET
  const allowedMethod = METHODS.get(functionId) || "POST";
  if ((request.method === "GET") !== (allowedMethod === "GET")) {
    return new Response(
      process.env.NODE_ENV === "development"
        ? `Method not allowed for server function: ${functionId}`
        : null,
      { status: 405, headers: { Allow: allowedMethod } }
    );
  }

  const event = options.createEvent ? options.createEvent(request) : { request, locals: {} };
  const provide = options.provideEvent || provideEvent;
  const flightHook =
    options.collectFlightData !== undefined ? options.collectFlightData : config.collectFlightData;
  // single-flight is scripted-client opt-in: the caller sends the request
  // header, the server must have a hook to produce the data
  const collectsFlight = !!(flightHook && instance && request.headers.has(SINGLE_FLIGHT_HEADER));

  const parsed = await parseArguments(request, url, instance, codec);

  const headers = new Headers();
  try {
    let result = await provide(event, async () => {
      event.locals.serverFunctionMeta = { id: functionId };
      return serverFunction(...parsed);
    });

    if (options.transformResult) {
      result = await options.transformResult(event, result, { instance, request });
    }

    let status = 200;
    let metadata;
    // envelope (from `respond()` or transformResult): HTTP metadata + value
    if (isResponseEnvelope(result)) {
      const { response, value } = result;
      // consumers without the client runtime get the carried response
      // whole — e.g. respond()'s real JSON body (invisible PE)
      if (!instance && !options.handleNoJS && response && response.body) {
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
      result = await foldFlightData(flightHook, event, headers, {
        id: functionId,
        value: result,
        response: metadata,
        request,
        thrown: false
      });
    }

    // calls made without the client runtime (no-JS form posts)
    if (!instance) {
      if (options.handleNoJS) return options.handleNoJS(result, request, parsed);
      if (result instanceof Response) return result;
      return encodeResult(result, headers, 200, codec);
    }

    return encodeResult(result, headers, status, codec);
  } catch (x) {
    if (x instanceof Response || isResponseEnvelope(x)) {
      if (options.transformResult) {
        x = await options.transformResult(event, x, { instance, request, thrown: true });
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
        x = await foldFlightData(flightHook, event, headers, {
          id: functionId,
          value: x,
          response: metadata,
          request,
          thrown: true
        });
      }

      headers.set("X-Server-Function-Error", "true");
      if (!instance) {
        if (options.handleNoJS) return options.handleNoJS(x, request, parsed, true);
        if (x instanceof Response) return x;
      }
      return encodeResult(x, headers, status, codec);
    }

    if (!instance) {
      if (options.handleNoJS) return options.handleNoJS(x, request, parsed, true);
      const message = x instanceof Error ? x.message : String(x);
      return new Response(process.env.NODE_ENV === "development" ? message : null, { status: 500 });
    }

    const error = x instanceof Error ? x.message : typeof x === "string" ? x : "true";
    headers.set("X-Server-Function-Error", error.replace(/[\r\n]+/g, ""));
    return encodeResult(x, headers, 200, codec);
  }
}
