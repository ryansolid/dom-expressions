/**
 * @jest-environment jsdom
 *
 * The container tier at the slot border (DR-2 case 3): a traced container (a
 * reactive-core projection) crossing a serialization boundary ships as its
 * TRACE — an async iterable whose first yield is a full state snapshot and
 * whose later yields are patch batches — and materializes back into a live
 * local container on the client. This module is renderer-agnostic: the
 * reactive core injects a resolver (server) and a materializer (client), so
 * these tests drive both halves with fakes.
 */
import * as r from "../../src/server";
import {
  renderServerComponent,
  frameTransformDirectResult,
  ServerComponentPlugin
} from "../../src/frame-sink";
import {
  ContainerTracePlugin,
  envelopeContainerTraces,
  isContainerTraced,
  reviveContainerTraces,
  setContainerTraceMaterializer,
  setContainerTraceResolver
} from "../../src/frame-container-plugin";
import { flightCodec } from "../../src/frame-transport";
import { createJSONSerializer } from "../../src/serializer";
import {
  createJSONDataTable,
  DEFAULT_WEB_PLUGINS,
  resolveSerializerPlugins
} from "../../src/serializer-decode";

// A fake reactive core: `trace(state, batches)` registers a container whose
// trace yields the snapshot then each batch.
const registry = new WeakMap();
function trace(container, snapshot, batches = [], { array = false } = {}) {
  registry.set(container, {
    array,
    subscribe: async function* () {
      yield snapshot;
      for (const batch of batches) yield batch;
    }
  });
  return container;
}

beforeEach(() => {
  setContainerTraceResolver(value => registry.get(value));
});

afterEach(() => {
  setContainerTraceResolver(undefined);
  setContainerTraceMaterializer(undefined);
});

function collectStream(component, frame = { id: "f", version: 1 }) {
  return new Promise(resolve => {
    const chunks = [];
    renderServerComponent(component, { frame }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks)
    });
  });
}

function collectDocument(component, clientProps, id = "f") {
  return new Promise(resolve => {
    const Inline = frameTransformDirectResult(component, { id });
    const chunks = [];
    r.renderToStream(() => Inline(clientProps), { plugins: [ServerComponentPlugin] }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks.join(""))
    });
  });
}

describe("container traces — classification", () => {
  it("a traced container is data, not content, even when its state has a `t` key", async () => {
    const container = trace({ t: "looks-like-content", n: 1 }, { t: "looks-like-content", n: 1 });
    const chunks = await collectStream(
      props => r.ssr`<div>${[props.row({ store: container })]}</div>`
    );
    const slot = chunks.find(c => c.type === "slot");
    // Data ref, no region chunk: the container guard preempts the content
    // shape probe.
    expect(slot.args.store.$ref).toBe("arg:row#0:store");
    expect(chunks.filter(c => c.type === "html").length).toBe(1); // root only
  });

  it("classification never reads container properties (pending-proxy safe)", async () => {
    // A stand-in for a pending projection proxy: every string-key GET throws.
    const explosive = new Proxy(
      {},
      {
        get(_, key) {
          if (typeof key !== "symbol") throw new Error(`read of '${String(key)}' during classification`);
          return undefined;
        }
      }
    );
    trace(explosive, { safe: true });
    const chunks = await collectStream(
      props => r.ssr`<div>${[props.row({ store: explosive })]}</div>`
    );
    const slot = chunks.find(c => c.type === "slot");
    expect(slot.args.store.$ref).toBe("arg:row#0:store");
  });
});

