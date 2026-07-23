/**
 * FrameSink — the frame-chunk side of the renderToStream emission seam.
 *
 * `renderToStream` (server.js) routes all emission through semantic sink
 * methods — data / fragment / reveal / asset / shell — with the document sink
 * (inline <script>/<template>/<link> output) as the default. This module is
 * the other side of that seam: a sink emitting the transport-agnostic
 * FrameChunk stream, plus `renderToFrameStream`, the producer entry that
 * wires it up with a frame envelope (start/complete chunks) in place of the
 * document writable. Same render core, different assembly.
 *
 * What stays in the shared render core, unchanged:
 *   - the render context API and resolveSSRNode
 *   - root-hole resolution, blockingPromises, flush scheduling
 *   - the registerFragment registry, reveal groups, waitForFragments,
 *     propagateBoundaryStyles
 *   - asset tracking (createAssetTracking)
 *
 * Call-site map (server.js core -> sink method -> frame chunks):
 *
 *   serializer onData                 -> data(payload)             -> data
 *   doShell                           -> shell(html, meta)         -> [assets,] html
 *   registerFragment resolve (post-flush)
 *                                     -> fragment(key, html, meta) -> [assets,] fragment [, reveal when eager]
 *   revealFragments / revealFallbacks -> reveal(keys, meta)        -> reveal
 *   registerAsset (post-flush)        -> asset(type, url)          -> assets
 *   envelope completion               -> end()                     -> complete
 *   error paths (not yet routed)      -> error(id, err)            -> error
 *
 * Deliberately does NOT flush `<script>` tags, wrap data in the document
 * `$HY` bootstrap, or do string injection: control flow is passive records,
 * not active scripts (the reason the frame consumer must not reuse the $df*
 * helpers).
 */
import { createPlugin } from "seroval";
import {
  runWithHydrationScope,
  sharedConfig,
  getOwner,
  runWithOwner,
  NoHydration,
  Hydration
} from "rxcore";

/**
 * Render server-owned output under NoHydration semantics (mimicking solid's
 * `<NoHydration>`): elements emit no hydration keys and async values skip
 * hydration serialization — adopted server content's HTML IS its data, so
 * per-element keys are pure tax ("hydration:false regions"). Ids are still
 * CONSUMED (the zone's owner inherits normally), so sibling key sequences
 * and fragment/Loading ids are untouched. Client positions re-enter through
 * `Hydration` in the document slot props. Cores without the
 * components fall back to plain evaluation (keys stay, nothing breaks).
 */
function serverOwned(render) {
  return NoHydration
    ? NoHydration({
        get children() {
          return render();
        }
      })
    : render();
}
import { renderToStream } from "./server.js";
import { createJSONSerializer } from "./serializer.js";
import { createChunk } from "./server-functions/shared.js";
import { isResponseEnvelope } from "./response.js";
import { FRAME_STREAM_HEADER } from "./frame-transport.js";

/**
 * A sink emitting the transport-agnostic FrameChunk stream. `emit(chunk)` is
 * the envelope boundary (array push in tests, an encoded write over a real
 * transport). `id`/`version` address the frame.
 *
 * @param {(chunk: object) => void} emit
 * @param {{ id: string, version: number }} frame
 */
