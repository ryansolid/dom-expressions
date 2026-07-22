/**
 * Client frame runtime — the consumer side of the frame stream (port of the
 * frame-streams spike, adapted to dom-expressions).
 *
 * A frame renders server-owned content into a DOM boundary from a resident
 * keyed record store. Chunks are *writes* into the store, not events to
 * replay, so application is prerequisite-driven and order-independent by
 * construction:
 *
 *   - root HTML apply into a boundary (element or comment-marker range)
 *   - version as a stale-guard only ("policy A": a newer version morphs in
 *     place; client slots/regions and their state survive — teardown is
 *     dispose(), never a version bump)
 *   - async fragment placeholder ranges + reveal readiness buffering
 *   - a zero-allocation server-owned morph that preserves protected
 *     projection ranges and fragment placeholders
 *   - the slot model: direct-insert and render-function slots as one callback
 *     primitive, iteration by occurrence id, re-call on args change, slot
 *     resolution threaded down through nested frames
 *
 * Adaptations from the spike:
 *   - Fragment placeholders use the document marker vocabulary emitted by
 *     renderToStream/renderToFrameStream: a `<template id="pl-KEY">` start
 *     marker (whose .content holds the fallback) closed by a `<!--pl-KEY-->`
 *     comment. Reveal mirrors $df: clear the range interior, insert content,
 *     remove both markers. Fallback reveal mirrors $dfl: materialize the
 *     template's content into the range without resolving.
 *   - `data` chunks are payload-only (Seroval output with ids embedded), so
 *     they apply through the host's data hook against a response-scoped
 *     record table instead of landing in a frame's store.
 */

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

// === Element claims for server content ===
//
// Compiled client output claims navigation-relevant elements per element at
// creation (client.js `claimElement`); frame content becomes live DOM from
// serialized HTML with no compiled creation code, so this module sweeps each
// subtree it materializes — and re-claims elements whose `href`/`action` the
// morph rewrites in place — against the SAME consumer registry, read through
// the registered symbol client.js mirrors it on (importless in both
// directions, like the FRAME brand below). Sweeps claim indiscriminately per
// the attribute contract; filtering belongs to the consumer. Dormant costs
// one property read per apply — the selectors never run without a consumer.
const CLAIM_SEAM = Symbol.for("dom-expressions.element-claims");
const CLAIMED_ELEMENTS = "a[href], form[action]";

/** The live consumer list (undefined when dormant — the one check sweeps pay). */
function claimHandlers() {
  const handlers = globalThis[CLAIM_SEAM];
  return handlers !== undefined && handlers.length !== 0 ? handlers : undefined;
}

/** Fire every handler on one element unconditionally. */
function claimNode(handlers, el) {
  for (let i = 0; i < handlers.length; i++) handlers[i](el);
}

const claimedAttr = name => name === "href" || name === "action";

/** Sweep `root` (element or fragment) and its claimable interior. */
function claimTree(handlers, root) {
  const isElement = root.nodeType === ELEMENT_NODE;
  if (!isElement && root.nodeType !== 11 /* DOCUMENT_FRAGMENT_NODE */) return;
  if (isElement && root.matches(CLAIMED_ELEMENTS)) claimNode(handlers, root);
  const found = root.querySelectorAll(CLAIMED_ELEMENTS);
  for (let i = 0; i < found.length; i++) claimNode(handlers, found[i]);
}

/** Fragment placeholder start: `<template id="pl-KEY">` (content = fallback). */
const placeholderId = name => `pl-${name}`;

const PROJECTION_START = /^proj:(.+):start$/;
const PROJECTION_END = /^proj:(.+):end$/;
const projectionEnd = id => `proj:${id}:end`;

/**
 * Map a wire chunk onto resident-store record writes. `html` is the root,
 * `fragment` a keyed segment, `reveal` sets segment gates (fallback reveals
 * set fallback gates), and so on. Control chunks (`complete`/`error`) are
 * stored as flag keys rather than fired as events, consistent with the store
 * model. `data` chunks return no records — they are response-scoped, not
 * frame-scoped, and the host applies them through its data hook.
 */
export function chunkToRecords(chunk) {
  switch (chunk.type) {
    case "start":
    case "data":
      return {};
    case "html":
      return { "": { kind: "html", value: chunk.html } };
    case "fragment":
      return { [`seg:${chunk.key}`]: { kind: "html", value: chunk.html } };
    case "reveal": {
      const records = {};
      const gate = chunk.fallback ? "fallback" : "reveal";
      for (const key of chunk.keys) records[`seg:${key}:${gate}`] = true;
      return records;
    }
    case "assets":
      return { [`seg:${chunk.key}:assets`]: chunk };
    case "slot":
      // A named slot invocation: the client render function for `key` is
      // called with these (resolved) args. Data args are serializer refs;
      // server-content args are frame refs resolved to nested regions.
      return { [`slot:${chunk.key}`]: { kind: "slot", args: chunk.args } };
    case "template":
      // Static markup sent once, stored under `tpl:<key>`; block instances
      // reference it so repeated structures never re-send their markup.
      return { [`tpl:${chunk.key}`]: { kind: "template", html: chunk.html, fields: chunk.fields } };
    case "block":
      // A keyed instance carrying only its dynamic values, revealed like any
      // other segment (`seg:<key>`), materialized from its template.
      return {
        [`seg:${chunk.key}`]: {
          kind: "block",
          template: `tpl:${chunk.template}`,
          values: chunk.values
        }
      };
    case "complete":
      return { ":complete": true };
    case "error":
      // Keyed errors are segment-scoped (an errored fragment); unkeyed ones
      // are stream-level. Both surface through the store — `frame.error`
      // reads the stream-level record.
      return chunk.key ? { [`seg:${chunk.key}:error`]: chunk.error } : { ":error": chunk.error };
    default:
      return {};
  }
}

/**
 * Routes a flat stream of addressed chunks to the right frame in a (possibly
 * nested) frame tree. A chunk addressed to a frame that has not registered
 * yet is buffered and delivered when that frame registers — server stream
 * order and client mount order are independent, exactly like the
 * resident-store readiness model one level up.
 *
 * @param {{
 *   serialize?: (value: unknown) => { $ref: string },
 *   resolve?: (ref: { $ref: string }) => unknown,
 *   applyData?: (chunk: object) => void
 * }} [options]
 *   `serialize`/`resolve` back slot data refs (response-scoped table);
 *   `applyData` receives each `data` chunk whole — keyed codec records
 *   ({ key, node, initial }, apply via createJSONDataTable) or eval-style
 *   `payload` scripts, depending on the producer's serializer.
 */
