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
 * Envelope pairing HTTP metadata with a value. Produced by `respond()` and
 * by server-function `transformResult` implementations (e.g. single-flight
 * payloads); the HTTP handler forwards `response`'s headers and
 * (non-redirect) status and encodes `value` as the body through the codec,
 * while client-only integrations read `value` directly — no reparse.
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

// Brand for URL-bearing values (e.g. a router's typed path objects). Like
// the envelope brand it's a registered symbol so identity survives
// duplicated module instances; `toString()` stays the coercion mechanism
// (attributes, Headers.set, template literals all call it) while the brand
// is the identity mechanism — a bare `{ toString(): string }` is satisfied
// by every object in the language, so without the brand the type would be
// decorative and `redirect(someObject)` would silently put
// "[object Object]" in a Location header.
const HREF = Symbol.for("solid.Href");
export { HREF };

/** Whether `value` is an `Href`-branded URL-bearing value. */
export function isHref(value) {
  return !!(value && (typeof value === "object" || typeof value === "function") && value[HREF]);
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
  if (typeof url !== "string" && !isHref(url)) {
    throw new TypeError(
      "redirect() expects a string URL or an Href-branded value (Symbol.for('solid.Href'))."
    );
  }
  const { responseInit, headers } = initWithRevalidate(
    typeof init === "number" ? { status: init } : init
  );
  if (responseInit.status === undefined) {
    responseInit.status = 302;
  }
  headers.set("Location", String(url));
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
 * A value paired with response metadata (status, headers, `revalidate`) —
 * for the things a naked return can't express. Progressive enhancement
 * stays invisible: the carried response holds a plain JSON body so
 * consumers without the client runtime (no-JS form posts, direct HTTP)
 * get real JSON, while integrations read `value` — no reparse.
 */
export function respond(value, init = {}) {
  const { responseInit, headers } = initWithRevalidate(init);
  headers.set("Content-Type", "application/json");
  return new ResponseEnvelope(
    new Response(JSON.stringify(value), { ...responseInit, headers }),
    value
  );
}
