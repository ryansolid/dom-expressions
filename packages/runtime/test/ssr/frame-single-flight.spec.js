/**
 * @jest-environment node
 */
// Single-flight where part of what a mutation invalidates is *markup*.
//
// The data half of single-flight folds a `{ value, data }` envelope keyed by
// the integration's cache keys. A component-valued entry is not a different
// KIND of payload, just a different representation of one: it stays in the
// envelope like any other value — serialized as a flight REFERENCE that
// resolves client-side to the very component the boundary showing that call
// holds — while its content rides the same response as a region addressed by
// the call (`frameAddress(id, args)`, the one name both peers derive
// independently). The integration seeds its cache through its ordinary path;
// markup travels as html exactly once and never also as data.
//
// The carrier is the frame stream: it already routes addressed chunks to
// arbitrary frames and already has a response-scoped chunk category that
// reaches the consumer without becoming DOM records. The mutation's outcome
// rides that category as `outcome` chunks.
import { JSDOM } from "jsdom";
globalThis.document = new JSDOM("<body></body>").window.document;

// The document registry (normally the shell's inline bootstrap): the
// plugin's no-transport fallback resolves flight references through it.
globalThis._$SC = {
  c: {},
  r(i) {
    return this.c[i] || (this.c[i] = () => i);
  }
};

import * as r from "../../src/server";
import {
  frameTransformDirectResult,
  frameTransformFlightResult,
  frameTransformResult
} from "../../src/frame-sink";
import {
  COMPONENT_BINDING,
  FRAME_STREAM_HEADER,
  createServerComponentHandler,
  flightCodec,
  isFrameStreamResponse
} from "../../src/frame-transport";
import { createFrame, createFrameHost } from "../../src/frame-client";
import {
  ChunkReader,
  SINGLE_FLIGHT_HEADER,
  createChunk,
  deserializeStream,
  frameAddress,
  subscribeFlightData
} from "../../src/server-functions/shared";
import {
  registerServerFunction,
  handleServerFunctionRequest
} from "../../src/server-functions/server";

const REFERER = "http://localhost/notes";

function flightRequest(id) {
  return new Request("http://localhost/_server", {
    method: "POST",
    headers: {
      "X-Server-Function-Id": id,
      "X-Server-Function-Instance": "server-function:test",
      [SINGLE_FLIGHT_HEADER]: "true",
      referer: REFERER
    }
  });
}

function dispatch(id, collectFlightData) {
  return handleServerFunctionRequest(flightRequest(id), {
    provideEvent: (event, fn) => fn(),
    transformResult: frameTransformResult,
    transformFlightResult: frameTransformFlightResult,
    collectFlightData
  });
}

/** A collected entry as the direct-call collection pass produces it: the
 *  component wrapped and branded with its function id and call address. */
function collected(component, id, args = []) {
  return frameTransformDirectResult(component, { id, args });
}

/** Every chunk of a frame-stream response, in order. */
async function chunks(response) {
  const reader = new ChunkReader(response.body);
  const out = [];
  for (let next = await reader.next(); !next.done; next = await reader.next()) {
    out.push(JSON.parse(next.value));
  }
  return out;
}

/**
 * The `{ value, data }` envelope carried by a response's `outcome` chunks.
 * They hold the codec's own nodes, so replaying them framed decodes exactly
 * as a plain single-flight body does — with the protocol's own plugin, the
 * way the transport decodes it.
 */
function outcomeOf(all) {
  const nodes = all.filter(c => c.type === "outcome");
  if (!nodes.length) return undefined;
  return deserializeStream(
    new Response(new Blob(nodes.map(n => createChunk(n.payload))).stream()),
    flightCodec()
  );
}

