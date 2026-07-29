/**
 * @jest-environment node
 */
import { respond } from "../../src/response";
import {
  FUNCTION_HEADER,
  deserializeString,
  encodeArgumentsKey,
  getServerFunctionMetadata,
  getStaticCacheKey,
  isServerFunction,
  serializeString,
  staticArtifactName,
  withMeta
} from "../../src/server-functions/shared";
import {
  configureServerFunctionsClient,
  createServerReference as createClientReference,
  staticFunction as clientStatic
} from "../../src/server-functions/client";
import {
  configureServerFunctionsServer,
  createServerReference,
  handleServerFunctionRequest,
  registerServerFunction,
  registerServerReference,
  staticFunction as serverStatic
} from "../../src/server-functions/server";
import { RequestContext } from "../../src/server";

// Minimal AsyncLocalStorage stand-in so request-event scoping works without
// node:async_hooks (mirrors what provideRequestEvent parks on the global).
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

// A recording staticCache: the tests assert on exactly what the prerender
// writer would have been handed.
function recordingCache() {
  const entries = [];
  return {
    entries,
    cache: {
      set(entry) {
        entries.push(entry);
      }
    }
  };
}

function withStaticCache(cache, run) {
  configureServerFunctionsServer({ staticCache: cache });
  return Promise.resolve(run()).finally(() => {
    configureServerFunctionsServer({ staticCache: null });
  });
}

function runInRequest(fn) {
  const event = { request: new Request("http://localhost/"), locals: {} };
  return globalThis[RequestContext].run(event, fn);
}

describe("static cache keys", () => {
  it("derives identical keys for equal JSON-safe args across calls", async () => {
    const a = await getStaticCacheKey("fn-0", ["docs", 2]);
    const b = await getStaticCacheKey("fn-0", ["docs", 2]);
    expect(a).toBe(b);
    expect(a).toMatch(/^fn-0-[0-9a-f]{8}$/);
  });

  it("is insensitive to object key insertion order", async () => {
    const a = await getStaticCacheKey("fn-0", [{ page: 1, tag: "x" }]);
    const b = await getStaticCacheKey("fn-0", [{ tag: "x", page: 1 }]);
    expect(a).toBe(b);
    const nestedA = await getStaticCacheKey("fn-0", [{ q: { a: 1, b: 2 }, list: [1] }]);
    const nestedB = await getStaticCacheKey("fn-0", [{ list: [1], q: { b: 2, a: 1 } }]);
    expect(nestedA).toBe(nestedB);
  });

  it("derives identical keys for equal codec-encoded args", async () => {
    // Dates force the codec path — the framed string is deterministic for
    // equal values, so both peers still agree
    const a = await getStaticCacheKey("fn-0", [new Date(0), new Map([["k", 1]])]);
    const b = await getStaticCacheKey("fn-0", [new Date(0), new Map([["k", 1]])]);
    expect(a).toBe(b);
  });

  it("distinguishes different args, different ids, and the no-args case", async () => {
    const none = await getStaticCacheKey("fn-0", []);
    const one = await getStaticCacheKey("fn-0", [1]);
    const two = await getStaticCacheKey("fn-0", [2]);
    expect(none).not.toBe(one);
    expect(one).not.toBe(two);
    expect(await getStaticCacheKey("fn-1", [1])).not.toBe(one);
    // no args encodes to the empty string, so the key is id + hash alone
    expect(await encodeArgumentsKey([])).toBe("");
    expect(none).toBe(await getStaticCacheKey("fn-0", []));
  });

  it("encodes arguments canonically", async () => {
    expect(await encodeArgumentsKey([{ b: 2, a: 1 }])).toBe('[{"a":1,"b":2}]');
    // codec-encoded args carry the frame prefix — visibly not JSON
    expect((await encodeArgumentsKey([new Date(0)])).startsWith(";0x")).toBe(true);
  });

  it("normalizes ids that cannot ride a URL path or filename", async () => {
    // `#` starts a URL fragment and `/` a path segment — the readable
    // prefix is normalized while the raw id still feeds the hash
    const key = await getStaticCacheKey("src/actions.ts#getUser", []);
    expect(key).toMatch(/^src_actions.ts_getUser-[0-9a-f]{8}$/);
    // normalized-away distinctions stay distinct through the hash
    expect(await getStaticCacheKey("fn#0", [])).not.toBe(await getStaticCacheKey("fn/0", []));
  });

  it("names artifacts {key}.txt", () => {
    expect(staticArtifactName("fn-0-abcd1234")).toBe("fn-0-abcd1234.txt");
  });
});

