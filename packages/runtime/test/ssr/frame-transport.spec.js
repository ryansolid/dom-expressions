/**
 * @jest-environment node
 */
// The server-component convention over HTTP: a component becomes a
// frame-stream Response and the client pumps it into a frame host.
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
import { createJSONDataTable } from "../../src/serializer";
import { createFrame, createFrameHost } from "../../src/frame-client";

describe("frameTransformResult", () => {
  const event = { locals: {} };
  const context = { id: "story#0" };

  it("passes non-function results through untouched", async () => {
    const value = { data: 1 };
    expect(frameTransformResult(event, value)).toBe(value);
    const envelope = respond({ data: 1 });
    expect(frameTransformResult(event, envelope)).toBe(envelope);
  });

  it("turns a function result into a frame-stream Response", async () => {
    const ServerComp = props => r.ssr`<div><h1>S</h1>${props.children}</div>`;
    const response = frameTransformResult(event, ServerComp, context);
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
      respond(ServerComp, { status: 201, headers: { "X-Custom": "yes" }, revalidate: "stories" }),
      context
    );
    expect(isFrameStreamResponse(response)).toBe(true);
    expect(response.status).toBe(201);
    expect(response.headers.get("X-Custom")).toBe("yes");
    expect(response.headers.get("X-Revalidate")).toBe("stories");
    // The frame tags win over the envelope's application/json fallback type.
    expect(response.headers.get("Content-Type")).toBe("application/x-frame-stream");
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
