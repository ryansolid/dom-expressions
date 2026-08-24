/**
 * @jest-environment node
 *
 * The cookie codec (`parseCookieHeader`/`serializeCookie` — the
 * platform-gap primitives, core's whole cookie surface), the committed
 * response stub's write loudness (`commitResponseStub`: a post-commit
 * header write throws in the dev build on every commit path), and the
 * multi-`Set-Cookie` guarantee: every path that materializes a response
 * stub (or merges response headers) must carry multiple `Set-Cookie`
 * values as separate entries — `getSetCookie()` + append, never `get`/
 * `set` folding — so cookies survive identically on Node/undici, workerd
 * and Deno. Cookie writes throughout use the blessed pattern:
 * `event.response.headers.append("set-cookie", serializeCookie(...))`.
 * Node environment for real Request/Response/Headers globals.
 */
import * as r from "../../src/server";
import { parseCookieHeader, serializeCookie } from "../../src/server";
import * as codec from "../../src/cookies";
import { RequestContext } from "../../src/server";

class FakeStorage {
  constructor() {
    this.store = undefined;
  }
  getStore() {
    return this.store;
  }
  run(value, fn) {
    const prev = this.store;
    this.store = value;
    try {
      return fn();
    } finally {
      this.store = prev;
    }
  }
}

beforeEach(() => {
  globalThis[RequestContext] = new FakeStorage();
});

afterEach(() => {
  delete globalThis[RequestContext];
});

function eventWithCookies(cookieHeader) {
  const headers = cookieHeader ? { cookie: cookieHeader } : undefined;
  return r.createRequestEvent(new Request("http://localhost/", { headers }));
}

// The blessed write pattern, spelled once.
function appendCookie(event, name, value, options) {
  event.response.headers.append("set-cookie", serializeCookie(name, value, options));
}

describe("codec exports", () => {
  it("the server entry re-exports the one real implementation", () => {
    expect(parseCookieHeader).toBe(codec.parseCookieHeader);
    expect(serializeCookie).toBe(codec.serializeCookie);
  });
});

describe("serializeCookie", () => {
  it("defaults Path to / and nothing else", () => {
    expect(serializeCookie("a", "b")).toBe("a=b; Path=/");
  });

  it("emits every attribute the caller asked for", () => {
    const expires = new Date("2027-01-01T00:00:00Z");
    expect(
      serializeCookie("session", "abc", {
        path: "/app",
        domain: "example.com",
        maxAge: 3600.9,
        expires,
        httpOnly: true,
        secure: true,
        sameSite: "lax"
      })
    ).toBe(
      `session=abc; Path=/app; Domain=example.com; Max-Age=3600; Expires=${expires.toUTCString()}; HttpOnly; Secure; SameSite=Lax`
    );
  });

  it("normalizes sameSite casing", () => {
    expect(serializeCookie("a", "b", { sameSite: "none" })).toBe("a=b; Path=/; SameSite=None");
    expect(serializeCookie("a", "b", { sameSite: "Strict" })).toBe("a=b; Path=/; SameSite=Strict");
  });

  it("percent-encodes name and value so any string round-trips", () => {
    const value = "sp ace;semi=eq,comma✓";
    const serialized = serializeCookie("na;me", value);
    const pair = serialized.split(";")[0];
    expect(pair).not.toContain(" ");
    expect(parseCookieHeader(pair)["na;me"]).toBe(value);
  });
});