export function createFrameHost(options = {}) {
  // One logical stream may feed several mounted boundaries (the same server
  // component mounted twice): ids map to SETS of frames and every chunk fans
  // out to all of them.
  const frames = new Map();
  const pending = new Map();
  const deliver = (frame, chunk) => {
    if (chunk.type === "data") {
      options.applyData && options.applyData(chunk);
      return;
    }
    frame.apply({ version: chunk.version, r: chunkToRecords(chunk) });
  };
  return {
    register(id, frame) {
      let set = frames.get(id);
      if (!set) frames.set(id, (set = new Set()));
      // A boundary mounting after siblings already streamed seeds from a
      // sibling's store — replay-equivalent without the host retaining
      // chunks (records are plain data; each frame dedupes in its own store).
      const sibling = set.size ? set.values().next().value : undefined;
      set.add(frame);
      if (sibling) {
        if (sibling.version !== undefined) {
          frame.apply({ version: sibling.version, r: sibling.store });
        }
        return;
      }
      const buffered = pending.get(id);
      if (buffered) {
        pending.delete(id);
        for (const chunk of buffered) deliver(frame, chunk);
      }
    },
    /**
     * Remove a frame (or, with no frame argument, every frame) under an id;
     * chunks still buffered for the id are dropped once none remain.
     */
    unregister(id, frame) {
      const set = frames.get(id);
      if (set && frame) set.delete(frame);
      if (!set || !frame || !set.size) {
        frames.delete(id);
        pending.delete(id);
      }
    },
    apply(chunk) {
      // Data payloads are response-scoped; apply immediately, no frame needed.
      if (chunk.type === "data") {
        options.applyData && options.applyData(chunk);
        return;
      }
      const set = frames.get(chunk.id);
      if (set && set.size) {
        for (const frame of set) deliver(frame, chunk);
        return;
      }
      // Buffer until the frame registers, keeping only the newest version's
      // chunks so a stale chunk can never land after the frame appears.
      const buffered = pending.get(chunk.id) ?? [];
      const maxVersion = buffered.reduce((m, c) => Math.max(m, c.version), chunk.version);
      if (chunk.version < maxVersion) return;
      const kept = buffered.filter(c => c.version >= chunk.version);
      kept.push(chunk);
      pending.set(chunk.id, kept);
    },
    get(id) {
      const set = frames.get(id);
      return set && set.values().next().value;
    },
    serialize(value) {
      if (!options.serialize) throw new Error("host has no serializer");
      return options.serialize(value);
    },
    resolve(ref, frameId) {
      return options.resolve ? options.resolve(ref, frameId) : undefined;
    }
  };
}

/**
 * The bubbling DOM event a frame dispatches from its parent element after
 * server content lands in the document (root materialize/morph, segment
 * reveal, fallback materialization) — `detail: { id, version, reason }`.
 * Document-level listeners (router affordance reflection, scroll
 * restoration) react to server-driven DOM changes without a
 * MutationObserver; nested region frames dispatch too and the event
 * bubbles, so one listener sees every boundary. Client-side renders never
 * fire it — client code has reactivity to subscribe with.
 */
export const FRAME_APPLIED_EVENT = "frame:applied";

class FrameImpl {
  // A frame renders either into an element (element boundary: #start/#end
  // null) or between two comment markers within some parent (range boundary).
  // The parent of a range boundary is derived live from the start marker, so
  // the range can be moved (e.g. re-placed by a client re-call) without
  // rebinding.
  #element;
  #start;
  #end;
  #options;
  #version;
  #store = Object.create(null);
  #appliedRootValue;
  #hasContent = false;
  #revealed = new Set();
  #fallbackShown = new Set();
  #slots;
  #mountedSlots = new Set();
  #slotCleanups = new Map();
  #slotArgs = new Map();
  #slotRegions = new Map();
  #slotResolvedRefs = new Map();
  #slotNodes = new Map();
  #processedAssets = new Set();
  #disposed = false;
  // Stable identity so a pending stylesheet holds at most one waiter per
  // frame across repeated readiness checks.
  #styleFlush = () => {
    if (!this.#disposed) this.#flush();
  };

