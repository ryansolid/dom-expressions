/**
 * Frame stream HTTP transport, client half: recognize a frame-tagged
 * server-function Response and pump its framed chunks into a frame host.
 *
 * The wire convention is shared with the server-function transport — each
 * chunk is length-prefixed (`;0x` + 32-bit hex byte length + `;`) UTF-8 of
 * `JSON.stringify(FrameChunk)` — so both transports read and write through
 * the one framing implementation in server-functions/shared.js. The server
 * half (`serverComponentResponse` / `frameTransformResult`) lives in
 * frame-sink.js; this module stays importable from client bundles.
 */
import { createPlugin } from "seroval";
import {
  ChunkReader,
  ERROR_HEADER,
  SINGLE_FLIGHT_HEADER,
  createChunk,
  deserializeStream,
  frameAddress,
  getFlightDataConsumer,
  getServerFunctionsCodec
} from "./server-functions/shared.js";
import { REVALIDATE_HEADER } from "./response.js";

/**
 * Header tagging a Response as a frame stream; its value is the producing
 * frame's id. Frame-owned contract (hence the namespace) — deliberately not
 * a `BodyFormat` entry, since the body is frame chunks, not a serialized
 * value.
 */
export const FRAME_STREAM_HEADER = "X-Frame-Stream";

/** Whether a fetch Response carries a frame stream. */
export function isFrameStreamResponse(response) {
  return response.headers.has(FRAME_STREAM_HEADER);
}

/**
 * Reads a frame-stream Response to completion, applying every chunk to
 * `host`. The client owns boundary identity: pass `options.as` to remap the
 * producer's root frame id onto a local one (the id your insertable/frame
 * registered under), so navigations to the same boundary reuse the same
 * frame regardless of what the server called it. Resolves with the id the
 * chunks were applied under once the stream ends.
 *
 * The client owns versions too: the producer can't know how many streams a
 * boundary has consumed, so `options.version` restamps the response's
 * chunks, making policy A's stale-guard real across navigations. A number
 * versions the whole response — one response IS one version — which holds
 * while a response addresses one boundary. A single-flight response
 * addresses several (each invalidated region is its own boundary, with its
 * own history), so `version` may instead be a function called once per
 * frame in the response.
 *
 * `options.onOutcome` receives the payload text of each `outcome` chunk —
 * the response-scoped single-flight envelope, which is the caller's result
 * rather than anything the host renders.
 *
 * `options.route` maps any other frame id onto a local one. Where `as`
 * renames the response's own root, this resolves the addresses a
 * single-flight response uses for the regions it refreshed.
 */
export async function applyFrameResponse(response, host, options = {}) {
  const rootId = response.headers.get(FRAME_STREAM_HEADER) ?? "";
  const as = options.as;
  const version = options.version;
  const perFrame = typeof version === "function" ? new Map() : null;
  const reader = new ChunkReader(response.body);
  let result = await reader.next();
  while (!result.done) {
    const chunk = JSON.parse(result.value);
    if (chunk.type === "outcome") {
      if (options.onOutcome) options.onOutcome(chunk.payload);
    } else {
      if (as !== undefined && chunk.id === rootId) chunk.id = as;
      else if (options.route) chunk.id = options.route(chunk.id);
      if (perFrame) {
        let v = perFrame.get(chunk.id);
        if (v === undefined) perFrame.set(chunk.id, (v = version(chunk.id)));
        chunk.version = v;
      } else if (version !== undefined) chunk.version = version;
      host.apply(chunk);
    }
    result = await reader.next();
  }
  return as !== undefined ? as : rootId;
}

/** Brands an inline-rendered server component with its function id. */
export const SERVER_COMPONENT = /*#__PURE__*/ Symbol.for("dom-expressions.server-component");

/** The unwrapped server component behind an inline-render wrap. */
export const SERVER_COMPONENT_SOURCE = /*#__PURE__*/ Symbol.for(
  "dom-expressions.server-component-source"
);

/** The call's wire address (`frameAddress`), for regions to be emitted under. */
export const SERVER_COMPONENT_ADDRESS = /*#__PURE__*/ Symbol.for(
  "dom-expressions.server-component-address"
);

