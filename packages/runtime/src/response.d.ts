/**
 * Envelope pairing HTTP metadata with a structured value. Produced by
 * `json()` and by server-function `transformResult` implementations (e.g.
 * single-flight payloads); the HTTP handler forwards `response`'s headers
 * and (non-redirect) status and serializes `value` as the body, while
 * client-only integrations read `value` directly — no reparse.
 */
export class ResponseEnvelope<T = unknown> {
  constructor(response: Response | undefined, value: T);
  response: Response | undefined;
  value: T;
}

/** Whether `value` is a `ResponseEnvelope` (robust across module copies). */
export function isResponseEnvelope(value: unknown): value is ResponseEnvelope;

export interface ResponseHelperInit extends ResponseInit {
  /**
   * Cache keys the mutation invalidated. Opaque to the protocol — the
   * integration's keyed cache assigns them meaning.
   */
  revalidate?: string | string[];
}

/**
 * Response redirecting to `url` (default 302). Works from server functions
 * (the handler forwards it) and client-side actions (the integration
 * interprets it) alike.
 */
export function redirect(url: string, init?: number | ResponseHelperInit): Response;

/**
 * Empty response requesting revalidation of the named cache keys (all of
 * them when omitted).
 */
export function reload(init?: ResponseHelperInit): Response;

/**
 * A value paired with response metadata (status, headers, `revalidate`).
 * The carried response holds a plain JSON body so direct HTTP consumers
 * (no client runtime) get real JSON, while integrations read `value`.
 */
export function json<T>(data: T, init?: ResponseHelperInit): ResponseEnvelope<T>;