describe("server capture", () => {
  it("captures in-process SSR calls through the apply trap", async () => {
    const { entries, cache } = recordingCache();
    const declared = serverStatic(
      createServerReference(
        registerServerReference("static-ssr-0", async n => ({ n, when: new Date(0) }))
      )
    );
    await withStaticCache(cache, async () => {
      const result = await runInRequest(() => declared(7));
      expect(result).toEqual({ n: 7, when: new Date(0) });
    });

    expect(entries).toHaveLength(1);
    const entry = entries[0];
    expect(entry.id).toBe("static-ssr-0");
    expect(entry.key).toBe(await getStaticCacheKey("static-ssr-0", [7]));
    expect(entry.filename).toBe(staticArtifactName(entry.key));
    expect(entry.args).toEqual([7]);
    expect(entry.value).toEqual({ n: 7, when: new Date(0) });
    // the payload is the framed wire format and round-trips to the value
    expect(entry.payload.startsWith(";0x")).toBe(true);
    expect(await deserializeString(entry.payload)).toEqual({ n: 7, when: new Date(0) });
  });

  it("captures rich types and resolved async values in the payload", async () => {
    const { entries, cache } = recordingCache();
    const declared = serverStatic(
      createServerReference(
        registerServerReference("static-rich-0", async () => ({
          tags: new Map([["a", 1]]),
          eventual: Promise.resolve("later")
        }))
      )
    );
    await withStaticCache(cache, () => runInRequest(() => declared()));

    expect(entries).toHaveLength(1);
    const decoded = await deserializeString(entries[0].payload);
    expect(decoded.tags).toEqual(new Map([["a", 1]]));
    await expect(decoded.eventual).resolves.toBe("later");
  });

  it("captures HTTP GET dispatch after transformResult", async () => {
    const { entries, cache } = recordingCache();
    serverStatic(createServerReference(registerServerReference("static-http-0", async n => n * 2)));
    const encodedArgs = encodeURIComponent(JSON.stringify([21]));
    let response;
    await withStaticCache(cache, async () => {
      response = await handleServerFunctionRequest(
        new Request(`http://localhost/_server?id=static-http-0&args=${encodedArgs}`, {
          method: "GET",
          headers: { "X-Server-Function-Instance": "server-function:test" }
        }),
        { transformResult: (event, result) => ({ doubled: result }) }
      );
    });
    expect(response.status).toBe(200);

    // the artifact holds the transformed result — exactly what a live GET
    // would have answered with
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("static-http-0");
    expect(entries[0].args).toEqual([21]);
    expect(entries[0].key).toBe(await getStaticCacheKey("static-http-0", [21]));
    expect(await deserializeString(entries[0].payload)).toEqual({ doubled: 42 });
  });

  it("never captures thrown errors", async () => {
    const { entries, cache } = recordingCache();
    const declared = serverStatic(
      createServerReference(
        registerServerReference("static-throw-0", async () => {
          throw new Error("kaboom");
        })
      )
    );
    await withStaticCache(cache, async () => {
      await expect(runInRequest(() => declared())).rejects.toThrow("kaboom");
      const response = await handleServerFunctionRequest(
        new Request("http://localhost/_server?id=static-throw-0", {
          method: "GET",
          headers: { "X-Server-Function-Instance": "server-function:test" }
        })
      );
      expect(response.headers.get("X-Server-Function-Error")).toBe("kaboom");
    });
    expect(entries).toHaveLength(0);
  });

  it("never captures Response or ResponseEnvelope results", async () => {
    const { entries, cache } = recordingCache();
    const rawResponse = serverStatic(
      createServerReference(
        registerServerReference("static-response-0", async () => new Response("verbatim"))
      )
    );
    const envelope = serverStatic(
      createServerReference(
        registerServerReference("static-envelope-0", async () =>
          respond({ ok: true }, { revalidate: "/notes" })
        )
      )
    );
    await withStaticCache(cache, async () => {
      await runInRequest(() => rawResponse());
      await runInRequest(() => envelope());
      await handleServerFunctionRequest(
        new Request("http://localhost/_server?id=static-envelope-0", {
          method: "GET",
          headers: { "X-Server-Function-Instance": "server-function:test" }
        })
      );
    });
    expect(entries).toHaveLength(0);
  });

  it("never captures functions that did not declare static", async () => {
    const { entries, cache } = recordingCache();
    const plain = createServerReference(
      registerServerReference("static-undeclared-0", async () => "value")
    );
    await withStaticCache(cache, async () => {
      expect(await runInRequest(() => plain())).toBe("value");
      // POST dispatch to a plain function under a configured cache
      const response = await handleServerFunctionRequest(
        new Request("http://localhost/_server", {
          method: "POST",
          headers: {
            [FUNCTION_HEADER]: "static-undeclared-0",
            "X-Server-Function-Instance": "server-function:test"
          }
        })
      );
      expect(response.status).toBe(200);
    });
    expect(entries).toHaveLength(0);
  });

  it("captures nothing without a configured staticCache", async () => {
    const declared = serverStatic(
      createServerReference(registerServerReference("static-nocache-0", async () => "value"))
    );
    // no cache configured: the call resolves exactly as before
    expect(await runInRequest(() => declared())).toBe("value");
  });

  it("a failing cache write never breaks the call it observed", async () => {
    const declared = serverStatic(
      createServerReference(registerServerReference("static-failwrite-0", async () => "value"))
    );
    await withStaticCache(
      {
        set() {
          throw new Error("disk full");
        }
      },
      async () => {
        expect(await runInRequest(() => declared())).toBe("value");
      }
    );
  });
});

