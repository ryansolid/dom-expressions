// Response helpers: constructors for the control-flow signals integrations
// interpret — `Location`, `X-Revalidate`, statuses — expressed entirely
// through the standard Response API. More generic than the server function
// transport: client-only actions return these and the integration reads
// the Response in memory (never over HTTP), while server functions return
// (or throw) the same objects and the HTTP handler forwards their
// metadata. No dependency on the codec or the wire format.
//
// The revalidation keys are opaque strings here — whatever keyed cache the
// integration brings assigns them meaning.

// Identity must survive duplicated module instances (e.g. the core entry
// and the server-functions entry bundled separately both carrying a copy),
// so the envelope is detected by a registered-symbol brand, not instanceof.
const ENVELOPE = Symbol.for("solid.ResponseEnvelope");

/**
 * Envelope pairing HTTP metadata with a structured value. Produced by
 * `json()` and by server-function `transformResult` implementations (e.g.
 * single-flight payloads); the HTTP handler forwards `response`'s headers
 * and (non-redirect) status and serializes `value` as the body, while
 * client-only integrations read `value` directly — no reparse.
 */
export class ResponseEnvelope {
  constructor(response, value) {
    this.response = response;
    this.value = value;
  }
}
ResponseEnvelope.prototype[ENVELOPE] = true;

/** Whether `value` is a `ResponseEnvelope` (robust across module copies). */
export function isResponseEnvelope(value) {
  return !!(value && typeof value === "object" && value[ENVELOPE]);
}

function initWithRevalidate(init) {
  const { revalidate, ...responseInit } = init;
  const headers = new Headers(responseInit.headers);
  revalidate !== undefined && headers.set("X-Revalidate", revalidate.toString());
  return { responseInit, headers };
}

/**
 * Response redirecting to `url` (default 302). `revalidate` names the
 * cache keys the mutation invalidated.
 */
export function redirect(url, init = 302) {
  const { responseInit, headers } = initWithRevalidate(
    typeof init === "number" ? { status: init } : init
  );
  if (responseInit.status === undefined) {
    responseInit.status = 302;
  }
  headers.set("Location", url);
  return new Response(null, { ...responseInit, headers });
}

/**
 * Empty response requesting revalidation of the named cache keys (all of
 * them when omitted).
 */
export function reload(init = {}) {
  const { responseInit, headers } = initWithRevalidate(init);
  return new Response(null, { ...responseInit, headers });
}

/**
 * A value paired with response metadata (status, headers, `revalidate`).
 * The carried response holds a plain JSON body so direct HTTP consumers
 * (no client runtime) get real JSON, while integrations read `value`.
 */
export function json(data, init = {}) {
  const { responseInit, headers } = initWithRevalidate(init);
  headers.set("Content-Type", "application/json");
  return new ResponseEnvelope(
    new Response(JSON.stringify(data), { ...responseInit, headers }),
    data
  );
}