export function createFrameSink(emit, frame) {
  const { id, version } = frame;
  // Fragments that streamed styles ahead of a grouped reveal; the group's
  // reveal chunk must tell the consumer to wait on them.
  const styledKeys = new Set();
  return {
    shell(html, meta = {}) {
      // Pre-flush assets (entry modules, hoisted boundary styles) are head
      // splices in the document sink; a frame carries them as an assets chunk
      // ahead of the shell html. `meta.assets` (evaluated useAssets HTML) is
      // document-head material with no frame representation — frames are
      // boundary content, not documents — so it is dropped.
      if (meta.preloads && meta.preloads.size) {
        const styles = [];
        const modules = [];
        for (const url of meta.preloads) {
          (url.endsWith(".css") ? styles : modules).push(url);
        }
        const chunk = { type: "assets", id, version, key: "" };
        if (styles.length) chunk.styles = styles;
        if (modules.length) chunk.modules = modules;
        emit(chunk);
      }
      emit({ type: "html", id, version, html });
    },
    data(record) {
      // Keyed codec record ({ key, node, initial }) from createJSONSerializer
      // — the frame wire format: eval-free SerovalNode data the consumer
      // applies to its record table (createJSONDataTable). A plain string
      // (hydration script from createHydrationSerializer) still passes
      // through as a `payload` chunk for eval-style consumers.
      //
      // The DOCUMENT hydration protocol's bookkeeping — fragment-resume
      // promises (`<id>_fr`) and ssrSource memo auto-serializations (bare
      // hydration-id keys, pure digits under a frame render) — has no
      // frame-side reader: the stream's own fragment/reveal chunks supersede
      // it. Dropped (measured at 26% of a navigation payload). Deliberate
      // serializations (codec `arg:` records, user keys) pass through.
      if (
        record &&
        typeof record.key === "string" &&
        (record.key.endsWith("_fr") || /^\d+$/.test(record.key))
      ) {
        return;
      }
      if (typeof record === "string") {
        emit({ type: "data", id, version, payload: record });
      } else {
        emit({
          type: "data",
          id,
          version,
          key: record.key,
          node: record.node,
          initial: record.initial
        });
      }
    },
    fragment(key, value, meta = {}) {
      // meta.styles is the core's { links, inline } split: stylesheet URLs
      // gate the reveal (they load async); inline styles are CSS content that
      // applies on insertion, carried by value, no gating.
      const links = (meta.styles && meta.styles.links) || [];
      const inline = (meta.styles && meta.styles.inline) || [];
      if (links.length || inline.length) {
        if (links.length) styledKeys.add(key);
        const chunk = { type: "assets", id, version, key };
        if (links.length) chunk.styles = links;
        if (inline.length) {
          chunk.inlineStyles = inline.map(e => ({ id: e.id, content: e.content, attrs: e.attrs }));
        }
        emit(chunk);
      }
      emit({ type: "fragment", id, version, key, html: value });
      // A fragment that ERRORED still reveals (its html is the fallback /
      // error template), but the failure is surfaced as a keyed error chunk
      // — the frame protocol has no `<key>_fr` rejection to ride.
      if (meta.error) {
        emit({
          type: "error",
          id,
          version,
          key,
          error: { message: String((meta.error && meta.error.message) || meta.error) }
        });
      }
      // An eagerly-revealed fragment (no reveal group) carries its own
      // reveal; grouped fragments wait for an explicit reveal() call.
      if (!meta.revealGroup) {
        emit({ type: "reveal", id, version, keys: [key], waitForStyles: !!links.length });
      }
    },
    reveal(keys, meta = {}) {
      let waitForStyles = false;
      for (const key of keys) if (styledKeys.has(key)) waitForStyles = true;
      const chunk = { type: "reveal", id, version, keys, waitForStyles };
      if (meta.fallback) chunk.fallback = true;
      emit(chunk);
    },
    asset(type, url) {
      // Post-flush styles ride their fragment's assets chunk (fragment() gets
      // them via meta.styles) — same as the document sink, which only writes
      // style links on the fragment path. Emitting them here too would
      // duplicate, mis-keyed to the root.
      if (type !== "module") return;
      emit({ type: "assets", id, version, key: "", modules: [url] });
    },
    end() {
      emit({ type: "complete", id, version });
    },
    error(errorId, error) {
      emit({ type: "error", id, version, key: errorId, error });
    },
    // A named slot invocation from the slot props proxy: the client's
    // render callback for the occurrence's prop is called with these args.
    // No document-sink counterpart — slots only exist in frame streams.
    slot(key, args) {
      emit({ type: "slot", id, version, key, args });
    },
    // A nested server-content region (a `{$frame}` slot arg): its html is a
    // chunk addressed to the CHILD frame id — the consumer binds a nested
    // frame to the arg's marker range and the host routes/buffers by id.
    region(childId, html) {
      emit({ type: "html", id: childId, version, html });
    }
  };
}