/**
 * The handoff contract on components the transport resolves: `{ fnId,
 * frameId, take(prev) }` (see `createServerComponentHandler`). A reader
 * whose source resolved a NEW component while a previous one is mounted
 * offers the old one — `take` rebinds the live mount when both are
 * boundaries of the same function, and the reader keeps its previous value
 * instead of remounting. `Symbol.for`, so consumers (a framework's
 * `dynamic`) can honor it without importing this module.
 */
export const COMPONENT_HANDOFF = /*#__PURE__*/ Symbol.for("dom-expressions.component-handoff");

// The live transport registry's resolver, installed by
// createServerComponentHandler. Module state on the config pattern (one
// active handler at a time, a later creation replaces the current one):
// the codec plugin below has no path to the handler instance — codecs are
// configured, handlers are created — and both live in this module, so the
// seam never needs a global.
let resolveServerComponent;

/**
 * Seroval plugin for a server component crossing a serialization boundary.
 * A branded component (see `frameTransformDirectResult`) serializes as a
 * REFERENCE — its markup never rides as data.
 *
 * Two distinct consumers share the one tag:
 *
 * - `serialize` (eval-style, the document hydration serializer): emits
 *   `self._$SC.r("<function id>")`. The document shell's inline bootstrap
 *   memoizes a stable placeholder per FUNCTION — a delegating shell whose
 *   every mount binds to its own SSR'd element during adoption — so the
 *   address adds nothing at t=0 and the reference stays id-keyed.
 * - `deserialize` (the JSON codec): the codec only ever carries a component
 *   inside a single-flight envelope, so this is a FLIGHT reference. It must
 *   resolve to the exact object the reading call site already holds — an
 *   integration seeding its cache with anything else fails the consumer's
 *   equals-gate and remounts the boundary — so it resolves through the live
 *   transport registry by the call's address.
 */
// One parser serves the sync and stream modes (identical signatures); async
// awaits the same two fields.
function parseServerComponent(value, ctx) {
  return {
    id: ctx.parse(value[SERVER_COMPONENT]),
    address: ctx.parse(value[SERVER_COMPONENT_ADDRESS])
  };
}

export const ServerComponentPlugin = /*#__PURE__*/ createPlugin({
  tag: "dom-expressions/server-component",
  test(value) {
    return typeof value === "function" && SERVER_COMPONENT in value;
  },
  parse: {
    sync: parseServerComponent,
    async async(value, ctx) {
      return {
        id: await ctx.parse(value[SERVER_COMPONENT]),
        address: await ctx.parse(value[SERVER_COMPONENT_ADDRESS])
      };
    },
    stream: parseServerComponent
  },
  serialize(node, ctx) {
    // The reference resolves per FUNCTION (the bootstrap memoizes one
    // placeholder per id), but it CARRIES the call's address: the bootstrap
    // records address -> id, and the client registers those records with the
    // transport — that record is how a post-load call for the same
    // (function, arguments) finds its way back to the adopted boundary even
    // though the document's value never traveled through the transport.
    return "self._$SC.r(" + ctx.serialize(node.id) + "," + ctx.serialize(node.address) + ")";
  },
  deserialize(node, ctx) {
    const id = ctx.deserialize(node.id);
    const address = ctx.deserialize(node.address);
    if (address !== undefined && resolveServerComponent) {
      return resolveServerComponent(id, address);
    }
    // No transport installed (or an unaddressed brand): fall back to the
    // document registry's per-function placeholder.
    return globalThis._$SC.r(id);
  }
});

/**
 * The codec options for a single-flight envelope: the configured codec plus
 * `ServerComponentPlugin`. The envelope is the only place a component
 * crosses the codec, and both legs of that path are frame-owned code (the
 * flight transform serializing it, this transport decoding it), so the
 * protocol injects the plugin itself — nothing to register anywhere.
 */
export function flightCodec(codec) {
  const plugins = (codec && codec.plugins) || [];
  // Tag equality, not instance equality: the two peers (and separately
  // bundled copies of this module) each carry their own plugin object.
  for (const plugin of plugins) {
    if (plugin && plugin.tag === "dom-expressions/server-component") return codec;
  }
  return { ...codec, plugins: [...plugins, ServerComponentPlugin] };
}

