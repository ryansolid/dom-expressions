import { ResponseEnvelope } from "../response.js";
import { JSONCodecOptions } from "../serializer.js";
import { RequestEvent } from "../server.js";

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
export type {
  FlightDataConsumer,
  FlightDataContext,
  ServerFunction,
  ServerFunctionMetadata,
  SingleFlightPayload
} from "./shared.js";
export { decodeFlashCookie, encodeFlashCookie } from "./flash.js";
export type { FlashSubmission } from "./flash.js";
import { ServerFunction } from "./shared.js";

/**
 * The request event a server function call runs under: the base
 * `RequestEvent` (request + locals, plus the optional `complete` flag) with
 * `serverOnly` added, set when the call is an in-process SSR invocation
 * whose result never serializes to a client.
 */
export interface ServerFunctionEvent extends RequestEvent {
  serverOnly?: boolean;
}

/**
 * What a server function call resolved to, as seen by the single-flight
 * hook — enough context for any data-production strategy without core
 * assuming one.
 */
export interface ServerFunctionOutcome {
  /** The build-stable id of the function that ran. */
  id: string;
  /**
   * The value the caller will receive: the raw return for plain results,
   * the unwrapped `value` for `ResponseEnvelope`s, `null` for body-less
   * control-flow `Response`s (redirect/reload).
   */
  value: unknown;
  /**
   * The `Response` carrying the result's HTTP metadata, when there is one
   * (from a returned/thrown `Response` or a `ResponseEnvelope`). Read
   * `Location` here for redirect-with-data — the data should describe the
   * destination route — and `X-Revalidate` for the invalidated keys.
   * Undefined for plain values.
   */
  response: Response | undefined;
  /**
   * The original HTTP request, untouched: headers the client integration
   * sent (referrer, custom route context) ride here for the hook to read —
   * core assigns them no meaning.
   */
  request: Request;
  /** Whether the result was thrown rather than returned. */
  thrown: boolean;
  /**
   * The URL the client will show after the mutation — the redirect
   * `Location` when the outcome carries one (resolved against the request
   * URL, as a browser would), the referring page otherwise. Undefined
   * without a usable referer (a non-browser caller has no page to produce
   * data for) and for redirects leaving the app's origin: produce no data
   * when this is undefined.
   */
  targetUrl: string | undefined;
  /**
   * The outcome's `X-Revalidate` keys, split — the invalidation scope the
   * mutation declared. Undefined when the outcome carries none (integrations
   * typically collect everything for the target in that case).
   */
  revalidateKeys: string[] | undefined;
  /**
   * The request headers with the mutation's cookie effects applied: the
   * event response's `Set-Cookie`s (set during the call), then the
   * outcome's own (e.g. `redirect(to, { headers })`), later winning on
   * conflict, deletions honored. Build the data-collection request from
   * these so re-run reads observe post-mutation cookie state.
   */
  foldedHeaders: Headers;
}

/**
 * The single-flight server hook: given the request event and the function's
 * outcome, optionally produce a data payload (possibly async) to fold into
 * the response alongside the return value. Data production is a black box
 * to the protocol — render data-only, run route preloads, query a cache,
 * whatever the integration chooses; the payload just has to be
 * codec-serializable. Return undefined to send the response unchanged
 * (byte-identical to a call without the hook).
 *
 * Runs after `transformResult`, only for scripted calls that sent
 * `SINGLE_FLIGHT_HEADER` on the request, on returned results and thrown
 * `Response`/`ResponseEnvelope` control-flow signals alike (plain thrown
 * errors never collect, and neither do raw body-carrying `Response` values
 * — those are the caller's verbatim payload). The handler owns the
 * enveloping: contributed data ships as `{ value, data }` under the
 * single-flight response header. The generic halves of collection arrive
 * pre-digested on the outcome (`targetUrl`, `revalidateKeys`,
 * `foldedHeaders`); the hook supplies only the data strategy.
 */
export type CollectFlightDataHook = (
  event: ServerFunctionEvent,
  outcome: ServerFunctionOutcome
) => unknown | Promise<unknown>;