  // Element-claim sweep for one materialized/morph-touched subtree, run
  // under `ownerScope` when the creator provided one — claim consumers
  // register per-element cleanup against the reactive owner current at claim
  // time, and the boundary's owner is what bounds this frame's content.
  // `direct` claims one element unconditionally — the morph's attribute
  // recheck, which must fire on `href`/`action` REMOVAL too (the element no
  // longer matches the sweep selector), mirroring compiled setAttribute.
  // Stable identity so it threads into the morph without allocation.
  #claimTree = (node, direct) => {
    const handlers = claimHandlers();
    if (!handlers) return;
    const run = () => (direct ? claimNode(handlers, node) : claimTree(handlers, node));
    const scope = this.#options.ownerScope;
    scope ? scope(run) : run();
  };

  constructor(element, start, end, options = {}) {
    this.#element = element;
    this.#start = start;
    this.#end = end;
    this.#options = options;
    this.#slots = options.slots;
    // Adopt: the boundary already holds server-rendered content, so the first
    // root apply morphs against it rather than materializing from scratch.
    // That content never ran compiled creation code, so sweep its claimable
    // elements now — before registration can flush a buffered morph over it
    // (in-place `href`/`action` rewrites re-claim on their own).
    if (options.adopt) {
      this.#hasContent = true;
      this.#claimContent();
    }
    // Register last, after all fields are initialized: registration may flush
    // buffered chunks straight into `apply`.
    if (options.host && options.id !== undefined) {
      options.host.register(options.id, this);
    }
    // Hydration attach: an adopted document-SSR boot may never receive a
    // chunk, so sync slots against the existing DOM immediately — callbacks
    // claim (`ctx.existing`, return undefined) or replace the server-rendered
    // client content in each range. Idempotent with any buffered-chunk flush
    // that already ran during registration.
    if (options.adopt) this.#syncSlots();
  }

  /** The node content lives in (element itself, or the range markers' parent). */
  #parent() {
    return this.#element ?? this.#start.parentNode;
  }

  /** Server content landed: caller hook + the bubbling document notification. */
  #applied(version, reason) {
    this.#options.onApply?.({ version, reason });
    const parent = this.#parent();
    // Construct from the element's own realm — a cross-realm CustomEvent
    // (e.g. Node's global against a JSDOM document) is rejected by dispatch.
    const Ev = parent && (parent.ownerDocument || parent).defaultView?.CustomEvent;
    if (Ev) {
      parent.dispatchEvent(
        new Ev(FRAME_APPLIED_EVENT, {
          bubbles: true,
          detail: { id: this.#options.id, version, reason }
        })
      );
    }
  }

  /** First content node (or `#end`/null when empty). */
  #firstContent() {
    return this.#start ? this.#start.nextSibling : this.#parent().firstChild;
  }

  get version() {
    return this.#version;
  }

  get store() {
    return this.#store;
  }

  isRevealed(segment) {
    return this.#revealed.has(segment);
  }

  /** The stream's error record, if an `error` chunk arrived (else undefined). */
  get error() {
    return this.#store[":error"];
  }

  apply(write) {
    if (this.#disposed) return;
    const v = write.version;
    if (this.#version === undefined) {
      this.#version = v;
    } else if (v < this.#version) {
      // Stale write for an older invocation: no live store to land in.
      return;
    } else if (v > this.#version) {
      // Policy A: version only guards against stale (older) writes. A newer
      // version is an in-place update, not a reset — the store, applied-root,
      // and slot records are kept so the reconciler morphs server content
      // while client-owned slots/regions and their state survive (e.g. across
      // a client-side navigation). Stale discard is the `v < version` branch;
      // a genuine teardown is `dispose()`.
      //
      // Segment state, though, is per-response: fragment names restart in
      // every stream (`pl-0`, ...), so a new version's placeholder must not
      // be skipped because the OLD version's segment of the same name
      // already revealed — nor revealed instantly with the old version's
      // content. Reveal bookkeeping and seg/tpl/error records reset; slot
      // records stay (dedupe is what preserves occurrence state).
      this.#version = v;
      this.#revealed.clear();
      this.#fallbackShown.clear();
      for (const key of Object.keys(this.#store)) {
        if (key.startsWith("seg:") || key.startsWith("tpl:") || key === ":error") {
          delete this.#store[key];
        }
      }
    }

    for (const key of Object.keys(write.r)) {
      const incoming = write.r[key];
      // Slot-record dedupe: streams re-send their slot chunks, and re-call
      // triggers on record identity — so an equivalent re-sent record keeps
      // the existing object (no re-call, occurrence state preserved).
      if (
        incoming &&
        incoming.kind === "slot" &&
        key.charCodeAt(0) === 115 /* s */ &&
        key.startsWith("slot:")
      ) {
        const existing = this.#store[key];
        if (existing && existing.kind === "slot" && argsEquivalent(existing.args, incoming.args)) {
          continue;
        }
      }
      this.#store[key] = incoming;
    }
    this.#flush();
  }

  #flush() {
    if (this.#disposed) return;
    const version = this.#version;

    const root = this.#store[""];
    if (root && root.kind === "html" && root.value !== this.#appliedRootValue) {
      const reason = this.#hasContent ? "morph" : "materialize";
      this.#applyRoot(root.value);
      this.#appliedRootValue = root.value;
      this.#applied(version, reason);
    }

    // Re-evaluate every segment on each flush. Because readiness is checked
    // against the store + DOM (not arrival order), reveal/content/placeholder
    // may arrive in any order. Passes repeat until one makes no progress:
    // revealing a segment (or materializing a fallback) can insert another
    // segment's placeholder into the DOM — the store-model analogue of the
    // document runtime's $dfd retry drain. Terminates because every step
    // moves a name into #revealed/#fallbackShown, bounded by the store.
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const key of Object.keys(this.#store)) {
        const name = segmentName(key);
        if (name === null || this.#revealed.has(name)) continue;
        if (this.#segmentReady(name)) {
          this.#revealSegment(name);
          this.#applied(version, "reveal");
          progressed = true;
        }
      }
      // Fallback gates materialize placeholder-template content into the
      // range ($dfl semantics) while the segment itself stays pending.
      for (const key of Object.keys(this.#store)) {
        const m = /^seg:([^:]+):fallback$/.exec(key);
        if (!m) continue;
        const name = m[1];
        if (this.#revealed.has(name) || this.#fallbackShown.has(name)) continue;
        if (this.#showFallback(name)) {
          this.#fallbackShown.add(name);
          this.#applied(version, "reveal");
          progressed = true;
        }
      }
    }

    // Module assets preload as soon as their record lands (the document
    // behavior's analogue: <link rel="modulepreload"> so lazy components
    // inside the frame don't waterfall). Styles are handled by the reveal
    // gate; this pass is modules only, once per record.
    for (const key of Object.keys(this.#store)) {
      if (this.#processedAssets.has(key) || !key.endsWith(":assets")) continue;
      this.#processedAssets.add(key);
      const record = this.#store[key];
      if (record && record.modules) {
        for (const href of record.modules) ensureModulePreload(href);
      }
    }

    this.#syncSlots();
  }

  /** Resolve a slot callback by prop: this frame's slots, then ancestors'. */
  #resolveSlot(prop) {
    return this.#slots?.[prop] ?? this.#options.resolveSlot?.(prop);
  }

  /**
   * Resolve a slot occurrence's args record: this frame's store, then
   * ancestors'. Occurrence markers evaluated inside nested server-content
   * regions carry their records on the frame whose props proxy emitted them
   * — the parent — while the marker lands in the child's content, so lookup
   * threads up the frame tree exactly like callback resolution.
   */
  #resolveSlotRecord(occurrence) {
    const record = this.#store[`slot:${occurrence}`];
    if (record !== undefined) return record;
    return this.#options.resolveSlotRecord?.(occurrence);
  }

  #syncSlots() {
    if (!this.#slots && !this.#options.resolveSlot) return;

    // Range-driven discovery: find every server-owned slot occurrence in this
    // frame's content. An occurrence id is the marker key (e.g. "children" or
    // "comment#0"); the callback is looked up by its prop — the part before
    // "#" — so one callback services N occurrences from an iterated render
    // prop.
    const found = new Map();
    this.#collectSlots(found);

    for (const [occurrence, start] of found) {
      const callback = this.#resolveSlot(propOf(occurrence));
      if (!callback) continue; // no client impl for this prop up the tree
      const record = this.#resolveSlotRecord(occurrence);
      // A mount whose output the morph destroyed (its range was recreated
      // inside a different server parent — ranges only relocate among
      // siblings) is a zombie: remount fresh so content stays correct, even
      // though state can't survive a destroyed node.
      const prev = this.#slotNodes.get(occurrence);
      const prevFirst = Array.isArray(prev) ? prev[0] : prev;
      const zombie = this.#mountedSlots.has(occurrence) && prevFirst && !prevFirst.parentNode;
      if (zombie) {
        this.#mountedSlots.delete(occurrence);
        this.#runSlotCleanups(occurrence);
      }
      if (!this.#mountedSlots.has(occurrence)) {
        // Direct-insert occurrences have no `slot:<id>` record and mount with
        // empty props; render-function occurrences mount with resolved props.
        // Mounting replaces the range interior: on a fresh stream it is
        // empty, but an adopted document-SSR range already holds the
        // server-rendered client content — a callback that returns nodes
        // replaces it (client render), one that returns undefined claims it
        // in place (hydration attach; the DOM is untouched).
        const nodes = this.#invokeSlot(occurrence, callback, record, start);
        if (nodes) this.#replaceRange(occurrence, start, nodes);
        this.#slotNodes.set(occurrence, nodes);
        this.#mountedSlots.add(occurrence);
        // Record-less mounts are adoption: the interior carries the regions.
        if (!record) this.#discoverRegions(occurrence, start);
        this.#bindRegions(occurrence);
      } else if (record !== this.#slotArgs.get(occurrence)) {
        // A re-sent record differing only in {$ref} identity may carry the
        // SAME values (tables rotate per response, so the store-write
        // dedupe stays conservative). Value-compare the new refs against
        // the cached resolutions: all equal -> adopt the record without
        // re-calling, occurrence state intact.
        if (this.#refArgsUnchanged(occurrence, record)) {
          this.#slotArgs.set(occurrence, record);
          continue;
        }
        // Args changed (incl. late args): re-call this occurrence only,
        // reusing its cached server-content regions. Same contract: an
        // undefined return keeps the current interior.
        const nodes = this.#invokeSlot(occurrence, callback, record, start);
        if (nodes) this.#replaceRange(occurrence, start, nodes);
        this.#slotNodes.set(occurrence, nodes);
        this.#bindRegions(occurrence);
      }
    }

    // Unmount occurrences whose range has disappeared from the server content.
    for (const occurrence of [...this.#mountedSlots]) {
      if (!found.has(occurrence)) this.#unmountSlot(occurrence);
    }
  }

  /**
   * Invoke a slot occurrence's callback with resolved props. `ctx.existing`
   * carries the range's current interior (server-rendered client content on
   * an adopted document-SSR boot; the previous output on a re-call) so a
   * framework binding can hydrate onto it. Returns the nodes to place, or
   * null when the callback returned undefined — "I claimed the existing DOM,
   * leave the range alone".
   */
  #invokeSlot(occurrence, callback, record, start) {
    const cleanups = this.#slotCleanups.get(occurrence) ?? [];
    const ctx = {
      // Identity for hydration-claim scoping: consumers derive the same
      // key prefix the document producer used for this occurrence. The
      // producer scopes EVERY occurrence (nested ones included) under the
      // root boundary's id, so region frames thread the root's claimScope
      // down rather than their own region id.
      frame: this.#options.claimScope ?? this.#options.id,
      key: occurrence,
      onCleanup: fn => cleanups.push(fn),
      existing: start ? rangeInterior(start, projectionEnd(occurrence)) : []
    };
    const props =
      record && record.kind === "slot" ? this.#resolveArgs(occurrence, record.args) : {};
    const content = callback(props, ctx);
    this.#slotArgs.set(occurrence, record);
    if (cleanups.length) this.#slotCleanups.set(occurrence, cleanups);
    if (content == null) return null;
    return Array.isArray(content) ? content : [content];
  }

  /** Replace the nodes between a slot range's start marker and its end marker. */
  #replaceRange(key, start, nodes) {
    const end = projectionEnd(key);
    const parent = start.parentNode;
    let n = start.nextSibling;
    while (n && !(n.nodeType === COMMENT_NODE && n.data === end)) {
      const next = n.nextSibling;
      parent.removeChild(n);
      n = next;
    }
    for (const node of nodes) parent.insertBefore(node, n);
  }

  #unmountSlot(key) {
    this.#mountedSlots.delete(key);
    this.#slotNodes.delete(key);
    // Long-session hygiene: an occurrence gone from the stream releases its
    // record and caches — keyed churn must not accumulate forever.
    this.#slotArgs.delete(key);
    this.#slotResolvedRefs.delete(key);
    delete this.#store[`slot:${key}`];
    this.#runSlotCleanups(key);
    const regions = this.#slotRegions.get(key);
    if (regions) {
      for (const { frame } of regions.values()) frame?.dispose();
      this.#slotRegions.delete(key);
    }
    this.#slotArgs.delete(key);
  }

  #runSlotCleanups(key) {
    const cleanups = this.#slotCleanups.get(key);
    if (!cleanups) return;
    this.#slotCleanups.delete(key);
    for (const fn of cleanups) fn();
  }

  /**
   * Resolve a slot's raw args into client-facing props:
   *  - data ref `{$ref}`      -> the response-scoped serialized value.
   *  - frame ref `{$frame}`   -> a nested reconciled region delivered as a
   *    marker range (no wrapper element), **cached per slot** so a re-call
   *    reuses the same range and its bound frame. The client places the
   *    returned fragment; the region's frame renders/reconciles between the
   *    markers.
   *  - anything else          -> passed through as a literal.
   */
  #resolveArgs(slotKey, args) {
    const host = this.#options.host;
    let regions = this.#slotRegions.get(slotKey);
    if (!regions) {
      regions = new Map();
      this.#slotRegions.set(slotKey, regions);
    }
    const props = {};
    for (const key of Object.keys(args)) {
      const value = args[key];
      if (isDataRef(value)) {
        // The frame's id rides along so multi-stream hosts can route the
        // ref to the right response-scoped data table. The resolution is
        // cached per occurrence so a later stream's re-sent ref can be
        // VALUE-compared (tables rotate per response, so ref identity
        // alone can't prove equivalence).
        const resolved = host ? host.resolve(value, this.#options.id) : undefined;
        let cache = this.#slotResolvedRefs.get(slotKey);
        if (!cache) this.#slotResolvedRefs.set(slotKey, (cache = {}));
        cache[key] = resolved;
        props[key] = resolved;
      } else if (isFrameRef(value)) {
        const fragment = document.createDocumentFragment();
        let entry = regions.get(value.$frame);
        if (!entry) {
          const start = document.createComment(`frame:${value.$frame}:start`);
          const end = document.createComment(`frame:${value.$frame}:end`);
          entry = { childId: value.$frame, start, end, frame: undefined };
          regions.set(value.$frame, entry);
          fragment.append(start, end);
        } else {
          // Re-call: move the existing range (markers + content) into a
          // fragment so the client re-places it; the bound frame's parent
          // follows live.
          let n = entry.start;
          while (n) {
            const next = n.nextSibling;
            fragment.append(n);
            if (n === entry.end) break;
            n = next;
          }
        }
        props[key] = fragment;
      } else {
        props[key] = value;
      }
    }
    return props;
  }

  /** Bind nested frames for a slot's regions once their markers are in the DOM. */
  /**
   * Marker-driven region discovery for the adopt path: a claimed
   * occurrence's interior already holds its nested server-content regions
   * between `frame:<childId>:start/:end` comments (the document producer
   * emitted them), but no slot record exists at t = 0 to create the region
   * entries `#resolveArgs` would. Seed entries from the OUTERMOST marker
   * pairs found in the interior (deeper pairs belong to the regions' own
   * occurrences and are discovered recursively when those claim);
   * `#bindRegions` then constructs adopting frames over them, which run
   * their own slot sync — this is what wires nested occurrences at boot.
   */
  #discoverRegions(slotKey, start) {
    if (!start) return;
    let regions = this.#slotRegions.get(slotKey);
    if (!regions) {
      regions = new Map();
      this.#slotRegions.set(slotKey, regions);
    }
    // Flat, document-ordered comment list for the interior (top-level
    // comments and element subtrees alike), then a depth stack pairs the
    // OUTERMOST frame ranges.
    const doc = start.ownerDocument;
    const endData = projectionEnd(slotKey);
    const comments = [];
    let n = start.nextSibling;
    while (n && !(n.nodeType === COMMENT_NODE && n.data === endData)) {
      if (n.nodeType === COMMENT_NODE) comments.push(n);
      else if (n.nodeType === 1) {
        const walker = doc.createTreeWalker(n, 128 /* COMMENT */);
        let c;
        while ((c = walker.nextNode())) comments.push(c);
      }
      n = n.nextSibling;
    }
    let depth = 0;
    let openId = null;
    let openStart = null;
    for (const c of comments) {
      const data = c.data;
      if (!data.startsWith("frame:")) continue;
      if (data.endsWith(":start")) {
        const childId = data.slice(6, -6);
        if (!childId) continue; // the insertable's unnamed boundary markers
        if (depth === 0) {
          openId = childId;
          openStart = c;
        }
        depth++;
      } else if (data.endsWith(":end")) {
        const childId = data.slice(6, -4);
        if (!childId) continue;
        if (depth > 0) {
          depth--;
          if (depth === 0 && childId === openId && !regions.has(openId)) {
            regions.set(openId, {
              childId: openId,
              start: openStart,
              end: c,
              frame: undefined,
              adopt: true
            });
          }
        }
      }
    }
  }

  /**
   * Whether a re-sent slot record's args are VALUE-equal to the mounted
   * occurrence's: primitives and {$frame} ids structurally, {$ref}s by
   * resolving the incoming ref (current table) against the cached
   * resolution from mount. Unresolvable or non-JSON-comparable values fall
   * back to "changed" (re-call) — the conservative default.
   */
  #refArgsUnchanged(occurrence, record) {
    const old = this.#slotArgs.get(occurrence);
    if (!old || old.kind !== "slot" || !record || record.kind !== "slot") return false;
    const a = old.args || {};
    const b = record.args || {};
    const ka = Object.keys(a);
    if (ka.length !== Object.keys(b).length) return false;
    const cache = this.#slotResolvedRefs.get(occurrence);
    for (const key of ka) {
      const va = a[key];
      const vb = b[key];
      if (va === vb) continue;
      if (!va || !vb || typeof va !== "object" || typeof vb !== "object") return false;
      if (typeof va.$frame === "string" && va.$frame === vb.$frame) continue;
      if (typeof va.$ref === "string" && typeof vb.$ref === "string" && cache && key in cache) {
        const host = this.#options.host;
        const next = host ? host.resolve(vb, this.#options.id) : undefined;
        try {
          if (JSON.stringify(next) === JSON.stringify(cache[key])) continue;
        } catch (e) {
          return false;
        }
      }
      return false;
    }
    return true;
  }

  #bindRegions(slotKey) {
    const regions = this.#slotRegions.get(slotKey);
    if (!regions) return;
    for (const entry of regions.values()) {
      if (!entry.frame && entry.start.parentNode) {
        // parentNode (not isConnected) so regions also bind during detached
        // rendering. Host buffering flushes any queued childId chunks. The
        // region inherits this frame's slot resolution, so client slots
        // revealed in its streamed content are filled by the same callbacks
        // the client threaded down — no global registry.
        entry.frame = new FrameImpl(null, entry.start, entry.end, {
          id: entry.childId,
          host: this.#options.host,
          // Regions discovered from adopted document markers already hold
          // their server-rendered content (adopt); streamed regions start
          // empty. Claim scoping threads the root boundary's id down.
          adopt: entry.adopt,
          claimScope: this.#options.claimScope ?? this.#options.id,
          // Element-claim sweeps in the region bind cleanup to the same
          // boundary owner as the root's.
          ownerScope: this.#options.ownerScope,
          resolveSlot: prop => this.#resolveSlot(prop),
          resolveSlotRecord: occurrence => this.#resolveSlotRecord(occurrence)
        });
      }
    }
  }

  /** Collect this frame's own top-level slot ranges (bounded to its content). */
  #collectSlots(found) {
    let n = this.#firstContent();
    const end = this.#end;
    while (n && n !== end) {
      const id = projectionStartId(n);
      if (id !== null) {
        if (!found.has(id)) found.set(id, n);
        n = afterRange(n, id);
        continue;
      }
      const regionId = frameRegionStartId(n);
      if (regionId !== null) {
        // Nested frame regions are child-owned: their interiors are opaque
        // to this frame's discovery (the child discovers, with callbacks and
        // records threaded down).
        n = afterFrameRegion(n, regionId);
        continue;
      }
      if (n.nodeType === ELEMENT_NODE) collectSlots(n, found);
      n = n.nextSibling;
    }
  }

  /** Find a fragment placeholder `<template id="pl-NAME">` bounded to this
   *  frame's content, or null. */
  #findPlaceholder(name) {
    const id = placeholderId(name);
    let n = this.#firstContent();
    const end = this.#end;
    while (n && n !== end) {
      if (isPlaceholderStart(n, id)) return n;
      if (n.nodeType === ELEMENT_NODE) {
        const found = findPlaceholder(n, id);
        if (found) return found;
      }
      n = n.nextSibling;
    }
    return null;
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const key of [...this.#slotCleanups.keys()]) this.#runSlotCleanups(key);
    for (const regions of this.#slotRegions.values()) {
      for (const { frame } of regions.values()) frame?.dispose();
    }
    this.#slotRegions.clear();
    this.#mountedSlots.clear();
    const { host, id } = this.#options;
    if (host && id !== undefined) host.unregister(id, this);
  }

  #applyRoot(html) {
    const fragment = parseFragment(html);
    const parent = this.#parent();
    if (!this.#hasContent) {
      this.#clearContent();
      // Claim before insertion empties the fragment — matching compiled
      // output, which claims at creation, pre-insert.
      this.#claimTree(fragment);
      parent.insertBefore(fragment, this.#end);
      this.#hasContent = true;
    } else {
      // Dormancy hoisted to once per apply: a null claim keeps the reconcile
      // inner loop at a register compare per node instead of a seam read.
      const claim = claimHandlers() ? this.#claimTree : null;
      reconcileChildren(parent, fragment, this.#start, this.#end, claim);
    }
  }

  /** Remove the frame's current content (bounded to its range). */
  #clearContent() {
    const parent = this.#parent();
    let n = this.#firstContent();
    while (n && n !== this.#end) {
      const next = n.nextSibling;
      parent.removeChild(n);
      n = next;
    }
  }

  /** Sweep-claim the frame's existing content (the adoption path). */
  #claimContent() {
    if (!claimHandlers()) return;
    let n = this.#firstContent();
    while (n && n !== this.#end) {
      this.#claimTree(n);
      n = n.nextSibling;
    }
  }

  #segmentReady(name) {
    const content = this.#store[`seg:${name}`];
    if (!content) return false;
    if (content.kind === "block") {
      // A block also depends on its template being present — so a block that
      // arrives before its template is buffered until the template lands.
      const template = this.#store[content.template];
      if (!template || template.kind !== "template") return false;
    } else if (content.kind !== "html") {
      return false;
    }
    // Reveal gate must be present and truthy.
    if (!this.#store[`seg:${name}:reveal`]) return false;
    // Style gate: the segment's streamed stylesheets must be loaded before it
    // shows (the $dfs/$dfc analogue). ensureStylesheet inserts pending links
    // immediately — even when other prerequisites are missing — so loading
    // overlaps with the rest of the stream; #styleFlush re-runs this frame
    // when one settles. Inline styles never gate (they apply on insertion).
    const assets = this.#store[`seg:${name}:assets`];
    if (assets && assets.styles) {
      let ready = true;
      for (const href of assets.styles) {
        if (!ensureStylesheet(href, this.#styleFlush)) ready = false;
      }
      if (!ready) return false;
    }
    // Structural prerequisite: the placeholder must exist in this frame's range.
    if (!this.#findPlaceholder(name)) return false;
    return true;
  }

  /**
   * Reveal a segment into its placeholder range ($df semantics): remove any
   * materialized fallback between the `pl-` template and its closing comment,
   * insert the content there, and remove both markers.
   */
  #revealSegment(name) {
    const tpl = this.#findPlaceholder(name);
    if (!tpl) return;
    // Inline styles ride the segment's assets record and apply just before
    // its content shows (document order: <style> precedes the template).
    const assets = this.#store[`seg:${name}:assets`];
    if (assets && assets.inlineStyles) applyInlineStyles(assets.inlineStyles);
    const content = this.#store[`seg:${name}`];
    const closing = rangeClose(tpl, placeholderId(name));
    const parent = tpl.parentNode;
    let n = tpl.nextSibling;
    while (n && n !== closing) {
      const next = n.nextSibling;
      parent.removeChild(n);
      n = next;
    }
    const materialized = this.#materialize(content);
    this.#claimTree(materialized);
    parent.insertBefore(materialized, closing);
    tpl.remove();
    closing && closing.remove();
    this.#revealed.add(name);
  }

  /**
   * Materialize the placeholder template's own content into the range
   * ($dfl semantics) without resolving the segment. Returns whether the
   * fallback was shown.
   */
  #showFallback(name) {
    const tpl = this.#findPlaceholder(name);
    if (!tpl) return false;
    const closing = rangeClose(tpl, placeholderId(name));
    if (!closing) return false;
    const fallback = tpl.content.cloneNode(true);
    this.#claimTree(fallback);
    closing.parentNode.insertBefore(fallback, closing);
    return true;
  }

  /** Materialize a content record into nodes: HTML directly, or a block by
   *  cloning its template and filling fields with the block's values. */
  #materialize(record) {
    if (record.kind === "html") return parseFragment(record.value);
    if (record.kind === "block") {
      const template = this.#store[record.template];
      // Readiness guarantees the template is present; guard defensively anyway.
      if (!template || template.kind !== "template") return parseFragment("");
      return materializeBlock(template, record.values);
    }
    return parseFragment("");
  }
}