/**
 * The client mirror of `frameTransformResult`, shaped for the server-function
 * client's `responseHandler` seam: frame-stream responses resolve the call
 * with a **stable component** instead of data, so an equals-gated consumer
 * (Solid's `dynamic`) never remounts across refetches — the response streams
 * into the boundary underneath as the only observable effect.
 *
 * Boundary identity is derived, never declared: every call keys by its
 * intrinsic address (function + arguments) — the same per-args rule an
 * integration's query cache keys values by, so the two stay one-to-one. A
 * repeat call for the same (function, args) resolves to the identical
 * component (refetches morph the showing boundary in place, cache hits pass
 * the reader's equals-gate), while different args resolve different
 * boundaries — which is what keeps a cached value honest: the boundary a
 * cached component mounts shows the call it was cached for, not whatever
 * the site streamed last. The host retains an unmounted boundary's state,
 * so a fresh mount re-materializes instantly and a stale-cache refetch
 * morphs over it. `component(frameId)` builds the framework's mountable
 * component for a boundary; it is invoked once per boundary and cached.
 *
 * A LIVE call site switching arguments is the one place per-args identity
 * must not mean a remount: the reader's next resolution is a different
 * component, but tearing the mounted boundary down would take its client
 * slot state (an expanded sidebar item, focus, media) with it — state whose
 * occurrences the new call's content still carries. So every component this
 * handler resolves is branded with a HANDOFF contract (a well-known symbol,
 * importless for consumers): the reader offers its previous value to the
 * incoming component, and when both are boundaries of the SAME function
 * with someone live to hand off, the mounted frame REBINDS to the incoming
 * call's id instead — the element and its slot occurrences stay, the old
 * call's state stashes into host retention under its own address (honesty
 * for later cache reads), and the incoming stream (or the new address's
 * retained state, on a cache hit with no stream) morphs it in place. The
 * reader keeps its previous value, so nothing remounts. Preloads never
 * offer a previous value — they have no reader — so hover fetches for other
 * args still buffer off-screen exactly as before.
 */