describe("single-flight with server-component regions", () => {
  it("streams a component-valued entry as a region and keeps it in the envelope", async () => {
    // A plain mutation: its own return value is data, not markup.
    registerServerFunction("sf-sc-0", async () => "saved");

    // The collector answers with two invalidated entries under their cache
    // keys — one ordinary value, one server component (collected through a
    // direct call, so it arrives wrapped and branded).
    const response = await dispatch("sf-sc-0", () => ({
      "count[]": 3,
      "notes[]": collected(() => r.ssr`<ul><li>fresh</li></ul>`, "getNotes")
    }));

    // Markup in the payload makes the frame stream the carrier.
    expect(isFrameStreamResponse(response)).toBe(true);
    expect(response.headers.get(SINGLE_FLIGHT_HEADER)).toBe("true");

    const all = await chunks(response);

    // The component's content streams as a region addressed by the CALL —
    // the one name the mutation's client derives independently, having made
    // the same call itself.
    const html = all.filter(c => c.type === "html");
    expect(html).toHaveLength(1);
    expect(html[0].id).toBe(frameAddress("getNotes", []));
    expect(html[0].html).toContain("<li>fresh</li>");

    // The envelope still carries the entry under its cache key — as a
    // reference, so the integration seeds its cache through the ordinary
    // path (freshness re-stamps itself) while the markup shipped once as
    // html. With no transport installed the reference resolves through the
    // document registry's per-function placeholder.
    const envelope = await outcomeOf(all);
    expect(envelope.value).toBe("saved");
    expect(envelope.data["count[]"]).toBe(3);
    expect(envelope.data["notes[]"]).toBe(globalThis._$SC.c["getNotes"]);
  });

  it("still returns a plain envelope when nothing invalidated is markup", async () => {
    registerServerFunction("sf-sc-1", async () => "saved");

    const response = await dispatch("sf-sc-1", () => ({ "count[]": 3 }));

    // No markup, no frame stream: byte-identical to single-flight today.
    expect(isFrameStreamResponse(response)).toBe(false);
    expect(response.headers.get(SINGLE_FLIGHT_HEADER)).toBe("true");
  });

  it("carries the outcome when the mutation itself returns a component", async () => {
    // The mutation answers with markup for its own boundary *and*
    // invalidates a sibling region.
    registerServerFunction("sf-sc-2", async () => () => r.ssr`<p>detail</p>`);

    const response = await dispatch("sf-sc-2", () => ({
      "notes[]": collected(() => r.ssr`<ul><li>fresh</li></ul>`, "getNotes")
    }));

    expect(isFrameStreamResponse(response)).toBe(true);
    // The called function's own frame keeps the function id as its address.
    expect(response.headers.get(FRAME_STREAM_HEADER)).toBe("sf-sc-2");

    const all = await chunks(response);
    const ids = all.filter(c => c.type === "html").map(c => c.id);
    expect(ids).toContain("sf-sc-2");
    expect(ids).toContain(frameAddress("getNotes", []));

    // Its own value is markup, so the envelope carries no value for it — the
    // client resolves the call to that frame's component.
    const envelope = await outcomeOf(all);
    expect(envelope.value).toBeUndefined();
    expect(envelope.data["notes[]"]).toBe(globalThis._$SC.c["getNotes"]);
  });
});

// Boundary identity is the call's intrinsic (function, arguments) address —
// the same per-args rule an integration's query cache keys values by, so
// cached components and boundaries stay one-to-one.
describe("per-args boundary identity", () => {
  it("same args resolve the same component; different args a different boundary", async () => {
    registerServerFunction("sf-sc-7", async () => () => r.ssr`<p>page</p>`);
    const host = createFrameHost();
    const handler = createServerComponentHandler({
      host,
      component: frameId => {
        const el = document.createElement("div");
        document.body.appendChild(el);
        createFrame(el, { host, id: frameId });
        return el;
      }
    });
    const fetchPage = () =>
      handleServerFunctionRequest(flightRequest("sf-sc-7"), {
        provideEvent: (event, fn) => fn(),
        transformResult: frameTransformResult
      });

    const top = await handler.handle(await fetchPage(), {
      id: "sf-sc-7",
      args: ["top", 1],
      context: null
    });
    const topAgain = await handler.handle(await fetchPage(), {
      id: "sf-sc-7",
      args: ["top", 1],
      context: null
    });
    const fresh = await handler.handle(await fetchPage(), {
      id: "sf-sc-7",
      args: ["new", 1],
      context: null
    });

    // A repeat call for the same (function, args) — refetch, preload, cache
    // read — resolves the identical component: equals-gated readers hold and
    // the stream morphs the showing boundary in place.
    expect(topAgain).toBe(top);
    // Different args are a different boundary: a cached component always
    // mounts the boundary showing the call it was cached for, never one the
    // site last streamed other args into.
    expect(fresh).not.toBe(top);
  });
});