/** Clone a template's markup and fill each `<!--field:<name>-->` marker with
 *  the matching value, positionally aligned to the template's `fields`. */
function materializeBlock(template, values) {
  const fragment = parseFragment(template.html);
  for (let i = 0; i < template.fields.length; i++) {
    const marker = `field:${template.fields[i]}`;
    const value = values[i] == null ? "" : String(values[i]);
    let hole = findComment(fragment, marker);
    while (hole) {
      hole.replaceWith(document.createTextNode(value));
      hole = findComment(fragment, marker);
    }
  }
  return fragment;
}

export function createFrame(boundary, options) {
  return new FrameImpl(boundary, null, null, options);
}

/**
 * Binds a frame to an EXISTING marker range — the document-SSR adoption
 * path. The page already holds the server-rendered boundary between
 * `frame:<id>:start`/`:end` comments: the frame constructed over it treats
 * that content as its own (first stream morphs rather than materializes)
 * and slots sync immediately, claiming their server-rendered DOM via
 * `ctx.existing`.
 */
export function adoptFrameRange(start, end, options) {
  return new FrameImpl(null, start, end, { ...options, adopt: true });
}

// Well-known brand shared with client.js's `insert` (constants.js defines
// the same registered symbol) — Symbol.for keeps the two modules importless
// in both directions, which is what makes frames zero-cost for apps that
// never import this entry.
const FRAME = Symbol.for("dom-expressions.frame");

