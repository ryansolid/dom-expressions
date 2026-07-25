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
 *     slot ranges and fragment placeholders
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

const SLOT_START = /^slot:(.+):start$/;
const SLOT_END = /^slot:(.+):end$/;
const slotEnd = id => `slot:${id}:end`;

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
        // ONE store write for the whole buffer: per-chunk applies flush (and
        // sync slots) between records, so the first record would mount every
        // discovered occurrence — the rest record-less — and each later
        // record would then look like an args CHANGE, re-calling with
        // incomplete args and wiping adopted interiors (the #547 boot face).
        // The buffer holds a single version by construction (stale-version
        // chunks are dropped at buffering time).
        const records = {};
        let version;
        for (const chunk of buffered) {
          if (chunk.type === "data") {
            options.applyData && options.applyData(chunk);
            continue;
          }
          version = chunk.version;
          Object.assign(records, chunkToRecords(chunk));
        }
        if (version !== undefined) frame.apply({ version, r: records });
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
      // content. Reveal bookkeeping and seg/error records reset; slot
      // records stay (dedupe is what preserves occurrence state).
      this.#version = v;
      this.#revealed.clear();
      this.#fallbackShown.clear();
      for (const key of Object.keys(this.#store)) {
        if (key.startsWith("seg:") || key === ":error") {
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

  /**
   * Delete an occurrence's args record from the store that OWNS it. A nested
   * occurrence's record lives on the frame whose props proxy emitted it — an
   * ancestor keyed by the root stream — not on the region frame that mounts
   * it, so removal threads up exactly like `#resolveSlotRecord`. Without this,
   * tearing down a region (a comment navigated away from) leaves its nested
   * occurrences' records stranded in the root store; on navigating back the
   * stale record (a subset of the re-sent one — the t=0 shape omits used
   * `{$frame}` regions) dedupes the re-introduced region away, and the wrapper
   * re-mounts with no children (the doubly-nested reply's body vanishes).
   */
  #removeSlotRecord(occurrence) {
    const key = `slot:${occurrence}`;
    if (key in this.#store) delete this.#store[key];
    else this.#options.removeSlotRecord?.(occurrence);
  }

  // `root`, when given, scopes discovery to a detached fragment instead of the
  // frame's live content: a boundary-driven reveal renders a segment's fills
  // INSIDE the reconstructed `<Loading>` (so their readiness gates the reveal),
  // then the filled fragment is committed. Those occurrences mount here and are
  // skipped by the next full sync; the unmount sweep is full-frame-only (a
  // scoped fill only ADDS occurrences, never removes the frame's others).
  #syncSlots(root) {
    if (!this.#slots && !this.#options.resolveSlot) return;

    // Range-driven discovery: find every server-owned slot occurrence in this
    // frame's content. An occurrence id is the marker key (e.g. "children" or
    // "comment#0"); the callback is looked up by its prop — the part before
    // "#" — so one callback services N occurrences from an iterated render
    // prop.
    const found = new Map();
    if (root) collectSlots(root, found);
    else this.#collectSlots(found);

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
        // In an adopt frame, a MOUNT is the hydration attach — whether the
        // constructor sync or a registration-flush drain (t=0 records
        // buffered before adoption) triggered it. ctx.adopted lets
        // consumers claim server-rendered DOM exactly then; stream re-calls
        // (the mounted branch below) must render for real or replaced
        // content is silently dropped (#547). Occurrences a post-boot
        // stream introduces mount with EMPTY interiors (the producer ships
        // bare marker pairs), so consumers' existing-content gate already
        // excludes them from claiming.
        // Discover the interior's region elements BEFORE invoking, on the
        // adopt path: a used region is omitted from the t=0 record (it
        // shipped as markup), so it is only knowable from the existing DOM —
        // and #invokeSlot must thread it into the wrapper's props so the
        // wrapper OWNS the already-rendered element (see #invokeSlot). A
        // fresh mount has no interior regions yet; discovery is a no-op then,
        // and #resolveArgs creates its entries during the invoke instead.
        if (this.#options.adopt) this.#discoverRegions(occurrence, start);
        const nodes = this.#invokeSlot(occurrence, callback, record, start, this.#options.adopt);
        if (nodes) this.#replaceRange(occurrence, start, nodes);
        this.#slotNodes.set(occurrence, nodes);
        this.#mountedSlots.add(occurrence);
        // Re-scan after invoke: a fresh mount's regions come from
        // #resolveArgs during the invoke, and the callback's output may have
        // introduced more. Idempotent with the pre-invoke adopt discovery.
        this.#discoverRegions(occurrence, start);
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

    // Unmount occurrences whose range has disappeared from the server content
    // — full-frame syncs only; a scoped fragment fill never removes siblings.
    if (!root) {
      for (const occurrence of [...this.#mountedSlots]) {
        if (!found.has(occurrence)) this.#unmountSlot(occurrence);
      }
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
  #invokeSlot(occurrence, callback, record, start, adopted) {
    const cleanups = this.#slotCleanups.get(occurrence) ?? [];
    const ctx = {
      // Identity for hydration-claim scoping: consumers derive the same
      // key prefix the document producer used for this occurrence. The
      // producer scopes EVERY occurrence (nested ones included) under the
      // root boundary's id, so region frames thread the root's claimScope
      // down rather than their own region id.
      frame: this.#options.claimScope ?? this.#options.id,
      key: occurrence,
      // True ONLY for the hydration-attach sync of an adopted document
      // range: the one invocation consumers may answer with a claim
      // (`existing` IS the server-rendered output). Stream re-calls leave
      // it unset — they must render for real (#547).
      adopted: !!adopted,
      onCleanup: fn => cleanups.push(fn),
      existing: start ? rangeInterior(start, slotEnd(occurrence)) : []
    };
    const props =
      record && record.kind === "slot" ? this.#resolveArgs(occurrence, record.args) : {};
    // Thread already-discovered regions into props (adopt path): a USED
    // region is omitted from the t=0 record (it shipped as page markup), so
    // without this the wrapper's `props.children` is undefined and its own
    // reactivity never OWNS the already-rendered region element — a
    // client-only toggle that conditionally renders it then can't hide/show
    // it until a stream re-call re-arms the arg. Threading the EXISTING
    // element (discovered from the interior before this invoke) makes the
    // wrapper's conditional track it as `current`, so removal works at t=0.
    // Keyed by the arg name (the childId's final segment); skips keys the
    // record already resolved, so a re-call's #resolveArgs regions win.
    const regions = this.#slotRegions.get(occurrence);
    if (regions) {
      for (const entry of regions.values()) {
        const argKey = entry.childId.slice(entry.childId.lastIndexOf(".") + 1);
        if (!(argKey in props)) props[argKey] = entry.element;
      }
    }
    const content = callback(props, ctx);
    this.#slotArgs.set(occurrence, record);
    if (cleanups.length) this.#slotCleanups.set(occurrence, cleanups);
    if (content == null) return null;
    return Array.isArray(content) ? content : [content];
  }

  /** Replace the nodes between a slot range's start marker and its end marker. */
  #replaceRange(key, start, nodes) {
    const end = slotEnd(key);
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
    this.#removeSlotRecord(key);
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
        // A nested server-content region: a single frame ELEMENT the wrapper
        // places. On re-call the wrapper re-places the SAME element (the
        // platform moves the subtree as one node — no marker range to walk,
        // no fragment refill), and the bound frame's parent follows live.
        let entry = regions.get(value.$frame);
        if (!entry) {
          const element = makeFrameElement(value.$frame);
          entry = { childId: value.$frame, element, frame: undefined };
          regions.set(value.$frame, entry);
        }
        props[key] = entry.element;
      } else {
        props[key] = value;
      }
    }
    return props;
  }

  /** Bind nested frames for a slot's regions once their markers are in the DOM. */
  /**
   * Marker-driven region discovery for the adopt path: a claimed
   * occurrence's interior already holds its nested server-content regions as
   * frame ELEMENTS (the document producer emitted them), but no slot record
   * exists at t = 0 to create the region entries `#resolveArgs` would. Seed
   * entries from the OUTERMOST region elements in the interior (a region's
   * own deeper regions belong to its occurrences and are discovered
   * recursively when those claim); `#bindRegions` then constructs adopting
   * frames over them, which run their own slot sync — this is what wires
   * nested occurrences at boot. An element boundary makes discovery a scoped
   * walk that stops at each region, replacing the flat-comment-list + depth-
   * stack pairing a marker range needed.
   */
  #discoverRegions(slotKey, start) {
    if (!start) return;
    let regions = this.#slotRegions.get(slotKey);
    if (!regions) {
      regions = new Map();
      this.#slotRegions.set(slotKey, regions);
    }
    const endData = slotEnd(slotKey);
    let n = start.nextSibling;
    while (n && !(n.nodeType === COMMENT_NODE && n.data === endData)) {
      collectRegionElements(n, regions);
      n = n.nextSibling;
    }
  }

  /**
   * Whether a re-sent slot record's args are VALUE-equal to the mounted
   * occurrence's: primitives and {$frame} ids structurally, {$ref}s by
   * resolving the incoming ref (current table) against the cached
   * resolution from mount. Keys the stream ADDS count as unchanged only
   * when they are {$frame} refs to regions the occurrence already holds —
   * the t=0 record omits used regions, so the first post-adoption stream
   * always re-introduces them (#547). Unresolvable or non-JSON-comparable
   * values fall back to "changed" (re-call) — the conservative default.
   */
  #refArgsUnchanged(occurrence, record) {
    const old = this.#slotArgs.get(occurrence);
    if (!record || record.kind !== "slot") return false;
    if (old && old.kind !== "slot") return false;
    // A mounted occurrence with NO record is a record-less adoption (or a
    // direct insert): its args baseline is empty, so a first stream record
    // carrying only known {$frame} regions is "unchanged" too (#547).
    const a = (old && old.args) || {};
    const b = record.args || {};
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (kb.length < ka.length) return false;
    // Keys the stream ADDS are unchanged when they are {$frame} refs whose
    // ranges this occurrence already holds: the t=0 record omits USED
    // regions by design (they shipped as page markup), so the first
    // post-adoption stream always re-introduces them — re-calling for that
    // would tear out live region ranges (#547). Anything else added is a
    // real change.
    if (kb.length !== ka.length) {
      const regions = this.#slotRegions.get(occurrence);
      for (const key of kb) {
        if (key in a) continue;
        const vb = b[key];
        if (!vb || typeof vb !== "object" || typeof vb.$frame !== "string") return false;
        if (!regions || !regions.has(vb.$frame)) return false;
      }
    }
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
      if (!entry.frame) {
        // Bind eagerly — the region ELEMENT always exists (unlike the old
        // marker range, which needed placement in a fragment/DOM to count).
        // This is what makes an OCCLUDED region work: its element is created
        // when args resolve but the wrapper doesn't place it until (e.g.)
        // expand, so it must bind and fill (from buffered/streamed chunks)
        // off-DOM, then reveal in place when the wrapper finally inserts the
        // single node. Host buffering flushes any queued childId chunks. The
        // region inherits this frame's slot resolution, so client slots
        // revealed in its streamed content are filled by the same callbacks
        // the client threaded down — no global registry.
        entry.frame = new FrameImpl(entry.element, null, null, {
          id: entry.childId,
          host: this.#options.host,
          // Regions discovered from adopted document elements already hold
          // their server-rendered content (adopt); streamed regions start
          // empty. Claim scoping threads the root boundary's id down.
          adopt: entry.adopt,
          claimScope: this.#options.claimScope ?? this.#options.id,
          // Element-claim sweeps in the region bind cleanup to the same
          // boundary owner as the root's.
          ownerScope: this.#options.ownerScope,
          resolveSlot: prop => this.#resolveSlot(prop),
          resolveSlotRecord: occurrence => this.#resolveSlotRecord(occurrence),
          removeSlotRecord: occurrence => this.#removeSlotRecord(occurrence)
        });
      }
    }
  }

  /** Collect this frame's own top-level slot ranges (bounded to its content). */
  #collectSlots(found) {
    let n = this.#firstContent();
    const end = this.#end;
    while (n && n !== end) {
      const id = slotStartId(n);
      if (id !== null) {
        if ("_DX_DEV_") devCheckRange(n, id);
        if (!found.has(id)) found.set(id, n);
        n = afterRange(n, id);
        continue;
      }
      // A nested frame/region element is child-owned: its interior is opaque
      // to this frame's discovery (the child discovers, with callbacks and
      // records threaded down). Don't descend into it.
      if (n.nodeType === ELEMENT_NODE && !isFrameElement(n)) collectSlots(n, found);
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
    // Release this frame's occurrences' records from the store that owns them
    // (an ancestor's, for a region frame's nested occurrences) so a torn-down
    // region leaves nothing stale to dedupe a later re-navigation against.
    for (const key of this.#mountedSlots) this.#removeSlotRecord(key);
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
    if (!content || content.kind !== "html") return false;
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
    if ("_DX_DEV_" && !closing) {
      console.error(
        `Frame fragment placeholder "${name}" is missing its closing comment ` +
          `(<!--${placeholderId(name)}-->); revealed content will be appended at the end of ` +
          `its parent instead of in place. Likely an HTML-rewriting layer stripped the ` +
          `comment, or invalid nesting split the placeholder range.`,
        tpl
      );
    }
    const parent = tpl.parentNode;
    // Clear the current range interior (a materialized fallback, if #showFallback
    // ran) — both paths below re-own this position.
    let n = tpl.nextSibling;
    while (n && n !== closing) {
      const next = n.nextSibling;
      parent.removeChild(n);
      n = next;
    }

    if (this.#options.reveal) {
      // Boundary-driven reveal (the ratified "per-`<Loading>`" model): the
      // server `<Loading>` boundary's footprint on the client is this exact
      // placeholder seam, so the binding reconstructs a client boundary here —
      // fallback = the placeholder's own template content, children = the
      // segment content plus its client fills, rendered INSIDE the boundary so
      // their readiness gates it. An unboundaried async fill suspends up to
      // THIS boundary and is covered, not orphaned; a fill with its own
      // boundary contains itself. Cost is one boundary per revealed segment —
      // and segments are `<Loading>` boundaries (few, author-placed), so this
      // is React's granularity, not a per-chunk tax. `closing` stays as the
      // boundary's insertion anchor; only the template is removed.
      const fallbackFrag = tpl.content.cloneNode(true);
      this.#claimTree(fallbackFrag);
      this.#options.reveal({
        before: closing,
        fallback: [...fallbackFrag.childNodes],
        content: () => {
          const materialized = this.#materialize(content);
          this.#syncSlots(materialized);
          this.#claimTree(materialized);
          return materialized;
        }
      });
      tpl.remove();
      this.#revealed.add(name);
      return;
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

  /** Materialize a content record into nodes (HTML fragments — the v1 and
   *  only payload mode; see docs/frame-seams-decision.md on why structural
   *  compression is not pursued). */
  #materialize(record) {
    return record.kind === "html" ? parseFragment(record.value) : parseFragment("");
  }
}