// The identity split (DR-1): the MOUNT is the site's, keyed by function —
// every call of a function resolves a binding wrapping the same per-function
// component, so an equals-gated reader keeps its instance across argument
// changes — while CONTENT is keyed per-address in resident stores. A site
// following a delivered address re-binds its frame's pull; leaving an
// address leaves its store warm for a later return. There is no mount to
// steal, so no handoff protocol exists, and a preload for other args only
// ever warms an unbound store.
describe("binding delivery across argument changes", () => {
  /** Poll a condition across macrotasks (streams apply asynchronously). */
  async function settle(cond) {
    for (let i = 0; i < 50 && !cond(); i++) await new Promise(r => setTimeout(r, 0));
    expect(cond()).toBe(true);
  }

  function makeHandler() {
    const host = createFrameHost();
    const handler = createServerComponentHandler({
      host,
      // ONE mount component per function. Each call of it is a site: it
      // mounts a frame bound to the delivered address, and hands back a
      // rebind handle standing in for a framework's reactive follow.
      component: () => (props, address) => {
        const el = document.createElement("div");
        document.body.appendChild(el);
        const frame = createFrame(el, { host, id: address() });
        return { el, follow: next => frame.rebind(next) };
      }
    });
    return { host, handler };
  }

  it("keeps the instance across args: same component, new address, one element", async () => {
    let payload = "top stories";
    registerServerFunction("sf-sc-9", async () => () => r.ssr`<p>${payload}</p>`);
    const { host, handler } = makeHandler();
    const fetchPage = () =>
      handleServerFunctionRequest(flightRequest("sf-sc-9"), {
        provideEvent: (event, fn) => fn(),
        transformResult: frameTransformResult
      });

    const top = await handler.handle(await fetchPage(), {
      id: "sf-sc-9",
      args: ["top"],
      context: null
    });
    const { el, follow } = top();
    await settle(() => el.textContent === "top stories");

    // The site switches args: a DIFFERENT binding resolves (per-address
    // values) wrapping the SAME component (per-function mounts) — the
    // reader's equals-gate keeps the instance and delivers the address.
    payload = "new stories";
    const fresh = await handler.handle(await fetchPage(), {
      id: "sf-sc-9",
      args: ["new"],
      context: null
    });
    expect(fresh).not.toBe(top);
    expect(fresh[COMPONENT_BINDING].component).toBe(top[COMPONENT_BINDING].component);
    // The instance follows the delivered address: the SAME element morphs
    // to the new call's content (already resident — the response streamed
    // into the store whether or not anything was bound).
    follow(fresh[COMPONENT_BINDING].address);
    await settle(() => el.textContent === "new stories");
    expect(host.get(frameAddress("sf-sc-9", ["new"]))).toBeDefined();
    expect(host.get(frameAddress("sf-sc-9", ["top"]))).toBeUndefined();

    // Returning to the original args resolves the SAME binding (identity-
    // stable per address); following it home re-materializes from the old
    // address's resident store, morphed by the refetch stream.
    payload = "top stories";
    const topAgain = await handler.handle(await fetchPage(), {
      id: "sf-sc-9",
      args: ["top"],
      context: null
    });
    expect(topAgain).toBe(top);
    follow(topAgain[COMPONENT_BINDING].address);
    await settle(() => el.textContent === "top stories");
    expect(host.get(frameAddress("sf-sc-9", ["top"]))).toBeDefined();
    expect(host.get(frameAddress("sf-sc-9", ["new"]))).toBeUndefined();
  });

  it("a preload for other args warms its store without touching any mount", async () => {
    let payload = "shown";
    registerServerFunction("sf-sc-10", async () => () => r.ssr`<p>${payload}</p>`);
    const { host, handler } = makeHandler();
    const fetchPage = () =>
      handleServerFunctionRequest(flightRequest("sf-sc-10"), {
        provideEvent: (event, fn) => fn(),
        transformResult: frameTransformResult
      });

    const shown = await handler.handle(await fetchPage(), {
      id: "sf-sc-10",
      args: ["shown"],
      context: null
    });
    const { el } = shown();
    await settle(() => el.textContent === "shown");

    // A hover preload: nothing is bound to the preloaded address, so its
    // stream write-throughs to the store and the page never changes.
    payload = "preloaded";
    const preloaded = await handler.handle(await fetchPage(), {
      id: "sf-sc-10",
      args: ["hovered"],
      context: null
    });
    await new Promise(r => setTimeout(r, 0));
    expect(el.textContent).toBe("shown");

    // Mounting the preloaded binding later (real navigation) materializes
    // instantly from the warm store.
    const { el: el2 } = preloaded();
    expect(el2.textContent).toBe("preloaded");
  });
});