/**
 * Request headers with `setCookies` folded into the `Cookie` header, as the
 * browser would have applied them before its next request. Later entries
 * win on conflict, and deletions are honored (`Max-Age` at or below zero,
 * `Expires` in the past). The input headers are not modified.
 *
 * For work re-run on the server after a mutation — a
 * `CollectFlightDataHook` gathering fresh data, typically. That pass starts
 * from the request that triggered the mutation, whose cookies are
 * pre-mutation by definition, so a read depending on a session the mutation
 * just established would otherwise see the old state. Which responses
 * contribute their `Set-Cookie`s, and in what order, is the caller's
 * decision.
 *
 * @example
 * ```ts
 * const headers = foldSetCookies(event.request.headers, [
 *   ...(event.response?.headers?.getSetCookie() ?? []),
 *   ...(outcome.response?.headers?.getSetCookie() ?? [])
 * ]);
 * ```
 */
export function foldSetCookies(headers: Headers, setCookies: readonly string[]): Headers;

/** Options for `createNoJSHandler`. */
export interface NoJSHandlerOptions {
  /** The app's mount path, for resolving a relative redirect `Location`. */
  base?: string;
}

/**
 * Builds the `handleNoJS` implementation for the no-JS form convention: a
 * form posted without the client runtime has no way to receive a value, so
 * the call redirects back to the referring page (or to the result's own
 * `Location`, resolved against `base`) with the outcome riding a one-shot
 * flash cookie. `303 See Other` turns the POST into a GET unless the result
 * names a redirect status of its own. A result that is already a `Response`
 * carries its meaning in its metadata and is not flashed.
 *
 * The render that follows reads the cookie with `decodeFlashCookie` and
 * surfaces the outcome however it likes — that half is the integration's.
 *
 * The handler applies to every call it receives. `handleServerFunctionRequest`
 * already uses it for browser form posts, so wire it explicitly only to set
 * a `base`, or to extend the convention to direct HTTP calls by registering
 * it through `configureServerFunctionsServer`.
 */
export function createNoJSHandler(
  options?: NoJSHandlerOptions
): (result: unknown, request: Request, args: unknown[], thrown?: boolean) => Response;

/** Options for `configureServerFunctionsServer`. */
export interface ServerFunctionsServerConfig {
  /**
   * Establishes the request-event scope for a call — the function passed
   * runs with `event` visible to `getRequestEvent()`. Wire it to
   * `provideRequestEvent` from `@solidjs/web/storage` (or the framework's
   * equivalent). When omitted, falls back to the AsyncLocalStorage instance
   * an established request scope parks on the global.
   */
  provideEvent?: <T>(event: ServerFunctionEvent, fn: () => T) => T;
  /**
   * The single-flight hook: produces the data payload folded into
   * responses of calls that opted in (see `CollectFlightDataHook`).
   * Registered once by the integration that owns data production (a
   * router); per-handler `collectFlightData` options override it.
   */
  collectFlightData?: CollectFlightDataHook;
  /**
   * Server-wide default for the handler's `transformResult` (same contract
   * — see `HandleServerFunctionRequestOptions`); a per-request option
   * overrides it. Registering it here makes result policies (e.g. frames'
   * `frameTransformResult`) work through generic dispatchers that call
   * `handleServerFunctionRequest(request)` with no options.
   */
  transformResult?(
    event: ServerFunctionEvent,
    result: unknown,
    context: {
      id: string;
      args: unknown[];
      instance: string | null;
      request: Request;
      thrown?: boolean;
    }
  ): unknown | ResponseEnvelope | Promise<unknown | ResponseEnvelope>;
  /**
   * The in-process mirror of `transformResult` for direct (same-server)
   * calls during document SSR — e.g. frames' `frameTransformDirectResult`.
   */
  transformDirectResult?(
    value: unknown,
    options: { id: string; args: unknown[]; event: ServerFunctionEvent }
  ): unknown;
  /**
   * Server-wide response builder for calls made without the client runtime
   * (see `handleNoJS` in `HandleServerFunctionRequestOptions`); a
   * per-request option overrides it. Set it to `createNoJSHandler({ base })`
   * to apply the convention to every non-scripted call rather than only to
   * browser form posts, to a handler of your own to replace it, or to
   * `null` to disable the built-in convention and answer form posts with
   * the plain serialized response.
   */
  handleNoJS?:
    | ((
        result: unknown,
        request: Request,
        args: unknown[],
        thrown?: boolean
      ) => Response | Promise<Response>)
    | null;
  /**
   * Endpoint the HTTP handler is mounted on, used for the `url` of SSR'd
   * references (e.g. form actions) — must match the client configuration.
   * Prefix it when the app serves from a base path (e.g.
   * `` `${BASE_URL}_server` ``).
   * @default "/_server"
   */
  endpoint?: string;
  /**
   * Codec options (extra plugins etc.) for decoding arguments and encoding
   * results — must match the client's. Stored in the shared layer, so
   * `decodeResponse` sees them too.
   */
  codec?: JSONCodecOptions;
}