/**
 * Render to a FrameChunk stream: the same render core as `renderToStream`,
 * with emission swapped to `createFrameSink` and the document writable
 * replaced by a chunk envelope. The envelope emits `start` up front and
 * `complete` at stream end; no document text is ever written.
 *
 *   renderToFrameStream(code, { frame: { id: "f0", version: 1 } })
 *     .pipe({ write(chunk) { ... }, end() { ... } });
 *
 *   const chunks = await renderToFrameStream(code, opts); // collected array
 *
 * Remaining `renderToStream` options (renderId, plugins, onError, manifest,
 * ...) pass through; `options.sink` is owned by this entry.
 *
 * @param {() => unknown} code
 * @param {{ frame?: { id?: string, version?: number } } & object} options
 */
export function renderToFrameStream(code, options = {}) {
  return frameStream(() => code, options);
}

/**
 * Render a **server component** — a `props => JSX` function, typically
 * returned from a server function — to a FrameChunk stream. `props` is a
 * slot-props proxy, not data: reading a prop as a child emits a slot
 * marker range the client fills with its own content; calling a prop as a
 * render function additionally emits a `slot` chunk carrying the call's
 * args (one occurrence per call, so iteration and state-follows-id reorder
 * work on the consumer). Args serialize through the frame's data codec —
 * primitives ride literally, everything else becomes a `{ $ref }` the
 * consumer resolves against its data table.
 *
 * This is the producing half of the convention "a function returned from a
 * server function is a server component"; the props the *client* passes
 * never reach the server — the server only marks where they go.
 *
 * @param {(props: object) => unknown} component
 * @param {{ frame?: { id?: string, version?: number } } & object} options
 */
export function renderServerComponent(component, options = {}) {
  return frameStream((sink, frame) => {
    const props = createSlotProps(sink, frame);
    return () => component(props);
  }, options);
}

// The shared chunk envelope: `start` up front, the frame sink for all render
// emission, `complete` + end on the stream settling. `makeCode` builds the
// render thunk with access to the sink/frame (the slot-props proxy needs
// both); no document text is ever written.
function frameStream(makeCode, options) {
  const { id = "", version = 1 } = options.frame || {};
  const frame = { id, version };
  function stream(w) {
    const emit = chunk => w.write(chunk);
    const sink = createFrameSink(emit, frame);
    emit({ type: "start", id, version });
    const code = makeCode(sink, frame);
    try {
      // Frames default to the keyed JSON codec for data records (eval-free
      // nodes; decode with createJSONDataTable). `options.serializer` can
      // override — e.g. createHydrationSerializer for eval-style payloads.
      // The whole stream render is server-owned: client positions never
      // render server-side post-load, so nothing in a frame stream carries
      // hydration keys or async-value hydration records.
      renderToStream(() => serverOwned(code), {
        serializer: createJSONSerializer,
        ...options,
        sink
      }).pipe({
        // Every document emission is intercepted by the frame sink, so no
        // text arrives here; the writable exists only for the completion
        // signal.
        write() {},
        end() {
          sink.end();
          w.end && w.end();
        }
      });
    } catch (err) {
      // A synchronous render failure travels as a structured chunk — the
      // consumer stores an `:error` record instead of seeing a truncated
      // stream. (Async fragment errors already ride their rejected `_fr`
      // promise through the data codec.)
      sink.error("", err instanceof Error ? err.message : String(err));
      sink.end();
      w.end && w.end();
    }
  }
  return {
    pipe: stream,
    then(onFulfilled, onRejected) {
      return new Promise((resolve, reject) => {
        const chunks = [];
        try {
          stream({ write: chunk => chunks.push(chunk), end: () => resolve(chunks) });
        } catch (err) {
          reject(err);
        }
      }).then(onFulfilled, onRejected);
    }
  };
}

/** The slot marker range for an occurrence, as a pre-rendered SSR value. */
function slotRange(occurrence) {
  return { t: `<!--slot:${occurrence}:start--><!--slot:${occurrence}:end-->` };
}

