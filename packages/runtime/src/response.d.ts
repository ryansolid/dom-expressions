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
export function redirect(url: string, init?: number | ResponseHelperInit): Response;

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
