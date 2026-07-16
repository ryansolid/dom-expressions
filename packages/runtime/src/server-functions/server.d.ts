import { ResponseEnvelope } from "../response.js";
import { JSONCodecOptions } from "../serializer.js";
import { RequestEvent } from "../server.js";

export { FUNCTION_HEADER, INSTANCE_HEADER, decodeResponse } from "./shared.js";

/**
 * The request event a server function call runs under: the base
 * `RequestEvent` (request + locals) plus `serverOnly`, set when the call is
 * an in-process SSR invocation whose result never serializes to a client.
 */
export interface ServerFunctionEvent extends RequestEvent {
  serverOnly?: boolean;
}

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
 * endpoint, codec plugins, or an explicit event provider).
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
 * `createServerReference` consumes. Not meant for hand-written code.
 * @internal
 */
export function registerServerReference<T extends any[], R>(
  id: string,
  fn: (...args: T) => R
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

/** Identity of the currently executing server function. */
export interface ServerFunctionMeta {
  id: string;
}

/**
 * Reads the calling server function's meta (its id) off the current request
 * event — usable inside a server function body, e.g. to key caches or logs
 * by function. Returns undefined outside a server function call.
 */
export function getServerFunctionMeta(): ServerFunctionMeta | undefined;

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
   * extension point for policies like single-flight payloads. Runs for
   * returned and thrown results alike (`context.thrown` distinguishes);
   * `context.instance` is null for no-JS calls. Return the result
   * unchanged to pass through, or a `ResponseEnvelope` (exposed through
   * the core entry) to send HTTP metadata plus a structured payload.
   */
  transformResult?(
    event: ServerFunctionEvent,
    result: unknown,
    context: { instance: string | null; request: Request; thrown?: boolean }
  ): unknown | ResponseEnvelope | Promise<unknown | ResponseEnvelope>;
  /**
   * Builds the response for calls made without the client runtime (no
   * instance header — no-JS form posts, direct HTTP) — the extension
   * point for conventions like redirect-with-flash-cookie. Receives the
   * (transformed) result, the request, and the decoded arguments; `thrown`
   * is set when the result was thrown rather than returned. Defaults to
   * the normal serialized response.
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
 * function id from the request, decodes arguments, runs the function under
 * a request-event scope, and encodes the result (forwarding
 * redirect/revalidation metadata through headers). Mount it on the endpoint
 * the client transport targets (default `/_server`); platform adapters
 * (h3, express, ...) convert their request shape to a web `Request` around
 * it.
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