/**
 * A branded frame-insertable value: `insert()` recognizes the brand and
 * calls the mount handler this value carries, which establishes a comment
 * range at the insertion point and binds a frame to it (registered with
 * `options.host` under `options.id`, so streamed chunks route to it —
 * including any buffered before mount).
 *
 * One static mount per value. Lifecycle belongs to the creator: server
 * updates flow through the frame's stream (policy A morphs in place), and
 * teardown is `value.dispose()` — the Solid binding registers it with its
 * owner (`onCleanup`), keeping the reactive-core dependency on that side.
 */
export function createFrameInsertable(options) {
  let frame = null;
  let start = null;
  let end = null;
  return {
    get frame() {
      return frame;
    },
    dispose() {
      if (!frame) return;
      frame.dispose();
      frame = null;
      const parent = start.parentNode;
      if (!parent) return;
      let n = start;
      while (n) {
        const next = n.nextSibling;
        parent.removeChild(n);
        if (n === end) break;
        n = next;
      }
    },
    [FRAME](parent, marker) {
      if (frame) return; // single-mount contract
      start = document.createComment("frame:start");
      end = document.createComment("frame:end");
      parent.insertBefore(start, marker);
      parent.insertBefore(end, marker);
      frame = new FrameImpl(null, start, end, options);
    }
  };
}