export function createFrame(boundary, options) {
  return new FrameImpl(boundary, null, null, options);
}

// The boundary/region element vocabulary — the DOM contract the producer
// (frame-sink.js) emits at t=0 and this consumer creates/adopts on the
// client. A frame mounts INTO this element: server content is its children,
// morphed in place. Making the boundary a first-class node is the whole
// point of the element-seams decision — `insert`/`reconcileArrays`/Suspense
// handle it natively with no brand (closing #550), and it cannot be split by
// invalid nesting or stripped by a CDN the way a comment-marker range can
// (see docs/frame-seams-decision.md). Kept in sync with the producer by
// convention, like the `slot:`/`frame:` marker strings already are — the two
// don't share a module (one is server-only, one client-only).
export const FRAME_TAG = "dx-frame";
export const FRAME_ID_ATTR = "data-fid";

/**
 * Create a boundary/region element and bind a frame to it (element mode).
 * Boundary identity belongs to the client, so the client creates the
 * element: a `<dx-frame>` rendered `display:contents` — layout- and
 * box-transparent, exactly like the comment range it replaces. Registered
 * with `options.host` under `options.id`, so streamed chunks route to it,
 * including any buffered before mount.
 *
 * Returns the element (a real node `insert()` places with no brand, in any
 * position — array, fragment, single) plus lifecycle. One frame per element;
 * server updates flow through the stream (policy A morphs in place), and
 * teardown is `dispose()` — the Solid binding ties it to its owner via
 * `onCleanup`.
 *
 * The tag is always `<dx-frame>`: a boundary can't sit inside table
 * internals at t=0 (the parser foster-parents a non-table element out of a
 * `<table>`), which is a documented, nameable limitation — own the whole
 * table in the server component, or supply rows via a client slot — not an
 * `as` escape hatch.
 */
