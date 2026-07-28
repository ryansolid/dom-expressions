/**
 * Envelope pairing HTTP metadata (a `Response`) with an in-memory value.
 * Produced by `respond()` and by server-function `transformResult`
 * implementations (e.g. single-flight payloads). The HTTP handler forwards
 * `response`'s headers and (non-redirect) status and encodes `value` as the
 * body through the codec, while client-only integrations read `value`
 * directly — no reparse. Mostly consumed by integrations (routers);
 * application code usually just returns what `respond()` gives it.
 */
export class ResponseEnvelope<T = unknown> {
  constructor(response: Response | undefined, value: T);
  /** The HTTP metadata: status and headers to forward (body ignored by integrations). */
  response: Response | undefined;
  /** The structured value the caller receives. */
  value: T;
}

/**
 * Whether `value` is a `ResponseEnvelope`. Uses a registered-symbol brand
 * rather than `instanceof`, so it stays correct when separately bundled
 * entries each carry a copy of the class. Integrations should always use
 * this over `instanceof`.
 */
export function isResponseEnvelope(value: unknown): value is ResponseEnvelope;

/**
 * Registered-symbol brand (`Symbol.for("solid.Href")`) marking URL-bearing
 * values. Declared `unique symbol` type-side; the runtime value is the
 * registered symbol, so separately bundled copies agree on identity.
 */
export declare const HREF: unique symbol;

/**
 * A URL-bearing value: coerces to its URL via `toString()` and carries the
 * `HREF` registered-symbol brand. Integrations mint these (e.g. a router's
 * typed path objects answer the brand from their proxy) and URL-accepting
 * APIs like `redirect()` accept them alongside plain strings. The brand is
 * what makes the type meaningful — every object has `toString()`.
 */
export interface Href {
  [HREF]: true;
  toString(): string;
}

/**
 * Whether `value` is an `Href`-branded URL-bearing value. Registered-symbol
 * check, so it stays correct across duplicated module instances — same
 * rationale as `isResponseEnvelope`.
 */
export function isHref(value: unknown): value is Href;

/**
 * Response header naming the cache keys a mutation invalidated
 * (`"X-Revalidate"`), comma separated. The response helpers below set it
 * from their `revalidate` option; the client transport treats its presence
 * as control flow, and integrations read it to invalidate their own cache.
 * Core never inspects the keys, so how they are matched (prefixes, exact
 * names, namespaces) is the integration's business.
 */
export const REVALIDATE_HEADER: string;

/** `ResponseInit` accepted by the response helpers, plus `revalidate`. */
export interface ResponseHelperInit extends ResponseInit {
  /**
   * Cache keys the mutation invalidated, carried in the `X-Revalidate`
   * header. Opaque to the protocol — the integration's keyed cache (e.g.
   * the router's `query` cache) assigns them meaning.
   */
  revalidate?: string | string[];
}

/**
 * Response redirecting to `url` (default status 302). Return (or throw) it
 * from a server function — the HTTP handler forwards the redirect for the
 * client integration to follow — or return it from a client-side action,
 * where the integration interprets it in memory. Same object, same
 * meaning, both sides.
 *
 * @example
 * ```ts
 * import { redirect } from "@solidjs/web";
 *
 * async function login(form: FormData) {
 *   "use server";
 *   // ...
 *   return redirect("/dashboard", { revalidate: "session" });
 * }
 * ```
 */
export function redirect(url: string | Href, init?: number | ResponseHelperInit): Response;

/**
 * Empty response requesting revalidation of the named cache keys — all of
 * them when omitted. For mutations whose only effect the caller needs is
 * "refetch your data".
 *
 * @example
 * ```ts
 * import { reload } from "@solidjs/web";
 *
 * async function addTodo(title: string) {
 *   "use server";
 *   await db.insert(title);
 *   return reload({ revalidate: "todos" });
 * }
 * ```
 */
export function reload(init?: ResponseHelperInit): Response;

/**
 * A value paired with response metadata (status, headers, `revalidate`) —
 * for the things a naked return can't express. Scripted callers receive
 * `value` transparently (the transport unwraps the envelope), and
 * progressive enhancement stays invisible: the carried response holds a
 * plain JSON body so consumers without the client runtime (no-JS form
 * posts, direct HTTP) get real JSON.
 *
 * @example
 * ```ts
 * import { respond } from "@solidjs/web";
 *
 * async function createItem(input: Item) {
 *   "use server";
 *   const item = await db.create(input);
 *   return respond(item, { status: 201, revalidate: "items" });
 * }
 * ```
 */
export function respond<T>(value: T, init?: ResponseHelperInit): ResponseEnvelope<T>;
