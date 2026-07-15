/**
 * @jest-environment node
 */
import { ResponseEnvelope, isResponseEnvelope, json, redirect, reload } from "../../src/response";
import {
  BODY_FORMAT_HEADER,
  BodyFormat,
  FILE_FORM_KEY,
  decodeResponse,
  deserializeStream,
  deserializeString,
  extractBody,
  getHeadersAndBody,
  serializeStream,
  serializeString
} from "../../src/server-functions/shared";
import {
  cloneServerReference as cloneClientReference,
  configureServerFunctionsClient
} from "../../src/server-functions/client";
import {
  cloneServerReference,
  configureServerFunctionsServer,
  createServerReference,
  getServerFunction,
  getServerFunctionMeta,
  handleServerFunctionRequest,
  registerServerFunction
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

  it("json pairs the value with a real JSON response", async () => {
    const result = json({ ok: true }, { revalidate: "/notes" });
    expect(result).toBeInstanceOf(ResponseEnvelope);
    expect(isResponseEnvelope(result)).toBe(true);
    expect(result.value).toEqual({ ok: true });
    expect(result.response.headers.get("Content-Type")).toBe("application/json");
    expect(result.response.headers.get("X-Revalidate")).toBe("/notes");
    expect(await result.response.json()).toEqual({ ok: true });
  });
});

describe("registration", () => {
  it("registers and resolves server references", () => {
    const fn = async () => "result";
    const reference = createServerReference("fn#0", fn);
    expect(reference).toEqual({ id: "fn#0", fn });
    expect(getServerFunction("fn#0")).toBe(fn);
  });

  it("throws for unknown ids", () => {
    expect(() => getServerFunction("missing")).toThrow("invalid server function: missing");
  });

  it("runs cloned references under a derived request event", async () => {
    const seen = {};
    const fn = async () => {
      seen.meta = getServerFunctionMeta();
      return "ok";
    };
    const reference = createServerReference("meta#0", fn);
    const callable = cloneServerReference(reference);

    const event = { request: new Request("http://localhost/"), locals: {} };
    const result = await globalThis[RequestContext].run(event, () => callable());
    expect(result).toBe("ok");
    expect(seen.meta).toEqual({ id: "meta#0" });
  });

  it("rejects cloned references outside of a request", () => {
    const callable = cloneServerReference(createServerReference("outside#0", async () => {}));
    expect(() => callable()).toThrow("Cannot call server function outside of a request");
  });

  it("exposes a url on cloned references", () => {
    const callable = cloneServerReference(createServerReference("url#0", async () => {}));
    expect(callable.url).toBe("/_server?id=url%230");
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
      const callable = cloneClientReference("echo-0");
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
      const result = await cloneClientReference("form-0")(form);
      expect(result).toBe("solid");
    } finally {
      restore();
    }
  });

  it("roundtrips GET calls with query-encoded args", async () => {
    registerServerFunction("get-0", async n => n * 2);
    const restore = connectTransport();
    try {
      const result = await cloneClientReference("get-0").GET(21);
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
      await expect(cloneClientReference("boom-0")()).rejects.toThrow("kaboom");
    } finally {
      restore();
    }
  });

  it("provides the request event and meta during handling", async () => {
    const seen = {};
    registerServerFunction("meta-1", async () => {
      seen.meta = getServerFunctionMeta();
      return null;
    });
    const restore = connectTransport();
    try {
      await cloneClientReference("meta-1")();
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
          "X-Server-Function": "raw-0",
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
          "X-Server-Function": "resp-0",
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
          "X-Server-Function": "wrap-0",
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
          "X-Server-Function": "flight-0",
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

  it("serves json() results to scripted clients and raw HTTP alike", async () => {
    registerServerFunction("json-0", async () => json({ ok: true }, { revalidate: "/notes" }));
    // scripted client: passthrough Response (X-Revalidate present), decoded explicitly
    const restore = connectTransport();
    try {
      const viaClient = await cloneClientReference("json-0")();
      expect(viaClient).toBeInstanceOf(Response);
      expect(viaClient.headers.get("X-Revalidate")).toBe("/notes");
      expect(await decodeResponse(viaClient)).toEqual({ ok: true });
    } finally {
      restore();
    }
    // raw HTTP (no instance header): the carried JSON body verbatim
    const rawResponse = await dispatch(
      new Request("http://localhost/_server?id=json-0", { method: "POST", body: "" })
    );
    expect(rawResponse.headers.get("Content-Type")).toBe("application/json");
    expect(await rawResponse.json()).toEqual({ ok: true });
  });

  it("propagates thrown redirects with forwarded metadata", async () => {
    registerServerFunction("throw-redirect-0", async () => {
      throw redirect("/login", { revalidate: "/session" });
    });
    const response = await dispatch(
      new Request("http://localhost/_server", {
        method: "POST",
        headers: {
          "X-Server-Function": "throw-redirect-0",
          "X-Server-Function-Instance": "server-function:test"
        }
      })
    );
    // redirect statuses are not forwarded to scripted clients; metadata is
    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBe("/login");
    expect(response.headers.get("X-Revalidate")).toBe("/session");
    expect(response.headers.get("X-Error")).toBe("true");
  });

  it("integration responses reach the caller whole and decode explicitly", async () => {
    registerServerFunction("redir-0", async () => "payload");
    const restore = connectTransport({
      transformResult: (event, result) =>
        new ResponseEnvelope(new Response(null, { headers: { "X-Revalidate": "/notes" } }), result)
    });
    try {
      const response = await cloneClientReference("redir-0")();
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