// Occurrence ids embed user data (`$key`), and they land in contexts with
// hard character constraints: HTML comment markers (`-->` terminates the
// comment — the Qwik marker-XSS class, GHSA-m6jq-g7gq-5w3c), unquoted `_hk`
// attribute values (whitespace/quotes/`=`/`<`/`>`/backtick truncate or split
// the attribute), and `#`, which is the occurrence separator `propOf` splits
// on. Keys are percent-encoded onto a conservative alphabet at the single
// point occurrences are minted; both proxies and the wire carry the encoded
// form, and the client never decodes — occurrence identity only requires the
// two sides to agree byte-for-byte. `%` itself encodes, so the mapping is
// injective and distinct keys can never collide.
const OCCURRENCE_UNSAFE = /[^A-Za-z0-9_.-]/g;
function encodeOccurrenceKey(key) {
  return String(key).replace(OCCURRENCE_UNSAFE, c => {
    const code = c.codePointAt(0);
    return "%" + (code < 16 ? "0" : "") + code.toString(16);
  });
}

/**
 * Mint the occurrence id for one render-prop call: `prop#<$key>` when the
 * caller named the occurrence, positional `prop#<n>` otherwise. Shared by the
 * stream and document proxies so identity is byte-identical across t=0
 * adoption and every later stream.
 */
function occurrenceId(prop, raw, counts) {
  const k = raw.$key;
  // Numbers encode too: exponent forms ("1e+21") carry `+`.
  if (typeof k === "string" || typeof k === "number") {
    return `${prop}#${encodeOccurrenceKey(k)}`;
  }
  const n = counts[prop] || 0;
  counts[prop] = n + 1;
  return `${prop}#${n}`;
}

/**
 * Document-mode slot props — the t = 0 counterpart of
 * `createSlotProps`. During initial document SSR a server component
 * renders INLINE, and (the one hydration-time exception) the client's real
 * props render server-side inside its positions. This proxy hands the
 * server component those real props while emitting the same marker dialect
 * the chunk producer uses — proj ranges around positions, frame ranges
 * around nested server content — so the client's `adopt` binds slots and
 * regions onto the server-rendered ranges and post-load streams morph them
 * in place. Occurrence identity (`$key`/positional) matches the chunk
 * producer exactly; nothing here is serialized — the page IS the payload.
 */
