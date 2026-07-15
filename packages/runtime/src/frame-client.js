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
      return { ":error": chunk.error };
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
      frames.set(id, frame);
      const buffered = pending.get(id);
      if (buffered) {
        pending.delete(id);
        for (const chunk of buffered) deliver(frame, chunk);
      }
    },
    /** Remove a frame and drop any chunks still buffered for its id. */
    unregister(id) {
      frames.delete(id);
      pending.delete(id);
    },
    apply(chunk) {
      // Data payloads are response-scoped; apply immediately, no frame needed.
      if (chunk.type === "data") {
        options.applyData && options.applyData(chunk);
        return;
      }
      const frame = frames.get(chunk.id);
      if (frame) {
        deliver(frame, chunk);
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
      return frames.get(id);
    },
    serialize(value) {
      if (!options.serialize) throw new Error("host has no serializer");
      return options.serialize(value);
    },
    resolve(ref) {
      return options.resolve ? options.resolve(ref) : undefined;
    }
  };
}

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
  #disposed = false;
  // Stable identity so a pending stylesheet holds at most one waiter per
  // frame across repeated readiness checks.
  #styleFlush = () => {
    if (!this.#disposed) this.#flush();
  };

  constructor(element, start, end, options = {}) {
    this.#element = element;
    this.#start = start;
    this.#end = end;
    this.#options = options;
    this.#slots = options.slots;
    // Adopt: the boundary already holds server-rendered content, so the first
    // root apply morphs against it rather than materializing from scratch.
    if (options.adopt) this.#hasContent = true;
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
      // and reveal state are kept so the reconciler morphs server content
      // while client-owned slots/regions and their state survive (e.g. across
      // a client-side navigation). Stale discard is the `v < version` branch;
      // a genuine teardown is `dispose()`.
      this.#version = v;
    }

    Object.assign(this.#store, write.r);
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
      this.#options.onApply?.({ version, reason });
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
          this.#options.onApply?.({ version, reason: "reveal" });
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
          this.#options.onApply?.({ version, reason: "reveal" });
          progressed = true;
        }
      }
    }

    this.#syncSlots();
  }

  /** Resolve a slot callback by prop: this frame's slots, then ancestors'. */
  #resolveSlot(prop) {
    return this.#slots?.[prop] ?? this.#options.resolveSlot?.(prop);
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
      const record = this.#store[`slot:${occurrence}`];
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
        this.#mountedSlots.add(occurrence);
        this.#bindRegions(occurrence);
      } else if (record !== this.#slotArgs.get(occurrence)) {
        // Args changed (incl. late args): re-call this occurrence only,
        // reusing its cached server-content regions. Same contract: an
        // undefined return keeps the current interior.
        const nodes = this.#invokeSlot(occurrence, callback, record, start);
        if (nodes) this.#replaceRange(occurrence, start, nodes);
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
        props[key] = host ? host.resolve(value) : undefined;
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
          resolveSlot: prop => this.#resolveSlot(prop)
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
    if (host && id !== undefined) host.unregister(id);
  }

  #applyRoot(html) {
    const fragment = parseFragment(html);
    const parent = this.#parent();
    if (!this.#hasContent) {
      this.#clearContent();
      parent.insertBefore(fragment, this.#end);
      this.#hasContent = true;
    } else {
      reconcileChildren(parent, fragment, this.#start, this.#end);
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
    parent.insertBefore(this.#materialize(content), closing);
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
    closing.parentNode.insertBefore(tpl.content.cloneNode(true), closing);
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
    if (n.nodeType === ELEMENT_NODE) collectSlots(n, out);
    n = n.nextSibling;
  }
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

function morphAttributes(oldEl, newEl) {
  const oldAttrs = oldEl.attributes;
  for (let i = oldAttrs.length - 1; i >= 0; i--) {
    const name = oldAttrs[i].name;
    if (!newEl.hasAttribute(name)) oldEl.removeAttribute(name);
  }
  const newAttrs = newEl.attributes;
  for (let i = 0; i < newAttrs.length; i++) {
    const attr = newAttrs[i];
    if (oldEl.getAttribute(attr.name) !== attr.value) oldEl.setAttribute(attr.name, attr.value);
  }
}

/** Morph `oldNode` in place to match `newNode` (assumed `compatible`). */
function morphNode(oldNode, newNode) {
  if (oldNode.nodeType === ELEMENT_NODE) {
    morphAttributes(oldNode, newNode);
    reconcileChildren(oldNode, newNode);
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
function adoptRange(parent, start, id, ref) {
  const end = projectionEnd(id);
  let n = start;
  let after = null;
  while (n) {
    const next = n.nextSibling;
    const isEnd = n.nodeType === COMMENT_NODE && n.data === end;
    parent.insertBefore(n, ref);
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
function reconcileChildren(parent, source, boundStart = null, boundEnd = null) {
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
          newChild = adoptRange(parent, newChild, pid, old ?? boundEnd);
        }
      }
      continue;
    }

    if (!old) {
      parent.insertBefore(newChild, boundEnd);
      newChild = nextNew;
      continue;
    }
    if (isProjectionMarker(old)) {
      // Old projection anchor: flow new server content in front of it without
      // disturbing the client-owned range.
      parent.insertBefore(newChild, old);
      newChild = nextNew;
      continue;
    }
    if (compatible(old, newChild)) {
      morphNode(old, newChild);
      oldChild = old.nextSibling;
      newChild = nextNew;
      continue;
    }
    // Incompatible: place the new node and leave the old one for later
    // matching or removal.
    parent.insertBefore(newChild, old);
    newChild = nextNew;
  }

  while (oldChild && oldChild !== boundEnd) {
    const next = oldChild.nextSibling;
    parent.removeChild(oldChild);
    oldChild = next;
  }
}
