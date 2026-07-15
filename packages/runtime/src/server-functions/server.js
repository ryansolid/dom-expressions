// Server half of the server function runtime ABI. Compiled server output
// calls `createServerReference(id, fn)` for every server function
// (registering it for HTTP dispatch) and `cloneServerReference(ref)` where
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
  configureServerFunctionsCodec,
  deserializeString,
  extractBody,
  getHeadersAndBody,
  getServerFunctionsCodec,
  serializeStream
} from "./shared.js";

export { FUNCTION_HEADER, INSTANCE_HEADER, decodeResponse } from "./shared.js";

const config = {
  provideEvent: undefined
};

/**
 * Configures the server runtime: `provideEvent(event, fn)` establishes the
 * request-event scope for a call (e.g. @solidjs/web/storage's
 * provideRequestEvent) and `codec` must match the client's (stored in the
 * shared layer).
 */
export function configureServerFunctionsServer({ provideEvent, codec } = {}) {
  if (provideEvent !== undefined) config.provideEvent = provideEvent;
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
export function createServerReference(id, fn) {
  registerServerFunction(id, fn);
  return { id, fn };
}

/**
 * Produces the server-side callable for a reference: calling it during SSR
 * runs the original function in-process, under a request event derived from
 * the current one (marked server-only, carrying the function's meta).
 */
export function cloneServerReference({ id, fn }) {
  if (typeof fn !== "function")
    throw new Error("Export from a 'use server' module must be a function");

  return new Proxy(fn, {
    get(target, prop, receiver) {
      if (prop === "url") {
        return `/_server?id=${encodeURIComponent(id)}`;
      }
      if (prop === "GET") return receiver;
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
 *   before encoding — the extension point for single-flight payloads.
 *   Return a `ResponseEnvelope` (from ../response.js) to send HTTP
 *   metadata + payload.
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
  const event = options.createEvent ? options.createEvent(request) : { request, locals: {} };
  const provide = options.provideEvent || provideEvent;

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
        if (result.body == null) {
          result = null;
        }
      }
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
        x = value;
      } else if (x instanceof Response) {
        if (x.headers) {
          x.headers.forEach((value, key) => headers.append(key, value));
        }
        if (x.status && (!instance || x.status < 300 || x.status >= 400)) {
          status = x.status;
        }
        if (x.body == null) {
          x = null;
        }
      }
      headers.set("X-Error", "true");
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
    headers.set("X-Error", error.replace(/[\r\n]+/g, ""));
    return encodeResult(x, headers, 200, codec);
  }
}
