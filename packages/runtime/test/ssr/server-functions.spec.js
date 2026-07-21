/**
 * @jest-environment node
 */
import {
  ResponseEnvelope,
  isHref,
  isResponseEnvelope,
  redirect,
  reload,
  respond
} from "../../src/response";
import {
  BODY_FORMAT_HEADER,
  BodyFormat,
  ERROR_HEADER,
  FILE_FORM_KEY,
  SINGLE_FLIGHT_HEADER,
  decodeErrorHeaderValue,
  decodeResponse,
  deserializeStream,
  deserializeString,
  encodeErrorHeaderValue,
  extractBody,
  getHeadersAndBody,
  getServerFunctionMetadata,
  isServerFunction,
  serializeStream,
  serializeString,
  subscribeFlightData,
  withMeta
} from "../../src/server-functions/shared";
import {
  GET as clientGET,
  createServerReference as createClientReference,
  configureServerFunctionsClient
} from "../../src/server-functions/client";
import {
  GET as serverGET,
  configureServerFunctionsServer,
  createServerReference,
  getServerFunction,
  getServerFunctionMeta,
  handleServerFunctionRequest,
  registerServerFunction,
  registerServerReference
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

describe("body negotiation", () => {
  it("directly encodes strings", async () => {
    const encoded = getHeadersAndBody("hello");
    expect(encoded.headers[BODY_FORMAT_HEADER]).toBe(BodyFormat.String);
    const decoded = await extractBody(new Response(encoded.body, { headers: encoded.headers }));
    expect(decoded).toBe("hello");
  });

  it("directly encodes FormData", async () => {
    const form = new FormData();
    form.set("a", "1");
    const encoded = getHeadersAndBody(form);
    expect(encoded.headers[BODY_FORMAT_HEADER]).toBe(BodyFormat.FormData);
    const decoded = await extractBody(new Response(encoded.body, { headers: encoded.headers }));
    expect(decoded).toBeInstanceOf(FormData);
    expect(decoded.get("a")).toBe("1");
  });

  it("directly encodes URLSearchParams", async () => {
    const encoded = getHeadersAndBody(new URLSearchParams("a=1&b=2"));
    expect(encoded.headers[BODY_FORMAT_HEADER]).toBe(BodyFormat.URLSearchParams);
    const decoded = await extractBody(new Response(encoded.body, { headers: encoded.headers }));
    expect(decoded).toBeInstanceOf(URLSearchParams);
    expect(decoded.get("b")).toBe("2");
  });

  it("directly encodes a File via FormData", async () => {
    const file = new File(["contents"], "notes.txt", { type: "text/plain" });
    const encoded = getHeadersAndBody(file);
    expect(encoded.headers[BODY_FORMAT_HEADER]).toBe(BodyFormat.File);
    expect(encoded.body.get(FILE_FORM_KEY)).toBeTruthy();
    const decoded = await extractBody(new Response(encoded.body, { headers: encoded.headers }));
    expect(decoded.name).toBe("notes.txt");
    expect(await decoded.text()).toBe("contents");
  });

  it("directly encodes binary bodies", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const encoded = getHeadersAndBody(bytes);
    expect(encoded.headers[BODY_FORMAT_HEADER]).toBe(BodyFormat.Uint8Array);
    const decoded = await extractBody(new Response(encoded.body, { headers: encoded.headers }));
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect([...decoded]).toEqual([1, 2, 3]);
  });

  it("falls back to the codec for structured values", () => {
    expect(getHeadersAndBody({ nested: true })).toBeUndefined();
    expect(getHeadersAndBody([1, 2])).toBeUndefined();
    expect(getHeadersAndBody(42)).toBeUndefined();
  });

  it("sniffs form posts without a format header", async () => {
    const decoded = await extractBody(
      new Response("a=1", {
        headers: { "content-type": "application/x-www-form-urlencoded" }
      })
    );
    expect(decoded).toBeInstanceOf(URLSearchParams);
    expect(decoded.get("a")).toBe("1");
  });
});

describe("framed codec streams", () => {
  it("roundtrips plain values", async () => {
    const value = { name: "solid", tags: ["a", "b"], count: 3, when: new Date(0) };
    const text = await serializeString(value);
    expect(text.startsWith(";0x")).toBe(true);
    const decoded = await deserializeString(text);
    expect(decoded).toEqual(value);
  });

  it("roundtrips async values across chunks", async () => {
    const value = { immediate: 1, eventual: Promise.resolve("later") };
    const decoded = await deserializeStream(new Response(serializeStream(value)));
    expect(decoded.immediate).toBe(1);
    await expect(decoded.eventual).resolves.toBe("later");
  });

  it("roundtrips values larger than one network chunk", async () => {
    const value = { blob: "x".repeat(100000) };
    const decoded = await deserializeString(await serializeString(value));
    expect(decoded.blob.length).toBe(100000);
  });

  it("rejects malformed streams", async () => {
    await expect(deserializeString("not a chunk")).rejects.toThrow(
      "Malformed server function stream."
    );
  });

  it("decodes responses via decodeResponse", async () => {
    const value = { flight: ["a", "b"] };
    const response = new Response(serializeStream(value), {
      headers: { [BODY_FORMAT_HEADER]: BodyFormat.Serialized }
    });
    expect(await decodeResponse(response)).toEqual(value);
  });

  it("decodes empty responses to undefined", async () => {
    expect(await decodeResponse(new Response(null, { status: 302 }))).toBeUndefined();
  });
});