// The consuming half: a mutation reads the same whether or not part of what
// it invalidated was markup — the value returns to the caller, the data
// reaches the flight consumer (component entries as the very components
// their boundaries hold), and the regions land in the boundaries showing the
// calls they refresh.
describe("consuming a single-flight frame response", () => {
  it("streams an invalidated region into the boundary showing that call", async () => {
    // The getter behind `query(getNotes, "notes")`. Nobody declares an
    // address: the transport derives it from the call the client made, and
    // the server derives the same one from the call its collection pass makes.
    registerServerFunction("sf-sc-4", async () => () => r.ssr`<ul><li>one</li></ul>`);
    registerServerFunction("sf-sc-5", async () => "saved");

    const host = createFrameHost();
    const handler = createServerComponentHandler({
      host,
      // One mount component per function; each call is a site binding a
      // frame to the delivered address.
      component: () => (props, address) => {
        const el = document.createElement("div");
        document.body.appendChild(el);
        createFrame(el, { host, id: address() });
        return el;
      }
    });

    const getter = await handleServerFunctionRequest(flightRequest("sf-sc-4"), {
      provideEvent: (event, fn) => fn(),
      transformResult: frameTransformResult
    });
    const binding = await handler.handle(getter, { id: "sf-sc-4", args: [], context: null });
    const el = binding();
    // Give the getter's stream time to land before the mutation follows.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(el.innerHTML).toContain("<li>one</li>");

    // A mutation invalidating the "notes" query answers with markup under
    // that call's address, and it lands in the boundary above — the
    // mutation's own call site never referred to it.
    const seen = [];
    const unsubscribe = subscribeFlightData(data => void seen.push(data));
    const mutation = await dispatch("sf-sc-5", () => ({
      "notes[]": collected(() => r.ssr`<ul><li>two</li></ul>`, "sf-sc-4")
    }));
    const result = await handler.handle(mutation, { id: "sf-sc-5", context: null });
    unsubscribe();

    expect(result).toBe("saved");
    expect(el.innerHTML).toContain("<li>two</li>");
    expect(el.innerHTML).not.toContain("<li>one</li>");
    // The envelope's entry IS that call's binding — identity-stable across
    // the wire, so an integration seeding its cache with it re-stamps
    // freshness without failing any equals-gate.
    expect(seen).toHaveLength(1);
    expect(seen[0]["notes[]"]).toBe(binding);
  });

  it("mints a boundary for a region nothing is showing, draining its buffered chunks", async () => {
    registerServerFunction("sf-sc-3", async () => "saved");
    const response = await dispatch("sf-sc-3", () => ({
      "count[]": 3,
      "notes[]": collected(() => r.ssr`<ul><li>fresh</li></ul>`, "getFreshNotes")
    }));

    const host = createFrameHost();
    const handler = createServerComponentHandler({
      host,
      component: () => (props, address) => {
        const el = document.createElement("div");
        document.body.appendChild(el);
        createFrame(el, { host, id: address() });
        return el;
      }
    });

    const seen = [];
    const unsubscribe = subscribeFlightData(data => void seen.push(data));
    const result = await handler.handle(response, { id: "sf-sc-3", context: null });
    unsubscribe();

    // The mutation's own return value, not a component: nothing about this
    // call site rendered markup.
    expect(result).toBe("saved");
    expect(seen).toHaveLength(1);
    expect(seen[0]["count[]"]).toBe(3);
    // Nothing was bound to the call's address, so its chunks write-throughed
    // to the resident store and the envelope's reference minted its binding:
    // wherever the integration's seeded value is eventually read, mounting
    // materializes from the warm store — still one round trip.
    const el = seen[0]["notes[]"]();
    expect(el.innerHTML).toContain("<li>fresh</li>");
  });

  it("reaches a boundary answered locally at t=0", async () => {
    registerServerFunction("sf-sc-6", async () => "saved");

    const host = createFrameHost();
    // The document already carries this boundary (SSR'd, then adopted).
    const adopted = document.createElement("div");
    document.body.appendChild(adopted);
    const handler = createServerComponentHandler({
      host,
      component: () => (props, address) => {
        createFrame(adopted, { host, id: address() });
        return adopted;
      },
      // Answered locally: any non-undefined hit resolves the call's binding.
      intercept: () => true
    });

    // The t=0 call never leaves the browser; the resolved binding mounts the
    // adopted element under the call's address (argless: the function id) —
    // which is where a mutation's region for this call then lands.
    const local = handler.intercept({ id: "sf-doc", args: [] });
    expect(local()).toBe(adopted);

    const mutation = await dispatch("sf-sc-6", () => ({
      "doc[]": collected(() => r.ssr`<p>after</p>`, "sf-doc")
    }));
    expect(await handler.handle(mutation, { id: "sf-sc-6", context: null })).toBe("saved");
    expect(adopted.innerHTML).toContain("after");
  });
});