export function createDocumentSlotProps(clientProps, frameId) {
  const counts = Object.create(null);
  const getters = new Map();
  const range = (occurrence, content) => [
    { t: `<!--slot:${occurrence}:start-->` },
    content,
    { t: `<!--slot:${occurrence}:end-->` }
  ];
  // Client content renders under a per-occurrence hydration-key OWNER
  // scope, so the adopting client re-renders each slot under the SAME
  // scope and solid's registry claims the server-rendered nodes by key —
  // templates never ship as data (the claim IS the transfer). Key chains
  // derive from the owner id on both sides (getNextChildId), which is why
  // this is an owner, not a render-context poke. Inside the serverOwned
  // (NoHydration) zone this is the `<Hydration id>` re-entry — same owner,
  // plus re-enabling key emission for the client position's subtree.
  //
  // The zone owner is captured HERE (proxy creation happens inside
  // serverOwned) because a position hole can evaluate later under an
  // ambient owner outside the zone: template holes re-enter their
  // registration owner (ssrScope), but a position sitting in a top-level
  // fragment resolves as an array element at flush time — Hydration would
  // see "no NoHydration zone" and pass through, leaking ambient-chain keys
  // onto the wrapper instead of its sc- occurrence namespace.
  const zoneOwner = getOwner ? getOwner() : null;
  const scoped = (occurrence, render) => {
    const id = `sc-${frameId}-${occurrence}-`;
    const run = () =>
      Hydration
        ? Hydration({
            id,
            get children() {
              return render();
            }
          })
        : runWithHydrationScope(id, render);
    return zoneOwner ? runWithOwner(zoneOwner, run) : run();
  };
  return new Proxy(Object.create(null), {
    has() {
      return true;
    },
    get(_, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop === "then") return undefined;
      let fn = getters.get(prop);
      if (!fn) {
        fn = (...callArgs) => {
          // Direct-insert position: the client's content renders inline,
          // wrapped in the range the adopting frame will claim.
          if (callArgs.length === 0 || callArgs[0] === undefined) {
            // Direct-insert positions are key-scoped like render props —
            // there is no natural id parity across the boundary, so BOTH
            // sides evaluate inside the occurrence scope. The prop is read
            // INSIDE scoped(): compiled component props are getters, so the
            // client's JSX evaluates lazily at access under the same keys —
            // plain JSX, no thunk convention.
            return scoped(prop, () => {
              const value = clientProps[prop];
              return range(prop, typeof value === "function" ? value() : value);
            });
          }
          const raw = callArgs[0];
          const occurrence = occurrenceId(prop, raw, counts);
          const slot = clientProps[prop];
          if (typeof slot !== "function") return range(occurrence, undefined);
          const resolved = {};
          // Usage tracking (dispatch case 3, document face): regions ride as
          // THUNKS, so SSR hole resolution evaluating one IS the usage
          // signal. A wrapper that never renders an arg (collapsed by
          // default) leaves its thunk unevaluated — that content would
          // vanish from the page, so after the wrapper's render it FLIPS:
          // serialized once as hydration-data records (the occurrence's args
          // + the region html, keyed for the adopting frame's store) and the
          // client mounts it from there when the wrapper finally renders it.
          const regions = [];
          for (const key of Object.keys(raw)) {
            const value = raw[key];
            if (key !== "$key" && isServerContent(value)) {
              const childId = `${frameId}.${occurrence}.${key}`;
              const region = { key, childId, value, used: false };
              regions.push(region);
              resolved[key] = () => {
                region.used = true;
                // A region is a frame ELEMENT the client wrapper adopts —
                // the same DOM contract as the boundary, one level down.
                return [{ t: frameElementOpen(childId) }, value, { t: FRAME_ELEMENT_CLOSE }];
              };
            } else {
              resolved[key] = value;
            }
          }
          const out = scoped(occurrence, () => range(occurrence, slot(resolved)));
          const unused = regions.filter(r => !r.used);
          if (sharedConfig.context) {
            // Every occurrence re-arms with real args at adoption via a
            // t=0 slot record — occluded args become region refs, and
            // primitives ride along UNLESS their (escaped) value already
            // appears in the occurrence's rendered output: those are
            // recoverable from the page (reverse-templating's job, not yet
            // built) and re-sending them would break the single-copy
            // invariant. Exclusion errs toward the claim: a coincidental
            // substring match just means that arg reads undefined at t=0.
            const rendered = renderedHtmlOf(out);
            const args = {};
            let any = false;
            for (const key of Object.keys(raw)) {
              const value = raw[key];
              if (key === "$key") continue;
              const region = regions.find(r => r.key === key);
              if (region) {
                if (!region.used) {
                  args[key] = { $frame: region.childId };
                  any = true;
                }
                continue;
              }
              if (isServerContent(value)) continue;
              const t = typeof value;
              if ((t === "string" || t === "number") && rendered !== null) {
                const needle =
                  t === "string" ? sharedConfig.context.escape(String(value)) : String(value);
                if (needle !== "" && rendered.includes(needle)) continue;
              }
              args[key] = value;
              any = true;
            }
            if (any) sharedConfig.context.serialize(`sc:slot:${frameId}:${occurrence}`, args);
            for (const region of unused) {
              // Resolve the region's server content through the live render
              // context. Sync content serializes directly; async content
              // serializes as a PROMISE of its final html — the hydration
              // serializer holds the stream and patches the record when it
              // settles (resolveRegionHtml re-pulls holes as their promises
              // land, the resolveRootHoles shape).
              sharedConfig.context.serialize(
                `sc:region:${region.childId}`,
                resolveRegionHtml(sharedConfig.context, region.value)
              );
            }
          }
          return out;
        };
        getters.set(prop, fn);
      }
      return fn;
    }
  });
}

