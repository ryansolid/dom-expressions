/**
 * @jest-environment node
 */
// The server-component convention over HTTP, end to end: a server function
// returning a `props => JSX` function becomes a frame-stream Response via
// the frameTransformResult policy (handler untouched — hook-based), and the
// client consumer pumps the framed chunks into a frame host. Framing is the
// server-function wire convention, shared byte-for-byte.
//
// Node environment for the real fetch primitives (Request/Response/
// ReadableStream); the consumer side gets a jsdom document since the frame
// client only needs DOM, not a browser event loop.
import { JSDOM } from "jsdom";
globalThis.document = new JSDOM("<body></body>").window.document;

import * as r from "../../src/server";
import { frameTransformResult, serverComponentResponse } from "../../src/frame-sink";
import {
  FRAME_STREAM_HEADER,
  applyFrameResponse,
  isFrameStreamResponse
} from "../../src/frame-transport";
import { respond } from "../../src/response";
import {
  FUNCTION_HEADER,
  INSTANCE_HEADER,
  handleServerFunctionRequest,
  registerServerFunction
} from "../../src/server-functions/server";
import { createJSONDataTable } from "../../src/serializer";
import { createFrame, createFrameHost } from "../../src/frame-client";

describe("frameTransformResult", () => {
  const event = { locals: { serverFunctionMeta: { id: "story#0" } } };

  it("passes non-function results through untouched", async () => {
    const value = { data: 1 };
    expect(frameTransformResult(event, value)).toBe(value);
    const envelope = respond({ data: 1 });
    expect(frameTransformResult(event, envelope)).toBe(envelope);
  });

  it("turns a function result into a frame-stream Response", async () => {
    const ServerComp = props => r.ssr`<div><h1>S</h1>${props.children}</div>`;
    const response = frameTransformResult(event, ServerComp);
    expect(response).toBeInstanceOf(Response);
    expect(isFrameStreamResponse(response)).toBe(true);
    // Tagged with the function id (stable boundary across repeat calls) and
    // raw pass-through so the handler never codec-encodes it.
    expect(response.headers.get(FRAME_STREAM_HEADER)).toBe("story#0");
    expect(response.headers.get("X-Content-Raw")).toBe("1");

    const host = createFrameHost();
    const boundary = document.createElement("div");
    document.body.appendChild(boundary);
    createFrame(boundary, {
      host,
      id: "story#0",
      slots: { children: () => document.createElement("b") }
    });
    const applied = await applyFrameResponse(response, host);
    expect(applied).toBe("story#0");
    expect(boundary.innerHTML).toBe(
      "<div><h1>S</h1><!--slot:children:start--><b></b><!--slot:children:end--></div>"
    );
    boundary.remove();
  });

  it("merges a respond() envelope's metadata into the frame Response", async () => {
    const ServerComp = () => r.ssr`<div>x</div>`;
    const response = frameTransformResult(
      event,
      respond(ServerComp, { status: 201, headers: { "X-Custom": "yes" }, revalidate: "stories" })
    );
    expect(isFrameStreamResponse(response)).toBe(true);
    expect(response.status).toBe(201);
    expect(response.headers.get("X-Custom")).toBe("yes");
    expect(response.headers.get("X-Revalidate")).toBe("stories");
    // The frame tags win over the envelope's application/json fallback type.
    expect(response.headers.get("Content-Type")).toBe("application/x-frame-stream");
  });
});

describe("server component over the real handler", () => {
  function callServer(id, body) {
    return handleServerFunctionRequest(
      new Request(`http://localhost/_server?id=${encodeURIComponent(id)}`, {
        method: "POST",
        headers: {
          [FUNCTION_HEADER]: id,
          [INSTANCE_HEADER]: "1",
          ...(body !== undefined && {
            "Content-Type": "text/plain",
            "X-Server-Function-Format": "1"
          })
        },
        body
      }),
      {
        transformResult: frameTransformResult,
        // The policy reads the event from its arguments, not async context —
        // a pass-through provider is enough here.
        provideEvent: (event, fn) => fn()
      }
    );
  }

  it("streams a server component through fetch semantics into client DOM, twice (policy A)", async () => {
    registerServerFunction("getStory", async storyId => {
      const title = `Story ${storyId}`;
      return props => r.ssr`<article><h1>${r.escape(title)}</h1>${props.children}</article>`;
    });

    const table = createJSONDataTable();
    const host = createFrameHost({
      applyData: c => table.apply(c),
      resolve: ref => table.resolve(ref)
    });
    const boundary = document.createElement("div");
    document.body.appendChild(boundary);
    const toggle = document.createElement("input");
    createFrame(boundary, { host, id: "story-pane", slots: { children: () => toggle } });

    // First navigation.
    const first = await callServer("getStory", "1");
    expect(isFrameStreamResponse(first)).toBe(true);
    await applyFrameResponse(first, host, { as: "story-pane" });
    expect(boundary.querySelector("h1").textContent).toBe("Story 1");

    // Client-only state between navigations.
    toggle.checked = true;
    const h1 = boundary.querySelector("h1");

    // Second navigation: same server function, same client boundary.
    const second = await callServer("getStory", "2");
    await applyFrameResponse(second, host, { as: "story-pane" });

    expect(boundary.querySelector("h1")).toBe(h1);
    expect(h1.textContent).toBe("Story 2");
    expect(boundary.querySelector("input")).toBe(toggle);
    expect(toggle.checked).toBe(true);
    boundary.remove();
  });

  it("leaves non-component results on the normal codec path", async () => {
    registerServerFunction("getData", async () => ({ plain: "value" }));
    const response = await callServer("getData");
    expect(isFrameStreamResponse(response)).toBe(false);
    expect(response.status).toBe(200);
    // Not an error envelope: a genuine serialized value came back.
    expect(response.headers.get("X-Server-Function-Error")).toBe(null);
    expect(await response.text()).toContain("plain");
  });
});

describe("serverComponentResponse", () => {
  it("streams render-prop slots and data args over the wire", async () => {
    const ServerComp = props =>
      r.ssr`<ul>${["a", "b"].map((label, i) => props.item({ label, meta: { i } }))}</ul>`;
    const response = serverComponentResponse(ServerComp, { frame: { id: "list" } });

    const table = createJSONDataTable();
    const host = createFrameHost({
      applyData: c => table.apply(c),
      resolve: ref => table.resolve(ref)
    });
    const boundary = document.createElement("div");
    document.body.appendChild(boundary);
    const seen = [];
    createFrame(boundary, {
      host,
      id: "list",
      slots: {
        item: props => {
          seen.push(props);
          const li = document.createElement("b");
          li.textContent = `${props.label}:${props.meta.i}`;
          return li;
        }
      }
    });
    await applyFrameResponse(response, host);
    expect(seen.length).toBe(2);
    expect(boundary.textContent).toBe("a:0b:1");
    // Args decoded from the wire, not in-process references.
    expect(seen[0].meta).toEqual({ i: 0 });
    boundary.remove();
  });
});
