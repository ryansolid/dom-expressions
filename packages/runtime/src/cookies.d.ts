// Cookie wire format: the platform-gap primitives, and ALL of core's
// cookie surface — core owns the exchange (the request's headers in, the
// response stub's headers out) and the codec, nothing ambient. Blessed
// patterns:
//
//   parseCookieHeader(event.request.headers.get("cookie"))
//   event.response.headers.append("set-cookie", serializeCookie(name, value, options))
//
// Dependency-free and isomorphic (exported from both entries — real
// implementation, never a stub); integrity/confidentiality layers
// (sessions) belong to the caller, on top of these primitives.

/**
 * Attributes for a `Set-Cookie` header, mirroring RFC 6265. `path`
 * defaults to `/`; nothing else is defaulted.
 */
export interface CookieOptions {
  /** Cookie `Path` attribute. Defaults to `/`. */
  path?: string;
  /** Cookie `Domain` attribute. Emitted only when provided. */
  domain?: string;
  /** Cookie `Max-Age` attribute, in seconds (truncated to an integer). */
  maxAge?: number;
  /** Cookie `Expires` attribute. */
  expires?: Date;
  /** Emit the `HttpOnly` attribute. */
  httpOnly?: boolean;
  /** Emit the `Secure` attribute. */
  secure?: boolean;
  /** Cookie `SameSite` attribute, any case. */
  sameSite?: "lax" | "strict" | "none" | "Lax" | "Strict" | "None";
}

/**
 * Parses a `Cookie` request header into a name → value map. Names and
 * values are `decodeURIComponent`-decoded (falling back to the raw text
 * when decoding throws); a quoted value keeps its content. `null`/empty
 * input parses to an empty map.
 *
 * The read half of the platform gap — the blessed request-cookie read is
 * `parseCookieHeader(event.request.headers.get("cookie"))`.
 */
export function parseCookieHeader(header: string | null | undefined): Record<string, string>;

/**
 * Serializes a cookie to a `Set-Cookie` header value. The name and value
 * are `encodeURIComponent`-encoded (the parser decodes symmetrically);
 * `path` defaults to `/` and every other attribute is emitted exactly
 * when the caller asked for it.
 *
 * The write half of the platform gap — the blessed response-cookie write
 * is `event.response.headers.append("set-cookie", serializeCookie(name,
 * value, options))`, which every head materialization path carries to the
 * wire entry-by-entry.
 */
export function serializeCookie(name: string, value: string, options?: CookieOptions): string;
