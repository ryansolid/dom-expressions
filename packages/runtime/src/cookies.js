// Cookie wire format: the platform-gap primitives. The web platform hands
// code whole `Cookie`/`Set-Cookie` headers but no codec for the pairs
// inside them — this module is that codec, and it is ALL of core's cookie
// surface: core owns the exchange (the request's headers in, the response
// stub's headers out) and the codec, nothing ambient. The blessed patterns:
//
//   parseCookieHeader(event.request.headers.get("cookie"))
//   event.response.headers.append("set-cookie", serializeCookie(name, value, options))
//
// Dependency-free and isomorphic — nothing here touches an event or the
// platform — and exported from BOTH entries: a pure value transformer has
// legitimate browser uses too (`document.cookie = serializeCookie(...)`,
// parsing `document.cookie`), and a no-op stub would hand back silent
// garbage. No client-runtime module imports it internally (the flash
// codec's client half keeps its raw-payload regex matcher), so it enters a
// client bundle exactly when user code calls it and tree-shakes away
// otherwise (guarded in scripts/size-guard.mjs).
//
// Encoding contract: names and values travel `encodeURIComponent`-encoded
// and the parser decodes both, so any string round-trips. No signing, no
// encryption — integrity/confidentiality layers (sessions) belong to the
// caller, on top of these primitives.

/**
 * Parses a `Cookie` request header into a name → value map. Names and
 * values are `decodeURIComponent`-decoded (falling back to the raw text
 * when decoding throws — cookies set by other producers are not
 * necessarily percent-encoded); a quoted value keeps its content, per the
 * RFC 6265 grammar. `null`/empty input parses to an empty map.
 *
 * The read half of the platform gap — the blessed request-cookie read is
 * `parseCookieHeader(event.request.headers.get("cookie"))`.
 */
export function parseCookieHeader(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = decodeSafe(part.slice(0, eq).trim());
    let value = part.slice(eq + 1).trim();
    if (value.length > 1 && value[0] === '"' && value[value.length - 1] === '"') {
      value = value.slice(1, -1);
    }
    cookies[name] = decodeSafe(value);
  }
  return cookies;
}

function decodeSafe(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/**
 * Serializes a cookie to a `Set-Cookie` header value. The name and value
 * are `encodeURIComponent`-encoded (the parser decodes symmetrically);
 * `path` defaults to `/` — the only defaulted attribute — and every other
 * attribute is emitted exactly when the caller asked for it: `domain`,
 * `maxAge` (seconds, truncated to an integer), `expires` (a `Date`),
 * `httpOnly`, `secure`, `sameSite` (`"lax" | "strict" | "none"`, any
 * case).
 *
 * The write half of the platform gap — the blessed response-cookie write
 * is `event.response.headers.append("set-cookie", serializeCookie(name,
 * value, options))`, which every head materialization path carries to the
 * wire entry-by-entry.
 */
export function serializeCookie(name, value, options = {}) {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookie += `; Path=${options.path === undefined ? "/" : options.path}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.maxAge !== undefined) cookie += `; Max-Age=${Math.trunc(options.maxAge)}`;
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) cookie += "; HttpOnly";
  if (options.secure) cookie += "; Secure";
  if (options.sameSite) {
    const sameSite = options.sameSite.toLowerCase();
    cookie += `; SameSite=${sameSite === "none" ? "None" : sameSite === "strict" ? "Strict" : "Lax"}`;
  }
  return cookie;
}