// The boundary element vocabulary — the t=0 DOM contract with the client
// consumer (frame-client.js `FRAME_TAG`/`FRAME_ID_ATTR`, which creates and
// adopts the same element). The boundary is an element, not a comment range:
// a first-class node the client adopts by attribute query and that `insert`
// places natively (see docs/frame-seams-decision.md). Kept in sync with the
// consumer by convention — the two don't share a module (server-only vs
// client-only). `display:contents` keeps it layout-transparent.
const FRAME_TAG = "dx-frame";
const FRAME_ID_ATTR = "data-fid";

/** Open tag for a boundary/region element with `id`. `id` is developer-owned
 *  (a server-function id), but attribute-escaped defensively. */
function frameElementOpen(id) {
  const escaped = sharedConfig.context ? sharedConfig.context.escape(String(id), true) : String(id);
  return `<${FRAME_TAG} ${FRAME_ID_ATTR}="${escaped}" style="display:contents">`;
}
const FRAME_ELEMENT_CLOSE = `</${FRAME_TAG}>`;

/**
 * The in-process mirror of `frameTransformResult`, for DOCUMENT SSR:
 * install as `configureServerFunctionsServer({ transformDirectResult })`
 * and a server function whose direct (same-process) call resolves to a
 * function comes back as an inline-renderable server component — the boundary
 * ELEMENT around it, document-mode slot props inside. HTTP calls are
 * untouched (`frameTransformResult` owns that leg).
 */
export function frameTransformDirectResult(value, { id }) {
  if (typeof value !== "function") return value;
  const component = value;
  const wrapped = props => [
    { t: frameElementOpen(id) },
    serverOwned(() => component(createDocumentSlotProps(props, id))),
    { t: FRAME_ELEMENT_CLOSE }
  ];
  // Branded so the hydration serializer can write it as a reference (see
  // ServerComponentPlugin) instead of meeting an unserializable function.
  wrapped[SERVER_COMPONENT] = id;
  return wrapped;
}

/**
 * The occurrence's rendered output as html when synchronously available
 * (`null` when async holes are pending — exclusion then errs toward
 * including the arg, which is safe: the value was NOT rendered yet).
 */