/** Returns the segment name for a `seg:<name>` content key, else `null`. */
function segmentName(key) {
  const m = /^seg:([^:]+)$/.exec(key);
  return m ? m[1] : null;
}

/** The prop name for a slot occurrence id: `comment#0` -> `comment`, `x` -> `x`. */
function propOf(occurrence) {
  const hash = occurrence.indexOf("#");
  return hash === -1 ? occurrence : occurrence.slice(0, hash);
}

function isDataRef(value) {
  return typeof value === "object" && value !== null && typeof value.$ref === "string";
}

function isFrameRef(value) {
  return typeof value === "object" && value !== null && typeof value.$frame === "string";
}

/** Parse an HTML string into a document fragment, preserving comments. */
function parseFragment(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}

// ---- Style loading (reveal gating) ------------------------------------
//
// Minimal, import-free mirror of the client asset registry's conventions
// (client.js acquireAsset): data-asset ids for inline styles, attribute-
// compared lookup instead of selector interpolation, adopt elements already
// in the document. The dom-expressions binding can swap in the ref-counted
// registry later; the gate only needs "are this segment's stylesheets loaded,
// and call me back when they settle".

/** Attribute-compared head lookup so href/id values never need escaping. */
function findHeadElement(selector, attr, value) {
  const nodes = document.head.querySelectorAll(selector);
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].getAttribute(attr) === value) return nodes[i];
  }
  return null;
}