/**
 * Configures the server runtime. Call once at server startup, before
 * handling requests. Only needed when deviating from the defaults (custom
 * endpoint, codec plugins, an explicit event provider, or a single-flight
 * hook).
 */
export function configureServerFunctionsServer(config?: ServerFunctionsServerConfig): void;

/**
 * A registered server function: its build-stable id paired with the
 * original implementation. Returned by `registerServerReference` and
 * consumed by the server-side `createServerReference`.
 *
 * Compiler ABI shape; hand-written code rarely constructs these.
 * @internal
 */
export interface ServerFunctionReference<T extends any[] = any[], R = any> {
  id: string;
  fn: (...args: T) => R;
  /**
   * The function's source name, emitted by development builds only —
   * `createServerReference` seeds the metadata channel with it.
   * @internal
   */
  name?: string;
}

/**
 * Adds a function to the dispatch registry under an id and returns it
 * unchanged. The low-level registry write for integrations registering
 * functions outside the compiler (e.g. a router registering its own
 * endpoints); compiled output goes through `registerServerReference`
 * instead. Ids must be stable across the client and server builds.
 */
export function registerServerFunction<T extends any[], R>(
  id: string,
  callback: (...args: T) => R
): (...args: T) => R;

/**
 * Looks up a registered server function by id; throws for unknown ids.
 * The HTTP handler uses this for dispatch — integrations building custom
 * dispatch (or introspection) can too.
 */
export function getServerFunction<T extends any[], R>(id: string): (...args: T) => R;

/**
 * Compiler ABI — emitted by compiled `"use server"` server output for
 * every server function: registers `fn` for HTTP dispatch under its
 * build-stable id and returns the reference the server-side
 * `createServerReference` consumes. Development builds pass the function's
 * source name as the trailing argument (dev-only metadata; never emitted in
 * production). Not meant for hand-written code.
 * @internal
 */
export function registerServerReference<T extends any[], R>(
  id: string,
  fn: (...args: T) => R,
  name?: string
): ServerFunctionReference<T, R>;

/**
 * Compiler ABI — emitted by compiled `"use server"` server output where
 * the function was referenced; produces the server-side callable. Calling
 * it during SSR runs the original function in-process (no HTTP), under a
 * request event derived from the current one — marked `serverOnly` and
 * carrying the function's meta. Not meant for hand-written code.
 * @internal
 */
export function createServerReference<T extends any[], R>(
  reference: ServerFunctionReference<T, R>
): (...args: T) => R;

/**
 * Declares a server function callable over HTTP GET. The server half is
 * identity-flavored — SSR calls stay in-process — but it brands the
 * declaration on the reference's metadata channel
 * (`getServerFunctionMetadata(fn)?.method === "GET"`) and records the
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
export function GET<A extends readonly any[], R>(
  fn: (...args: A) => R
): ServerFunction<A, Awaited<R>>;

/** Identity of the currently executing server function call. */
export interface ServerFunctionInvocation {
  id: string;
}