describe("client production path", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    globalThis.fetch = originalFetch;
  });

  function mockFetch(handler) {
    const requests = [];
    globalThis.fetch = (url, init) => {
      requests.push({ url: String(url), init });
      return Promise.resolve(handler(String(url), init));
    };
    return requests;
  }

  it("fetches the captured artifact and resolves the decoded value", async () => {
    // capture on the server first — the client must replay the same bytes
    const { entries, cache } = recordingCache();
    const declared = serverStatic(
      createServerReference(
        registerServerReference("static-e2e-0", async (slug, opts) => ({
          slug,
          page: opts.page,
          when: new Date(0)
        }))
      )
    );
    await withStaticCache(cache, () => runInRequest(() => declared("intro", { page: 2 })));
    expect(entries).toHaveLength(1);

    process.env.NODE_ENV = "production";
    const requests = mockFetch(url => {
      expect(url).toBe(`/_server-static/${entries[0].filename}`);
      return new Response(entries[0].payload);
    });
    // key-order insensitivity holds across the wire: the client passes the
    // options object with its keys in the other order
    const result = await clientStatic(createClientReference("static-e2e-0"))("intro", {
      page: 2
    });
    expect(result).toEqual({ slug: "intro", page: 2, when: new Date(0) });
    // a plain asset fetch: no server-function headers, no RequestInit at all
    expect(requests).toHaveLength(1);
    expect(requests[0].init).toBeUndefined();
  });

  it("throws naming the function id and key on a non-OK response", async () => {
    process.env.NODE_ENV = "production";
    mockFetch(() => new Response(null, { status: 404 }));
    const callable = clientStatic(createClientReference("static-miss-0"));
    const key = await getStaticCacheKey("static-miss-0", ["nope"]);
    await expect(callable("nope")).rejects.toThrow(
      new RegExp(`"static-miss-0".*"${key}".*404`, "s")
    );
  });

  it("fetches from the configured staticEndpoint", async () => {
    process.env.NODE_ENV = "production";
    const key = await getStaticCacheKey("static-endpoint-0", []);
    const payload = await serializeString("value");
    const requests = mockFetch(() => new Response(payload));
    configureServerFunctionsClient({ staticEndpoint: "/assets/static-fns" });
    try {
      const result = await clientStatic(createClientReference("static-endpoint-0"))();
      expect(result).toBe("value");
      expect(requests[0].url).toBe(`/assets/static-fns/${staticArtifactName(key)}`);
    } finally {
      configureServerFunctionsClient({ staticEndpoint: "/_server-static" });
    }
  });

  it("answers from responseHandler.intercept without fetching", async () => {
    process.env.NODE_ENV = "production";
    const requests = mockFetch(() => new Response(null, { status: 404 }));
    configureServerFunctionsClient({
      responseHandler: {
        intercept: ({ id, args }) => (id === "static-intercept-0" ? `local:${args[0]}` : undefined),
        handle: () => undefined
      }
    });
    try {
      const result = await clientStatic(createClientReference("static-intercept-0"))("x");
      expect(result).toBe("local:x");
      expect(requests).toHaveLength(0);
    } finally {
      configureServerFunctionsClient({ responseHandler: null });
    }
  });
});

