// The container tier at the slot border (DR-2 case 3): a reactive container
// (a projection) crossing a serialization boundary ships as its TRACE — an
// async iterable whose first yield is a full state snapshot and whose later
// yields are patch batches (the reactive core's own continuation protocol,
// the same one hydration resume uses). The client materializes the trace
// back into a live read-only container: fine-grained updates without wire
// diffing — patches are RECORDED at write time by the producer, never
// computed — and without domain keys (paths are framework-owned identity).
//
// This module is renderer-agnostic glue: the reactive core owns both halves
// of the protocol and injects them here —
//
//   - the SERVER half (`setContainerTraceResolver`) answers "is this value a
//     traced container, and what is its trace" (solid: getProjectionTrace);
//   - the CLIENT half (`setContainerTraceMaterializer`) turns a received
//     trace into a live local container (solid: a projection consuming the
//     iterable).
//
// With neither hook installed the plugin matches nothing and markers pass
// through untouched, so it is safe to register unconditionally — which is
// how it ships: the plugin rides the codec's DEFAULT plugin set
// (serializer-decode.js), so every serializer face carries it with nothing
// for integrations to wire, and its weight stays in the lazy codec graph.

/** @type {((value: unknown) => ({ subscribe(): AsyncIterable<any>, array: boolean } | undefined)) | undefined} */
let resolveTrace;
/** @type {((marker: { $tr: AsyncIterable<any>, $ta?: number }) => unknown) | undefined} */
let materializeTrace;

/** Server half: install the reactive core's trace resolver. */
export function setContainerTraceResolver(fn) {
  resolveTrace = fn;
}

/** Client half: install the reactive core's trace materializer. */
export function setContainerTraceMaterializer(fn) {
  materializeTrace = fn;
}

/**
 * Whether a value is a traced container (server side). The slot
 * classifiers check this FIRST: a container is DATA however object-shaped
 * it looks — and the test is a WeakMap probe, safe on a pending projection
 * proxy whose property reads throw not-ready.
 */
export function isContainerTraced(value) {
  return !!(resolveTrace && typeof value === "object" && value !== null && resolveTrace(value));
}

// The envelope: what actually crosses the serializer. Seroval consults
// plugins only after its own classification pass — it reads `.constructor`
// (which detonates a pending proxy) and claims arrays outright (an
// array-rooted container would serialize as a dead snapshot) — so a raw
// container can never be intercepted reliably. The sink swaps each traced
// container for a plain `{ [TRACE]: trace }` object before the value enters
// the serializer; the plugin matches THAT. The symbol is module-private:
// envelopes exist only between envelopeContainerTraces and the plugin.
const TRACE = Symbol("container-trace");

/**
 * Replace traced containers ANYWHERE in a value (a container can sit at any
 * depth of an argument — `{ filters: { user: proj } }` is one arg) with
 * their serialization envelopes. Copy-on-write: author objects are never
 * mutated, untouched subtrees pass through by reference. Only plain
 * objects/arrays are walked — anything exotic is either a container (probed
 * first, by WeakMap — property-read safe) or an app value the serializer
 * owns. No-op until the resolver is installed.
 */
export function envelopeContainerTraces(value) {
  if (!resolveTrace || value == null || typeof value !== "object") return value;
  const trace = resolveTrace(value);
  if (trace) return { [TRACE]: trace };
  if (Array.isArray(value)) {
    let out = value;
    for (let i = 0; i < value.length; i++) {
      const next = envelopeContainerTraces(value[i]);
      if (next !== value[i]) {
        if (out === value) out = value.slice();
        out[i] = next;
      }
    }
    return out;
  }
  if (Object.getPrototypeOf(value) === Object.prototype) {
    let out = value;
    for (const key of Object.keys(value)) {
      const next = envelopeContainerTraces(value[key]);
      if (next !== value[key]) {
        if (out === value) out = { ...value };
        out[key] = next;
      }
    }
    return out;
  }
  return value;
}

// One live container per trace, however many places reference it: seroval's
// refs already dedupe the NODE within a stream, and this memo makes the
// materialization idempotent across independent revival sites (an eval-face
// marker read by two occurrences, a codec node re-resolved per record).
const materialized = new WeakMap();
// The client-face mirror of the server's WeakMap probe (isContainerTraced):
// every value this module has materialized, so consumers can recognize a
// live container WITHOUT touching its properties.
const materializedValues = new WeakSet();