describe("container traces — stream face wire", () => {
  it("the arg's data chunks carry the trace: snapshot then patch batches", async () => {
    const container = trace(
      { list: ["a"] },
      { list: ["a"] },
      [[[["list", 1], "b", 1]]] // one batch: insert "b" at list[1]
    );
    const chunks = await collectStream(
      props => r.ssr`<div>${[props.row({ store: container })]}</div>`
    );
    const dataChunks = chunks.filter(c => c.type === "data" && c.key === "arg:row#0:store");
    expect(dataChunks.length).toBeGreaterThan(1); // node + streamed yields
    const wire = JSON.stringify(dataChunks.map(c => c.node));
    expect(wire).toContain(ContainerTracePlugin.tag);
    expect(wire).toContain('"a"');
    expect(wire).toContain('"b"');
    // The record shipped before the trace finished, complete after.
    const slotIdx = chunks.indexOf(chunks.find(c => c.type === "slot"));
    const lastData = chunks.indexOf(dataChunks[dataChunks.length - 1]);
    const completeIdx = chunks.findIndex(c => c.type === "complete");
    expect(slotIdx).toBeLessThan(lastData);
    expect(lastData).toBeLessThan(completeIdx);
  });

  it("codec roundtrip: the decoded arg materializes through the client hook", async () => {
    const container = trace({ n: 1 }, { n: 1 }, [[[["n"], 2]]]);
    const received = [];
    setContainerTraceMaterializer(marker => {
      const store = { $live: true, marker };
      received.push(store);
      return store;
    });

    const records = [];
    await new Promise(resolve => {
      const serializer = createJSONSerializer({
        plugins: [ContainerTracePlugin],
        onData: record => records.push(record),
        onDone: resolve
      });
      // What the sink does before any container meets seroval.
      serializer.write("arg:x", envelopeContainerTraces(container));
      serializer.flush();
    });

    const table = createJSONDataTable({ plugins: [ContainerTracePlugin] });
    for (const record of records) table.apply(record);
    const value = table.resolve({ $ref: "arg:x" });
    // The table hands back the MATERIALIZED container, not a marker.
    expect(value.$live).toBe(true);
    expect(received.length).toBe(1);
    // The marker's iterable replays the full trace.
    const yields = [];
    for await (const v of received[0].marker.$tr) yields.push(v);
    expect(yields[0]).toEqual({ n: 1 });
    expect(yields[1]).toEqual([[["n"], 2]]);
  });

  it("a container nested inside a plain object arg envelopes at depth", async () => {
    const container = trace({ user: "d" }, { user: "d" });
    const chunks = await collectStream(
      props => r.ssr`<div>${[props.row({ filters: { by: container, page: 1 } })]}</div>`
    );
    const slot = chunks.find(c => c.type === "slot");
    expect(slot.args.filters.$ref).toBe("arg:row#0:filters");
    const wire = JSON.stringify(
      chunks.filter(c => c.type === "data" && c.key === "arg:row#0:filters").map(c => c.node)
    );
    expect(wire).toContain(ContainerTracePlugin.tag);
    expect(wire).toContain('"user"');
  });

  it("array-rooted containers carry their shape for the consumer's seed", async () => {
    const container = trace(["a"], ["a"], [], { array: true });
    let seenMarker;
    setContainerTraceMaterializer(marker => {
      seenMarker = marker;
      return marker;
    });
    const records = [];
    await new Promise(resolve => {
      const serializer = createJSONSerializer({
        plugins: [ContainerTracePlugin],
        onData: record => records.push(record),
        onDone: resolve
      });
      serializer.write("arg:x", envelopeContainerTraces(container));
      serializer.flush();
    });
    const table = createJSONDataTable({ plugins: [ContainerTracePlugin] });
    for (const record of records) table.apply(record);
    table.resolve({ $ref: "arg:x" });
    expect(seenMarker.$ta).toBe(1);
  });
});

describe("container traces — document face wire", () => {
  it("the record ships the trace as an eval marker; inline markup reads the value", async () => {
    const container = trace({ label: "live" }, { label: "live" });
    const html = await collectDocument(
      props => r.ssr`<div>${[props.row({ store: container })]}</div>`,
      { row: p => r.ssr`<b>${r.escape(p.store.label)}</b>` }
    );
    // Inline fill read the container directly at t=0.
    expect(html).toContain("<b");
    expect(html).toContain("live");
    // The slot record serialized the trace as the marker literal (an object
    // with $tr / $ta), not as a plain data copy of the state object.
    expect(html).toContain("$tr:");
    expect(html).toContain("sc:slot:f:row#0");
  });
});

describe("container traces — revival", () => {
  it("reviveContainerTraces revives markers at any depth, memoized per trace", () => {
    const iterable = { [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true }) }) };
    const marker = { $tr: iterable, $ta: 0 };
    let calls = 0;
    setContainerTraceMaterializer(m => {
      calls++;
      return { store: m };
    });
    const args = { top: marker, nested: { deep: [marker] }, plain: 5 };
    const revived = reviveContainerTraces(args);
    expect(revived.top.store).toBe(marker);
    expect(revived.nested.deep[0]).toBe(revived.top); // memoized: same store
    expect(revived.plain).toBe(5);
    expect(calls).toBe(1);
  });

  it("without a materializer, revival is a no-op", () => {
    const marker = { $tr: { [Symbol.asyncIterator]() {} } };
    expect(reviveContainerTraces({ a: marker }).a).toBe(marker);
  });
});

describe("container traces — plugin registration", () => {
  it("the trace plugin rides the codec's DEFAULT plugin set (every face, nothing to wire)", () => {
    expect(DEFAULT_WEB_PLUGINS.map(p => p.tag)).toContain(ContainerTracePlugin.tag);
    // And the composed sets keep it whatever the caller passes.
    expect(resolveSerializerPlugins(undefined).map(p => p.tag)).toContain(
      ContainerTracePlugin.tag
    );
    expect(resolveSerializerPlugins([ServerComponentPlugin]).map(p => p.tag)).toContain(
      ContainerTracePlugin.tag
    );
  });

  it("flightCodec injects the server-component plugin over the codec defaults", () => {
    const codec = flightCodec({ plugins: resolveSerializerPlugins(undefined) });
    const tags = codec.plugins.map(p => p.tag);
    expect(tags).toContain("dom-expressions/server-component");
    expect(tags).toContain(ContainerTracePlugin.tag);
  });

  it("isContainerTraced is false for everything with no resolver installed", () => {
    setContainerTraceResolver(undefined);
    expect(isContainerTraced(trace({}, {}))).toBe(false);
  });
});