function renderedHtmlOf(out) {
  try {
    const res = sharedConfig.context.resolve(out);
    // Markers, frame/region element tags, AND hydration keys stripped: the
    // occurrence/region ids inside them would false-positive the
    // recoverability check (an arg value "c1" matching its own
    // `slot:comment#c1` marker, or a region element's `data-fid` embedding
    // the occurrence id), and `_hk` attributes embed the occurrence key — so
    // any `cid === $key` occurrence would match its own wrapper's hydration
    // key and never arm its t=0 record (#547). Only element TEXT counts as
    // recoverable-from-page. (This whole heuristic is slated for removal —
    // t=0 args ship unconditionally — see docs/frame-seams-decision.md.)
    if (res && res.t && (!res.h || !res.h.length)) {
      return res.t[0]
        .replace(/<!--[^>]*-->/g, "")
        .replace(/<\/?dx-frame[^>]*>/g, "")
        .replace(/ _hk=("[^"]*"|[^\s>]+)/g, "");
    }
  } catch (e) {}
  return null;
}

/**
 * Resolves server content to its final html, riding out async holes: waits
 * each pass's promises, re-pulls the holes, splices — recursively, since a
 * re-pulled hole can yield further holes. Returns the html directly when
 * everything is sync (no promise wrapper on the common path).
 */
function resolveRegionHtml(ctx, node) {
  const res = ctx.resolve(node);
  if (!res || !res.t) return String(res ?? "");
  if (!res.h || !res.h.length) return res.t[0];
  return Promise.all(res.p).then(() => {
    let out = Promise.resolve(res.t[0]);
    for (let i = 0; i < res.h.length; i++) {
      const hole = res.h[i];
      const tail = res.t[i + 1];
      out = out.then(acc =>
        Promise.resolve(resolveRegionHtml(ctx, hole)).then(part => acc + part + tail)
      );
    }
    return out;
  });
}

/** Brands an inline-rendered server component with its function id. */
export const SERVER_COMPONENT = /*#__PURE__*/ Symbol.for("dom-expressions.server-component");

/**
 * Seroval plugin for the document hydration serializer (`renderToStream`'s
 * `options.plugins`): an inline-rendered server component — the resolved
 * value of an async source like `dynamic(() => getStory(id))` — serializes
 * as a REFERENCE, `self._$SC.r("<function id>")`. The document shell's
 * inline bootstrap memoizes a stable placeholder component per id
 * (hydration data scripts run during parse, before the module bundle, so
 * resolution is invocation-time indirection); the frames client installs
 * the implementation that placeholder delegates to, and the transport's
 * document-adoption step returns the same placeholder so the first
 * navigation's equals-gate holds.
 */
export const ServerComponentPlugin = /*#__PURE__*/ createPlugin({
  tag: "dom-expressions/server-component",
  test(value) {
    return typeof value === "function" && SERVER_COMPONENT in value;
  },
  parse: {
    sync(value, ctx) {
      return { id: ctx.parse(value[SERVER_COMPONENT]) };
    },
    async async(value, ctx) {
      return { id: await ctx.parse(value[SERVER_COMPONENT]) };
    },
    stream(value, ctx) {
      return { id: ctx.parse(value[SERVER_COMPONENT]) };
    }
  },
  serialize(node, ctx) {
    return "self._$SC.r(" + ctx.serialize(node.id) + ")";
  },
  deserialize(node, ctx) {
    return globalThis._$SC.r(ctx.deserialize(node.id));
  }
});

/**
 * The inline bootstrap the document shell must include BEFORE any hydration
 * data script (e.g. in `<head>`): memoizes one stable placeholder component
 * per server-component reference. `_$SC.impl` is installed later by the
 * frames client runtime.
 */
export const SERVER_COMPONENT_BOOTSTRAP =
  "self._$SC={c:{},r(i){return this.c[i]||(this.c[i]=(p)=>self._$SC.impl(i,p))}};";

/**
 * The props proxy handed to a server component. Every prop resolves to a
 * function (SSR hole resolution invokes child-position functions with no
 * arguments, so one shape serves both uses):
 *
 *  - invoked with no args (child position — `{props.children}`): renders as
 *    the direct-insert marker range for the prop. Stable per prop; placing
 *    the same prop twice repeats the same occurrence id and the consumer
 *    mounts the first range found.
 *  - invoked with an args object (render prop — `props.item({...})`): emits
 *    a `slot` chunk for a fresh `prop#N` occurrence and renders as that
 *    occurrence's marker range. Primitive args pass literally; other values
 *    serialize under `arg:<occurrence>:<key>` ids (referential dedupe across
 *    occurrences comes from the codec's shared refs — the no-double-data
 *    invariant at the args level).
 *
 * Serialization goes through the live render context, so the proxy must
 * only be *used* during the frame's render.
 */
/** Whether a slot-arg value is server JSX: an SSR template object, or an
 *  array made entirely of them (compiled children lists). */
function isServerContent(value) {
  if (value && typeof value === "object") {
    if ("t" in value) return true;
    if (Array.isArray(value) && value.length > 0) {
      for (const item of value) {
        if (!(item && typeof item === "object" && "t" in item)) return false;
      }
      return true;
    }
  }
  return false;
}

export function createSlotProps(sink, frame) {
  const counts = Object.create(null);
  const getters = new Map();
  return new Proxy(Object.create(null), {
    // Every key virtually exists — a prop is a *position* the client may
    // fill, and the server cannot know which ones the client supplied. This
    // is what routes reactive-core merge utilities down their proxy path
    // ($PROXY in source) and resolves per-property lookups (property in s)
    // to us; it also means merged defaults never override a slot —
    // correct, since slot fallbacks belong to the client slot.
    // Enumeration stays empty by nature (positions aren't listable), so
    // spreads copy nothing: server components should read props directly.
    has() {
      return true;
    },
    get(_, prop) {
      if (typeof prop !== "string") return undefined;
      // `has: true` + callable gets would otherwise make the proxy thenable
      // — a stray await/Promise.resolve would "call" a phantom then slot.
      if (prop === "then") return undefined;
      let fn = getters.get(prop);
      if (!fn) {
        fn = (...callArgs) => {
          if (callArgs.length === 0 || callArgs[0] === undefined) {
            return slotRange(prop);
          }
          const raw = callArgs[0];
          // Occurrence identity (RFC open question 1): a primitive `$key` arg
          // names the occurrence, so client state follows the entity across
          // responses — the slot-level analogue of For's `keyed`
          // function, for the case where references can't carry identity
          // (every response re-creates everything). Without it, identity is
          // positional per prop — the right default for most flows: a state
          // reset across different lists is usually correct, and equivalent
          // re-sends dedupe anyway. `$key` matters when a live list reorders.
          const occurrence = occurrenceId(prop, raw, counts);
          const args = {};
          for (const key of Object.keys(raw)) {
            const value = raw[key];
            const t = typeof value;
            if (value == null || t === "string" || t === "number" || t === "boolean") {
              args[key] = value;
            } else if (isServerContent(value)) {
              // Server JSX flows as a nested region, never as data — the
              // no-double-serialize invariant (transport dispatch case 1):
              // its html is the transfer; the client wraps the range without
              // re-rendering it. Nested occurrence markers evaluated inside
              // this content already emitted their slot chunks against this
              // frame — the consumer threads record lookup up the frame tree.
              const resolved = sharedConfig.context.resolve(value);
              if (resolved.h.length) {
                throw new Error(
                  "Async server content in slot args is not supported yet (arg '" +
                    key +
                    "' of " +
                    occurrence +
                    "). Move the async read above the slot or into a fragment."
                );
              }
              // Region ids derive from occurrence + arg name — stable across
              // responses (allocation order isn't), so a later stream's
              // region content routes to the same bound region and morphs in
              // place, and keyed dedupe holds under reorders.
              const childId = `${frame.id}.${occurrence}.${key}`;
              sink.region(childId, resolved.t[0]);
              args[key] = { $frame: childId };
            } else {
              const ref = `arg:${occurrence}:${key}`;
              sharedConfig.context.serialize(ref, value);
              args[key] = { $ref: ref };
            }
          }
          sink.slot(occurrence, args);
          return slotRange(occurrence);
        };
        getters.set(prop, fn);
      }
      return fn;
    }
  });
}

/**
 * A server component as an HTTP Response: `renderServerComponent`'s chunk
 * stream, framed with the server-function wire convention (length-prefixed
 * JSON — see frame-transport.js for the reader). Tagged with
 * `X-Frame-Stream: <frame id>` for the client and `X-Content-Raw` so the
 * server-function handler forwards it untouched instead of codec-encoding
 * it. `init` (headers/status, e.g. from a `respond()` envelope) merges in;
 * the frame tags win on conflict.
 */
export function serverComponentResponse(component, options = {}, init = {}) {
  const { id = "", version = 1 } = options.frame || {};
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/x-frame-stream");
  headers.set(FRAME_STREAM_HEADER, id);
  headers.set("X-Content-Raw", "1");
  const stream = renderServerComponent(component, { ...options, frame: { id, version } });
  const body = new ReadableStream({
    start(controller) {
      stream.pipe({
        write(chunk) {
          controller.enqueue(createChunk(JSON.stringify(chunk)));
        },
        end() {
          controller.close();
        }
      });
    }
  });
  return new Response(body, { status: init.status || 200, headers });
}

/**
 * The server-component convention as a `transformResult` policy for
 * `handleServerFunctionRequest`: **a function returned from a server
 * function is a server component** — it renders as a frame-stream Response
 * (frame id defaulting to the server function's id, so repeat calls target
 * the same client boundary and policy A morphs in place). A `respond()`
 * envelope whose value is a function contributes its headers/status to the
 * frame Response. Everything else passes through untouched.
 */
export function frameTransformResult(event, result) {
  let init;
  if (isResponseEnvelope(result)) {
    const { response, value } = result;
    if (typeof value !== "function") return result;
    init = response ? { headers: response.headers, status: response.status } : undefined;
    result = value;
  }
  if (typeof result !== "function") return result;
  const meta = event && event.locals && event.locals.serverFunctionMeta;
  return serverComponentResponse(result, { frame: { id: (meta && meta.id) || "" } }, init);
}