export function createServerComponentHandler({
  host,
  component,
  onStream,
  documentComponent,
  intercept,
  // The flight consumer and codec are module state in the server-function
  // client's SHARED instance; a bundler may give this module a private copy
  // (solid-web's frames client does), so an integrator whose bundle splits
  // them passes getters that read the built instance. The defaults read the
  // local copy — correct whenever there is only one.
  consumer = getFlightDataConsumer,
  codec = getServerFunctionsCodec
}) {
  // The boundary for each call, keyed by the call's wire address — identity
  // and routing in one map: `(function, args)` is the only name both peers
  // derive independently, so it is how a repeat call finds its boundary AND
  // how a mutation's regions reach the boundaries showing the calls they
  // refresh. Entries are permanent for the session: a boundary never changes
  // which call it shows.
  const byAddress = new Map();
  // Where a pinned call site's mount currently lives. A reader that accepted
  // a handoff keeps its previous component (its "root") while the mounted
  // frame walks address to address; this maps each root's frame id to the id
  // its mount is currently bound to, path-compressed (one hop, retargeted on
  // every handoff) so chains can't cycle. Entries clear when the mount comes
  // home or goes unfindable.
  const forwards = new Map();
  /**
   * Brand a resolved component with the handoff contract (see the factory
   * doc). `take(prev)` is the whole protocol: called by a reader resolving
   * THIS component while still holding `prev`, it answers whether the
   * reader should keep prev — true when they are the same boundary, and
   * true after REBINDING prev's live mount to this component's id (same
   * function, someone mounted). False is "swap normally": different
   * function, unbranded prev, or nothing live to hand off.
   */
  const brand = (comp, fnId, frameId) => {
    // `component` is the integration's type — brand what can carry a
    // property (functions, objects) and pass anything else through: an
    // unbrandable component just never offers handoffs.
    const brandable = typeof comp === "function" || (typeof comp === "object" && comp !== null);
    if (brandable && !comp[COMPONENT_HANDOFF]) {
      comp[COMPONENT_HANDOFF] = {
        fnId,
        frameId,
        take(prev) {
          const meta =
            prev !== null &&
            (typeof prev === "function" || typeof prev === "object") &&
            prev[COMPONENT_HANDOFF];
          if (!meta || meta.fnId !== fnId) return false;
          const root = meta.frameId;
          let cur = forwards.get(root) ?? root;
          // A stale forward (the mount unmounted while away) falls back to
          // the root itself — a mount living under the root is still ours.
          if (cur !== root && !host.get(cur)) {
            forwards.delete(root);
            cur = root;
          }
          if (cur === frameId) return true;
          let frame = host.get(cur);
          if (!frame) return false;
          while (frame) {
            frame.rebind(frameId);
            frame = host.get(cur);
          }
          if (frameId === root) forwards.delete(root);
          else forwards.set(root, frameId);
          return true;
        }
      };
    }
    return comp;
  };
  /** The boundary showing an address, minted under the ADDRESS itself when
   *  none is — chunks for an unshown address buffer in the host under that
   *  id, so a later mount of the minted component drains them. */
  const boundaryFor = (address, fnId) => {
    let entry = byAddress.get(address);
    if (!entry) {
      entry = { frameId: address, component: brand(component(address), fnId, address) };
      byAddress.set(address, entry);
    }
    return entry;
  };
  /** Resolve a flight reference (see `ServerComponentPlugin`) to a
   *  component. Registered so repeat references stay identity-stable. */
  const resolveAddress = (id, address) => boundaryFor(address, id).component;
  resolveServerComponent = resolveAddress;
  // Version history per frame id. A getter's boundary is the only frame in
  // its response, but a single-flight response carries several — each
  // invalidated region is a boundary with its own stale-guard.
  const versions = new Map();
  const bump = frameId => {
    const version = (versions.get(frameId) || 0) + 1;
    versions.set(frameId, version);
    return version;
  };
  return {
    intercept:
      intercept &&
      (info => {
        const hit = intercept(info);
        // A locally-answered call (t=0 document adoption) is showing all the
        // same: record its address so a mutation can reach the adopted
        // boundary — which streams under the function id, like every
        // document boundary — even though no request ever left for it.
        if (hit !== undefined) {
          const address = frameAddress(info.id, info.args);
          byAddress.set(address, { frameId: info.id, component: brand(hit, info.id, info.id) });
        }
        return hit;
      }),
    handle(response, ctx) {
      if (!isFrameStreamResponse(response)) return undefined;
      // The call's intrinsic address is its whole identity (see the factory
      // doc): a repeat call — refetch, preload, cache read — resolves the
      // boundary showing that exact (function, args) and its stream morphs
      // in place; different args resolve a different boundary, so a preload
      // for OTHER args streams off-screen (buffered until mounted) instead
      // of morphing what the page is showing.
      const address = frameAddress(ctx.id, ctx.args);
      let entry = byAddress.get(address);
      if (!entry) {
        // A document-SSR boundary for this function adopts into the cache
        // first: the initial navigation resolves to the SAME placeholder the
        // hydration data produced, so the equals-gate holds and the stream
        // morphs the adopted DOM instead of remounting. Document boundaries
        // are addressed by function id (the logical wire address). The
        // integration returns nothing once the boundary is claimed — from
        // then on the address entry is the only way back to it.
        const adopted = documentComponent && documentComponent(ctx.id);
        if (adopted) {
          entry = { frameId: ctx.id, component: brand(adopted, ctx.id, ctx.id) };
          byAddress.set(address, entry);
        } else {
          entry = boundaryFor(address, ctx.id);
        }
      }
      // A single-flight response is a MUTATION's: it carries regions for the
      // calls it invalidated, and the caller wants the mutation's value
      // rather than a component.
      if (response.headers.has(SINGLE_FLIGHT_HEADER)) {
        return applyFlightResponse(response, entry);
      }
      const version = bump(entry.frameId);
      if (onStream) onStream(entry.frameId, version, response);
      applyFrameResponse(response, host, { as: entry.frameId, version }).catch(err =>
        host.apply({
          type: "error",
          id: entry.frameId,
          version,
          error: { message: String(err && err.message) }
        })
      );
      return entry.component;
    },

    /**
     * Declares that the document is showing a call. Hydration-data values
     * never travel through the transport (the integration seeds its cache
     * straight from the serialized state), so their address -> boundary
     * records arrive through this seam instead — the t=0 reference carries
     * the call's address (see ServerComponentPlugin.serialize), and the
     * integration forwards it with the reference's placeholder. Without the
     * record, the first post-load call for the same (function, arguments)
     * cannot find its way back to the adopted boundary: it would mint a
     * fresh component, failing the reader's equals-gate into a remount.
     */
    showing(address, functionId, component) {
      if (!byAddress.has(address)) {
        byAddress.set(address, {
          frameId: functionId,
          component: brand(component, functionId, functionId),
          address
        });
      }
    }
  };

  /**
   * A mutation whose payload includes markup. The regions stream to the
   * boundaries showing the calls they refresh — untouched by this call
   * site's identity, since they belong to whatever is reading those calls —
   * while the `outcome` chunks carry the `{ value, data }` envelope a plain
   * single-flight body would have held, component-valued entries included
   * (as flight references resolving to the very components those boundaries
   * hold). Data reaches the integration through the same consumer, and the
   * caller gets the same value, so a mutation reads identically whether or
   * not any of what it invalidated was markup.
   */
  async function applyFlightResponse(response, entry) {
    // The mutation's own markup (when it returned a component) belongs to
    // this call site's boundary; every other frame keeps its wire address.
    const rootId = response.headers.get(FRAME_STREAM_HEADER) ?? "";
    const as = rootId ? entry.frameId : undefined;

    // The envelope decodes progressively, exactly as a plain single-flight
    // body does: outcome chunks are the codec's own nodes, so replaying them
    // framed lets async values inside flight data settle as they arrive.
    let feed;
    const source = new ReadableStream({
      start(controller) {
        feed = controller;
      }
    });
    const payload = deserializeStream(new Response(source), flightCodec(codec()));
    let carried = false;

    await applyFrameResponse(response, host, {
      as,
      // Region ROOTS arrive under the address of the call they refresh; send
      // each to the boundary showing it. Nested region ids (address-prefixed:
      // `<address>.item#0.children`) pass through UNTOUCHED — the records in
      // the root's chunks reference them by those very ids, and the consumer
      // mounts region frames under the record ids, so rewriting the chunks
      // (but never the records) would strand the content in the buffer while
      // the mounted regions wait forever. An address nothing is showing
      // routes as itself and the host buffers it — the envelope's reference
      // to the same call (resolved by `resolveAddress`) mints a boundary
      // under that id, so the content mounts wherever the seeded value is
      // eventually read.
      route: id => {
        const local = byAddress.get(id);
        return local ? local.frameId : id;
      },
      // Every frame in the response gets its own bump, and the integration
      // rotates that frame's response-scoped state (data tables) — a region
      // is as much a new stream into a boundary as a navigation is.
      version: frameId => {
        const version = bump(frameId);
        if (onStream) onStream(frameId, version, response);
        return version;
      },
      onOutcome: text => {
        carried = true;
        feed.enqueue(createChunk(text));
      }
    });
    feed.close();

    // A frame stream tagged single-flight always carries its envelope; an
    // absent one is a truncated response, not an empty payload.
    if (!carried) throw new Error("Single-flight frame response carried no outcome");

    const envelope = await payload;
    const deliver = consumer();
    if (deliver) await deliver(envelope.data, { response });
    // Mirrors the data-only path: responses carrying integration metadata
    // are control flow for the consumer to interpret; a bare error-tagged
    // one throws.
    if (
      response.headers.has(ERROR_HEADER) &&
      !response.headers.has("Location") &&
      !response.headers.has(REVALIDATE_HEADER)
    ) {
      throw envelope.value;
    }
    // A mutation that answered with markup for its own boundary resolves to
    // the boundary's component, like a getter would.
    return rootId ? entry.component : envelope.value;
  }
}