/**
 * Ensure a stylesheet link exists and report whether it has settled. A link
 * this loader created tracks waiters until load/error (error unblocks too —
 * same policy as the document runtime's $dfc onerror); a link that was
 * already in the document counts as settled.
 */
function ensureStylesheet(href, onSettle) {
  let link = findHeadElement('link[rel="stylesheet"]', "href", href);
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    const waiters = new Set();
    link._$frWaiters = waiters;
    const settle = () => {
      link._$frWaiters = null;
      for (const fn of waiters) fn();
    };
    link.addEventListener("load", settle);
    link.addEventListener("error", settle);
    document.head.appendChild(link);
  }
  const waiters = link._$frWaiters;
  if (waiters == null) return true; // settled, or document-owned
  waiters.add(onSettle);
  return false;
}

/** Ensure a modulepreload link exists for `href` (deduped, adopt existing). */
function ensureModulePreload(href) {
  if (findHeadElement('link[rel="modulepreload"]', "href", href)) return;
  const link = document.createElement("link");
  link.rel = "modulepreload";
  link.href = href;
  document.head.appendChild(link);
}

/** Insert inline-style entries into the head, deduped by data-asset id. */
function applyInlineStyles(inlineStyles) {
  for (const entry of inlineStyles) {
    if (findHeadElement("style[data-asset]", "data-asset", entry.id)) continue;
    const el = document.createElement("style");
    el.setAttribute("data-asset", entry.id);
    if (entry.attrs) {
      for (const name in entry.attrs) el.setAttribute(name, entry.attrs[name]);
    }
    el.textContent = entry.content || "";
    document.head.appendChild(el);
  }
}

/** Whether `node` is the `<template id="pl-KEY">` placeholder start marker. */
function isPlaceholderStart(node, id) {
  return (
    node.nodeType === ELEMENT_NODE && node.tagName === "TEMPLATE" && node.getAttribute("id") === id
  );
}

/** The `<!--pl-KEY-->` comment closing a placeholder range, or null. */
function rangeClose(start, id) {
  let n = start.nextSibling;
  while (n) {
    if (n.nodeType === COMMENT_NODE && n.data === id) return n;
    n = n.nextSibling;
  }
  return null;
}

/** Depth-first search for a placeholder template with the given id. */
function findPlaceholder(root, id) {
  let n = root.firstChild;
  while (n) {
    if (isPlaceholderStart(n, id)) return n;
    if (n.nodeType === ELEMENT_NODE) {
      const found = findPlaceholder(n, id);
      if (found) return found;
    }
    n = n.nextSibling;
  }
  return null;
}

/**
 * Collect this frame's own slot ranges (`proj:<key>:start`) into `out`, keyed
 * by slot id. Descends through server-owned elements but never into a range's
 * interior, so slots belonging to nested frames / client content are ignored.
 */
function collectSlots(root, out) {
  let n = root.firstChild;
  while (n) {
    const id = projectionStartId(n);
    if (id !== null) {
      if (!out.has(id)) out.set(id, n);
      n = afterRange(n, id);
      continue;
    }
    const regionId = frameRegionStartId(n);
    if (regionId !== null) {
      n = afterFrameRegion(n, regionId);
      continue;
    }
    if (n.nodeType === ELEMENT_NODE) collectSlots(n, out);
    n = n.nextSibling;
  }
}

const FRAME_REGION_START = /^frame:(.+):start$/;

/** If `node` is a `frame:<id>:start` comment, return its id; else `null`. */
function frameRegionStartId(node) {
  if (node.nodeType !== COMMENT_NODE) return null;
  const m = FRAME_REGION_START.exec(node.data);
  return m ? m[1] : null;
}

/** The sibling immediately after the `frame:<id>:end` marker for `start`. */
function afterFrameRegion(start, id) {
  const end = `frame:${id}:end`;
  let n = start.nextSibling;
  while (n) {
    if (n.nodeType === COMMENT_NODE && n.data === end) return n.nextSibling;
    n = n.nextSibling;
  }
  return null;
}

/**
 * Whether two slot-args objects are equivalent for re-call purposes:
 * primitives by value, `{$frame}` region refs by id (region content updates
 * flow through the region's own chunks — a re-call is never needed for
 * them). `{$ref}` codec refs are response-scoped — the same id can decode
 * to a new value on a later stream — so they conservatively count as
 * changed.
 */
function argsEquivalent(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const key of ka) {
    const va = a[key];
    const vb = b[key];
    if (va === vb) continue;
    if (
      va &&
      vb &&
      typeof va === "object" &&
      typeof vb === "object" &&
      typeof va.$frame === "string" &&
      va.$frame === vb.$frame
    ) {
      continue;
    }
    return false;
  }
  return true;
}

/** The nodes strictly between a range's start marker and its end comment. */
function rangeInterior(start, endData) {
  const nodes = [];
  let n = start.nextSibling;
  while (n && !(n.nodeType === COMMENT_NODE && n.data === endData)) {
    nodes.push(n);
    n = n.nextSibling;
  }
  return nodes;
}

/** Depth-first search for a comment node with exact `data`. */
function findComment(root, data) {
  const children = root.childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.nodeType === COMMENT_NODE && node.data === data) return node;
    if (node.nodeType === ELEMENT_NODE) {
      const found = findComment(node, data);
      if (found) return found;
    }
  }
  return null;
}

// --- Morph -----------------------------------------------------------------
//
// A zero-allocation, two-cursor server-owned DOM patch path: text/attribute
// updates, child insertion/removal, and preservation of two protected marker
// kinds — fragment placeholder ranges and projection ranges. It walks the
// live children and the freshly parsed source in lockstep instead of building
// intermediate token/result arrays, so the common "server churn around client
// anchors" case stays competitive with hand-written morphers.
//
// Projection ranges are opaque protected units: their interior is never
// diffed, and a range already in the right position is never touched — which
// is what preserves focus/selection/media inside it. Placeholder templates
// morph as ordinary elements (their fallback lives in .content, which child
// reconciliation never descends into).

/** If `node` is a `proj:<id>:start` comment, return its id; else `null`. */
function projectionStartId(node) {
  if (node.nodeType !== COMMENT_NODE) return null;
  const m = PROJECTION_START.exec(node.data);
  return m ? m[1] : null;
}

/** Whether `node` is any projection marker (start or end). */
function isProjectionMarker(node) {
  if (node.nodeType !== COMMENT_NODE) return false;
  const data = node.data;
  return PROJECTION_START.test(data) || PROJECTION_END.test(data);
}

function compatible(a, b) {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType === ELEMENT_NODE) return a.nodeName === b.nodeName;
  return a.nodeType === TEXT_NODE || a.nodeType === COMMENT_NODE;
}