export function createFrameElement(options) {
  const el = makeFrameElement(options.id);
  const frame = new FrameImpl(el, null, null, options);
  return {
    element: el,
    get frame() {
      return frame;
    },
    dispose() {
      frame.dispose();
      el.remove();
    }
  };
}

/**
 * Create a bare boundary/region element (no frame bound yet). `<dx-frame>` is
 * inlined as `display:contents` — not a stylesheet or custom-element
 * registration — so it holds before any bundle loads and needs nothing
 * defined: an undefined custom element is inert HTMLUnknownElement, and
 * `display:contents` makes it generate no box, so its children lay out in the
 * frame's parent.
 */
function makeFrameElement(id) {
  const el = document.createElement(FRAME_TAG);
  el.style.display = "contents";
  if (id !== undefined) el.setAttribute(FRAME_ID_ATTR, id);
  return el;
}

/** Whether `node` is a frame boundary/region element (carries our id attr). */
function isFrameElement(node) {
  return node.nodeType === ELEMENT_NODE && node.hasAttribute(FRAME_ID_ATTR);
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
 * Collect this frame's own slot ranges (`slot:<key>:start`) into `out`, keyed
 * by slot id. Descends through server-owned elements but never into a range's
 * interior, so slots belonging to nested frames / client content are ignored.
 */
function collectSlots(root, out) {
  let n = root.firstChild;
  while (n) {
    const id = slotStartId(n);
    if (id !== null) {
      if ("_DX_DEV_") devCheckRange(n, id);
      if (!out.has(id)) out.set(id, n);
      n = afterRange(n, id);
      continue;
    }
    // Skip nested frame/region element interiors — child-owned (see
    // #collectSlots).
    if (n.nodeType === ELEMENT_NODE && !isFrameElement(n)) collectSlots(n, out);
    n = n.nextSibling;
  }
}

/**
 * Collect the OUTERMOST frame region elements in `node`'s subtree into
 * `regions` (keyed by childId, seeded for adoption). A region is opaque — its
 * own deeper regions belong to its occurrences, discovered when they claim —
 * so the walk stops descending at each region element. Client wrapper
 * elements around a region are descended through.
 */
function collectRegionElements(node, regions) {
  if (node.nodeType !== ELEMENT_NODE) return;
  if (isFrameElement(node)) {
    const childId = node.getAttribute(FRAME_ID_ATTR);
    if (childId && !regions.has(childId)) {
      regions.set(childId, { childId, element: node, frame: undefined, adopt: true });
    }
    return;
  }
  for (let c = node.firstChild; c; c = c.nextSibling) collectRegionElements(c, regions);
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

// --- Morph -----------------------------------------------------------------
//
// A zero-allocation, two-cursor server-owned DOM patch path: text/attribute
// updates, child insertion/removal, and preservation of two protected marker
// kinds — fragment placeholder ranges and slot ranges. It walks the
// live children and the freshly parsed source in lockstep instead of building
// intermediate token/result arrays, so the common "server churn around client
// anchors" case stays competitive with hand-written morphers.
//
// Slot ranges are opaque protected units: their interior is never
// diffed, and a range already in the right position is never touched — which
// is what preserves focus/selection/media inside it. Placeholder templates
// morph as ordinary elements (their fallback lives in .content, which child
// reconciliation never descends into).

/** If `node` is a `slot:<id>:start` comment, return its id; else `null`. */
function slotStartId(node) {
  if (node.nodeType !== COMMENT_NODE) return null;
  const m = SLOT_START.exec(node.data);
  return m ? m[1] : null;
}

/** Whether `node` is any slot marker (start or end). */
function isSlotMarker(node) {
  if (node.nodeType !== COMMENT_NODE) return false;
  const data = node.data;
  return SLOT_START.test(data) || SLOT_END.test(data);
}

function compatible(a, b) {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType === ELEMENT_NODE) return a.nodeName === b.nodeName;
  return a.nodeType === TEXT_NODE || a.nodeType === COMMENT_NODE;
}

// Live-state the server can't know: `open` on <details>/<dialog> IS the
// user's toggle (unlike form value/checked, which are PROPERTIES that
// decouple from their attributes after input, so an attribute-only morph
// already leaves them alone). The morph makes attributes match server output
// exactly, which would reset a user-opened <details> on every navigation —
// so `open` is preserved: never removed, never set by the morph. A server
// that must force it can rebuild the boundary (a genuine teardown), not a
// morph. Popover/dialog "showing" is not an attribute (JS API), so nothing
// to guard there.
function preservesOpen(el) {
  const t = el.tagName;
  return t === "DETAILS" || t === "DIALOG";
}

function morphAttributes(oldEl, newEl, claim) {
  let reclaim = false;
  let changed = false;
  const keepOpen = preservesOpen(oldEl);
  const oldAttrs = oldEl.attributes;
  for (let i = oldAttrs.length - 1; i >= 0; i--) {
    const name = oldAttrs[i].name;
    if (keepOpen && name === "open") continue;
    if (!newEl.hasAttribute(name)) {
      oldEl.removeAttribute(name);
      changed = true;
      reclaim ||= claimedAttr(name);
    }
  }
  const newAttrs = newEl.attributes;
  for (let i = 0; i < newAttrs.length; i++) {
    const attr = newAttrs[i];
    if (keepOpen && attr.name === "open") continue;
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
    // Escape hatch (the claim contract's analogue): an element the author
    // marks `data-preserve` keeps its live attributes AND subtree untouched
    // by the morph — for server DOM that a third-party widget has taken over
    // (a rich editor, a chart) or any state the deny-list above can't name.
    // The element stays matched in position; only its interior is frozen.
    if (oldNode.hasAttribute("data-preserve")) return;
    morphAttributes(oldNode, newNode, claim);
    reconcileChildren(oldNode, newNode, null, null, claim);
  } else if (oldNode.data !== newNode.data) {
    oldNode.data = newNode.data;
  }
}

/** The sibling immediately after the `slot:<id>:end` marker for `start`. */
function afterRange(start, id) {
  const end = slotEnd(id);
  let n = start.nextSibling;
  while (n) {
    if (n.nodeType === COMMENT_NODE && n.data === end) return n.nextSibling;
    n = n.nextSibling;
  }
  return null;
}

/**
 * Dev-only range integrity check: a slot start marker whose end marker is not
 * a later sibling means the range was corrupted between the producer and
 * here. `afterRange` returning null is ambiguous (an end marker that IS the
 * last sibling also has no `nextSibling`), so this re-scans for the marker
 * itself and reports the two known corruption causes loudly instead of
 * letting collection silently truncate at the broken range.
 */
function devCheckRange(start, id) {
  if (!"_DX_DEV_") return;
  const end = slotEnd(id);
  let n = start.nextSibling;
  while (n) {
    if (n.nodeType === COMMENT_NODE && n.data === end) return;
    n = n.nextSibling;
  }
  console.error(
    `Frame slot range "${id}" is missing its end marker (<!--${end}-->) among its start ` +
      `marker's siblings. Slots after it in this content cannot be discovered. Likely causes: ` +
      `invalid HTML nesting split the range during parsing (e.g. a block element inside <p>), ` +
      `or an HTML-rewriting layer (CDN/minifier/translator) removed or moved the comment — ` +
      `serve frame documents with Cache-Control: no-transform.`,
    start
  );
}

/** The sibling after the `slot:<id>:end` marker in the incoming source. */
function skipRange(start, id) {
  return afterRange(start, id);
}

/** Find a `slot:<id>:start` comment among siblings in `[from, bound)`. */
function findRangeStart(from, id, bound) {
  const target = `slot:${id}:start`;
  let n = from;
  while (n && n !== bound) {
    if (n.nodeType === COMMENT_NODE && n.data === target) return n;
    n = n.nextSibling;
  }
  return null;
}

/** Move the range `[start .. slot:<id>:end]` to before `ref` within `parent`. */
function moveRangeBefore(parent, start, id, ref) {
  const end = slotEnd(id);
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
 * Move an incoming slot range from the source into `parent` before
 * `ref`, returning the source cursor just past the range's end marker.
 */
function adoptRange(parent, start, id, ref, claim) {
  const end = slotEnd(id);
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
    const pid = slotStartId(newChild);
    // Treat reaching the upper bound as "no more old nodes".
    const old = oldChild === boundEnd ? null : oldChild;

    if (pid !== null) {
      if (old && slotStartId(old) === pid) {
        // Same slot already here: preserve its live interior untouched
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
          // New slot: adopt the server-sent placeholder range as-is.
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
    if (isSlotMarker(old)) {
      // Old slot anchor: flow new server content in front of it without
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
    // slot-range interiors, which belong to the client).
    if (newChild.nodeType === 1) {
      let ahead = old.nextSibling;
      while (ahead && ahead !== boundEnd && !compatible(ahead, newChild)) {
        const aheadPid = slotStartId(ahead);
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