describe("response helpers", () => {
  it("redirect carries location, status and revalidation keys", () => {
    const response = redirect("/login");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");

    const custom = redirect("/next", { status: 307, revalidate: ["/notes", "/tags"] });
    expect(custom.status).toBe(307);
    expect(custom.headers.get("X-Revalidate")).toBe("/notes,/tags");

    expect(redirect("/x", 303).status).toBe(303);
  });

  it("reload carries revalidation keys", () => {
    expect(reload().headers.get("X-Revalidate")).toBeNull();
    expect(reload({ revalidate: "/notes" }).headers.get("X-Revalidate")).toBe("/notes");
  });

  it("redirect accepts Href-branded values and rejects unbranded objects", () => {
    // an integration's typed path object: coerces via toString, branded
    // with the registered symbol (identity survives module copies)
    const path = {
      [Symbol.for("solid.Href")]: true,
      toString: () => "/users/5"
    };
    expect(isHref(path)).toBe(true);
    expect(redirect(path).headers.get("Location")).toBe("/users/5");

    // callable values (proxy-based path builders) qualify too
    const callablePath = Object.assign(() => "/users", {
      [Symbol.for("solid.Href")]: true,
      toString: () => "/users"
    });
    expect(isHref(callablePath)).toBe(true);
    expect(redirect(callablePath).headers.get("Location")).toBe("/users");

    // toString alone is every object in the language — without the brand
    // redirect would silently emit "[object Object]"
    expect(isHref({ toString: () => "/x" })).toBe(false);
    expect(() => redirect({ toString: () => "/x" })).toThrow(TypeError);
    expect(() => redirect(undefined)).toThrow(TypeError);
  });

  it("recognizes envelopes across module copies", () => {
    // simulate the core entry and server-functions entry each bundling
    // their own copy of the class — the registered-symbol brand must hold
    class OtherCopy {
      constructor(response, value) {
        this.response = response;
        this.value = value;
      }
    }
    OtherCopy.prototype[Symbol.for("solid.ResponseEnvelope")] = true;
    expect(isResponseEnvelope(new OtherCopy(undefined, 1))).toBe(true);
    expect(new OtherCopy(undefined, 1)).not.toBeInstanceOf(ResponseEnvelope);
    expect(isResponseEnvelope({ response: undefined, value: 1 })).toBe(false);
  });

  it("respond pairs the value with metadata and a real JSON body", async () => {
    const result = respond({ ok: true }, { revalidate: "/notes", status: 201 });
    expect(result).toBeInstanceOf(ResponseEnvelope);
    expect(isResponseEnvelope(result)).toBe(true);
    expect(result.value).toEqual({ ok: true });
    expect(result.response.status).toBe(201);
    expect(result.response.headers.get("X-Revalidate")).toBe("/notes");
    // invisible PE: consumers without the client runtime get real JSON
    expect(result.response.headers.get("Content-Type")).toBe("application/json");
    expect(await result.response.json()).toEqual({ ok: true });

    // values without a JSON form still carry through `value` for
    // integrations — e.g. a function (the server-component convention)
    const Component = () => null;
    expect(respond(Component, { revalidate: "/notes" }).value).toBe(Component);
  });
});

describe("registration", () => {
  it("registers and resolves server references", () => {
    const fn = async () => "result";
    const reference = registerServerReference("fn#0", fn);
    expect(reference).toEqual({ id: "fn#0", fn });
    expect(getServerFunction("fn#0")).toBe(fn);
  });

  it("throws for unknown ids", () => {
    expect(() => getServerFunction("missing")).toThrow("invalid server function: missing");
  });

  it("runs server-side callables under a derived request event", async () => {
    const seen = {};
    const fn = async () => {
      seen.meta = getServerFunctionMeta();
      return "ok";
    };
    const reference = registerServerReference("meta#0", fn);
    const callable = createServerReference(reference);

    const event = { request: new Request("http://localhost/"), locals: {} };
    const result = await globalThis[RequestContext].run(event, () => callable());
    expect(result).toBe("ok");
    expect(seen.meta).toEqual({ id: "meta#0" });
  });

  it("rejects server-side callables outside of a request", () => {
    const callable = createServerReference(registerServerReference("outside#0", async () => {}));
    expect(() => callable()).toThrow("Cannot call server function outside of a request");
  });

  it("exposes a url on server-side callables", () => {
    const callable = createServerReference(registerServerReference("url#0", async () => {}));
    expect(callable.url).toBe("/_server?id=url%230");
  });

  it("prefixes urls with the configured endpoint", () => {
    configureServerFunctionsServer({ endpoint: "/base/_server" });
    try {
      const callable = createServerReference(registerServerReference("url#1", async () => {}));
      expect(callable.url).toBe("/base/_server?id=url%231");
    } finally {
      configureServerFunctionsServer({ endpoint: "/_server" });
    }
  });
});