function morphAttributes(oldEl, newEl, claim) {
  let reclaim = false;
  let changed = false;
  const oldAttrs = oldEl.attributes;
  for (let i = oldAttrs.length - 1; i >= 0; i--) {
    const name = oldAttrs[i].name;
    if (!newEl.hasAttribute(name)) {
      oldEl.removeAttribute(name);
      changed = true;
      reclaim ||= claimedAttr(name);
    }
  }
  const newAttrs = newEl.attributes;
  for (let i = 0; i < newAttrs.length; i++) {
    const attr = newAttrs[i];
    if (oldEl.getAttribute(attr.name) !== attr.value) {
      oldEl.setAttribute(attr.name, attr.value);
      changed = true;
      reclaim ||= claimedAttr(attr.name);
    }
  }
  // The morph is the only write path for server-owned elements, and it makes
  // attributes match server output exactly — including STRIPPING state a
  // claim consumer applied (aria-current, data-active). So a claimable
  // element re-claims on ANY attribute change, letting the consumer
  // reassert; `href`/`action` transitions re-claim even when the element no
  // longer matches the selector (removal must fire, mirroring compiled
  // setAttribute). Direct claims, not subtree sweeps.
  if (claim && (reclaim || (changed && oldEl.matches(CLAIMED_ELEMENTS)))) claim(oldEl, true);
}

/** Morph `oldNode` in place to match `newNode` (assumed `compatible`). */
function morphNode(oldNode, newNode, claim) {
  if (oldNode.nodeType === ELEMENT_NODE) {
    morphAttributes(oldNode, newNode, claim);
    reconcileChildren(oldNode, newNode, null, null, claim);
  } else if (oldNode.data !== newNode.data) {
    oldNode.data = newNode.data;
  }
}

/** The sibling immediately after the `proj:<id>:end` marker for `start`. */
function afterRange(start, id) {
  const end = projectionEnd(id);
  let n = start.nextSibling;
  while (n) {
    if (n.nodeType === COMMENT_NODE && n.data === end) return n.nextSibling;
    n = n.nextSibling;
  }
  return null;
}

/** The sibling after the `proj:<id>:end` marker in the incoming source. */
function skipRange(start, id) {
  return afterRange(start, id);
}

/** Find a `proj:<id>:start` comment among siblings in `[from, bound)`. */
function findRangeStart(from, id, bound) {
  const target = `proj:${id}:start`;
  let n = from;
  while (n && n !== bound) {
    if (n.nodeType === COMMENT_NODE && n.data === target) return n;
    n = n.nextSibling;
  }
  return null;
}

/** Move the range `[start .. proj:<id>:end]` to before `ref` within `parent`. */
function moveRangeBefore(parent, start, id, ref) {
  const end = projectionEnd(id);
  let n = start;
  while (n) {
    const next = n.nextSibling;
    const isEnd = n.nodeType === COMMENT_NODE && n.data === end;
    parent.insertBefore(n, ref);
    if (isEnd) break;
    n = next;
  }
}

/**
 * Move an incoming projection range from the source into `parent` before
 * `ref`, returning the source cursor just past the range's end marker.
 */
function adoptRange(parent, start, id, ref, claim) {
  const end = projectionEnd(id);
  let n = start;
  let after = null;
  while (n) {
    const next = n.nextSibling;
    const isEnd = n.nodeType === COMMENT_NODE && n.data === end;
    parent.insertBefore(n, ref);
    // Fresh server-sent placeholder content: claim indiscriminately (the
    // slot mount that later fills the range claims its own output through
    // compiled creation).
    if (claim) claim(n);
    if (isEnd) {
      after = next;
      break;
    }
    n = next;
  }
  return after;
}

/**
 * Reconcile the children of `parent` toward the children of `source`, reusing
 * existing DOM in place. `source` is a freshly parsed, disposable node whose
 * children are moved into `parent` only when they are genuinely new.
 *
 * When `boundStart`/`boundEnd` are given, only the nodes in `(boundStart,
 * boundEnd)` are reconciled and new nodes are inserted before `boundEnd` —
 * this is how a range-boundary frame reconciles between its markers without
 * touching the client content around them.
 */
function reconcileChildren(parent, source, boundStart = null, boundEnd = null, claim = null) {
  let oldChild = boundStart ? boundStart.nextSibling : parent.firstChild;
  let newChild = source.firstChild;

  while (newChild) {
    const nextNew = newChild.nextSibling;
    const pid = projectionStartId(newChild);
    // Treat reaching the upper bound as "no more old nodes".
    const old = oldChild === boundEnd ? null : oldChild;

    if (pid !== null) {
      if (old && projectionStartId(old) === pid) {
        // Same projection already here: preserve its live interior untouched
        // (this is what keeps focus/selection/media alive) and skip both
        // ranges.
        oldChild = afterRange(old, pid);
        newChild = skipRange(newChild, pid);
      } else {
        const existing = findRangeStart(old, pid, boundEnd);
        if (existing) {
          // Reorder: relocate the existing client-owned range into position.
          moveRangeBefore(parent, existing, pid, old ?? boundEnd);
          newChild = skipRange(newChild, pid);
        } else {
          // New projection: adopt the server-sent placeholder range as-is.
          newChild = adoptRange(parent, newChild, pid, old ?? boundEnd, claim);
        }
      }
      continue;
    }

    if (!old) {
      parent.insertBefore(newChild, boundEnd);
      if (claim) claim(newChild);
      newChild = nextNew;
      continue;
    }
    if (isProjectionMarker(old)) {
      // Old projection anchor: flow new server content in front of it without
      // disturbing the client-owned range.
      parent.insertBefore(newChild, old);
      if (claim) claim(newChild);
      newChild = nextNew;
      continue;
    }
    if (compatible(old, newChild)) {
      morphNode(old, newChild, claim);
      oldChild = old.nextSibling;
      newChild = nextNew;
      continue;
    }
    // Incompatible here — but a compatible element may sit further along:
    // content churn between versions (a placeholder where revealed content
    // was) shifts positions, and recreating a later match would destroy the
    // client-owned interiors it carries. Relocate it instead (skipping over
    // projection-range interiors, which belong to the client).
    if (newChild.nodeType === 1) {
      let ahead = old.nextSibling;
      while (ahead && ahead !== boundEnd && !compatible(ahead, newChild)) {
        const aheadPid = projectionStartId(ahead);
        ahead = aheadPid !== null ? afterRange(ahead, aheadPid) : ahead.nextSibling;
      }
      if (ahead && ahead !== boundEnd) {
        parent.insertBefore(ahead, old);
        morphNode(ahead, newChild, claim);
        newChild = nextNew;
        continue;
      }
    }
    // No match anywhere: place the new node and leave the old one for later
    // matching or removal.
    parent.insertBefore(newChild, old);
    if (claim) claim(newChild);
    newChild = nextNew;
  }

  while (oldChild && oldChild !== boundEnd) {
    const next = oldChild.nextSibling;
    parent.removeChild(oldChild);
    oldChild = next;
  }
}
