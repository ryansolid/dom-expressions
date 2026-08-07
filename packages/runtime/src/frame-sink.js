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
import {
  runWithHydrationScope,
  sharedConfig,
  getOwner,
  runWithOwner,
  NoHydration,
  Hydration,
  runInServerComponentScope,
  ssrHandleError,
  ssrAsyncValue
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

/**
 * The server component's own render runs inside the core's context barrier
 * (when the core provides one): user context does not cross a server
 * component root. A refetch or mutation region renders standalone — no app
 * tree above it — so a t=0 inline read that resolved an app-level provider
 * would silently diverge on the next response; the barrier makes both
 * renders agree by construction. Boundary plumbing (Loading / error /
 * reveal coordination) still crosses — the back-and-forth between a server
 * component's async content and the enclosing boundaries at t=0 is
 * intentional. Client positions are unaffected: they re-enter the zone
 * owner captured OUTSIDE the barrier (see createDocumentSlotProps), so the
 * client's own components keep full app context during document SSR.
 */
function serverComponentScope(render) {
  return runInServerComponentScope ? runInServerComponentScope(render) : render();
}
import { renderToStream } from "./server.js";
import { createJSONSerializer } from "./serializer.js";
import {
  ChunkReader,
  SINGLE_FLIGHT_HEADER,
  createChunk,
  frameAddress,
  serializeStream
} from "./server-functions/shared.js";
import { getEventServerFunctionInvocation } from "./server-functions/server.js";
import { isResponseEnvelope } from "./response.js";
import {
  FRAME_STREAM_HEADER,
  SERVER_COMPONENT,
  SERVER_COMPONENT_ADDRESS,
  SERVER_COMPONENT_SOURCE,
  flightCodec,
  setServerComponentBootstrap
} from "./frame-transport.js";

// The brands and the codec plugin live with the transport (the client half
// resolves flight references against its live registry, so they must be
// importable from client bundles); re-exported here because this module is
// where server integrations import the document-SSR surface from.
export {
  SERVER_COMPONENT,
  SERVER_COMPONENT_SOURCE,
  SERVER_COMPONENT_ADDRESS,
  ServerComponentPlugin
} from "./frame-transport.js";

/**
 * The client-side `_$SC` registry as an idempotent expression: evaluates to
 * the registry, creating it only if absent. Idempotence matters — the
 * bootstrap travels with the FIRST serialized reference of each hydration
 * script (see `ServerComponentPlugin.serialize`; loading this module
 * installs the text there, keeping it out of client bundles), so several
 * scripts in one document may each carry a copy and only the first may
 * define it: a redefinition would wipe the `a` address records registered
 * in between.
 *
 * `r(id, address?)` memoizes one stable placeholder component per server
 * function (`_$SC.impl` is installed later by the frames client runtime) and
 * files the call's address -> id record (`a`, plus the live `reg` hook once
 * the client installs one). Placeholders forward a caller-provided address
 * binding (`b`, the frame transport's second-argument convention for mount
 * components) through to `impl`.
 */
const SERVER_COMPONENT_BOOTSTRAP_EXPR =
  "(self._$SC||(self._$SC={c:{},a:{},r(i,a){a&&(this.a[a]=i,this.reg&&this.reg(a,i));return this.c[i]||(this.c[i]=(p,b)=>self._$SC.impl(i,p,b))}}))";

// Serializer contexts (one per emitted script — see seroval's
// crossSerializeStream) whose script already carries the bootstrap; later
// references in the same script are bare registry reads.
const bootstrappedScripts = new WeakSet();
setServerComponentBootstrap(ctx => {
  if (bootstrappedScripts.has(ctx)) return "self._$SC";
  bootstrappedScripts.add(ctx);
  return SERVER_COMPONENT_BOOTSTRAP_EXPR;
});

/**
 * Statement form of the registry bootstrap, for a document shell that wants
 * to install `_$SC` ahead of every data script (e.g. a plugin injecting it
 * into `<head>`). No longer required — serialized references self-bootstrap
 * — but kept for integrations still emitting it; the idempotent form makes
 * the double-definition harmless. Never splice it before the authored
 * `<head>` elements: a head-open script claims as the first walked child at
 * hydration and drifts every positional claim after it.
 */
export const SERVER_COMPONENT_BOOTSTRAP = SERVER_COMPONENT_BOOTSTRAP_EXPR + ";";

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
  // The binding ledger (DR-2 case 1): open bindings for re-runnable slot
  // args — compiled getters, thunks, memos passed whole — re-evaluated at
  // every commit the response observes. A commit is any settlement the sink
  // sees flow through it: a data flush (a serialized promise resolving, an
  // iterator yielding), a fragment resolving, a pending arg's retry
  // succeeding. Sweeps coalesce per microtask and are equality-gated inside
  // each binding, so a quiet ledger costs one comparison per binding per
  // commit. Refs MINTED by sweeps are excluded from the funnel — their own
  // flushes must not re-trigger the sweep that produced them, or a getter
  // returning fresh object identities would loop the response forever; each
  // real commit then drives at most one re-emit per binding.
  //
  // Keyed by `(occurrence, arg)`, replace-on-reopen: one live binding per
  // arg position. A re-render of the same occurrence within one response —
  // the same `$key` rendered twice, or (designed, not yet built) a
  // generator component's next yield — SUPERSEDES the previous render's
  // binding: the stale closure stops sweeping the moment the fresh one
  // opens, instead of both re-emitting per commit.
  const bindings = new Map();
  const sweepMinted = new Set();
  const argRefVersions = new Map();
  let sweepScheduled = false;
  let closed = false;
  // The commit epoch: bumped once per sweep batch, exposed so the reactive
  // core can cache sync derivations per epoch (a memo pulled twice in one
  // sweep computes once; a memo pulled across commits recomputes — the
  // client contract applied to the server, without a subscriber graph).
  let epoch = 0;
  const sweep = () => {
    epoch++;
    for (const b of [...bindings.values()]) {
      try {
        b.sweep();
      } catch (_) {
        // A sweep failure (a serializer already closed at the end-of-response
        // latch) must not take the stream down: the binding's last emitted
        // value stands.
      }
    }
  };
  const scheduleSweep = () => {
    if (closed || sweepScheduled || !bindings.size) return;
    sweepScheduled = true;
    queueMicrotask(() => {
      sweepScheduled = false;
      if (!closed) sweep();
    });
  };
  // Fragment keys registered while a REGION (a `{$frame}` slot arg) resolves,
  // mapped to that region's childId. A region is a nested frame the client
  // owns end-to-end, so its Suspense fragment/reveal must route to the region,
  // not this root frame — else the root store carries the region's segment
  // state and the region's independent morph across responses desyncs from it.
  // First write wins so a fragment inside a nested region is tagged with the
  // innermost region (the region wrap runs before the enclosing one).
  const regionKeys = new Map();
  const frameOf = key => regionKeys.get(key) || id;
  return {
    // Tag a fragment key to the region resolving around its registration, so
    // its later fragment/reveal chunks address the region frame.
    tagRegion(key, childId) {
      if (!regionKeys.has(key)) regionKeys.set(key, childId);
    },
    shell(html, meta = {}) {
      // Pre-flush assets (entry modules, hoisted boundary styles) are head
      // splices in the document sink; a frame carries them as an assets chunk
      // ahead of the shell html.
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
        scheduleSweep();
      } else {
        emit({
          type: "data",
          id,
          version,
          key: record.key,
          node: record.node,
          initial: record.initial
        });
        if (!sweepMinted.has(record.key)) scheduleSweep();
      }
    },
    fragment(key, value, meta = {}) {
      // meta.styles is the core's { links, inline } split: stylesheet URLs
      // gate the reveal (they load async); inline styles are CSS content that
      // applies on insertion, carried by value, no gating.
      const fid = frameOf(key);
      const links = (meta.styles && meta.styles.links) || [];
      const inline = (meta.styles && meta.styles.inline) || [];
      if (links.length || inline.length) {
        if (links.length) styledKeys.add(key);
        const chunk = { type: "assets", id: fid, version, key };
        // Link entries are urls or attributed gate entries; the wire form
        // drops the document-sink markup (`attrHtml`) and keeps the
        // setAttribute record.
        if (links.length) {
          chunk.styles = links.map(e =>
            typeof e === "string" ? e : e.attrs ? { href: e.href, attrs: e.attrs } : e.href
          );
        }
        if (inline.length) {
          chunk.inlineStyles = inline.map(e => ({ id: e.id, content: e.content, attrs: e.attrs }));
        }
        emit(chunk);
      }
      emit({ type: "fragment", id: fid, version, key, html: value });
      // A fragment resolving is a settlement: values its async work produced
      // are now visible to watched args.
      scheduleSweep();
      // A fragment that ERRORED still reveals (its html is the fallback /
      // error template), but the failure is surfaced as a keyed error chunk
      // — the frame protocol has no `<key>_fr` rejection to ride.
      if (meta.error) {
        emit({
          type: "error",
          id: fid,
          version,
          key,
          error: { message: String((meta.error && meta.error.message) || meta.error) }
        });
      }
      // An eagerly-revealed fragment (no reveal group) carries its own
      // reveal; grouped fragments wait for an explicit reveal() call.
      if (!meta.revealGroup) {
        emit({ type: "reveal", id: fid, version, keys: [key], waitForStyles: !!links.length });
      }
    },
    reveal(keys, meta = {}) {
      // Keys in one reveal group can belong to different frames (a region's
      // fragment shares a group with the root's). Split by frame so each
      // reveal chunk addresses the frame that owns those placeholders, keeping
      // registration order within each frame.
      const byFrame = new Map();
      for (const key of keys) {
        const fid = frameOf(key);
        let group = byFrame.get(fid);
        if (!group) byFrame.set(fid, (group = []));
        group.push(key);
      }
      for (const [fid, groupKeys] of byFrame) {
        let waitForStyles = false;
        for (const key of groupKeys) if (styledKeys.has(key)) waitForStyles = true;
        const chunk = { type: "reveal", id: fid, version, keys: groupKeys, waitForStyles };
        if (meta.fallback) chunk.fallback = true;
        emit(chunk);
      }
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
      // The end-of-response latch: one final synchronous sweep so a commit
      // that landed in the last flush still ships before `complete` (the
      // scheduled microtask would lose that race). Completion latches every
      // binding's last value as final.
      if (bindings.size) sweep();
      closed = true;
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
    },
    // ---- the binding ledger (DR-2 case 1) ----
    /**
     * Open a watched-arg binding under its `(occurrence, arg)` key; it
     * sweeps until the response completes or a re-render of the same
     * position supersedes it.
     */
    openBinding(key, b) {
      bindings.set(key, b);
    },
    /** A real error is terminal for its binding — same as the retry loop. */
    closeBinding(key) {
      bindings.delete(key);
    },
    /** Exclude a sweep-minted data ref's flushes from the commit funnel. */
    mintRef(ref) {
      sweepMinted.add(ref);
    },
    /**
     * Allocate the next versioned-ref number for an arg position. Owned by
     * the sink (not the binding) because data refs are write-once in the
     * codec and positions outlive bindings: a superseding render's fresh
     * binding must continue the position's sequence, never restart it.
     */
    nextArgRef(ledgerKey) {
      const n = (argRefVersions.get(ledgerKey) || 0) + 1;
      argRefVersions.set(ledgerKey, n);
      return n;
    },
    /** An out-of-band commit signal (a pending arg's retry settling). */
    commit: scheduleSweep,
    /** The current commit epoch (see the ledger comment above). */
    get epoch() {
      return epoch;
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
    return () => {
      // The out-of-band commit hook for the binding ledger. A server-owned
      // render serializes nothing (the HTML is the data), so an async value
      // settling INSIDE it — a promise memo resolving, an iterator memo
      // yielding — produces no sink flush for the commit funnel to see. The
      // reactive core pokes this hook at those settles (and pumps iterator
      // memos only while it exists), so watched slot args reading them stay
      // live for the response window.
      const ctx = sharedConfig.context;
      if (ctx) {
        ctx.commit = sink.commit;
        // Per-epoch memo caching (the ledger's derivation story): the core
        // compares this at memo reads so sync derivations recompute across
        // commits and stay cached within one.
        ctx.commitEpoch = () => sink.epoch;
      }
      return serverComponentScope(() => component(props));
    };
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

/** An async value in the DR-2 value-tier sense: passed whole, rides the data
 *  channel, and the consumer's READ settles. */
function isAsyncValue(v) {
  return (
    !!v &&
    typeof v === "object" &&
    (typeof v.then === "function" || typeof v[Symbol.asyncIterator] === "function")
  );
}

/**
 * One cursor, two consumers (document face): pull the iterable's first step
 * for the inline read, and mint a replay wrapper for the record — it
 * re-yields that step before delegating to the live cursor, so the adopted
 * client sees the complete sequence. The same tap shape the reactive core
 * uses to share an iterator between a memo's value and its serialization.
 */
function tapFirstYield(iterable) {
  const iter = iterable[Symbol.asyncIterator]();
  // Normalized: protocol-loose producers may return a bare IteratorResult
  // when a value is already buffered (seroval's deserialized streams do).
  const firstStep = Promise.resolve(iter.next());
  return {
    first: firstStep.then(r => (r.done ? undefined : r.value)),
    rest: {
      [Symbol.asyncIterator]() {
        let replayed = false;
        return {
          next: () => {
            if (!replayed) {
              replayed = true;
              return firstStep;
            }
            return iter.next();
          },
          return: v => (iter.return ? iter.return(v) : Promise.resolve({ done: true, value: v })),
          throw: e => (iter.throw ? iter.throw(e) : Promise.reject(e))
        };
      }
    }
  };
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
          // Unwrap function-valued args once (a function can't be serialized,
          // so it is a thunk producing content or a scalar): resolve one-shot,
          // then both the region-detection here and the t=0 arming below see
          // the same classified value. This is how top-level one-shot reactive
          // control flow (<For>/<Show>) reaches the region path when it arrives
          // as a thunk/memo. Bounded against a pathological self-returning fn.
          const vals = {};
          for (const key of Object.keys(raw)) {
            if (key === "$key") continue;
            let value = raw[key];
            for (let d = 0; typeof value === "function" && d < 16; d++) value = value();
            vals[key] = value;
          }
          const regions = [];
          for (const key of Object.keys(vals)) {
            const value = vals[key];
            if (isServerContent(value)) {
              const childId = `${frameId}.${occurrence}.${key}`;
              const region = { key, childId, value, used: false, locked: false };
              regions.push(region);
              resolved[key] = () => {
                // Streaming occlusion lock: the usage flip below runs at the
                // wrapper's SYNCHRONOUS return, but a wrapper that places this
                // region behind an async boundary (a Suspense that resolves
                // after the shell flush) calls this thunk LATER — after the
                // flip already deemed the region occluded and serialized its
                // content once as a data record. Re-emitting it as markup now
                // would double-ship the same content (data + markup), the one
                // thing single-copy forbids. So a locked region contributes
                // nothing — identical to a region the wrapper never placed; the
                // client mounts it from the `sc:region:` record on placement.
                if (region.locked) return [];
                region.used = true;
                // A region is a frame ELEMENT the client wrapper adopts —
                // the same DOM contract as the boundary, one level down.
                return [{ t: frameElementOpen(childId) }, value, { t: FRAME_ELEMENT_CLOSE }];
              };
            } else if (ssrAsyncValue && isAsyncValue(value)) {
              // DR-2 value tier, document face: the inline fill's read of an
              // async arg must SUSPEND (throw not-ready into the engine's
              // hole machinery, which re-pulls on settle), not read the raw
              // promise — a raw read renders empty markup the adopted client
              // then contradicts (it reads the record's settled value): a
              // hydration mismatch instead of a covered pending state. The
              // record is untouched — the async value itself still ships
              // there and the document's data scripts stream its resolution,
              // exactly as before.
              //
              // An async ITERABLE has one cursor and two consumers (this
              // read wants the first yield; the record's serialization wants
              // every yield), so it is tapped: the read settles on the first
              // yield — markup is the V1 snapshot, later yields are the
              // adopted client's story — and the record ships a replay
              // wrapper that re-yields it before delegating, so the client
              // still sees the full sequence.
              let readable = value;
              if (typeof value.then !== "function") {
                const { first, rest } = tapFirstYield(value);
                readable = first;
                vals[key] = rest;
              }
              const read = ssrAsyncValue(readable);
              Object.defineProperty(resolved, key, {
                get: read,
                enumerable: true,
                configurable: true
              });
            } else {
              resolved[key] = value;
            }
          }
          const out = scoped(occurrence, () => range(occurrence, slot(resolved)));
          const unused = regions.filter(r => !r.used);
          if (sharedConfig.context) {
            // One record shape (A5, server-components-principles.md): the
            // t=0 document emits the record a stream would — every invoked
            // occurrence gets one, and EVERY region arg rides as its
            // `{$frame}` address ref, used or not. The ref is addressing,
            // not content: a used region's content ships once as page
            // markup (the adopting client resolves the ref to the element
            // already in the interior), an occluded one ships once as its
            // `sc:region:` record. Primitive args always ship — a scalar
            // the client needs AS DATA to re-invoke the wrapper is not a
            // single-copy concern (value-from-page recovery is a
            // template-mode question, never a substring guess: the old
            // heuristic dropped correct args on any markup coincidence).
            const args = {};
            for (const key of Object.keys(vals)) {
              const value = vals[key];
              const region = regions.find(r => r.key === key);
              if (region) {
                args[key] = { $frame: region.childId };
                continue;
              }
              if (isServerContent(value)) continue;
              args[key] = value;
            }
            sharedConfig.context.serialize(`sc:slot:${frameId}:${occurrence}`, args);
            for (const region of unused) {
              // Lock BEFORE returning: the content is now committed to the data
              // channel, so any later async placement of this region must
              // suppress its markup (see the thunk above) — that is what makes
              // "serialize once at flush" a guarantee rather than a race.
              region.locked = true;
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
export function frameTransformDirectResult(value, { id, args }) {
  if (typeof value !== "function") return value;
  const component = value;
  const wrapped = props => [
    { t: frameElementOpen(id) },
    // Slot props are created OUTSIDE the context barrier: their zone owner
    // (captured at proxy creation) is what client positions re-enter, so
    // the client's content keeps full app context while the component's
    // own render is context-isolated.
    serverOwned(() => {
      const slotProps = createDocumentSlotProps(props, id);
      return serverComponentScope(() => component(slotProps));
    }),
    { t: FRAME_ELEMENT_CLOSE }
  ];
  // Branded so the hydration serializer can write it as a reference (see
  // ServerComponentPlugin) instead of meeting an unserializable function.
  wrapped[SERVER_COMPONENT] = id;
  // The wrap is for rendering INLINE in a document. A direct call also
  // happens where there is no document — collecting single-flight data, where
  // the component becomes a region in a frame stream instead — so the
  // original stays reachable for that producer to render on its own terms,
  // under the address the calling client derived for the same call.
  wrapped[SERVER_COMPONENT_SOURCE] = component;
  wrapped[SERVER_COMPONENT_ADDRESS] = frameAddress(id, args);
  return wrapped;
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

/** Bounded thunk unwrap: resolve nested thunks/memos to their value. */
function unwrapThunks(value) {
  for (let d = 0; typeof value === "function" && d < 16; d++) value = value();
  return value;
}

/** The DR-3 rule-1 rejection: async slot args are data-only. */
function contentArgError(key, occurrence) {
  return new Error(
    "Async slot arg resolved to JSX (arg '" +
      key +
      "' of " +
      occurrence +
      "). Async args must resolve to serializable values; render async content through a boundary instead."
  );
}

/**
 * The arg-level markup-hole retry loop (DR-2 value tier): a slot arg whose
 * evaluation threw not-ready ships as this pending promise, re-evaluated
 * each time the blocking async settles until an evaluation succeeds — then
 * the promise resolves with that value and seroval's streaming
 * serialization patches the record's data ref. A retry that throws a real
 * error rejects the promise (the client `Loading` covering the consumption
 * read errors instead of hanging). Retries run under the evaluation's
 * owner, like `buildAsyncWrap`'s markup holes, so context reads inside the
 * getter keep resolving. `onSettle` fires before the resolve — the watched
 * binding (case 1) syncs its last-value there, and the settle doubles as a
 * commit for the rest of the ledger.
 */
function retryArgUntilSettled(evaluate, blocked, key, occurrence, onSettle) {
  const owner = getOwner();
  return new Promise((resolve, reject) => {
    const retry = () => {
      try {
        const value = owner ? runWithOwner(owner, evaluate) : evaluate();
        if (isServerContent(value)) {
          // DR-3 rule 1: markup emission is long past by the time this
          // settles — there is no placeholder to fill retroactively.
          reject(contentArgError(key, occurrence));
          return;
        }
        if (onSettle) onSettle(value);
        resolve(value);
      } catch (err) {
        const next = ssrHandleError && ssrHandleError(err);
        if (next) next.then(retry, retry);
        else reject(err);
      }
    };
    blocked.then(retry, retry);
  });
}

/**
 * A watched-arg binding (DR-2 case 1): the ledger entry for one re-runnable
 * slot arg. Opened after the occurrence's record emits; the sink sweeps it
 * at every commit until the response completes. A sweep re-evaluates the
 * arg under its render owner and, reference-equality gated, re-emits the
 * occurrence's record:
 *
 *   - a changed scalar rides the record literally, same as at emission;
 *   - a changed object mints a VERSIONED ref (`arg:<occ>:<key>@<n>` — data
 *     refs are write-once in the codec) and serializes the new value;
 *   - settled -> not-ready re-enters pending-with-previous: the versioned
 *     ref ships pending and the retry loop settles it, while the client's
 *     read suspends holding its latest value;
 *   - a real error is terminal: the arg re-ships as a rejected ref (the
 *     client read throws into its covering boundary, diagnosably) and the
 *     binding closes, mirroring the retry loop's rejection semantics;
 *   - a re-evaluation producing JSX is the DR-3 rule-1 violation, rejected
 *     with the same diagnostic as the retry loop.
 *
 * Pending bindings don't sweep — the retry loop owns their progress and its
 * settle re-arms the ledger (`state` is shared with the retry's onSettle).
 * Record re-emissions clone the canonical args object so in-process
 * consumers (tests, same-tab transports) never see later mutations through
 * an already-delivered chunk.
 */
function openArgBinding(sink, ctx, occurrence, key, evaluate, args, state) {
  const owner = getOwner();
  const ledgerKey = `${occurrence}:${key}`;
  const reEmit = value => {
    const ref = `arg:${occurrence}:${key}@${sink.nextArgRef(ledgerKey)}`;
    sink.mintRef(ref);
    ctx.serialize(ref, value);
    args[key] = { $ref: ref };
    sink.slot(occurrence, { ...args });
  };
  const binding = {
    sweep() {
      if (!state.settled) return;
      let value;
      try {
        value = owner ? runWithOwner(owner, evaluate) : evaluate();
      } catch (err) {
        const blocked = ssrHandleError && ssrHandleError(err);
        if (!blocked) {
          sink.closeBinding(ledgerKey);
          reEmit(Promise.reject(err instanceof Error ? err : new Error(String(err))));
          return;
        }
        state.settled = false;
        reEmit(
          retryArgUntilSettled(evaluate, blocked, key, occurrence, v => {
            state.settled = true;
            state.last = v;
            sink.commit();
          })
        );
        return;
      }
      if (value === state.last) return;
      state.last = value;
      if (isServerContent(value)) {
        sink.closeBinding(ledgerKey);
        reEmit(Promise.reject(contentArgError(key, occurrence)));
        return;
      }
      const t = typeof value;
      if (value == null || t === "string" || t === "number" || t === "boolean") {
        args[key] = value;
        sink.slot(occurrence, { ...args });
      } else {
        reEmit(value);
      }
    }
  };
  sink.openBinding(ledgerKey, binding);
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
          // Watched-arg bindings to open AFTER the record emits (the ledger
          // must never re-emit a record ahead of its first emission).
          const opened = [];
          for (const key of Object.keys(raw)) {
            if (key === "$key") continue; // occurrence identity, not client data
            // Region ids derive from occurrence + arg name — stable across
            // responses (allocation order isn't), so a later stream's region
            // content routes to the same bound region and morphs in place, and
            // keyed dedupe holds under reorders. Known before we resolve, so
            // any Suspense boundary the arg renders can tag its fragment to it.
            const childId = `${frame.id}.${occurrence}.${key}`;
            const ctx = sharedConfig.context;
            // A Suspense inside this arg registers its fragment as it renders —
            // during the unwrap below (an eager component thunk) or the resolve
            // (a deferred hole). Route those fragments to the region for the
            // whole window: the arg may not classify as content, but only
            // server content registers fragments, so a stray tag is inert.
            const origRegister = ctx.registerFragment;
            ctx.registerFragment = (fragKey, fragOptions) => {
              sink.tagRegion(fragKey, childId);
              return origRegister.call(ctx, fragKey, fragOptions);
            };
            try {
              // A function cannot be serialized, so a function-valued arg must
              // be a thunk producing content (or a getter producing a scalar):
              // resolve it one-shot, then classify the result. This is how
              // top-level one-shot reactive control flow (<For>/<Show>) reaches
              // the content path when it arrives as a thunk/memo rather than an
              // eager node. Bounded against a pathological self-returning fn.
              //
              // The evaluator is captured from the property DESCRIPTOR, not
              // the property read: compiled JSX props are getters (evaluation
              // happens at the read itself, so a not-ready `raw[key]` inside
              // the catch would throw again), while author thunks and memos
              // arrive as function values. Either shape yields a re-runnable
              // `evaluate` — the handle both the retry loop and the watched
              // binding (case 1) re-run.
              const desc = Object.getOwnPropertyDescriptor(raw, key);
              let evaluate = null;
              let value;
              // Shared with the retry loop's onSettle and the binding's
              // sweeps: whether the arg has a successful value, and which.
              let state = null;
              try {
                if (desc.get) {
                  const get = desc.get;
                  evaluate = () => unwrapThunks(get.call(raw));
                  value = evaluate();
                } else {
                  value = desc.value;
                  if (typeof value === "function") {
                    const fn = value;
                    evaluate = () => unwrapThunks(fn);
                    value = evaluate();
                  }
                }
              } catch (err) {
                // DR-2 value tier: a not-ready evaluation (an async memo, or a
                // getter reading one) never holds the record and never kills
                // the stream — the arg ships NOW as a pending promise and the
                // markup-hole retry loop runs at the arg level: re-evaluate
                // when the blocking async settles, settle the promise at the
                // first successful evaluation. The client suspends at the
                // consumption read, not here.
                const blocked = ssrHandleError && ssrHandleError(err);
                if (!blocked) throw err;
                state = { settled: false, last: undefined };
                const pendingState = state;
                value = retryArgUntilSettled(evaluate, blocked, key, occurrence, v => {
                  pendingState.settled = true;
                  pendingState.last = v;
                  // The settle is a commit: other watched args may read the
                  // same source. (This binding's own re-emission stays gated
                  // on inequality with the value just recorded.)
                  sink.commit();
                });
              }
              const t = typeof value;
              if (value == null || t === "string" || t === "number" || t === "boolean") {
                args[key] = value;
                if (evaluate) state = { settled: true, last: value };
              } else if (isServerContent(value)) {
                // Server JSX flows as a nested region, never as data — the
                // no-double-serialize invariant (transport dispatch case 1):
                // its html is the transfer; the client wraps the range without
                // re-rendering it. Nested occurrence markers evaluated inside
                // this content already emitted their slot chunks against this
                // frame — the consumer threads record lookup up the frame tree.
                const resolved = ctx.resolve(value);
                if (resolved.h.length) {
                  // A Suspense boundary keeps its async out of `h` (it catches,
                  // renders a fallback, and streams its fragment — now routed
                  // to the region). A residual hole here is a BARE async read
                  // with no boundary: nothing to show while it settles, and no
                  // fragment to reveal into.
                  throw new Error(
                    "Async server content in a slot arg needs a boundary (arg '" +
                      key +
                      "' of " +
                      occurrence +
                      "). Wrap the async read in a <Suspense>, or move it above the slot."
                  );
                }
                sink.region(childId, resolved.t[0]);
                args[key] = { $frame: childId };
              } else {
                const ref = `arg:${occurrence}:${key}`;
                ctx.serialize(ref, value);
                args[key] = { $ref: ref };
                if (evaluate && !state) state = { settled: true, last: value };
              }
              // A re-runnable arg that classified as DATA (settled or
              // pending) is a watched binding — case 1's within-response
              // liveness. Content args stay one-shot: a thunk producing JSX
              // was the control-flow handoff into the region path, and
              // regions have their own update story (DR-3).
              if (evaluate && state) opened.push({ key, evaluate, state });
            } finally {
              ctx.registerFragment = origRegister;
            }
          }
          // Deliver a CLONE and keep the canonical object for the ledger:
          // re-emissions mutate `args` and clone again, so an in-process
          // consumer's already-applied record never changes under it.
          sink.slot(occurrence, { ...args });
          const ctx = sharedConfig.context;
          for (const b of opened) {
            openArgBinding(sink, ctx, occurrence, b.key, b.evaluate, args, b.state);
          }
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
// Copy a response-init's headers preserving multiple `Set-Cookie` values:
// Headers-to-Headers copying through the constructor folds them into one
// comma-joined entry on some runtimes (a folded Set-Cookie is corrupt).
// Plain-object inits cannot carry duplicates and pass through as-is.
function copyInitHeaders(init) {
  if (!init || !init.getSetCookie) return new Headers(init);
  const headers = new Headers();
  init.forEach((value, key) => {
    if (key !== "set-cookie") headers.append(key, value);
  });
  for (const cookie of init.getSetCookie()) headers.append("Set-Cookie", cookie);
  return headers;
}

export function serverComponentResponse(component, options = {}, init = {}) {
  const { id = "", version = 1 } = options.frame || {};
  const headers = copyInitHeaders(init.headers);
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
 *
 * A single-flight call is the exception: the component stays a component
 * here, because the mutation's markup is only one part of the payload and
 * the whole stream is assembled once flight data is in hand
 * (`frameTransformFlightResult`). Building a Response now would commit to a
 * body that can no longer take the invalidated regions or the outcome.
 */
export function frameTransformResult(event, result, context) {
  let init;
  if (isResponseEnvelope(result)) {
    const { response, value } = result;
    if (typeof value !== "function") return result;
    init = response ? { headers: response.headers, status: response.status } : undefined;
    result = value;
  }
  if (typeof result !== "function") return result;
  if (context && context.collectsFlight) return init ? { response: init, value: result } : result;
  const invocation = getEventServerFunctionInvocation(event);
  return serverComponentResponse(
    result,
    { frame: { id: (invocation && invocation.id) || "" } },
    init
  );
}

/**
 * The frame half of single-flight, as a `transformFlightResult` policy: when
 * some of what a mutation invalidated is *markup*, the frame stream carries
 * the whole payload.
 *
 * A component-valued entry is not a different KIND of payload, just a
 * different representation of one: it stays in the `{ value, data }`
 * envelope like any other value — serialized as a flight reference (see
 * `ServerComponentPlugin`) that resolves client-side to the very component
 * the boundary showing that call holds, so the integration seeds its cache
 * through its ordinary path and freshness falls out for free. Its CONTENT
 * rides alongside as a region addressed by the call (`frameAddress` — the
 * one name both peers derive independently), so markup travels as html
 * exactly once and the envelope carries only a pointer to it.
 *
 * With nothing to frame this returns `undefined`, and the response is the
 * plain single-flight envelope, byte for byte.
 */
export async function frameTransformFlightResult(event, outcome, context) {
  const { value, data } = outcome;
  const regions = [];
  let serialized = data;
  if (data && typeof data === "object") {
    serialized = {};
    // Collected entries arrive unresolved (an integration's cache stores the
    // in-flight promise), and a value has to be in hand to know whether it is
    // markup. So a mutation's payload settles before its response starts,
    // where a data-only one streams as the codec produces it — the cost of
    // knowing what kind of thing each entry is.
    const keys = Object.keys(data);
    const values = await Promise.all(keys.map(key => data[key]));
    for (let i = 0; i < keys.length; i++) {
      const entry = values[i];
      // A component-valued entry is not a different KIND of payload, just a
      // different representation of one: it stays in the map like any other
      // value, serialized by reference (see `ServerComponentPlugin`) so the
      // client seeds its cache with the boundary component and re-stamps
      // freshness through the ordinary path. Its content rides alongside as a
      // region addressed by the CALL — the address both peers derive
      // independently — so markup ships once as html and the map carries only
      // a pointer to it.
      serialized[keys[i]] = entry;
      if (typeof entry === "function") {
        regions.push({
          id: entry[SERVER_COMPONENT_ADDRESS] || keys[i],
          component: entry[SERVER_COMPONENT_SOURCE] || entry
        });
      }
    }
  }
  const invocation = getEventServerFunctionInvocation(event);
  // The called function's own markup keeps the function id as its address,
  // the same boundary a non-flight call targets.
  const primary =
    typeof value === "function"
      ? { id: (invocation && invocation.id) || "", component: value }
      : undefined;
  if (!primary && !regions.length) return undefined;
  return frameFlightResponse({
    primary,
    regions,
    outcome: {
      // The mutation's own return value is markup or data, never both: when
      // it is a component the client resolves it to that frame's component.
      value: primary ? undefined : value,
      data: serialized
    },
    codec: context && context.codec
  });
}

/**
 * A framed response carrying several frames and a single-flight outcome:
 * each frame's chunks in order (the host routes and buffers by id), then the
 * `{ value, data }` envelope as `outcome` chunks.
 *
 * Those chunks carry the codec's own nodes, one per chunk, so async values
 * inside flight data settle progressively exactly as they do in a plain
 * single-flight body — the consumer replays them into the same decoder.
 */
export function frameFlightResponse({ primary, regions = [], outcome, codec }, init = {}) {
  const frames = primary ? [primary, ...regions] : regions;
  const headers = copyInitHeaders(init.headers);
  headers.set("Content-Type", "application/x-frame-stream");
  headers.set(FRAME_STREAM_HEADER, primary ? primary.id : "");
  headers.set("X-Content-Raw", "1");
  headers.set(SINGLE_FLIGHT_HEADER, "true");
  const body = new ReadableStream({
    async start(controller) {
      const write = chunk => controller.enqueue(createChunk(JSON.stringify(chunk)));
      try {
        // Sequential: chunk order matters within a frame, not across them.
        for (const { id, component } of frames) {
          await new Promise(resolve => {
            renderServerComponent(component, { frame: { id, version: 1 } }).pipe({
              write,
              end: resolve
            });
          });
        }
        if (outcome) {
          // Component-valued entries serialize as flight references — the
          // protocol injects its own plugin (see `flightCodec`), so nothing
          // registers it.
          const reader = new ChunkReader(serializeStream(outcome, flightCodec(codec)));
          for (let node = await reader.next(); !node.done; node = await reader.next()) {
            write({ type: "outcome", payload: node.value });
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });
  return new Response(body, { status: init.status || 200, headers });
}