describe("handler", () => {
  function dispatch(request, options) {
    return handleServerFunctionRequest(request, options);
  }

  // Routes the client transport's fetch straight into the handler so the
  // full client -> wire -> server -> wire -> client path is exercised.
  function connectTransport(options) {
    const original = globalThis.fetch;
    globalThis.fetch = (url, init) =>
      dispatch(new Request(new URL(url, "http://localhost"), init), options);
    return () => {
      globalThis.fetch = original;
    };
  }

  it("404s for missing and unknown ids", async () => {
    const missing = await dispatch(new Request("http://localhost/_server", { method: "POST" }));
    expect(missing.status).toBe(404);

    const unknown = await dispatch(
      new Request("http://localhost/_server?id=nope", { method: "POST" })
    );
    expect(unknown.status).toBe(404);
  });

  it("roundtrips a full client call", async () => {
    registerServerFunction("echo-0", async (a, b) => ({ sum: a + b, when: new Date(0) }));
    const restore = connectTransport();
    try {
      const callable = createClientReference("echo-0");
      const result = await callable(2, 3);
      expect(result).toEqual({ sum: 5, when: new Date(0) });
    } finally {
      restore();
    }
  });

  it("roundtrips single direct-encoded arguments", async () => {
    registerServerFunction("form-0", async form => form.get("name"));
    const restore = connectTransport();
    try {
      const form = new FormData();
      form.set("name", "solid");
      const result = await createClientReference("form-0")(form);
      expect(result).toBe("solid");
    } finally {
      restore();
    }
  });

  it("prepends url-encoded bound args to natural-encoding instance posts", async () => {
    // A router intercepting a server-rendered form action url
    // (`?id=...&args=[7]`) posts the FormData to that url verbatim with the
    // client transport. The server reconstructs [boundArgs..., formData]
    // from url + body exactly as it does for no-JS posts.
    registerServerFunction("bound-form-0", async (bound, form) => `${bound}:${form.get("name")}`);
    const restore = connectTransport();
    try {
      const callable = createClientReference(
        "bound-form-0",
        undefined,
        "/_server?id=bound-form-0&args=%5B7%5D"
      );
      const form = new FormData();
      form.set("name", "solid");
      expect(await callable(form)).toBe("7:solid");
    } finally {
      restore();
    }
  });

  it("ignores url args for codec-serialized bodies", async () => {
    // Client stubs with bound args serialize the full argument array in the
    // body; a stray `args` in the url must not double-apply.
    registerServerFunction("bound-serialized-0", async (...args) => args);
    const restore = connectTransport();
    try {
      const callable = createClientReference(
        "bound-serialized-0",
        undefined,
        "/_server?id=bound-serialized-0&args=%5B7%5D"
      );
      // two args force the codec path (no natural single-arg encoding)
      expect(await callable("a", "b")).toEqual(["a", "b"]);
    } finally {
      restore();
    }
  });

  it("roundtrips GET calls with query-encoded args", async () => {
    // the server half of GET records the method declaration for dispatch
    serverGET(createServerReference(registerServerReference("get-0", async n => n * 2)));
    const restore = connectTransport();
    try {
      const result = await clientGET(createClientReference("get-0"))(21);
      expect(result).toBe(42);
    } finally {
      restore();
    }
  });

  it("propagates thrown errors to the client", async () => {
    registerServerFunction("boom-0", async () => {
      throw new Error("kaboom");
    });
    const restore = connectTransport();
    try {
      await expect(createClientReference("boom-0")()).rejects.toThrow("kaboom");
    } finally {
      restore();
    }
  });

  describe("error header encoding", () => {
    // Header values are latin1 ByteStrings: without the encoding guard,
    // Headers.set throws on messages with code points above U+00FF and the
    // whole call collapses into a bare 500 (solidjs/solid-start#1874).
    const NON_LATIN1_MESSAGES = {
      cjk: "服务器错误：找不到用户",
      emoji: "rocket failed 🚀💥",
      mixed: "Ошибка 🚀 ünïcode — special chars"
    };

    it("keeps plain ASCII messages verbatim on the wire", async () => {
      registerServerFunction("err-ascii-0", async () => {
        throw new Error("plain ascii message");
      });
      const response = await dispatch(
        new Request("http://localhost/_server", {
          method: "POST",
          headers: {
            "X-Server-Function-Id": "err-ascii-0",
            "X-Server-Function-Instance": "server-function:test"
          }
        })
      );
      // fast path: byte-identical to the historical wire format
      expect(response.headers.get(ERROR_HEADER)).toBe("plain ascii message");
      expect(decodeErrorHeaderValue(response.headers.get(ERROR_HEADER))).toBe(
        "plain ascii message"
      );
    });

    for (const [label, message] of Object.entries(NON_LATIN1_MESSAGES)) {
      it(`round-trips a ${label} message through the header`, async () => {
        const id = `err-${label}-0`;
        registerServerFunction(id, async () => {
          throw new Error(message);
        });
        const response = await dispatch(
          new Request("http://localhost/_server", {
            method: "POST",
            headers: {
              "X-Server-Function-Id": id,
              "X-Server-Function-Instance": "server-function:test"
            }
          })
        );
        // the response encoded without throwing, tagged as an error
        expect(response.status).toBe(200);
        const header = response.headers.get(ERROR_HEADER);
        expect(header).not.toBeNull();
        // decoded header restores the message exactly (astral planes included)
        expect(decodeErrorHeaderValue(header)).toBe(message);
        // and the structured error in the body still carries it
        const decoded = await decodeResponse(response);
        expect(decoded).toBeInstanceOf(Error);
        expect(decoded.message).toBe(message);
      });

      it(`rejects the client call with the ${label} message intact`, async () => {
        const id = `err-${label}-client-0`;
        registerServerFunction(id, async () => {
          throw new Error(message);
        });
        const restore = connectTransport();
        try {
          await expect(createClientReference(id)()).rejects.toThrow(message);
        } finally {
          restore();
        }
      });
    }

    it("encodes and decodes symmetrically at the codec level", () => {
      for (const message of [
        "plain",
        "",
        "true",
        ...Object.values(NON_LATIN1_MESSAGES),
        "𝒜stral 𝔻ata", // astral-plane letters
        "  padded  ", // Headers.set would trim these
        "=?1?looks-already-encoded", // verbatim marker collision
        "line\r\nbreaks stripped"
      ]) {
        const encoded = encodeErrorHeaderValue(message);
        // must be settable on real Headers without throwing or mutating
        const headers = new Headers();
        headers.set(ERROR_HEADER, encoded);
        expect(headers.get(ERROR_HEADER)).toBe(encoded);
        expect(decodeErrorHeaderValue(headers.get(ERROR_HEADER))).toBe(
          message.replace(/[\r\n]+/g, "")
        );
      }
    });

    it("never throws on lone surrogates", () => {
      const encoded = encodeErrorHeaderValue("broken \uD800 surrogate");
      const headers = new Headers();
      headers.set(ERROR_HEADER, encoded);
      expect(decodeErrorHeaderValue(encoded)).toBe("broken \uFFFD surrogate");
    });

    it("passes unmarked values through decode untouched", () => {
      expect(decodeErrorHeaderValue("kaboom")).toBe("kaboom");
      expect(decodeErrorHeaderValue("true")).toBe("true");
      expect(decodeErrorHeaderValue("50%25 there")).toBe("50%25 there");
    });
  });

  it("provides the request event and meta during handling", async () => {
    const seen = {};
    registerServerFunction("meta-1", async () => {
      seen.meta = getServerFunctionMeta();
      return null;
    });
    const restore = connectTransport();
    try {
      await createClientReference("meta-1")();
      expect(seen.meta).toEqual({ id: "meta-1" });
    } finally {
      restore();
    }
  });

  it("passes raw responses through untouched", async () => {
    registerServerFunction(
      "raw-0",
      async () =>
        new Response("raw body", {
          headers: { "X-Content-Raw": "true", "content-type": "text/plain" }
        })
    );
    const response = await dispatch(
      new Request("http://localhost/_server", {
        method: "POST",
        headers: {
          "X-Server-Function-Id": "raw-0",
          "X-Server-Function-Instance": "server-function:test"
        }
      })
    );
    expect(await response.text()).toBe("raw body");
    expect(response.headers.get("X-Content-Raw")).toBe("true");
  });

  it("forwards headers and non-redirect statuses from returned responses", async () => {
    registerServerFunction(
      "resp-0",
      async () => new Response(null, { status: 201, headers: { "X-Custom": "yes" } })
    );
    const response = await dispatch(
      new Request("http://localhost/_server", {
        method: "POST",
        headers: {
          "X-Server-Function-Id": "resp-0",
          "X-Server-Function-Instance": "server-function:test"
        }
      })
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("X-Custom")).toBe("yes");
  });

  it("lets transformResult replace the outcome", async () => {
    registerServerFunction("wrap-0", async () => "inner");
    const response = await dispatch(
      new Request("http://localhost/_server", {
        method: "POST",
        headers: {
          "X-Server-Function-Id": "wrap-0",
          "X-Server-Function-Instance": "server-function:test"
        }
      }),
      {
        transformResult: (event, result) => `${result}+wrapped`
      }
    );
    const decoded = await extractBody(response);
    expect(decoded).toBe("inner+wrapped");
  });

  it("sends metadata + payload via ResponseEnvelope", async () => {
    registerServerFunction("flight-0", async () => "action result");
    const response = await dispatch(
      new Request("http://localhost/_server", {
        method: "POST",
        headers: {
          "X-Server-Function-Id": "flight-0",
          "X-Server-Function-Instance": "server-function:test"
        }
      }),
      {
        transformResult: (event, result) =>
          new ResponseEnvelope(new Response(null, { headers: { "X-Single-Flight": "true" } }), {
            value: result,
            data: { "/notes": ["fresh"] }
          })
      }
    );
    expect(response.headers.get("X-Single-Flight")).toBe("true");
    const decoded = await decodeResponse(response);
    expect(decoded).toEqual({ value: "action result", data: { "/notes": ["fresh"] } });
  });

  it("serves respond() results to scripted clients and raw HTTP alike", async () => {
    registerServerFunction("respond-0", async () =>
      respond({ ok: true }, { revalidate: "/notes" })
    );
    // scripted client: passthrough Response (X-Revalidate present), decoded explicitly
    const restore = connectTransport();
    try {
      const viaClient = await createClientReference("respond-0")();
      expect(viaClient).toBeInstanceOf(Response);
      expect(viaClient.headers.get("X-Revalidate")).toBe("/notes");
      expect(await decodeResponse(viaClient)).toEqual({ ok: true });
    } finally {
      restore();
    }
    // no client runtime (no-JS form posts, direct HTTP): the carried JSON
    // body verbatim — progressive enhancement stays invisible
    const rawResponse = await dispatch(
      new Request("http://localhost/_server?id=respond-0", { method: "POST", body: "" })
    );
    expect(rawResponse.headers.get("Content-Type")).toBe("application/json");
    expect(await rawResponse.json()).toEqual({ ok: true });
  });

  it("raw Responses serve literal bodies for full control", async () => {
    registerServerFunction(
      "literal-json-0",
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" }
        })
    );
    const response = await dispatch(
      new Request("http://localhost/_server?id=literal-json-0", { method: "POST", body: "" })
    );
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("propagates thrown redirects with forwarded metadata", async () => {
    registerServerFunction("throw-redirect-0", async () => {
      throw redirect("/login", { revalidate: "/session" });
    });
    const response = await dispatch(
      new Request("http://localhost/_server", {
        method: "POST",
        headers: {
          "X-Server-Function-Id": "throw-redirect-0",
          "X-Server-Function-Instance": "server-function:test"
        }
      })
    );
    // redirect statuses are not forwarded to scripted clients; metadata is
    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBe("/login");
    expect(response.headers.get("X-Revalidate")).toBe("/session");
    expect(response.headers.get("X-Server-Function-Error")).toBe("true");
  });

  it("integration responses reach the caller whole and decode explicitly", async () => {
    registerServerFunction("redir-0", async () => "payload");
    const restore = connectTransport({
      transformResult: (event, result) =>
        new ResponseEnvelope(new Response(null, { headers: { "X-Revalidate": "/notes" } }), result)
    });
    try {
      const response = await createClientReference("redir-0")();
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("X-Revalidate")).toBe("/notes");
      expect(await decodeResponse(response)).toBe("payload");
    } finally {
      restore();
    }
  });

  it("lets handleNoJS own instanceless calls", async () => {
    registerServerFunction("nojs-0", async () => "value");
    const response = await dispatch(
      new Request("http://localhost/_server?id=nojs-0", { method: "POST", body: "" }),
      {
        handleNoJS: result =>
          new Response(null, { status: 302, headers: { Location: `/?flash=${result}` } })
      }
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/?flash=value");
  });
});