/**
 * Reads the in-flight server function invocation (its id) off the current
 * request event — usable inside a server function body, e.g. to key caches
 * or logs by function. Returns undefined outside a server function call.
 * Distinct from `getServerFunctionMetadata(fn)`, which reads a reference's
 * static declaration metadata; this describes the call currently executing.
 */
export function getServerFunctionInvocation(): ServerFunctionInvocation | undefined;

/**
 * Hooks layering framework policy onto `handleServerFunctionRequest`.
 * All are optional — the bare handler dispatches, scopes events, and
 * encodes results on its own.
 */
export interface HandleServerFunctionOptions {
  /**
   * Builds the request event a call runs under (default: bare
   * `{ request, locals: {} }`). Integrations supply their richer event
   * (cookies, response helpers, platform handles).
   */
  createEvent?(request: Request): ServerFunctionEvent;
  /**
   * Overrides the configured event provider for this handler — same
   * contract as the `provideEvent` config option.
   */
  provideEvent?<T>(event: ServerFunctionEvent, fn: () => T): T;
  /**
   * Observes or replaces the function's result before encoding — the
   * extension point for response metadata policies (headers, statuses,
   * substituted results). Runs for returned and thrown results alike
   * (`context.thrown` distinguishes); `context.instance` is null for no-JS
   * calls. The context carries the call's identity — the function `id` and
   * the parsed `args` the implementation was invoked with — matching the
   * direct-call mirror (`transformDirectResult`), so a policy keying state
   * by the call works over either dispatch path. Return the result
   * unchanged to pass through, or a `ResponseEnvelope` (exposed through
   * the core entry) to send HTTP metadata plus a structured payload. Runs
   * before `collectFlightData`, so the flight hook sees the transformed
   * outcome — use `collectFlightData`, not this, to fold data into the
   * response.
   */
  transformResult?(
    event: ServerFunctionEvent,
    result: unknown,
    context: {
      id: string;
      args: unknown[];
      instance: string | null;
      request: Request;
      thrown?: boolean;
    }
  ): unknown | ResponseEnvelope | Promise<unknown | ResponseEnvelope>;
  /**
   * Overrides the configured single-flight hook for this handler — same
   * contract as the `collectFlightData` config option (see
   * `CollectFlightDataHook`).
   */
  collectFlightData?: CollectFlightDataHook;
  /**
   * Builds the response for calls made without the client runtime (no
   * instance header — no-JS form posts, direct HTTP). Receives the
   * (transformed) result, the request, and the decoded arguments; `thrown`
   * is set when the result was thrown rather than returned.
   *
   * Overrides the configured hook, which in turn overrides the built-in
   * `createNoJSHandler()` applied to browser form posts. Other
   * no-instance callers get the normal serialized response.
   */
  handleNoJS?(
    result: unknown,
    request: Request,
    args: unknown[],
    thrown?: boolean
  ): Response | Promise<Response>;
  /** Overrides the configured codec options for this handler. */
  codec?: JSONCodecOptions;
}

/**
 * Web-standard HTTP handler for server function calls: resolves the
 * function id from the request, gates GET dispatch on the declaration (405
 * for a GET request to a function that never declared `GET`; POST is always
 * accepted), decodes arguments, runs the function under a request-event scope,
 * and encodes the result (forwarding redirect/revalidation metadata
 * through headers). Mount it on the endpoint the client transport targets
 * (default `/_server`); platform adapters (h3, express, ...) convert their
 * request shape to a web `Request` around it.
 *
 * @example
 * ```ts
 * import { handleServerFunctionRequest } from "@solidjs/web/server-functions";
 * import "virtual:solid-server-function-manifest";
 *
 * // in the server's request handling:
 * if (url.pathname.startsWith("/_server")) {
 *   return handleServerFunctionRequest(request);
 * }
 * ```
 */
export function handleServerFunctionRequest(
  request: Request,
  options?: HandleServerFunctionOptions
): Promise<Response>;