function materialize(marker) {
  let value = materialized.get(marker.$tr);
  if (value === undefined) {
    value = materializeTrace(marker);
    materialized.set(marker.$tr, value);
    if (value !== null && typeof value === "object") materializedValues.add(value);
  }
  return value;
}

/**
 * Whether a value is a container this module materialized (client side).
 * Arg classifiers must check this FIRST: a pending container's property
 * reads throw not-ready, so an async probe (`.then`, `Symbol.asyncIterator`)
 * or a serialization compare would detonate it. A WeakSet probe never
 * triggers the proxy's traps.
 */
export function isMaterializedContainer(value) {
  return value !== null && typeof value === "object" && materializedValues.has(value);
}

/**
 * Whether a decoded value is a trace marker: the eval face serializes a
 * trace as `{ $tr: iterable, $ta: 0|1 }` (a plain literal — data scripts
 * execute before any runtime that could materialize is guaranteed
 * resident, so revival is deferred to the arg-read site).
 */
export function isContainerTraceMarker(value) {
  return (
    value != null &&
    typeof value === "object" &&
    value.$tr != null &&
    typeof value.$tr[Symbol.asyncIterator] === "function"
  );
}

/**
 * Deep-revive trace markers inside a decoded value (document-face slot args
 * arrive as literals, and a container can sit at ANY depth of an argument —
 * `{ filters: { user: proj } }` is one arg). In-place: args records are
 * per-record decoded copies. No-op until the materializer is installed.
 */
export function reviveContainerTraces(value) {
  if (!materializeTrace || value == null || typeof value !== "object") return value;
  if (isContainerTraceMarker(value)) return materialize(value);
  // Plain containers only — anything exotic was either produced by the
  // codec plugin (already materialized) or is an app value not ours to walk.
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = reviveContainerTraces(value[i]);
  } else if (Object.getPrototypeOf(value) === Object.prototype) {
    for (const key of Object.keys(value)) value[key] = reviveContainerTraces(value[key]);
  }
  return value;
}

function parseTrace(value, ctx) {
  const trace = value[TRACE];
  return { a: trace.array ? 1 : 0, i: ctx.parse(trace.subscribe()) };
}

/**
 * Seroval plugin carrying reactive containers across the slot border as
 * traces. Part of the codec's DEFAULT plugin set (serializer-decode.js), so
 * every face — the hydration serializer, the frames codec, flight
 * payloads, the client data tables — carries it with nothing to wire, and
 * its weight lives in the (lazy) codec graph, never the eager client.
 *
 * @type {import("seroval").Plugin<object, { a: number, i: any }>}
 */
export const ContainerTracePlugin = {
  tag: "dom-expressions/container-trace",
  test(value) {
    // Matches the ENVELOPE, never a raw container (see TRACE above). The
    // symbol probe is trap-safe on anything.
    return value != null && typeof value === "object" && TRACE in value;
  },
  parse: {
    sync() {
      // A trace is a stream; a sync parse has nowhere to put its later
      // yields and would freeze the container silently.
      throw new Error("A reactive container can only be serialized by a streaming serializer.");
    },
    async async(value, ctx) {
      const trace = value[TRACE];
      return { a: trace.array ? 1 : 0, i: await ctx.parse(trace.subscribe()) };
    },
    stream: parseTrace
  },
  serialize(node, ctx) {
    // Eval face: a marker literal, revived at the arg-read site (see
    // reviveContainerTraces). `$ta` seeds the consumer's root shape.
    return "{$tr:" + ctx.serialize(node.i) + ",$ta:" + node.a + "}";
  },
  deserialize(node, ctx) {
    const iterable = ctx.deserialize(node.i);
    const marker = { $tr: iterable, $ta: node.a };
    // Codec face: the decode runs where the reactive core is resident (the
    // frames client installs the materializer at module load, before any
    // response can decode), so the value leaves the table already live. The
    // marker fallback keeps a hookless decode inert instead of broken.
    return materializeTrace ? materialize(marker) : marker;
  }
};
