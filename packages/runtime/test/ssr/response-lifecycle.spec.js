/**
 * @jest-environment node
 *
 * The HTTP response-head lifecycle: `createRequestEvent`'s stub-backed
 * event, `createSSRResponse` deriving the outgoing head at shell flush
 * (commit, redirect protocol, post-flush script fallback), and
 * `composeMiddleware`. Plus the server-function per-invocation wrap seam
 * (`wrapInvocation`). Node environment for real Response/ReadableStream/
 * TextEncoder globals.
 */
import * as r from "../../src/server";
import {
  configureServerFunctionsServer,
  createServerReference,
  getServerFunctionInvocation,
  handleServerFunctionRequest,
  registerServerFunction,
  registerServerReference
} from "../../src/server-functions/server";
import { getEventServerFunctionInvocation } from "../../src/server-functions/server";
import { BODY_FORMAT_HEADER, BodyFormat } from "../../src/server-functions/shared";
import { RequestContext } from "../../src/server";
import { sharedConfig } from "rxcore";

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
  configureServerFunctionsServer({ csrf: false });
});

afterEach(() => {
  delete globalThis[RequestContext];
});

// A genuinely streamed render: the shell flushes immediately with a pending
// fragment; `onLate` runs strictly after the shell went out (the seam for
// post-flush stub writes), then the fragment resolves as a second chunk.
function asyncStream(onLate) {
  let fragDone;
  const stream = r.renderToStream(() => {
    fragDone = sharedConfig.context.registerFragment("f1");
    return r.ssr`<div>shell</div>`;
  });
  setTimeout(() => {
    onLate && onLate();
    fragDone("<p>late</p>");
  }, 10);
  return stream;
}

const syncStream = () => r.renderToStream(() => r.ssr`<p>sync</p>`);

describe("createRequestEvent", () => {
  it("builds the canonical stub-backed event", () => {
    const request = new Request("http://localhost/");
    const event = r.createRequestEvent(request);
    expect(event.request).toBe(request);
    expect(event.locals).toEqual({});
    expect(event.response.status).toBeUndefined();
    expect(event.response.committed).toBe(false);
    expect(event.response.headers).toBeInstanceOf(Headers);
  });

  it("spreads init over the defaults", () => {
    const request = new Request("http://localhost/");
    const custom = { status: 200, headers: new Headers(), committed: false };
    const event = r.createRequestEvent(request, { response: custom, clientAddress: "::1" });
    expect(event.response).toBe(custom);
    expect(event.clientAddress).toBe("::1");
    expect(event.locals).toEqual({});
  });
});

describe("getExpectedRedirectStatus", () => {
  it("keeps a redirect status, replaces a page status with 302", () => {
    expect(r.getExpectedRedirectStatus({ status: 307, headers: new Headers() })).toBe(307);
    expect(r.getExpectedRedirectStatus({ status: 404, headers: new Headers() })).toBe(302);
    expect(r.getExpectedRedirectStatus({ headers: new Headers() })).toBe(302);
  });
});

describe("createSSRResponse — string results", () => {
  it("derives the head from the stub and commits it", async () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.status = 404;
    event.response.statusText = "Not Found";
    event.response.headers.set("x-page", "missing");
    const response = r.createSSRResponse("<p>404</p>", event);
    expect(event.response.committed).toBe(true);
    expect(response.status).toBe(404);
    expect(response.statusText).toBe("Not Found");
    expect(response.headers.get("x-page")).toBe("missing");
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toBe("<p>404</p>");
  });

  it("keeps multiple Set-Cookie values distinct and lets the stub win over responseInit", () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.headers.append("set-cookie", "a=1");
    event.response.headers.append("set-cookie", "b=2");
    event.response.headers.set("x-shared", "stub");
    const response = r.createSSRResponse("<p/>", event, {
      responseInit: { status: 201, headers: { "x-shared": "init", "x-base": "kept" } }
    });
    expect(response.headers.getSetCookie()).toEqual(["a=1", "b=2"]);
    expect(response.headers.get("x-shared")).toBe("stub");
    expect(response.headers.get("x-base")).toBe("kept");
    // stub carried no status — responseInit's applies
    expect(response.status).toBe(201);
  });

  it("turns a Location into a real redirect carrying the stub's cookies", async () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.headers.set("Location", "/login");
    event.response.headers.append("set-cookie", "flash=1");
    const response = r.createSSRResponse("<p>never sent</p>", event);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
    expect(response.headers.getSetCookie()).toEqual(["flash=1"]);
    expect(response.body).toBe(null);
  });

  it("honors a redirect status set on the stub", () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.status = 308;
    event.response.headers.set("Location", "/moved");
    expect(r.createSSRResponse("", event).status).toBe(308);
  });

  it("applies transformChunk and works without an event", async () => {
    const response = r.createSSRResponse("<p/>", undefined, {
      transformChunk: chunk => "<!DOCTYPE html>" + chunk
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<!DOCTYPE html><p/>");
  });
});