describe("single-flight", () => {
  function dispatch(request, options) {
    return handleServerFunctionRequest(request, options);
  }

  function connectTransport(options) {
    const original = globalThis.fetch;
    globalThis.fetch = (url, init) =>
      dispatch(new Request(new URL(url, "http://localhost"), init), options);
    return () => {
      globalThis.fetch = original;
    };
  }

  // A scripted call that opted into single-flight, like a router mutation.
  function flightRequest(id, extraHeaders) {
    return new Request("http://localhost/_server", {
      method: "POST",
      headers: {
        "X-Server-Function-Id": id,
        "X-Server-Function-Instance": "server-function:test",
        [SINGLE_FLIGHT_HEADER]: "true",
        ...extraHeaders
      }
    });
  }

  // The client half of the opt-in is subscribing: with a consumer
  // registered the transport sends the request header itself, so plain
  // references opt in automatically (see the consumer tests below).

  it("folds hook data into a success response as { value, data }", async () => {
    registerServerFunction("sf-plain-0", async () => "mutated");
    const seen = {};
    const response = await dispatch(flightRequest("sf-plain-0"), {
      collectFlightData: (event, outcome) => {
        seen.event = event;
        seen.outcome = outcome;
        return { "/notes": ["fresh"] };
      }
    });
    expect(response.headers.get(SINGLE_FLIGHT_HEADER)).toBe("true");
    expect(await decodeResponse(response)).toEqual({
      value: "mutated",
      data: { "/notes": ["fresh"] }
    });
    // enough context for any strategy: id, unwrapped value, no metadata
    // for a plain return, the untouched request, thrown flag
    expect(seen.outcome.id).toBe("sf-plain-0");
    expect(seen.outcome.value).toBe("mutated");
    expect(seen.outcome.response).toBeUndefined();
    expect(seen.outcome.request.headers.get(SINGLE_FLIGHT_HEADER)).toBe("true");
    expect(seen.outcome.thrown).toBe(false);
    expect(seen.event.request).toBe(seen.outcome.request);
  });

  it("supports async hooks and respond() envelopes", async () => {
    registerServerFunction("sf-respond-0", async () =>
      respond({ ok: true }, { revalidate: "/notes" })
    );
    const seen = {};
    const response = await dispatch(flightRequest("sf-respond-0"), {
      collectFlightData: async (event, outcome) => {
        seen.outcome = outcome;
        return { "/notes": ["fresh"] };
      }
    });
    // envelope metadata still forwards; the hook saw it for its strategy
    expect(response.headers.get("X-Revalidate")).toBe("/notes");
    expect(response.headers.get(SINGLE_FLIGHT_HEADER)).toBe("true");
    expect(seen.outcome.value).toEqual({ ok: true });
    expect(seen.outcome.response.headers.get("X-Revalidate")).toBe("/notes");
    expect(await decodeResponse(response)).toEqual({
      value: { ok: true },
      data: { "/notes": ["fresh"] }
    });
  });

  it("folds data into thrown redirects for the destination route", async () => {
    registerServerFunction("sf-redirect-0", async () => {
      throw redirect("/dashboard", { revalidate: "/session" });
    });
    const seen = {};
    const response = await dispatch(flightRequest("sf-redirect-0"), {
      collectFlightData: (event, outcome) => {
        seen.outcome = outcome;
        // a real integration reads the destination off the metadata and
        // produces that route's data — core just hands it the context
        return { destination: outcome.response.headers.get("Location") };
      }
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBe("/dashboard");
    expect(response.headers.get("X-Revalidate")).toBe("/session");
    expect(response.headers.get(SINGLE_FLIGHT_HEADER)).toBe("true");
    expect(seen.outcome.thrown).toBe(true);
    expect(seen.outcome.value).toBe(null);
    expect(await decodeResponse(response)).toEqual({
      value: null,
      data: { destination: "/dashboard" }
    });
  });

  it("is byte-identical to today when the hook returns undefined", async () => {
    registerServerFunction("sf-none-0", async () => ({ n: 1 }));
    const withHook = await dispatch(flightRequest("sf-none-0"), {
      collectFlightData: () => undefined
    });
    const withoutHook = await dispatch(flightRequest("sf-none-0"));
    expect(withHook.headers.has(SINGLE_FLIGHT_HEADER)).toBe(false);
    expect(withHook.status).toBe(withoutHook.status);
    expect([...withHook.headers.entries()]).toEqual([...withoutHook.headers.entries()]);
    expect(await withHook.text()).toBe(await withoutHook.text());
  });

  it("only collects for scripted calls that sent the request header", async () => {
    registerServerFunction("sf-optin-0", async () => "value");
    const hook = jest.fn(() => ({ data: true }));

    // no single-flight request header
    const plain = await dispatch(
      new Request("http://localhost/_server", {
        method: "POST",
        headers: {
          "X-Server-Function-Id": "sf-optin-0",
          "X-Server-Function-Instance": "server-function:test"
        }
      }),
      { collectFlightData: hook }
    );
    expect(plain.headers.has(SINGLE_FLIGHT_HEADER)).toBe(false);

    // no instance (no-JS form post) — header alone must not opt in
    const noJS = await dispatch(
      new Request("http://localhost/_server?id=sf-optin-0", {
        method: "POST",
        body: "",
        headers: { [SINGLE_FLIGHT_HEADER]: "true" }
      }),
      { collectFlightData: hook }
    );
    expect(noJS.headers.has(SINGLE_FLIGHT_HEADER)).toBe(false);
    expect(hook).not.toHaveBeenCalled();
  });

  it("never collects for plain thrown errors", async () => {
    registerServerFunction("sf-error-0", async () => {
      throw new Error("kaboom");
    });
    const hook = jest.fn(() => ({ data: true }));
    const response = await dispatch(flightRequest("sf-error-0"), { collectFlightData: hook });
    expect(hook).not.toHaveBeenCalled();
    expect(response.headers.has(SINGLE_FLIGHT_HEADER)).toBe(false);
    expect(response.headers.get("X-Server-Function-Error")).toBe("kaboom");
  });

  it("registers through configureServerFunctionsServer with per-handler override", async () => {
    registerServerFunction("sf-config-0", async () => "value");
    configureServerFunctionsServer({ collectFlightData: () => ({ from: "config" }) });
    try {
      const viaConfig = await dispatch(flightRequest("sf-config-0"));
      expect(await decodeResponse(viaConfig)).toEqual({
        value: "value",
        data: { from: "config" }
      });

      const overridden = await dispatch(flightRequest("sf-config-0"), {
        collectFlightData: () => ({ from: "handler" })
      });
      expect(await decodeResponse(overridden)).toEqual({
        value: "value",
        data: { from: "handler" }
      });
    } finally {
      configureServerFunctionsServer({ collectFlightData: null });
    }
  });

  it("subscribing opts calls in: the transport sends the request header itself", async () => {
    registerServerFunction("sf-header-0", async () => "value");
    const seenHeaders = [];
    const restore = connectTransport({
      collectFlightData: (event, outcome) => {
        seenHeaders.push(outcome.request.headers.get(SINGLE_FLIGHT_HEADER));
        return { collected: true };
      }
    });
    const unsubscribe = subscribeFlightData(() => {});
    try {
      await createClientReference("sf-header-0")();
      expect(seenHeaders).toEqual(["true"]);
    } finally {
      unsubscribe();
      restore();
    }
  });

  it("never sends the request header without a consumer", async () => {
    registerServerFunction("sf-noheader-0", async () => "value");
    const hook = jest.fn(() => ({ collected: true }));
    const restore = connectTransport({ collectFlightData: hook });
    try {
      // no consumer registered: the server is never asked to collect, the
      // call round-trips exactly like before the protocol existed
      const result = await createClientReference("sf-noheader-0")();
      expect(result).toBe("value");
      expect(hook).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it("keeps GET calls plain even with a consumer subscribed", async () => {
    serverGET(createServerReference(registerServerReference("sf-get-0", async () => "read")));
    const hook = jest.fn(() => ({ collected: true }));
    const restore = connectTransport({ collectFlightData: hook });
    const unsubscribe = subscribeFlightData(() => {});
    try {
      // reads are cacheable URLs — folding per-request flight data into
      // them would defeat caching, so only non-GET calls opt in
      const result = await clientGET(createClientReference("sf-get-0"))();
      expect(result).toBe("read");
      expect(hook).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
      restore();
    }
  });

  it("delivers data to the registered consumer and value to the caller", async () => {
    registerServerFunction("sf-client-0", async () => "mutated");
    const restore = connectTransport({
      collectFlightData: () => ({ "/notes": ["fresh"] })
    });
    const delivered = [];
    const unsubscribe = subscribeFlightData(async (data, context) => {
      // async consumers settle before the caller sees the value
      await Promise.resolve();
      delivered.push({ data, context });
    });
    try {
      const result = await createClientReference("sf-client-0")();
      expect(result).toBe("mutated");
      expect(delivered).toHaveLength(1);
      expect(delivered[0].data).toEqual({ "/notes": ["fresh"] });
      expect(delivered[0].context.response.headers.get(SINGLE_FLIGHT_HEADER)).toBe("true");
    } finally {
      unsubscribe();
      restore();
    }
  });

  it("hands redirect-with-data to the consumer through the envelope context", async () => {
    registerServerFunction("sf-client-redirect-0", async () => {
      throw redirect("/dashboard", { revalidate: "/session" });
    });
    const restore = connectTransport({
      collectFlightData: () => ({ "/dashboard": ["destination data"] })
    });
    const delivered = [];
    const unsubscribe = subscribeFlightData((data, context) => {
      delivered.push({ data, context });
    });
    try {
      // the redirect is the consumer's to interpret — the caller resolves
      const result = await createClientReference("sf-client-redirect-0")();
      expect(result).toBe(null);
      expect(delivered).toHaveLength(1);
      expect(delivered[0].data).toEqual({ "/dashboard": ["destination data"] });
      expect(delivered[0].context.response.headers.get("Location")).toBe("/dashboard");
      expect(delivered[0].context.response.headers.get("X-Revalidate")).toBe("/session");
    } finally {
      unsubscribe();
      restore();
    }
  });

  it("throws the value for bare error envelopes after delivering data", async () => {
    registerServerFunction("sf-client-error-0", async () => {
      // no Location / X-Revalidate — a genuine error result with metadata
      throw respond({ reason: "denied" }, { status: 403 });
    });
    const restore = connectTransport({
      collectFlightData: () => ({ "/notes": ["still fresh"] })
    });
    const delivered = [];
    const unsubscribe = subscribeFlightData(data => {
      delivered.push(data);
    });
    try {
      await expect(createClientReference("sf-client-error-0")()).rejects.toEqual({
        reason: "denied"
      });
      expect(delivered).toEqual([{ "/notes": ["still fresh"] }]);
    } finally {
      unsubscribe();
      restore();
    }
  });

  it("passes manually opted-in responses through whole without a consumer", async () => {
    registerServerFunction("sf-noconsumer-0", async () => "value");
    const restore = connectTransport({
      collectFlightData: () => ({ "/notes": ["fresh"] })
    });
    // an integration can still send the header by hand (session policy via
    // prepareRequest); with no consumer registered the tagged response
    // reaches the caller whole — the integration decodes it itself
    configureServerFunctionsClient({
      prepareRequest: init => ({
        ...init,
        headers: { ...init.headers, [SINGLE_FLIGHT_HEADER]: "true" }
      })
    });
    try {
      const response = await createClientReference("sf-noconsumer-0")();
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get(SINGLE_FLIGHT_HEADER)).toBe("true");
      expect(await decodeResponse(response)).toEqual({
        value: "value",
        data: { "/notes": ["fresh"] }
      });
    } finally {
      configureServerFunctionsClient({ prepareRequest: null });
      restore();
    }
  });

  it("unsubscribing restores plain calls and later registrations replace", async () => {
    registerServerFunction("sf-unsub-0", async () => "value");
    const hook = jest.fn(() => ({ data: true }));
    const restore = connectTransport({ collectFlightData: hook });
    const first = jest.fn();
    const second = jest.fn();
    const unsubscribeFirst = subscribeFlightData(first);
    const unsubscribeSecond = subscribeFlightData(second);
    try {
      await createClientReference("sf-unsub-0")();
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);

      // stale unsubscribe must not tear down the active consumer
      unsubscribeFirst();
      await createClientReference("sf-unsub-0")();
      expect(second).toHaveBeenCalledTimes(2);

      // unsubscribing removes the opt-in: no header, no collection
      unsubscribeSecond();
      hook.mockClear();
      const result = await createClientReference("sf-unsub-0")();
      expect(result).toBe("value");
      expect(hook).not.toHaveBeenCalled();
    } finally {
      unsubscribeSecond();
      restore();
    }
  });
});

describe("metadata channel", () => {
  it("brands references on both sides and exposes id", () => {
    const client = createClientReference("md-0");
    expect(isServerFunction(client)).toBe(true);
    expect(client.id).toBe("md-0");
    expect(getServerFunctionMetadata(client)).toEqual({});

    const server = createServerReference(registerServerReference("md-1", async () => {}));
    expect(isServerFunction(server)).toBe(true);
    expect(server.id).toBe("md-1");
    expect(getServerFunctionMetadata(server)).toEqual({});
  });

  it("rejects non-references", () => {
    expect(isServerFunction(() => {})).toBe(false);
    expect(getServerFunctionMetadata(() => {})).toBeUndefined();
    expect(isServerFunction(null)).toBe(false);
    expect(isServerFunction({})).toBe(false);
    expect(getServerFunctionMetadata({})).toBeUndefined();
  });

  it("recognizes references across module copies", () => {
    // simulate a separately bundled runtime copy branding its own
    // references — the registered-symbol brand must hold, like the
    // ResponseEnvelope one
    const foreign = () => {};
    foreign[Symbol.for("solid.ServerFunctionMetadata")] = { method: "GET" };
    expect(isServerFunction(foreign)).toBe(true);
    expect(getServerFunctionMetadata(foreign)).toEqual({ method: "GET" });
  });

  it("withMeta attaches user metadata, merging later writes", () => {
    const ref = createClientReference("md-2");
    expect(withMeta(ref, { requiresAuth: true })).toBe(ref);
    expect(getServerFunctionMetadata(ref)).toEqual({ requiresAuth: true });
    withMeta(ref, { tenant: "x" });
    expect(getServerFunctionMetadata(ref)).toEqual({ requiresAuth: true, tenant: "x" });
    expect(() => withMeta(() => {}, {})).toThrow("withMeta expects a server function reference");
  });

  it("withMeta composes with GET in either order", () => {
    const inside = clientGET(withMeta(createClientReference("md-3"), { tenant: "x" }));
    expect(getServerFunctionMetadata(inside)).toEqual({ method: "GET", tenant: "x" });

    const outside = withMeta(clientGET(createClientReference("md-3")), { tenant: "x" });
    expect(getServerFunctionMetadata(outside)).toEqual({ method: "GET", tenant: "x" });

    const server = withMeta(
      serverGET(createServerReference(registerServerReference("md-4", async () => {}))),
      { tenant: "x" }
    );
    expect(getServerFunctionMetadata(server)).toEqual({ method: "GET", tenant: "x" });
  });

  it("withMeta on server references leaves SSR calls in-process", async () => {
    const spy = jest.fn(async () => "ok");
    const server = withMeta(createServerReference(registerServerReference("md-5", spy)), {
      requiresAuth: true
    });
    expect(getServerFunctionMetadata(server)).toEqual({ requiresAuth: true });
    const event = { request: new Request("http://localhost/"), locals: {} };
    expect(await globalThis[RequestContext].run(event, () => server())).toBe("ok");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("seeds the compiler-emitted dev name on both sides", () => {
    // dev-mode compiled output passes the source name as the trailing ABI
    // argument; it lands on the metadata channel as a human-readable label
    const client = createClientReference("md-name-0", "sendMessage");
    expect(getServerFunctionMetadata(client)).toEqual({ name: "sendMessage" });

    const server = createServerReference(
      registerServerReference("md-name-1", async () => {}, "saveTodo")
    );
    expect(getServerFunctionMetadata(server)).toEqual({ name: "saveTodo" });
  });

  it("dev name is a default: explicit withMeta writes win", () => {
    const ref = createClientReference("md-name-2", "compiled");
    withMeta(ref, { name: "user label" });
    expect(getServerFunctionMetadata(ref)).toEqual({ name: "user label" });

    // other writes merge alongside without disturbing the seeded name
    const merged = createClientReference("md-name-3", "compiled");
    withMeta(merged, { requiresAuth: true });
    expect(getServerFunctionMetadata(merged)).toEqual({ name: "compiled", requiresAuth: true });
  });

  it("no name is seeded when none was emitted (prod / anonymous output)", () => {
    const client = createClientReference("md-name-4");
    expect(getServerFunctionMetadata(client)).toEqual({});
    expect("name" in getServerFunctionMetadata(client)).toBe(false);

    const server = createServerReference(registerServerReference("md-name-5", async () => {}));
    expect(getServerFunctionMetadata(server)).toEqual({});
    expect("name" in getServerFunctionMetadata(server)).toBe(false);
  });

  it("GET inherits the seeded dev name through the metadata channel", () => {
    const declared = clientGET(createClientReference("md-name-6", "getUser"));
    expect(getServerFunctionMetadata(declared)).toEqual({ method: "GET", name: "getUser" });
  });
});

describe("GET declaration", () => {
  it("client references expose id/url and no legacy escape hatches", () => {
    const ref = createClientReference("plain-0");
    expect(ref.id).toBe("plain-0");
    expect(ref.url).toBe("/_server?id=plain-0");
    // the shrunken reference contract: `GET(fn)` and `prepareRequest`
    // replaced the per-reference escape hatches
    expect(ref.GET).toBeUndefined();
    expect(ref.withOptions).toBeUndefined();
  });

  it("client GET produces a declared reference with id, url and metadata", () => {
    const ref = clientGET(createClientReference("getd-0"));
    expect(ref.id).toBe("getd-0");
    expect(ref.url).toBe("/_server?id=getd-0");
    expect(isServerFunction(ref)).toBe(true);
    expect(getServerFunctionMetadata(ref)).toEqual({ method: "GET" });
    expect(ref.GET).toBeUndefined();
    expect(ref.withOptions).toBeUndefined();
  });

  it("server GET is identity and SSR calls stay in-process", async () => {
    const spy = jest.fn(async n => n + 1);
    const ref = createServerReference(registerServerReference("getd-1", spy));
    const declared = serverGET(ref);
    expect(declared).toBe(ref);
    expect(getServerFunctionMetadata(declared)).toEqual({ method: "GET" });
    expect(declared.GET).toBeUndefined();
    expect(declared.withOptions).toBeUndefined();

    const event = { request: new Request("http://localhost/"), locals: {} };
    const result = await globalThis[RequestContext].run(event, () => declared(41));
    expect(result).toBe(42);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("rejects non-references", () => {
    expect(() => clientGET(async () => {})).toThrow("GET expects a server function reference");
    expect(() => serverGET(async () => {})).toThrow("GET expects a server function reference");
  });

  it("sends GET requests with args codec-encoded in the query string", async () => {
    serverGET(createServerReference(registerServerReference("getd-2", async (a, b) => a + b)));
    const seen = {};
    const original = globalThis.fetch;
    globalThis.fetch = (url, init) => {
      seen.url = String(url);
      seen.method = init.method;
      seen.body = init.body;
      return handleServerFunctionRequest(new Request(new URL(url, "http://localhost"), init));
    };
    try {
      const result = await clientGET(createClientReference("getd-2"))(1, 2);
      expect(result).toBe(3);
      expect(seen.method).toBe("GET");
      expect(seen.body).toBeUndefined();
      expect(seen.url).toContain("id=getd-2");
      expect(seen.url).toContain("&args=");
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("method enforcement", () => {
  it("still accepts POST on a GET-declared function (GET grants, doesn't revoke)", async () => {
    // a query()-wrapped function is GET-declared but may also be called
    // directly over the default POST transport — both must dispatch
    serverGET(createServerReference(registerServerReference("m405-0", async () => "x")));
    const response = await handleServerFunctionRequest(
      new Request("http://localhost/_server", {
        method: "POST",
        headers: {
          "X-Server-Function-Id": "m405-0",
          "X-Server-Function-Instance": "server-function:test"
        }
      })
    );
    expect(response.status).toBe(200);
    expect(await extractBody(response)).toBe("x");
  });

  it("405s a GET to a function that never declared it", async () => {
    registerServerFunction("m405-1", async () => "x");
    const response = await handleServerFunctionRequest(
      new Request("http://localhost/_server?id=m405-1", { method: "GET" })
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });

  it("accepts GET on GET-declared functions, including no-JS calls", async () => {
    serverGET(createServerReference(registerServerReference("m405-2", async () => "ok")));
    // direct HTTP / no-JS form GET: no instance header
    const response = await handleServerFunctionRequest(
      new Request("http://localhost/_server?id=m405-2", { method: "GET" })
    );
    expect(response.status).toBe(200);
    expect(await extractBody(response)).toBe("ok");
  });
});

describe("prepareRequest", () => {
  function connectTransport(options) {
    const original = globalThis.fetch;
    globalThis.fetch = (url, init) =>
      handleServerFunctionRequest(new Request(new URL(url, "http://localhost"), init), options);
    return () => {
      globalThis.fetch = original;
    };
  }

  // the server function reads the live request off the event scope, so the
  // tests observe exactly what the hook put on the wire
  function registerHeaderEcho(id, header) {
    registerServerFunction(id, async () => {
      const event = globalThis[RequestContext].getStore();
      return event.request.headers.get(header);
    });
  }

  afterEach(() => {
    configureServerFunctionsClient({ prepareRequest: null });
  });

  it("runs before every fetch with the id and declaration metadata", async () => {
    registerHeaderEcho("prep-0", "Authorization");
    const seen = [];
    configureServerFunctionsClient({
      prepareRequest(init, context) {
        seen.push(context);
        return { ...init, headers: { ...init.headers, Authorization: "Bearer token-1" } };
      }
    });
    const restore = connectTransport();
    try {
      const result = await createClientReference("prep-0")();
      expect(result).toBe("Bearer token-1");
      expect(seen).toEqual([{ id: "prep-0", meta: {} }]);
    } finally {
      restore();
    }
  });

  it("supports async hooks and applies to GET-declared calls", async () => {
    const echo = async () => {
      const event = globalThis[RequestContext].getStore();
      return event.request.headers.get("X-Tenant");
    };
    serverGET(createServerReference(registerServerReference("prep-get-0", echo)));
    const seen = [];
    configureServerFunctionsClient({
      async prepareRequest(init, { meta }) {
        seen.push(meta);
        return { ...init, headers: { ...init.headers, "X-Tenant": "acme" } };
      }
    });
    const restore = connectTransport();
    try {
      const result = await clientGET(createClientReference("prep-get-0"))();
      expect(result).toBe("acme");
      expect(seen).toEqual([{ method: "GET" }]);
    } finally {
      restore();
    }
  });

  it("keys per-function behavior on withMeta declarations", async () => {
    registerHeaderEcho("prep-auth-0", "Authorization");
    registerHeaderEcho("prep-auth-1", "Authorization");
    configureServerFunctionsClient({
      // react-in-hook: the session policy keys on the declared metadata
      // instead of comparing function ids
      prepareRequest(init, { meta }) {
        if (meta && meta.requiresAuth) {
          return { ...init, headers: { ...init.headers, Authorization: "Bearer secret" } };
        }
        return init;
      }
    });
    const restore = connectTransport();
    try {
      const authed = withMeta(createClientReference("prep-auth-0"), { requiresAuth: true });
      const plain = createClientReference("prep-auth-1");
      expect(await authed()).toBe("Bearer secret");
      expect(await plain()).toBe(null);
    } finally {
      restore();
    }
  });
});