describe("parseCookieHeader", () => {
  it("parses multiple pairs and trims whitespace", () => {
    expect(parseCookieHeader("a=1; b=2;c=3")).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("answers an empty map for null/empty input", () => {
    expect(parseCookieHeader(null)).toEqual({});
    expect(parseCookieHeader("")).toEqual({});
  });

  it("skips segments without an =", () => {
    expect(parseCookieHeader("garbage; a=1")).toEqual({ a: "1" });
  });

  it("unquotes quoted values", () => {
    expect(parseCookieHeader('a="quoted value"')).toEqual({ a: "quoted value" });
  });

  it("keeps raw text when decoding throws", () => {
    expect(parseCookieHeader("a=%zz")).toEqual({ a: "%zz" });
  });

  it("reads the blessed pattern off a request event", () => {
    const event = eventWithCookies("session=abc; name=sp%20ace%3B%E2%9C%93");
    const cookies = parseCookieHeader(event.request.headers.get("cookie"));
    expect(cookies.session).toBe("abc");
    expect(cookies.name).toBe("sp ace;✓");
    expect(cookies.missing).toBeUndefined();
  });
});

// Raw source is the dev build (`"_DX_DEV_"` is a truthy string until a
// bundler replaces it), so the never-silent policy surfaces as throws
// here; the production build reports through console.error and no-ops.
describe("commitResponseStub write loudness", () => {
  it("commits the stub and fails post-commit set/append/delete loudly (dev)", () => {
    const event = eventWithCookies();
    r.commitResponseStub(event.response);
    expect(event.response.committed).toBe(true);
    expect(() => event.response.headers.set("x-late", "1")).toThrow(
      /after the response head was sent/
    );
    expect(() => appendCookie(event, "late", "1")).toThrow(/after the response head was sent/);
    expect(() => event.response.headers.delete("x-late")).toThrow(
      /after the response head was sent/
    );
    expect(event.response.headers.getSetCookie()).toEqual([]);
  });

  it("keeps the Headers identity and its reads intact", () => {
    const event = eventWithCookies();
    const headers = event.response.headers;
    appendCookie(event, "a", "1");
    r.commitResponseStub(event.response);
    expect(event.response.headers).toBe(headers);
    expect(headers).toBeInstanceOf(Headers);
    expect(headers.getSetCookie()).toEqual(["a=1; Path=/"]);
    expect(headers.get("set-cookie")).toContain("a=1");
  });

  it("is idempotent: an already-committed stub is left alone", () => {
    const stub = r.createResponseStub();
    r.commitResponseStub(stub);
    const patched = stub.headers.set;
    r.commitResponseStub(stub);
    expect(stub.headers.set).toBe(patched);
  });

  it("allowLateLocation permits exactly the post-commit Location set", () => {
    const stub = r.createResponseStub();
    r.commitResponseStub(stub, { allowLateLocation: true });
    stub.headers.set("Location", "/next");
    expect(stub.headers.get("Location")).toBe("/next");
    expect(() => stub.headers.set("x-other", "1")).toThrow(/after the response head was sent/);
    expect(() => stub.headers.append("set-cookie", "a=1")).toThrow(
      /after the response head was sent/
    );
  });
});

describe("createSSRResponse carries multiple Set-Cookie values", () => {
  it("string result: stub cookies and base-init cookies all survive individually", async () => {
    const event = eventWithCookies();
    appendCookie(event, "a", "1");
    appendCookie(event, "b", "2");
    const base = new Headers();
    base.append("Set-Cookie", "c=3; Path=/");
    const response = r.createSSRResponse("<p/>", event, { responseInit: { headers: base } });
    expect(response.headers.getSetCookie()).toEqual(["c=3; Path=/", "a=1; Path=/", "b=2; Path=/"]);
    expect(event.response.committed).toBe(true);
  });

  it("redirect result: cookies ride the redirect head", () => {
    const event = eventWithCookies();
    appendCookie(event, "session", "fresh");
    event.response.headers.set("Location", "/next");
    const response = r.createSSRResponse("<p>never sent</p>", event);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/next");
    expect(response.headers.getSetCookie()).toEqual(["session=fresh; Path=/"]);
  });

  it("stream result: cookies set before the shell flush reach the head", async () => {
    const event = eventWithCookies();
    appendCookie(event, "a", "1");
    appendCookie(event, "b", "2");
    const response = await r.createSSRResponse(
      r.renderToStream(() => r.ssr`<p>sync</p>`),
      event
    );
    expect(response.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
    expect(event.response.committed).toBe(true);
  });

  it("string commit rejects late header writes (dev)", () => {
    const event = eventWithCookies();
    r.createSSRResponse("<p/>", event);
    expect(() => appendCookie(event, "late", "1")).toThrow(/after the response head was sent/);
  });

  it("shell-flush commit rejects late header writes (dev) but honors late Location", async () => {
    const event = eventWithCookies();
    const response = await r.createSSRResponse(
      r.renderToStream(() => r.ssr`<p>sync</p>`),
      event
    );
    expect(event.response.committed).toBe(true);
    expect(() => appendCookie(event, "late", "1")).toThrow(/after the response head was sent/);
    // the stream path's documented exception: a post-flush Location is
    // honored client-side through the completion script
    event.response.headers.set("Location", "/next");
    expect(event.response.headers.get("Location")).toBe("/next");
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});