describe("createSSRResponse — stream results", () => {
  it("freezes the head at shell flush; post-flush header writes fail loudly and never reach the wire", async () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.status = 404;
    event.response.headers.set("x-pre", "shell");
    const seen = {};
    const response = await r.createSSRResponse(
      asyncStream(() => {
        // runs after the shell flushed — the head is out, so the write is
        // a loud failure (dev build throws; production reports + no-ops)
        seen.committedAtLate = event.response.committed;
        try {
          event.response.headers.set("x-post", "late");
        } catch (error) {
          seen.lateWriteError = error;
        }
      }),
      event
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("x-pre")).toBe("shell");
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await response.text();
    expect(html).toContain("late");
    expect(seen.committedAtLate).toBe(true);
    expect(seen.lateWriteError).toBeInstanceOf(Error);
    expect(seen.lateWriteError.message).toMatch(/after the response head was sent/);
    expect(response.headers.get("x-post")).toBe(null);
  });

  it("short-circuits a pre-flush Location to a bodyless redirect", async () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.status = 303;
    event.response.headers.set("Location", "/target");
    event.response.headers.append("set-cookie", "session=s1");
    const response = await r.createSSRResponse(syncStream(), event);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/target");
    expect(response.headers.getSetCookie()).toEqual(["session=s1"]);
    expect(response.body).toBe(null);
  });

  it("emits the script fallback for a post-flush Location, carrying the nonce", async () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    const response = await r.createSSRResponse(
      asyncStream(() => {
        event.response.headers.set("Location", "/next?a=1&b=2");
      }),
      event,
      { nonce: 'n"1' }
    );
    // the head went out 200 — the redirect can only happen client-side
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<script nonce="n&quot;1">window.location="/next?a=1&b=2"</script>`);
  });

  it("escapes  '<' in the script redirect target", async () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    const response = await r.createSSRResponse(
      asyncStream(() => {
        event.response.headers.set("Location", "/x?q=</script>");
      }),
      event
    );
    const html = await response.text();
    expect(html).toContain('window.location="/x?q=\\u003c/script>"');
    expect(html).not.toContain("</script></script>");
  });

  it("applies transformChunk to every chunk", async () => {
    const seen = [];
    const response = await r.createSSRResponse(asyncStream(), undefined, {
      transformChunk: chunk => {
        seen.push(chunk);
        return chunk;
      }
    });
    const html = await response.text();
    expect(seen.length).toBeGreaterThan(1);
    expect(seen.join("")).toBe(html);
  });

  it("survives cancellation without crashing the render", async () => {
    const unhandled = [];
    const onUnhandled = reason => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const response = await r.createSSRResponse(asyncStream(), undefined);
      const reader = response.body.getReader();
      await reader.read();
      await reader.cancel("client went away");
      await new Promise(resolve => setTimeout(resolve, 20));
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
    expect(unhandled).toEqual([]);
  });
});

describe("commitEventResponse", () => {
  it("folds a fresh stub: cookies append entry-by-entry, gaps fill, the response's own metadata wins", () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.status = 418;
    event.response.headers.append("set-cookie", "a=1");
    event.response.headers.append("set-cookie", "b=2");
    event.response.headers.set("x-fill", "stub");
    event.response.headers.set("x-owned", "stub");
    const response = r.commitEventResponse(
      new Response("{}", {
        status: 201,
        headers: { "content-type": "application/json", "x-owned": "response" }
      }),
      event
    );
    expect(response.headers.getSetCookie()).toEqual(["a=1", "b=2"]);
    expect(response.headers.get("x-fill")).toBe("stub");
    // gap-fill only — the response answered this header itself
    expect(response.headers.get("x-owned")).toBe("response");
    // the status is never taken from the stub
    expect(response.status).toBe(201);
    expect(event.response.committed).toBe(true);
  });

  it("never gap-fills the protocol-owned family or body metadata onto a bodiless response", () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.headers.set("Location", "/elsewhere");
    event.response.headers.set("X-Server-Function-Error", "true");
    event.response.headers.set("content-type", "text/html");
    event.response.headers.append("set-cookie", "keep=1");
    const response = r.commitEventResponse(new Response(null, { status: 204 }), event);
    // a stray stub Location must not turn this body into a redirect signal
    expect(response.headers.get("location")).toBe(null);
    expect(response.headers.get("x-server-function-error")).toBe(null);
    // bodiless response — don't advertise a body that isn't there
    expect(response.headers.get("content-type")).toBe(null);
    // cookies still ride along
    expect(response.headers.getSetCookie()).toEqual(["keep=1"]);
    expect(event.response.committed).toBe(true);
  });

  it("rebuilds around immutable headers (Response.redirect)", () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.headers.append("set-cookie", "session=s1");
    const redirect = Response.redirect("http://localhost/next", 303);
    const response = r.commitEventResponse(redirect, event);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/next");
    expect(response.headers.getSetCookie()).toEqual(["session=s1"]);
  });

  it("passes a committed stub's response through untouched — page responses do not double-fold", async () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.headers.append("set-cookie", "once=1");
    const page = r.createSSRResponse("<p/>", event);
    expect(event.response.committed).toBe(true);
    const refolded = r.commitEventResponse(page, event);
    expect(refolded).toBe(page);
    expect(refolded.headers.getSetCookie()).toEqual(["once=1"]);
  });

  it("commits the stub so a post-fold header write fails loudly", () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    r.commitEventResponse(new Response("ok"), event);
    expect(event.response.committed).toBe(true);
    // dev build throws (production reports + no-ops)
    expect(() => event.response.headers.set("x-late", "write")).toThrow(
      /after the response head was sent/
    );
  });

  it("defaults to the ambient request event", () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    event.response.headers.append("set-cookie", "ambient=1");
    const response = globalThis[RequestContext].run(event, () =>
      r.commitEventResponse(new Response("ok"))
    );
    expect(response.headers.getSetCookie()).toEqual(["ambient=1"]);
    expect(event.response.committed).toBe(true);
  });

  it("is a pass-through for events without a stub (the handler's bare shape)", () => {
    const bare = new Response("ok");
    const stubless = { request: new Request("http://localhost/"), locals: {} };
    expect(r.commitEventResponse(bare, stubless)).toBe(bare);
    // same through the ambient default
    expect(globalThis[RequestContext].run(stubless, () => r.commitEventResponse(bare))).toBe(bare);
  });
});

describe("composeMiddleware", () => {
  const respond = body => new Response(body);

  it("runs in order around the terminal dispatch", async () => {
    const order = [];
    const run = r.composeMiddleware([
      async (req, next) => {
        order.push("a:pre");
        const response = await next();
        order.push("a:post");
        return response;
      },
      async (req, next) => {
        order.push("b:pre");
        const response = await next();
        order.push("b:post");
        return response;
      }
    ]);
    const response = await run(new Request("http://localhost/"), () => {
      order.push("handler");
      return respond("ok");
    });
    expect(order).toEqual(["a:pre", "b:pre", "handler", "b:post", "a:post"]);
    expect(await response.text()).toBe("ok");
  });

  it("short-circuits when middleware answers without calling next", async () => {
    let reached = false;
    const run = r.composeMiddleware([() => new Response("blocked", { status: 403 })]);
    const response = await run(new Request("http://localhost/"), () => {
      reached = true;
      return respond("never");
    });
    expect(response.status).toBe(403);
    expect(reached).toBe(false);
  });

  it("substitutes the request downstream via next(request)", async () => {
    const run = r.composeMiddleware([
      (req, next) => next(new Request("http://localhost/rewritten", { headers: req.headers })),
      (req, next) => next()
    ]);
    let seen;
    await run(new Request("http://localhost/original"), req => {
      seen = req.url;
      return respond("ok");
    });
    expect(seen).toBe("http://localhost/rewritten");
  });

  it("lets error middleware catch a throwing handler", async () => {
    const run = r.composeMiddleware([
      async (req, next) => {
        try {
          return await next();
        } catch (error) {
          return new Response(`caught: ${error.message}`, { status: 500 });
        }
      }
    ]);
    const response = await run(new Request("http://localhost/"), () => {
      throw new Error("boom");
    });
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("caught: boom");
  });

  it("keeps a streamed response's headers mutable until the outermost middleware returns", async () => {
    const event = r.createRequestEvent(new Request("http://localhost/"));
    const run = r.composeMiddleware([
      async (req, next) => {
        const response = await next();
        // the body hasn't been consumed — the head is still ours to shape
        response.headers.set("x-middleware", "after-next");
        return response;
      }
    ]);
    const response = await run(event.request, () => r.createSSRResponse(asyncStream(), event));
    expect(response.headers.get("x-middleware")).toBe("after-next");
    expect(await response.text()).toContain("late");
  });

  it("rejects a double next() call", async () => {
    const run = r.composeMiddleware([
      async (req, next) => {
        await next();
        return next();
      }
    ]);
    await expect(run(new Request("http://localhost/"), () => respond("ok"))).rejects.toThrow(
      "next() called multiple times"
    );
  });
});

describe("wrapInvocation", () => {
  afterEach(() => {
    configureServerFunctionsServer({ wrapInvocation: null });
  });

  it("wraps HTTP dispatch with identity available before, during and after run()", async () => {
    registerServerFunction("wrap#0", async name => `hello ${name}`);
    const seen = {};
    const response = await handleServerFunctionRequest(
      new Request("http://localhost/_server?id=wrap%230", {
        method: "POST",
        headers: { "content-type": "application/json", [BODY_FORMAT_HEADER]: BodyFormat.Json },
        body: JSON.stringify(["world"])
      }),
      {
        wrapInvocation: async (run, context) => {
          seen.before = getServerFunctionInvocation();
          seen.context = { id: context.id, args: context.args, direct: context.direct };
          seen.hasRequest = context.request instanceof Request;
          const result = await run();
          // Post-await, ambient reads need real AsyncLocalStorage (the test
          // fake is synchronous) — the event-keyed accessor proves the
          // invocation persists through the wrap.
          seen.after = getEventServerFunctionInvocation(context.event);
          return result;
        }
      }
    );
    expect(response.status).toBe(200);
    expect(seen.before).toEqual({ id: "wrap#0" });
    expect(seen.after).toEqual({ id: "wrap#0" });
    expect(seen.context).toEqual({ id: "wrap#0", args: ["world"], direct: false });
    expect(seen.hasRequest).toBe(true);
  });

  it("replaces the result and routes thrown errors through normal encoding", async () => {
    registerServerFunction("wrap#1", async () => "original");
    const replaced = await handleServerFunctionRequest(
      new Request("http://localhost/_server?id=wrap%231", { method: "POST" }),
      { wrapInvocation: async run => `${await run()} (wrapped)` }
    );
    // strings direct-encode: the body is the raw string
    expect(await replaced.text()).toBe("original (wrapped)");

    const failed = await handleServerFunctionRequest(
      new Request("http://localhost/_server?id=wrap%231", { method: "POST" }),
      {
        wrapInvocation: () => {
          throw new Error("denied");
        }
      }
    );
    // plain thrown error, no instance header: 500 with the message in dev
    expect(failed.status).toBe(500);
  });

  it("the configured hook also wraps direct SSR calls", async () => {
    const seen = [];
    configureServerFunctionsServer({
      wrapInvocation: (run, context) => {
        seen.push({
          id: context.id,
          direct: context.direct,
          hasRequest: context.request !== undefined,
          invocation: getServerFunctionInvocation()
        });
        return run();
      }
    });
    const callable = createServerReference(registerServerReference("wrap#2", async n => n * 2));
    const event = { request: new Request("http://localhost/"), locals: {} };
    const result = await globalThis[RequestContext].run(event, () => callable(21));
    expect(result).toBe(42);
    expect(seen).toEqual([
      { id: "wrap#2", direct: true, hasRequest: false, invocation: { id: "wrap#2" } }
    ]);
  });

  it("stays transparent for synchronous direct calls", () => {
    configureServerFunctionsServer({ wrapInvocation: (run, context) => run() });
    const callable = createServerReference(registerServerReference("wrap#3", () => "sync"));
    const event = { request: new Request("http://localhost/"), locals: {} };
    const result = globalThis[RequestContext].run(event, () => callable());
    expect(result).toBe("sync");
  });
});