describe("client development path", () => {
  it("calls the live GET transport exactly like the GET wrapper", async () => {
    // NODE_ENV is "test" here — not production — so the wrapper must issue
    // a live GET request against the configured endpoint
    serverStatic(createServerReference(registerServerReference("static-dev-0", async n => n + 1)));
    const seen = {};
    const original = globalThis.fetch;
    globalThis.fetch = (url, init) => {
      seen.url = String(url);
      seen.method = init.method;
      return handleServerFunctionRequest(new Request(new URL(url, "http://localhost"), init));
    };
    try {
      const result = await clientStatic(createClientReference("static-dev-0"))(41);
      expect(result).toBe(42);
      expect(seen.method).toBe("GET");
      expect(seen.url).toContain("id=static-dev-0");
      expect(seen.url).toContain("&args=");
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("declaration metadata", () => {
  it("brands method GET and static on both halves", () => {
    const client = clientStatic(createClientReference("static-md-0"));
    expect(isServerFunction(client)).toBe(true);
    expect(client.id).toBe("static-md-0");
    expect(getServerFunctionMetadata(client)).toEqual({ method: "GET", static: true });

    const server = serverStatic(
      createServerReference(registerServerReference("static-md-1", async () => {}))
    );
    expect(isServerFunction(server)).toBe(true);
    expect(getServerFunctionMetadata(server)).toEqual({ method: "GET", static: true });
  });

  it("server staticFunction is identity and SSR calls stay in-process", async () => {
    const spy = jest.fn(async n => n + 1);
    const ref = createServerReference(registerServerReference("static-md-2", spy));
    const declared = serverStatic(ref);
    expect(declared).toBe(ref);
    expect(await runInRequest(() => declared(41))).toBe(42);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("composes with withMeta in either order", () => {
    const inside = clientStatic(withMeta(createClientReference("static-md-3"), { tenant: "x" }));
    expect(getServerFunctionMetadata(inside)).toEqual({
      method: "GET",
      static: true,
      tenant: "x"
    });

    const outside = withMeta(clientStatic(createClientReference("static-md-3")), {
      tenant: "x"
    });
    expect(getServerFunctionMetadata(outside)).toEqual({
      method: "GET",
      static: true,
      tenant: "x"
    });

    const server = withMeta(
      serverStatic(createServerReference(registerServerReference("static-md-4", async () => {}))),
      { tenant: "x" }
    );
    expect(getServerFunctionMetadata(server)).toEqual({
      method: "GET",
      static: true,
      tenant: "x"
    });
  });

  it("grants GET dispatch (static implies GET)", async () => {
    serverStatic(
      createServerReference(registerServerReference("static-md-get-0", async () => "ok"))
    );
    const response = await handleServerFunctionRequest(
      new Request("http://localhost/_server?id=static-md-get-0", { method: "GET" })
    );
    expect(response.status).toBe(200);

    // a plain function still answers GET with 405
    registerServerFunction("static-md-plain-0", async () => "x");
    const denied = await handleServerFunctionRequest(
      new Request("http://localhost/_server?id=static-md-plain-0", { method: "GET" })
    );
    expect(denied.status).toBe(405);
  });

  it("rejects non-references", () => {
    expect(() => clientStatic(async () => {})).toThrow(
      "staticFunction expects a server function reference"
    );
    expect(() => serverStatic(async () => {})).toThrow(
      "staticFunction expects a server function reference"
    );
  });
});
