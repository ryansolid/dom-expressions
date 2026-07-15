import { ResponseEnvelope } from "../response.js";
import { JSONCodecOptions } from "../serializer.js";
import { RequestEvent } from "../server.js";

export { FUNCTION_HEADER, INSTANCE_HEADER, decodeResponse } from "./shared.js";

export interface ServerFunctionEvent extends RequestEvent {
  serverOnly?: boolean;
}

export interface ServerFunctionsServerConfig {
  /**
   * Establishes the request-event scope for a call (e.g.
   * @solidjs/web/storage's provideRequestEvent). Falls back to the
   * AsyncLocalStorage instance an established request scope parks on the
   * global.
   */
  provideEvent?: <T>(event: ServerFunctionEvent, fn: () => T) => T;
  /** Codec options — must match the client's (stored in the shared layer). */
  codec?: JSONCodecOptions;
}

/** Configures the server runtime. Call before handling requests. */
export function configureServerFunctionsServer(config?: ServerFunctionsServerConfig): void;

export interface ServerFunctionReference<T extends any[] = any[], R = any> {
  id: string;
  fn: (...args: T) => R;
}

export function registerServerFunction<T extends any[], R>(
  id: string,
  callback: (...args: T) => R
): (...args: T) => R;

/** Looks up a registered server function; throws for unknown ids. */
export function getServerFunction<T extends any[], R>(id: string): (...args: T) => R;

/** Registers a compiled server function under its id. */
export function createServerReference<T extends any[], R>(
  id: string,
  fn: (...args: T) => R
): ServerFunctionReference<T, R>;

/**
 * Produces the server-side callable for a reference: calling it during SSR
 * runs the original function in-process, under a request event derived from
 * the current one (marked server-only, carrying the function's meta).
 */
export function cloneServerReference<T extends any[], R>(
  reference: ServerFunctionReference<T, R>
): (...args: T) => R;

export interface ServerFunctionMeta {
  id: string;
}

/** Reads the calling server function's meta off the current request event. */
export function getServerFunctionMeta(): ServerFunctionMeta | undefined;

export interface HandleServerFunctionOptions {
  /**
   * Builds the request event (default: bare `{ request, locals: {} }`).
   * Integrations supply their richer event.
   */
  createEvent?(request: Request): ServerFunctionEvent;
  /** Overrides the configured event provider for this handler. */
  provideEvent?<T>(event: ServerFunctionEvent, fn: () => T): T;
  /**
   * Observes/replaces the result before encoding — the extension point for
   * single-flight payloads. Return a `ResponseEnvelope` (from
   * `../response.js`, exposed through the core entry) to send both HTTP
   * metadata and a structured payload.
   */
  transformResult?(
    event: ServerFunctionEvent,
    result: unknown,
    context: { instance: string | null; request: Request; thrown?: boolean }
  ): unknown | ResponseEnvelope | Promise<unknown | ResponseEnvelope>;
  /**
   * Response for calls made without the client runtime (no instance
   * header) — the extension point for no-JS form conventions. Defaults to
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
 * Web-standard HTTP handler for server function calls. Mount it on the
 * endpoint the client transport targets (default `/_server`).
 */
export function handleServerFunctionRequest(
  request: Request,
  options?: HandleServerFunctionOptions
): Promise<Response>;
