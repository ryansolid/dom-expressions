import { ChildProperties } from "./constants";
import { sharedConfig, root, ssrHandleError, getOwner, runWithOwner } from "rxcore";
import { createHydrationSerializer, getLocalHeaderScript } from "./serializer";
import {
  HEAD_ELIGIBLE_TAGS,
  HEAD_ATTR_NAME,
  classifyHeadTag,
  evalHeadProps,
  evalHeadValue,
  resourceIdentity,
  replaceableIdentity,
  resolveHead,
  STYLESHEET_FETCH_META
} from "./head.js";

// `mergeProps` comes from the framework like the client/universal entries —
// prop-merge semantics (function sources, precedence) belong to the reactive
// core, and a local copy here drifts from them (it resolved function sources
// for key enumeration only, dropping their values in SSR output).
export { createComponent, effect, memo, untrack, mergeProps } from "rxcore";
// Hole owner scope (`_$scope(...)` in compiled ssr output) — owner-creating
// wrapper for deferred child holes that can allocate hydration ids. The
// framework owns the implementation (owner creation + per-attempt reset).
export { ssrScope as scope } from "rxcore";
export { getOwner };

export {
  DOMWithState,
  ChildProperties,
  DOMElements,
  SVGElements,
  MathMLElements,
  VoidElements,
  RawTextElements,
  Namespaces,
  DelegatedEvents
} from "./constants.js";

// ---- Asset Manifest ----

// Join defensively rather than trusting the manifest's shape: dev manifests
// have answered `_base` with non-strings and emitted `file` values with a
// leading slash (solidjs/solid#2817 layers 1-2). Normalizing here keeps the
// emitted URLs sane for any reasonable manifest instead of playing contract
// ping-pong with bundler plugins.
function joinAssetPath(base, file) {
  // absolute (`https://cdn/x.js`) and protocol-relative (`//cdn/x.js`) pass through
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(file)) return file;
  if (typeof base !== "string" || !base) base = "/";
  if (base[base.length - 1] !== "/") base += "/";
  return base + (file[0] === "/" ? file.slice(1) : file);
}

function resolveAssets(moduleUrl, manifest) {
  if (!manifest) return null;
  const base = manifest._base;
  const entry = manifest[moduleUrl];
  if (!entry) return null;
  const css = [];
  const js = [];
  const visited = new Set();
  const walk = key => {
    if (visited.has(key)) return;
    visited.add(key);
    const e = manifest[key];
    if (!e) return;
    js.push(joinAssetPath(base, e.file));
    if (e.css) for (let i = 0; i < e.css.length; i++) css.push(joinAssetPath(base, e.css[i]));
    if (e.imports) for (let i = 0; i < e.imports.length; i++) walk(e.imports[i]);
  };
  walk(moduleUrl);
  return { js, css };
}

function registerEntryAssets(manifest) {
  // Resolver manifests can't be enumerated for entries; consumers that want
  // SSR'd entry assets resolve their entry key themselves.
  if (!manifest || typeof manifest === "function" || typeof manifest.resolve === "function") return;
  const ctx = sharedConfig.context;
  if (!ctx?.registerAsset) return;
  for (const key in manifest) {
    if (manifest[key].isEntry) {
      const assets = resolveAssets(key, manifest);
      if (assets) {
        for (let i = 0; i < assets.css.length; i++) ctx.registerAsset("style", assets.css[i]);
      }
      return;
    }
  }
}

// ---- Asset Tracking ----

function createAssetTracking() {
  const boundaryModules = new Map();
  const boundaryStyles = new Map();
  const emittedAssets = new Set();
  const inlineStyles = new Map();
  let currentBoundaryId = null;
  return {
    boundaryModules,
    boundaryStyles,
    emittedAssets,
    inlineStyles,
    // Inline styles (dev CSS collected from the module graph, critical CSS)
    // dedupe by `id` — repeated registrations reuse the same entry object so
    // boundary Sets and the head injection never emit the same style twice.
    registerInlineStyle(desc) {
      let entry = inlineStyles.get(desc.id);
      if (!entry) {
        entry = { id: desc.id, content: desc.content || "", attrs: desc.attrs, emitted: false };
        inlineStyles.set(desc.id, entry);
      }
      if (currentBoundaryId) {
        let styles = boundaryStyles.get(currentBoundaryId);
        if (!styles) {
          styles = new Set();
          boundaryStyles.set(currentBoundaryId, styles);
        }
        styles.add(entry);
      }
      return entry;
    },
    get currentBoundaryId() {
      return currentBoundaryId;
    },
    set currentBoundaryId(v) {
      currentBoundaryId = v;
    },
    // `key` is opaque to the runtime — the reactive library's server-side
    // lazy() picks it (e.g. a hydration id) and its client-side counterpart
    // looks preloaded modules up under the same key after loadModuleAssets.
    registerModule(key, entryUrl) {
      const id = currentBoundaryId || "";
      let map = boundaryModules.get(id);
      if (!map) {
        map = {};
        boundaryModules.set(id, map);
      }
      map[key] = entryUrl;
    },
    getBoundaryModules(id) {
      return boundaryModules.get(id) || null;
    },
    getBoundaryStyles(id) {
      return boundaryStyles.get(id) || null;
    }
  };
}

// Manifest contract guard. When `context.resolveAssets` answers null/undefined
// or with no client js entries for a module the render asked about,
// server-side lazy() has nothing to file into the hydration asset map
// (`registerModule` is never reached on a miss), the client cannot preload
// the module, and hydration fails far from the cause with a cryptic
// `lazy() module "…" was not preloaded before hydration` error. The
// resolution seam is the one choke point every consumer (solid's lazy,
// frames) passes through and the only place the miss is still observable —
// recording/serialization never sees the module at all. The warning is
// unconditional (the server bundle has no dev build variant, and an
// unanswered lookup for a rendered module is never benign in a hydrating
// render). Known scoping:
// - `noScripts` renders ship no hydration data (nothing can break), so the
//   caller skips the guard entirely.
// - `resolveAssetsSync` stays unguarded: sync probes (a lazy component's
//   `moduleUrl` getter) legitimately probe modules that may not resolve and
//   have graceful fallbacks.
// - A NoHydration/islands zone could one day legitimately resolve modules
//   absent from the client manifest (nothing hydrates there), but that scope
//   is invisible at this seam and no supported integration produces it today
//   (dev resolvers always answer; islands remain experimental). Revisit if
//   that changes.
function warnUnresolvedModuleAssets(moduleUrl, warned) {
  if (warned.has(moduleUrl)) return;
  warned.add(moduleUrl);
  console.error(
    `Asset manifest returned no client assets for module "${moduleUrl}". ` +
      "If this module is a server-rendered lazy() component, its entry will be missing from " +
      "the serialized hydration asset map, the client will be unable to preload it, and " +
      "hydration will fail with 'lazy() module \"…\" was not preloaded before hydration'. " +
      "This means the integration's asset resolver (dev manifest bridge or build client " +
      "manifest) failed to answer for this module — check the integration's server logs, " +
      "restart the dev server, or verify the module is included in the client build."
  );
}

function guardResolvedAssets(moduleUrl, result, warned) {
  if (result && typeof result.then === "function") {
    return result.then(assets => {
      if (!assets || !assets.js || !assets.js.length) warnUnresolvedModuleAssets(moduleUrl, warned);
      return assets;
    });
  }
  if (!result || !result.js || !result.js.length) warnUnresolvedModuleAssets(moduleUrl, warned);
  return result;
}

function applyAssetTracking(context, tracking, manifest, noScripts) {
  // Deduped per render: one warning per module, however many times it renders.
  const warned = new Set();
  const guard = noScripts
    ? resolve => resolve
    : resolve => moduleUrl => guardResolvedAssets(moduleUrl, resolve(moduleUrl), warned);
  Object.defineProperty(context, "_currentBoundaryId", {
    get() {
      return tracking.currentBoundaryId;
    },
    set(v) {
      tracking.currentBoundaryId = v;
    },
    configurable: true,
    enumerable: true
  });
  context.registerModule = tracking.registerModule;
  context.getBoundaryModules = tracking.getBoundaryModules;
  // A manifest can be the static object produced by a build (sync lookups,
  // entry enumeration) or a resolver — the primitive a dev server implements
  // against its live module graph: `{ resolve, resolveSync? }`, where
  // `resolve` may return a promise and may resolve css entries to
  // inline-style descriptors instead of URLs, and `resolveSync` answers with
  // what is knowable without async work (for sync consumers like a lazy
  // component's moduleUrl getter). A bare function is accepted as shorthand
  // for `{ resolve }`. Callers (the reactive library's lazy()) handle both
  // result shapes. Static manifests are sync by nature, so both context
  // paths point at the same lookup.
  if (typeof manifest === "function") {
    context.resolveAssets = guard(manifest);
  } else if (manifest && typeof manifest.resolve === "function") {
    context.resolveAssets = guard(key => manifest.resolve(key));
    if (typeof manifest.resolveSync === "function") {
      context.resolveAssetsSync = key => manifest.resolveSync(key);
    }
  } else if (manifest) {
    const resolve = moduleUrl => resolveAssets(moduleUrl, manifest);
    context.resolveAssets = guard(resolve);
    context.resolveAssetsSync = resolve;
  }
}

// ---- Head Management (useHead) ----
//
// Server half of the head registry (design: docs/head-management-rfc.md).
// Replaceable tags are recorded at registration and evaluated at the flush of
// their nearest enclosing flush boundary — the shell, or the owning suspense
// fragment (attributed via the same `_currentBoundaryId` seam as boundary
// asset tracking). Resource-class tags (preload/preconnect/… links,
// `script[src]`) evaluate immediately and stream eagerly: their value is
// earliness, so holding them for their boundary's flush would defeat them.

// Stylesheet-vs-module classification for tracked asset URLs. Dev servers
// commonly serve CSS with cache-busting queries (`/src/foo.css?t=…`), so the
// suffix test runs against the path portion only.
function isCssUrl(url) {
  const q = url.search(/[?#]/);
  return (q === -1 ? url : url.slice(0, q)).endsWith(".css");
}

function createHeadRegistry() {
  return {
    pending: [], // { boundary, tags: [raw descriptor (+ peeked link rel)] }
    committed: [], // { seq, tags: [{ tag, props, identity }] } in commit order
    seq: 0,
    uniq: 0,
    resources: new Set(), // resource identities already emitted
    eagerHtml: "", // pre-shell resource markup, joined into the shell head
    flushed: null, // Map<identity, signature> — post-shell resolution snapshot
    shellFlushed: false
  };
}

// Registration entry point (context.registerHeadTags). `emitResource` is the
// post-shell eager write channel (null in renderToString, where everything is
// pre-shell by construction).
function registerHeadTags(registry, context, tracking, emitResource, nonce, tags) {
  const boundary = context._currentBoundaryId || "";
  let replaceable = null;
  for (let i = 0; i < tags.length; i++) {
    const desc = tags[i];
    if (!desc || !HEAD_ELIGIBLE_TAGS.has(desc.tag)) {
      if ("_DX_DEV_") console.warn(`useHead: ignoring non-head tag`, desc);
      continue;
    }
    const cls = classifyHeadTag(desc);
    if (cls.resource) {
      emitHeadResource(registry, context, tracking, emitResource, nonce, desc, cls.rel);
    } else {
      (replaceable || (replaceable = [])).push(
        cls.rel !== undefined
          ? { tag: desc.tag, props: desc.props, key: desc.key, rel: cls.rel }
          : desc
      );
    }
  }
  if (replaceable) registry.pending.push({ boundary, tags: replaceable });
}

// Resource-class tag: evaluate now, dedupe by full resource identity, emit at
// the next flush opportunity. Plain stylesheet/modulepreload links (rel+href
// only) route through `registerAsset` so they share one identity set with
// manifest-driven asset emission — a user-authored preload must never
// duplicate a manifest link — and, for stylesheets, participate in the
// style-gated fragment reveal like tracked boundary CSS.
//
// Other stylesheets split by what their extra attributes mean: fetch metadata
// (crossorigin, integrity, …) doesn't change render-criticality, so those
// sheets — and plain sheets whose URL fails the `.css` suffix test the
// tracked path needs — carry their attributes through the boundary style set
// and gate fragment reveal like tracked CSS. Condition-changing attributes
// (media, alternate, disabled) take the ungated eager path: gating a reveal
// on a sheet that may never apply would block content on a low-priority
// fetch. Non-stylesheet resources (hints, scripts) always emit eagerly.
function emitHeadResource(registry, context, tracking, emitResource, nonce, desc, rel) {
  let props;
  try {
    props = evalHeadProps(desc.props || {}, rel !== undefined ? { rel } : undefined);
  } catch (err) {
    if ("_DX_DEV_") console.warn(`useHead: error evaluating resource tag props`, err);
    return;
  }
  const identity = resourceIdentity(desc.tag, props);
  if (registry.resources.has(identity)) return;
  registry.resources.add(identity);
  if (desc.tag === "link" && (rel === "stylesheet" || rel === "modulepreload")) {
    let plain = true;
    let gateable = rel === "stylesheet";
    for (const name in props) {
      if (name === "rel" || name === "href") continue;
      plain = false;
      if (!STYLESHEET_FETCH_META.has(name)) gateable = false;
    }
    // The asset-tracking emitters decide stylesheet-vs-modulepreload by the
    // `.css` suffix, so only suffix-conforming URLs can ride that path.
    if (plain && props.href != null) {
      const isCss = isCssUrl(props.href);
      if (rel === "stylesheet" ? isCss : !isCss) {
        context.registerAsset(rel === "stylesheet" ? "style" : "module", props.href);
        return;
      }
    }
    if (gateable && props.href != null) {
      const attrHtml = renderHeadAttrHtml(props);
      // `attrs` is the wire/DOM form (frame sink chunks, client adoption);
      // `attrHtml` is the pre-escaped document-sink form. `attrHtml` also
      // discriminates this shape from inline-style entries in the boundary
      // style set.
      const entry = { href: props.href, attrHtml, attrs: headAttrRecord(props, true) };
      if (tracking.currentBoundaryId) {
        let styles = tracking.boundaryStyles.get(tracking.currentBoundaryId);
        if (!styles) tracking.boundaryStyles.set(tracking.currentBoundaryId, (styles = new Set()));
        styles.add(entry);
      }
      const markup = `<link${attrHtml}>`;
      if (emitResource) emitResource(markup, entry);
      else {
        registry.eagerHtml += markup;
        entry.emitted = true;
      }
      return;
    }
  }
  const url = props.href || props.src;
  if (url != null && tracking.emittedAssets.has(url)) return;
  const markup = renderHeadTagMarkup(desc.tag, props, null, nonce);
  if (emitResource) emitResource(markup);
  else registry.eagerHtml += markup;
}

// Moves pending registrations for `boundary` into the committed list,
// evaluating props getters exactly once (this is the evaluation-timing
// contract: a deferred getter's collection window is its boundary's render).
// The shell ("" with an `isPendingFragment` probe) commits everything that
// does not belong to a still-pending fragment — including registrations from
// boundaries that resolved before first flush and inlined into the shell.
function commitHeadBoundary(registry, boundary, isPendingFragment) {
  const keep = [];
  const groups = [];
  for (let i = 0; i < registry.pending.length; i++) {
    const reg = registry.pending[i];
    const mine =
      boundary === ""
        ? !(isPendingFragment && reg.boundary !== "" && isPendingFragment(reg.boundary))
        : reg.boundary === boundary;
    if (!mine) {
      keep.push(reg);
      continue;
    }
    const tags = [];
    for (let j = 0; j < reg.tags.length; j++) {
      const desc = reg.tags[j];
      let props, key;
      try {
        props = evalHeadProps(
          desc.props || {},
          desc.rel !== undefined ? { rel: desc.rel } : undefined
        );
        key = evalHeadValue(desc.key);
      } catch (err) {
        if ("_DX_DEV_") console.warn(`useHead: error evaluating tag props`, err);
        continue;
      }
      const identity = replaceableIdentity(desc.tag, props, key, "u:" + registry.uniq++);
      if ((identity === "base" || identity === "charset") && registry.shellFlushed) {
        // Shell-only: a charset that changes mid-stream or a base that
        // changes after relative URLs resolved is incoherent by definition.
        if ("_DX_DEV_")
          console.warn(
            `useHead: <${desc.tag}> (${identity}) registered after shell flush is ignored`
          );
        continue;
      }
      tags.push({ tag: desc.tag, props, identity });
    }
    if (tags.length) groups.push({ seq: registry.seq++, tags });
  }
  registry.pending = keep;
  for (let i = 0; i < groups.length; i++) registry.committed.push(groups[i]);
  return groups;
}

// Reassigns a resolved child fragment's pending registrations to the parent
// that absorbed its payload (waitForFragments), so they evaluate and commit
// at the parent's flush — the nearest boundary that actually flushes.
function adoptHeadBoundary(registry, childKey, parentKey) {
  for (let i = 0; i < registry.pending.length; i++) {
    if (registry.pending[i].boundary === childKey) registry.pending[i].boundary = parentKey;
  }
}

// An errored fragment reveals no content; retitling the document for it
// would be wrong, so its registrations are dropped.
function dropHeadBoundary(registry, boundary) {
  registry.pending = registry.pending.filter(reg => reg.boundary !== boundary);
}

function headGroupSignature(winner) {
  let sig = "" + winner.seq;
  for (let i = 0; i < winner.tags.length; i++) {
    const t = winner.tags[i];
    sig += "|" + t.tag + JSON.stringify(t.props);
  }
  return sig;
}

// Shell flush: commit + resolve + render winning tags to markup. Returns
// `{ prelude, html }` for document assembly — `prelude` (charset/base)
// splices immediately after the `<head>` open tag to satisfy hard placement
// constraints; `html` splices before `</head>`, resources first (earliness),
// then replaceable tags by category: link/style, meta, others, script.
function renderShellHead(registry, nonce, isPendingFragment) {
  commitHeadBoundary(registry, "", isPendingFragment);
  registry.shellFlushed = true;
  const winners = resolveHead(registry.committed);
  registry.flushed = new Map();
  let prelude = "";
  let links = "";
  let metas = "";
  let others = "";
  let scripts = "";
  for (const [identity, winner] of winners) {
    registry.flushed.set(identity, headGroupSignature(winner));
    for (let i = 0; i < winner.tags.length; i++) {
      const t = winner.tags[i];
      const markup = renderHeadTagMarkup(t.tag, t.props, identity, nonce);
      if (identity === "charset" || identity === "base") prelude += markup;
      else if (t.tag === "link" || t.tag === "style") links += markup;
      else if (t.tag === "meta") metas += markup;
      else if (t.tag === "script") scripts += markup;
      else others += markup;
    }
  }
  return { prelude, html: registry.eagerHtml + links + metas + others + scripts };
}

// Fragment flush: commit the boundary's registrations, re-resolve, and diff
// against the flushed snapshot. Returns patch ops (or null) for the client
// `$dh` helper: `["t", text]` retitle, `["r", identity]` remove owned tags,
// `["a", identity, tag, attrs, children]` append. Only identities present in
// the newly committed groups can change (the server never disposes), so the
// diff walks just those.
function flushHeadFragment(registry, boundary) {
  const groups = commitHeadBoundary(registry, boundary);
  if (!groups.length) return null;
  const winners = resolveHead(registry.committed);
  const affected = new Set();
  for (let i = 0; i < groups.length; i++)
    for (let j = 0; j < groups[i].tags.length; j++) affected.add(groups[i].tags[j].identity);
  const ops = [];
  for (const identity of affected) {
    const winner = winners.get(identity);
    const sig = headGroupSignature(winner);
    if (registry.flushed.get(identity) === sig) continue;
    const existed = registry.flushed.has(identity);
    registry.flushed.set(identity, sig);
    if (identity === "title") {
      const children = winner.tags[0].props.children;
      ops.push(["t", children == null ? "" : String(children)]);
      continue;
    }
    if (existed) ops.push(["r", identity]);
    for (let i = 0; i < winner.tags.length; i++) {
      const t = winner.tags[i];
      const attrs = {};
      for (const name in t.props) {
        if (name === "children" || name === "ref" || name.slice(0, 2) === "on") continue;
        if (!HEAD_ATTR_NAME.test(name)) {
          if ("_DX_DEV_") console.warn(`useHead: ignoring invalid attribute name "${name}"`);
          continue;
        }
        const v = t.props[name];
        if (v == null || v === false) continue;
        attrs[name] = v === true ? "" : String(v);
      }
      const children = t.props.children;
      ops.push(["a", identity, t.tag, attrs, children == null ? null : String(children)]);
    }
  }
  return ops.length ? ops : null;
}

function renderHeadAttrHtml(props) {
  let attrs = "";
  for (const name in props) {
    if (name === "children" || name === "ref" || name.slice(0, 2) === "on") continue;
    if (!HEAD_ATTR_NAME.test(name)) {
      if ("_DX_DEV_") console.warn(`useHead: ignoring invalid attribute name "${name}"`);
      continue;
    }
    const v = props[name];
    if (v == null || v === false) continue;
    attrs += v === true ? ` ${name}` : ` ${name}="${escape(String(v), true)}"`;
  }
  return attrs;
}

// Plain name→string record of the same filtered attributes, for consumers
// that apply via setAttribute (frame chunks, client adoption) rather than
// markup. `skipRelHref` drops the attributes implied by the element shape.
function headAttrRecord(props, skipRelHref) {
  let attrs = null;
  for (const name in props) {
    if (name === "children" || name === "ref" || name.slice(0, 2) === "on") continue;
    if (skipRelHref && (name === "rel" || name === "href")) continue;
    if (!HEAD_ATTR_NAME.test(name)) continue;
    const v = props[name];
    if (v == null || v === false) continue;
    (attrs || (attrs = {}))[name] = v === true ? "" : String(v);
  }
  return attrs;
}

function renderHeadTagMarkup(tag, props, identity, nonce) {
  let attrs = renderHeadAttrHtml(props);
  if (identity != null) attrs += ` data-dh="${escape(identity, true)}"`;
  if (nonce && (tag === "script" || tag === "style")) attrs += ` nonce="${nonce}"`;
  if (tag === "meta" || tag === "link" || tag === "base") return `<${tag}${attrs}>`;
  let body = props.children == null ? "" : String(props.children);
  if (tag === "script") body = body.replace(/<\/(script)/gi, "<\\/$1");
  else if (tag === "style") body = escapeStyleContent(body);
  else body = escape(body);
  return `<${tag}${attrs}>${body}</${tag}>`;
}

/**
 * Registers head tags with the render's head registry. Replaceable tags
 * (title/meta/canonical/…) resolve by last-committed group and stream as
 * patches with their suspense boundary's reveal; resource tags (preload,
 * stylesheets, `script[src]`) emit eagerly. See docs/head-management-rfc.md.
 */
export function useHead(tags) {
  const ctx = sharedConfig.context;
  if (!ctx || !ctx.registerHeadTags) {
    if ("_DX_DEV_")
      console.warn("useHead() called outside of a server render; registration ignored.");
    return;
  }
  ctx.registerHeadTags(Array.isArray(tags) ? tags : [tags]);
}

// Based on https://github.com/WebReflection/domtagger/blob/master/esm/sanitizer.js
const VOID_ELEMENTS =
  /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;
// Fragment replacement helpers emitted into stream task scripts.
//
// Mechanics vs. policy: the inline script owns the parse-time MECHANICS only
// — it must work before any runtime loads (streamed content reveals with no
// JS at all). All reveal POLICY (late-arrival holds, boundary claims) lives
// in the hydration runtime: once it installs `_$HY.f`, every $df routes
// through it and the runtime decides when the raw swap ($dfr) runs. One
// owner at any moment, mirroring the `$dh`/`_$HY.h` head-patch handoff.
//
// - $df(id): route to the runtime's fragment policy (`_$HY.f`) when
//   installed, else swap immediately via $dfr. The runtime installs `_$HY.f`
//   before global hydration can complete, so an inline (pre-runtime) $df can
//   never run after `_$HY.done` — the raw path needs no done check.
// - $dfr(id): the raw swap — replace the `pl-*` marker range with the
//   template payload, then announce the reveal as `_$HY.fe(id, parent)` —
//   the parent scopes consumers that need to look at what just landed
//   (server-component boundaries adopt there) to the revealed fragment
//   instead of the document. A marker that isn't in the live DOM yet (it
//   sits inside a flushed-but-unactivated ancestor template held by a reveal
//   group) queues the id in `_$HY.dq` for retry instead of dropping the
//   swap. A missing content template means the swap already ran — that stays
//   a plain no-op and is never queued. The runtime's policy calls back into
//   $dfr for swaps it approves, so the DOM mechanics exist exactly once.
// - $dfl(id): materialize fallback from `pl-*` template content without resolving.
//   Marker misses queue in `_$HY.dlq`, same reasoning as $dfr.
// - $dflj(ids): materialize fallback content for every id in the list.
// - $dfd(): drain both retry queues. Runs after every successful swap or fallback
//   materialization — the only events that can bring queued markers into the live
//   document. Content swaps ($df) drain before fallbacks ($dfl) so a settled
//   fragment wins over its own pending fallback. Each pass snapshots the queue,
//   so still-inert entries simply re-queue and wait for the next swap. Drains
//   route through $df, so queued swaps stay subject to runtime policy.
// - $dfs(id, count, defer): register pending stylesheet count for fragment `id`.
// - $dfc(id): style completion callback; reveals when the fragment/group is unblocked.
// - $dfg(id): group-style gate check; reveals a waiting group once all style counts hit zero.
// - $dfj(ids): reveal a group in registration order, waiting if any member still has pending styles.
const REPLACE_SCRIPT = `function $df(e){return _$HY.f?_$HY.f(e):$dfr(e)}function $dfr(e,n,o,t){if(!(n=document.getElementById(e)))return 0;if(!(o=document.getElementById("pl-"+e)))return(_$HY.dq=_$HY.dq||{})[e]=1,0;for(;o&&(8!==o.nodeType||o.nodeValue!=="pl-"+e);)t=o.nextSibling,o.remove(),o=t;t=o.parentNode,o.replaceWith(n.content),n.remove(),_$HY.fe(e,t),_$HY.hp&&_$HY.hp[e]&&($dh(_$HY.hp[e]),delete _$HY.hp[e]),$dfd();return 1}function $dfl(e,o,n){if(!(o=document.getElementById("pl-"+e)))return(_$HY.dlq=_$HY.dlq||{})[e]=1,0;if(o._$fl)return 1;for(n=o.nextSibling;n;){if(8===n.nodeType&&n.nodeValue==="pl-"+e){o.parentNode&&o.parentNode.insertBefore(o.content.cloneNode(!0),n),o._$fl=1,$dfd();return 1}n=n.nextSibling}return 0}function $dflj(e,i){for(i=0;i<e.length;i++)$dfl(e[i])}function $dfd(e,i){if(e=_$HY.dq){_$HY.dq=0;for(i in e)$df(i)}if(e=_$HY.dlq){_$HY.dlq=0;for(i in e)$dfl(i)}}function $dfs(e,c,d){(_$HY.sc=_$HY.sc||{})[e]=c,d&&((_$HY.sd=_$HY.sd||{})[e]=1)}function $dfg(e,g,i,k){if(!(g=_$HY.sg&&_$HY.sg[e]))return;for(i=0;i<g.length;i++)if(_$HY.sc&&_$HY.sc[g[i]]>0)return;for(i=0;i<g.length;i++)k=g[i],delete _$HY.sg[k],$df(k)}function $dfc(e){if(--_$HY.sc[e]<=0){delete _$HY.sc[e],_$HY.sg&&_$HY.sg[e]?$dfg(e):!(_$HY.sd&&_$HY.sd[e])&&$df(e);_$HY.sd&&delete _$HY.sd[e]}}function $dfj(e,i,n){for(i=0;i<e.length;i++)if(_$HY.sc&&_$HY.sc[e[i]]>0){for(n=0;n<e.length;n++)(_$HY.sg=_$HY.sg||{})[e[n]]=e;return}for(i=0;i<e.length;i++)$df(e[i])}`;

// Head patch runtime, emitted once alongside the first head-patch task:
// - $dha(ops): apply patch ops to document.head — "t" sets the title (and
//   marks the element so the client registry can claim it), "r" removes tags
//   owned by an identity, "a" creates + appends a marked tag. Attribute
//   values apply via setAttribute and bodies via textContent, so nothing in
//   a payload is ever parsed as markup.
// - $dhr(identity): remove owned tags (attribute-compared, no selector
//   escaping — same reasoning as findAssetElement client-side).
// - $dh(ops): route — once the client registry is live it installs _$HY.h
//   and patches flow through it (registry state stays authoritative);
//   before that, ops apply directly. The DOM itself (ownership-marked tags)
//   is the bootstrap state the registry later adopts, so no separate queue
//   is needed.
// Patch application is triggered from $df when the owning fragment reveals
// (see _$HY.hp in REPLACE_SCRIPT), so head updates and content reveal stay
// atomic — including through style gates and deferred reveal groups.
const HEAD_SCRIPT = `function $dha(o,i,e,n){for(i=0;i<o.length;i++)e=o[i],"t"==e[0]?((n=document.querySelector("title"))||(n=document.createElement("title"),document.head.appendChild(n)),n.textContent=e[1],n.setAttribute("data-dh","title")):"r"==e[0]?$dhr(e[1]):(n=document.createElement(e[2]),Object.keys(e[3]).forEach(function(a){n.setAttribute(a,e[3][a])}),null!=e[4]&&(n.textContent=e[4]),n.setAttribute("data-dh",e[1]),document.head.appendChild(n))}function $dhr(v,l,i){for(l=document.head.querySelectorAll("[data-dh]"),i=0;i<l.length;i++)l[i].getAttribute("data-dh")==v&&l[i].remove()}function $dh(o){_$HY.h?_$HY.h(o):$dha(o)}`;

export function renderToString(code, options = {}) {
  const { renderId = "", nonce, noScripts, manifest, onHead } = options;
  let scripts = "";
  const serializer = createHydrationSerializer({
    scopeId: renderId,
    plugins: options.plugins,
    onData(script) {
      if (noScripts) return;
      if (!scripts) {
        scripts = getLocalHeaderScript(renderId);
      }
      scripts += script + ";";
    },
    onError: options.onError
  });
  const tracking = createAssetTracking();
  const headRegistry = createHeadRegistry();
  sharedConfig.context = {
    assets: [],
    nonce,
    escape: escape,
    resolve: resolveSSRNode,
    ssr: ssr,
    registerHeadTags(tags) {
      // Sync render: everything is pre-shell, resources join the shell head.
      registerHeadTags(headRegistry, sharedConfig.context, tracking, null, nonce, tags);
    },
    serialize(id, p) {
      if (sharedConfig.context.noHydrate) return;
      if (
        p != null &&
        typeof p === "object" &&
        (typeof p.then === "function" || typeof p[Symbol.asyncIterator] === "function")
      ) {
        throw new Error(
          "Cannot serialize async value in renderToString (id: " +
            id +
            "). " +
            "Use renderToStream for async data."
        );
      }
      serializer.write(id, p);
    },
    registerAsset(type, value) {
      if (type === "inline-style") {
        tracking.registerInlineStyle(value);
        return;
      }
      if (tracking.currentBoundaryId && type === "style") {
        let styles = tracking.boundaryStyles.get(tracking.currentBoundaryId);
        if (!styles) {
          styles = new Set();
          tracking.boundaryStyles.set(tracking.currentBoundaryId, styles);
        }
        styles.add(value);
      }
      tracking.emittedAssets.add(value);
    }
  };
  applyAssetTracking(sharedConfig.context, tracking, manifest, noScripts);
  registerEntryAssets(manifest);
  let html = root(
    d => {
      setTimeout(d);
      return resolveSSRSync(escape(code()));
    },
    { id: renderId }
  );
  serializeFragmentAssets("", tracking.boundaryModules, sharedConfig.context);
  sharedConfig.context.noHydrate = true;
  serializer.close();
  // Asset closures evaluate unconditionally (they can have side effects), even
  // when there is no `</head>` for their output to land in.
  const assetsHtml = resolveAssetsHtml(sharedConfig.context.assets);
  const head = renderShellHead(headRegistry, nonce, null);
  return assembleDocument(
    html,
    assetsHtml,
    tracking.emittedAssets,
    tracking.inlineStyles,
    scripts.length ? scripts : "",
    nonce,
    head,
    onHead
  );
}

export function renderToStream(code, options = {}) {
  let {
    nonce,
    onCompleteShell,
    onCompleteAll,
    renderId = "",
    noScripts,
    manifest,
    onHead
  } = options;
  let dispose;
  const blockingPromises = new Set();
  let headerEmitted = false;
  const pushTask = task => {
    if (noScripts) return;
    if (!headerEmitted) {
      headerEmitted = true;
      tasks += getLocalHeaderScript(renderId);
    }
    tasks += task + ";";
    if (!timer && firstFlushed) {
      // Microtask (not timer) batching: tasks emitted in the same resolution
      // burst still coalesce into one <script>, without a macrotask of
      // latency between a fragment's template and its activation.
      timer = true;
      queue(() => queue(writeTasks));
    }
  };
  const onDone = () => {
    writeTasks();
    doShell();
    onCompleteAll &&
      onCompleteAll({
        write(v) {
          !completed && buffer.write(v);
        }
      });
    writable && writable.end();
    completed = true;
    if (firstFlushed) dispose();
  };
  // FrameSink seam (design in frame-sink.js): semantic emission routes through
  // a sink so the same render core can drive either document output (default)
  // or a transport-agnostic frame-chunk stream. Methods close over stream
  // state, so the document sink is assembled here rather than by a standalone
  // factory. `options.sink` overrides individual methods (experimental —
  // surface grows as seams extract; unlisted emission still writes document
  // output directly).
  const sink = {
    // One serialized data record: a Seroval script addressing one or more ids
    // (ids are embedded in the payload, not addressable here). Document
    // behavior: accumulate as a task, flush inside a <script>.
    data(payload) {
      pushTask(payload);
    },
    // An async fragment resolved post-shell with its normalized HTML payload.
    // Document behavior: <template id=key> plus, when the fragment carries
    // streamed style links, a $dfs gate and onload-$dfc stylesheet links
    // (inline styles apply as the parser sees them — no gating); eager
    // (ungrouped, link-free) fragments self-activate with $df. Grouped
    // fragments defer to reveal().
    fragment(key, value, meta) {
      const deferActivation = !!meta.revealGroup;
      const styles = meta.styles;
      for (let i = 0; i < styles.inline.length; i++) {
        buffer.write(renderInlineStyle(styles.inline[i], nonce));
      }
      if (styles.links.length) {
        emitTask(`$dfs("${key}",${styles.links.length},${deferActivation ? 1 : 0})`);
        // Flush the $dfs gate before the links so their onload can't fire
        // ahead of the pending-style registration.
        writeTasks();
        for (const entry of styles.links) {
          buffer.write(
            typeof entry === "string"
              ? `<link rel="stylesheet" href="${entry}" onload="$dfc('${key}')" onerror="$dfc('${key}')">`
              : `<link${entry.attrHtml} onload="$dfc('${key}')" onerror="$dfc('${key}')">`
          );
        }
        buffer.write(`<template id="${key}">${value}</template>`);
      } else {
        buffer.write(`<template id="${key}">${value}</template>`);
        if (!deferActivation) {
          emitTask(`$df("${key}")`);
        }
      }
    },
    // Reveal a set of fragments (registration order). Document behavior:
    // $dfj task, or $dflj to materialize fallback content instead.
    reveal(keys, meta) {
      emitTask(`${meta.fallback ? "$dflj" : "$dfj"}(${JSON.stringify(keys)})`);
    },
    // A late-registered asset while streaming. Document behavior: style links
    // are handled per-fragment (see fragment()); modules preload immediately;
    // non-boundary inline styles write their <style> tag directly. Head
    // resource tags (useHead preload/preconnect/script[src]) arrive as
    // already-rendered markup and write through eagerly.
    asset(type, value) {
      if (type === "module") {
        buffer.write(`<link rel="modulepreload" href="${value}">`);
      } else if (type === "inline-style") {
        buffer.write(renderInlineStyle(value, nonce));
      } else if (type === "head-tag") {
        buffer.write(value);
      }
    },
    // The resolved shell. `meta.assets` is the already-evaluated useAssets
    // HTML (evaluation is core work — asset closures can serialize data, which
    // must land in `meta.tasks`). Document behavior: head/script string
    // surgery — assets and preload links spliced before </head>, accumulated
    // tasks spliced at the <!--xs--> marker — then one write. Injection order
    // (assets, preloads, scripts) is part of the byte-exact document output.
    // `onHead` fires synchronously inside assembly, before the shell chunk is
    // written — the host receives its head content before any body output it
    // could flush.
    shell(shellHtml, meta) {
      buffer.write(
        assembleDocument(
          shellHtml,
          meta.assets,
          meta.preloads,
          meta.inlineStyles,
          meta.tasks.length ? meta.tasks : "",
          nonce,
          meta.head,
          onHead
        )
      );
    },
    ...options.sink
  };
  // Serializer seam (companion to the sink seam): `options.serializer` is a
  // factory with the hydration serializer's contract — `write(id, value)` +
  // `flush()`, completion via onDone once everything pending settles. What
  // flows through onData is a contract between the serializer and the sink
  // (hydration scripts for the document sink, keyed codec records for the
  // frame sink); the core never inspects it.
  const serializer = (options.serializer || createHydrationSerializer)({
    scopeId: options.renderId,
    plugins: options.plugins,
    onData: payload => sink.data(payload),
    onDone,
    onError: options.onError
  });
  let rootAssetsSerialized = false;
  const serializeRootAssets = () => {
    if (rootAssetsSerialized) return;
    rootAssetsSerialized = true;
    // Ensure the root boundary's module map is written to the serializer
    // before it flushes. A Loading boundary's resolve path can queue flushEnd
    // while the shell is still pending (cascading root holes), which would
    // otherwise call serializer.flush() before doShell() writes root _assets.
    // Seroval silently drops writes after flush, so the root module mapping
    // would be lost and lazy hydration would fail for root-level lazy modules.
    serializeFragmentAssets("", tracking.boundaryModules, context);
  };
  const flushEnd = () => {
    if (!registry.size) {
      serializeRootAssets();
      queue(() => queue(() => serializer.flush())); // double queue because of elsewhere
    }
  };
  const registry = new Map();
  const writeTasks = () => {
    if (tasks.length && !completed && firstFlushed) {
      buffer.write(`<script${nonce ? ` nonce="${nonce}"` : ""}>${tasks}</script>`);
      tasks = "";
    }
    timer = null;
  };

  let context;
  let writable;
  let tmp = "";
  let tasks = "";
  let firstFlushed = false;
  let completed = false;
  let shellCompleted = false;
  let scriptFlushed = false;
  let headStyles;
  const revealGroups = new Map();
  let timer = null;
  const emitTask = task => {
    pushTask(`${task}${!scriptFlushed ? ";" + REPLACE_SCRIPT : ""}`);
    scriptFlushed = true;
  };
  function resolveRevealKeys(groupOrKeys, release, consume) {
    if (Array.isArray(groupOrKeys)) return groupOrKeys.slice();
    let group = revealGroups.get(groupOrKeys);
    if (!group) {
      if (!release) return;
      group = { order: [], keys: new Set(), released: true };
      revealGroups.set(groupOrKeys, group);
    } else if (release) group.released = true;
    if (!group.order.length) return;
    const keys = group.order.slice();
    if (consume) revealGroups.delete(groupOrKeys);
    return keys;
  }
  let rootHoles = null;
  let nextHoleId = 0;
  let buffer = {
    write(payload) {
      tmp += payload;
    }
  };
  const tracking = createAssetTracking();
  const headRegistry = createHeadRegistry();
  let headScriptFlushed = false;
  // Head patch ops park on `_$HY.hp[key]` and apply when the owning
  // fragment's `$df` reveal fires, so head updates stay atomic with content
  // reveal — through style gates and reveal groups alike. `emitTask` (not a
  // bare pushTask) because the ops are useless without $df's hook.
  const emitHeadOps = (key, ops) => {
    const payload = JSON.stringify(ops).replace(/</g, "\\u003C");
    emitTask(
      `${!headScriptFlushed ? HEAD_SCRIPT : ""}(_$HY.hp=_$HY.hp||{})[${JSON.stringify(key)}]=${payload}`
    );
    headScriptFlushed = true;
  };

  sharedConfig.context = context = {
    async: true,
    assets: [],
    nonce,
    registerHeadTags(tags) {
      registerHeadTags(
        headRegistry,
        context,
        tracking,
        // Resource-class tags stream eagerly: before first flush they join
        // the shell head; afterwards they write straight into the stream.
        // Gate entries (reveal-gated stylesheets) emitted into the shell are
        // marked so their fragment flush skips them; post-shell they stay
        // parked on the boundary's style set and flush load-gated with the
        // fragment instead of writing here.
        (markup, gateEntry) => {
          if (!firstFlushed) {
            headRegistry.eagerHtml += markup;
            if (gateEntry) gateEntry.emitted = true;
          } else if (!gateEntry || !tracking.currentBoundaryId) {
            sink.asset("head-tag", markup);
          }
        },
        nonce,
        tags
      );
    },
    registerAsset(type, value) {
      if (type === "inline-style") {
        const entry = tracking.registerInlineStyle(value);
        // Boundary-attributed inline styles flush with their fragment; a late
        // registration outside any boundary has no other emission point, so
        // emit it immediately.
        if (firstFlushed && !tracking.currentBoundaryId && !entry.emitted) {
          entry.emitted = true;
          sink.asset("inline-style", entry);
        }
        return;
      }
      if (tracking.currentBoundaryId && type === "style") {
        let styles = tracking.boundaryStyles.get(tracking.currentBoundaryId);
        if (!styles) {
          styles = new Set();
          tracking.boundaryStyles.set(tracking.currentBoundaryId, styles);
        }
        styles.add(value);
      }
      if (!tracking.emittedAssets.has(value)) {
        tracking.emittedAssets.add(value);
        if (firstFlushed) sink.asset(type, value);
      }
    },
    block(p) {
      if (!firstFlushed) blockingPromises.add(p);
    },
    replace(id, payloadFn) {
      if (firstFlushed) return;
      const placeholder = `<!--!$${id}-->`;
      const first = html.indexOf(placeholder);
      if (first === -1) return;
      const last = html.indexOf(`<!--!$/${id}-->`, first + placeholder.length);
      html =
        html.slice(0, first) +
        resolveSSRSync(escape(payloadFn())) +
        html.slice(last + placeholder.length + 1);
    },
    serialize(id, p, deferStream) {
      if (sharedConfig.context.noHydrate) return;
      if (!firstFlushed && deferStream && typeof p === "object" && "then" in p) {
        blockingPromises.add(p);
        p.then(d => serializer.write(id, d)).catch(e => serializer.write(id, e));
      } else serializer.write(id, p);
    },
    escape: escape,
    resolve: resolveSSRNode,
    ssr: ssr,
    registerFragment(key, options) {
      const revealGroup = options && options.revealGroup;
      if (revealGroup) {
        let group = revealGroups.get(revealGroup);
        if (!group) {
          group = { order: [], keys: new Set(), released: false };
          revealGroups.set(revealGroup, group);
        }
        if (!group.keys.has(key)) {
          group.keys.add(key);
          group.order.push(key);
        }
        if (group.released) {
          throw new Error(
            "registerFragment() for reveal group '" +
              revealGroup +
              "' was called after revealFragments(). Ensure template payload is emitted before grouped reveal."
          );
        }
      }
      if (!registry.has(key)) {
        let resolve, reject;
        const p = new Promise((r, rej) => ((resolve = r), (reject = rej)));
        // double queue to ensure that the fragment is last but in same flush
        registry.set(key, {
          resolve: err =>
            queue(() =>
              queue(() => {
                err ? reject(err) : resolve(true);
                queue(flushEnd);
              })
            )
        });
        serializer.write(key + "_fr", p);
      }
      return (value, error) => {
        if (registry.has(key)) {
          const item = registry.get(key);
          registry.delete(key);

          if (item.children) {
            for (const k in item.children) {
              value = replacePlaceholder(value, k, item.children[k]);
            }
          }

          const parentKey = waitForFragments(registry, key);
          if (parentKey) {
            const parent = registry.get(parentKey);
            parent.children ||= {};
            parent.children[key] = value !== undefined ? value : "";
            serializeFragmentAssets(key, tracking.boundaryModules, context);
            propagateBoundaryStyles(key, parentKey, tracking);
            // The parent is the boundary that actually flushes; head
            // registrations evaluate and commit there.
            adoptHeadBoundary(headRegistry, key, parentKey);
            item.resolve();
            return;
          }
          if (!completed) {
            if (error) dropHeadBoundary(headRegistry, key);
            if (!firstFlushed) {
              // Head registrations stay pending: a boundary that inlines into
              // the shell commits with the shell flush (its key is no longer
              // a pending fragment, so renderShellHead picks them up).
              queue(() => (html = replacePlaceholder(html, key, value !== undefined ? value : "")));
              serializeFragmentAssets(key, tracking.boundaryModules, context);
              item.resolve(error);
            } else {
              serializeFragmentAssets(key, tracking.boundaryModules, context);
              const styles = collectStreamStyles(key, tracking, headStyles);
              // Evaluate + commit + diff this boundary's head registrations
              // now (collection window closed), parking ops for the
              // fragment's $df so head update and reveal stay atomic. Must
              // precede sink.fragment so the ops land in the same task batch
              // as (and before) the activation call.
              const headOps = error ? null : flushHeadFragment(headRegistry, key);
              if (headOps) emitHeadOps(key, headOps);
              // The error rides the sink call: the document sink ignores it
              // (its protocol rejects `<key>_fr` via item.resolve below), but
              // transport sinks with no resume protocol need the signal.
              sink.fragment(key, value !== undefined ? value : " ", { styles, revealGroup, error });
              item.resolve(error);
            }
          }
        }
        return firstFlushed;
      };
    },
    revealFragments(groupOrKeys) {
      // Group reveal follows fragment registration order so visibility order
      // cannot be changed by resolve timing.
      const keys = resolveRevealKeys(groupOrKeys, true, true);
      if (!keys) return;
      sink.reveal(keys, { fallback: false });
    },
    revealFallbacks(groupOrKeys) {
      const keys = resolveRevealKeys(groupOrKeys, false, false);
      if (!keys) return;
      sink.reveal(keys, { fallback: true });
    }
  };
  applyAssetTracking(context, tracking, manifest, noScripts);
  registerEntryAssets(manifest);

  let html = root(
    d => {
      dispose = d;
      const res = resolveSSRNode(escape(code()));
      if (!res.h.length) return res.t[0];
      rootHoles = [];
      let out = res.t[0];
      for (let i = 0; i < res.h.length; i++) {
        const id = nextHoleId++;
        rootHoles.push({ id, fn: res.h[i] });
        out += `<!--rh${id}-->` + res.t[i + 1];
      }
      for (const p of res.p) blockingPromises.add(p);
      return out;
    },
    { id: renderId }
  );
  // Re-pull pending root holes, splicing sync results into `html` and
  // re-queueing still-async ones (their retry promises join
  // `blockingPromises`). Returns true once no holes remain.
  function resolveRootHoles() {
    if (!rootHoles) return true;
    const pending = [];
    for (const { id, fn } of rootHoles) {
      const marker = `<!--rh${id}-->`;
      const res = resolveSSRNode(fn);
      if (!res.h.length) {
        html = html.replace(marker, res.t[0]);
      } else {
        let out = res.t[0];
        for (let j = 0; j < res.h.length; j++) {
          const newId = nextHoleId++;
          pending.push({ id: newId, fn: res.h[j] });
          out += `<!--rh${newId}-->` + res.t[j + 1];
        }
        html = html.replace(marker, out);
        for (const p of res.p) blockingPromises.add(p);
      }
    }
    if (pending.length) {
      rootHoles = pending;
      return false;
    }
    rootHoles = null;
    return true;
  }
  function doShell() {
    if (shellCompleted) return;
    if (!resolveRootHoles()) return;
    sharedConfig.context = context;
    // Asset closures run before anything reads `tasks`: they can serialize
    // data (via sink.data → tasks), which the shell snapshot must include.
    const assetsHtml = resolveAssetsHtml(context.assets);
    headStyles = new Set();
    for (const url of tracking.emittedAssets) {
      if (isCssUrl(url)) headStyles.add(url);
    }
    // Same constraint: root _assets serialization feeds sink.data → tasks.
    serializeRootAssets();
    // Shell head flush: commits every registration not owned by a
    // still-pending fragment (those flush with their fragment later).
    const head = renderShellHead(headRegistry, nonce, k => registry.has(k));
    sink.shell(html, {
      assets: assetsHtml,
      preloads: tracking.emittedAssets,
      inlineStyles: tracking.inlineStyles,
      tasks,
      head
    });
    tasks = "";
    onCompleteShell &&
      onCompleteShell({
        write(v) {
          !completed && buffer.write(v);
        }
      });
    shellCompleted = true;
  }
  // Flush attempts run on microtasks — never paying a macrotask of
  // first-byte latency — with two guards:
  //
  // 1. Registry drain: an already-settled async read (cached data,
  //    Promise.resolve) completes its whole retry chain in microtasks, so
  //    before flushing we keep yielding double-microtask turns while the
  //    pending-fragment registry is still shrinking. That preserves the
  //    "near-instant async inlines into the shell with no fallback flash"
  //    behavior, while genuinely-pending I/O leaves the registry stable and
  //    the shell flushes immediately.
  // 2. Timer fallback for the no-progress retry: a root hole whose promise
  //    has settled but that still cannot complete is waiting on some other
  //    macrotask, and a microtask-only loop would starve it. Progress is
  //    detected as growth of the (append-only) blocking set — new async
  //    means the next allSettled genuinely waits, yielding the event loop.
  // An already-settled read completes its retry chain in a handful of
  // microtask turns (promise .then → scheduler flush → recompute → fragment
  // resolve, itself double-queued). Grant at least that many turns — total
  // cost is nanoseconds — and keep extending while fragments are actually
  // completing (registry churn), so nested settled boundaries drain fully.
  const MIN_DRAIN_TURNS = 8;
  let lastBlockingSize = -1;
  let lastRegistrySize = -1;
  let drainTurn = 0;
  const scheduleFlush = fn => {
    const attempt = () => {
      if (registry.size !== lastRegistrySize || drainTurn++ < MIN_DRAIN_TURNS) {
        if (registry.size !== lastRegistrySize) drainTurn = 0;
        lastRegistrySize = registry.size;
        queue(attempt);
        return;
      }
      fn();
    };
    const progressed = blockingPromises.size !== lastBlockingSize;
    lastBlockingSize = blockingPromises.size;
    lastRegistrySize = -1;
    drainTurn = 0;
    progressed ? queue(attempt) : setTimeout(attempt);
  };
  let cachedReadable;
  // Which consumer has claimed the render. `pipe`/`pipeTo` hand the render
  // to a sink and `readable` builds one internally — mixing them would
  // silently split (and corrupt) the output, so the conflict throws instead.
  let consumer;
  const claimConsumer = name => {
    if (consumer && consumer !== name) {
      throw new Error(
        `renderToStream result was already consumed via \`${consumer}\`; cannot also consume it via \`${name}\`. Use exactly one of \`pipe\`, \`pipeTo\`, or \`readable\`.`
      );
    }
    consumer = name;
  };
  const pipeToImpl = w => {
    let resolve;
    const p = new Promise(r => (resolve = r));
    function flush() {
      allSettled(blockingPromises).then(() => {
        scheduleFlush(() => {
          doShell();
          if (!shellCompleted) return flush();
          const encoder = new TextEncoder();
          const writer = w.getWriter();
          // Writes are chained and awaited before the lock is released.
          // `writer.write()` returns a promise, and releasing the lock (or
          // closing) with one still in flight leaves that chunk's fate up to
          // the host's stream implementation — Node queues it anyway, workerd
          // drops it. The chunk at risk is the last one written, which for a
          // streamed boundary is its `_fr` resolution; losing that leaves the
          // client's boundary waiting on a promise that never resolves.
          let pendingWrites = Promise.resolve();
          writable = {
            end() {
              pendingWrites.then(() => {
                writer.releaseLock();
                w.close().catch(() => {});
                resolve();
              });
            }
          };
          buffer = {
            write(payload) {
              pendingWrites = pendingWrites
                .then(() => writer.write(encoder.encode(payload)))
                .catch(() => {});
            }
          };
          buffer.write(tmp);
          firstFlushed = true;
          if (completed) {
            dispose();
            writable.end();
          } else flushEnd();
        });
      });
    }
    flush();
    return p;
  };
  return {
    then(fn) {
      function complete() {
        dispose();
        fn(tmp);
      }
      if (onCompleteAll) {
        let ogComplete = onCompleteAll;
        onCompleteAll = options => {
          ogComplete(options);
          complete();
        };
      } else onCompleteAll = complete;
      function flush() {
        allSettled(blockingPromises).then(() => {
          scheduleFlush(() => {
            if (!resolveRootHoles()) return flush();
            queue(flushEnd);
          });
        });
      }
      flush();
    },
    pipe(w) {
      claimConsumer("pipe");
      function flush() {
        allSettled(blockingPromises).then(() => {
          scheduleFlush(() => {
            doShell();
            if (!shellCompleted) return flush();
            buffer = writable = w;
            buffer.write(tmp);
            firstFlushed = true;
            if (completed) {
              dispose();
              writable.end();
            } else flushEnd();
          });
        });
      }
      flush();
    },
    pipeTo(w) {
      claimConsumer("pipeTo");
      return pipeToImpl(w);
    },
    get readable() {
      claimConsumer("readable");
      if (!cachedReadable) {
        const t = new TransformStream();
        // Deliberately NOT awaited: the pipe settles only after the whole
        // render has been written, and nothing drains the readable side
        // until it is handed back — awaiting before returning would
        // deadlock. The pipe already encodes chunks (TextEncoder), so the
        // readable side yields Uint8Array bytes, Response-body ready.
        pipeToImpl(t.writable);
        cachedReadable = t.readable;
      }
      return cachedReadable;
    }
  };
}

// components
export function HydrationScript(props) {
  const { nonce } = sharedConfig.context;
  return ssr(generateHydrationScript({ nonce, ...props }));
}

// Compiler-emitted: tags `fn` so `ssr()` routes it through the grouped
// fast-path. One grouped fn per element collapses N attribute/textContent
// closures into one array-returning call.
export function ssrGroup(fn, n) {
  fn.$g = n;
  return fn;
}

// Cold-path NotReady catch + owner-capture wrap, shared by every site
// that escalates a sync throw to a streaming retry slot. Returns
// `{ fn, p }` on `NotReadyError` (with `fn` bound to the original owner
// so retries see the same id counter / contexts) or `null` for
// non-NotReady errors so callers can fall back to their contribute-
// nothing path.
function buildAsyncWrap(err, node) {
  const p = ssrHandleError(err);
  if (!p) return null;
  const owner = getOwner();
  return { fn: owner ? () => runWithOwner(owner, node) : node, p };
}

// Cold-path helper for the first hit of a group. Isolates `try/catch`
// from the hot `ssr()` loop. Returns the value array on sync success,
// `{ fn, p }` on `NotReadyError` escalation, or `null` for non-NotReady
// errors (matches `tryResolveString`'s "" path).
function ssrFirstGroupHit(hole) {
  try {
    return hole();
  } catch (err) {
    return buildAsyncWrap(err, hole);
  }
}

function tryResolveFunctionHole(hole) {
  let value;
  try {
    value = hole();
  } catch (err) {
    return buildAsyncWrap(err, hole) || "";
  }
  const t = typeof value;
  if (t === "string") return value;
  if (t === "number") return "" + value;
  if (value == null || t === "boolean") return "";
  return tryResolveString(value);
}

// Cold-path: splice a nested `{ t, h, p }` template into `result` at
// its current last segment. Used when `tryResolveString` walks into a
// template object that itself carries async holes.
function mergeTemplateInto(result, node) {
  result.t[result.t.length - 1] += node.t[0];
  if (node.t.length > 1) {
    result.t.push(...node.t.slice(1));
    result.h.push(...node.h);
    result.p.push(...node.p);
  }
}

function appendResolvedNode(result, node) {
  if (node.fn !== undefined) {
    result.h.push(node.fn);
    result.p.push(node.p);
    result.t.push("");
  } else if (node.merge !== undefined) mergeTemplateInto(result, node.merge);
  else resolveSSRNode(node.bail, result);
}

// Module-scoped cache for grouped retry slots. Slots fire contiguously
// in queue order, so slot 0 evaluates `fn` once and caches `arr`
// (success) or `err` (NotReady) on the module slots; slots `1..N-1`
// short-circuit on `_lastGroupFn === fn`. Cache invalidates on a
// different fn (next group) or when slot 0 re-fires (next retry pass
// for the same group). Net: 1 evaluation per group per pass.
let _lastGroupFn = null;
let _lastGroupArr = null;
let _lastGroupErr = null;

function ssrGroupSlot(fn, idx) {
  return () => {
    if (idx > 0 && _lastGroupFn === fn) {
      if (_lastGroupArr !== null) return _lastGroupArr[idx];
      throw _lastGroupErr;
    }
    _lastGroupFn = fn;
    _lastGroupArr = null;
    _lastGroupErr = null;
    try {
      _lastGroupArr = fn();
      return _lastGroupArr[idx];
    } catch (err) {
      _lastGroupErr = err;
      throw err;
    }
  };
}

// rendering
export function ssr(t) {
  // Inlined hole resolution — uses `arguments` instead of a `(t, ...nodes)`
  // rest parameter to avoid the per-call holes-array allocation. Inline
  // string/number/null/bool fast paths skip `tryResolveString` entirely
  // for the typical "all-static-after-eval" hole shape; only the heavy
  // path (async escalation) materializes the `{ t, h, p }` result shape.
  //
  // Group fast-path (`hole.$g` set by compiler `_$ssrGroup`): one call
  // returns an array of values for >=N hole positions. The check is at
  // the END of the typeof chain so non-function holes don't pay for it.
  const len = arguments.length;
  if (len === 1) return { t };
  let s = t[0];
  let result = null;
  let lastGroup = null;
  // Array on sync success, `{ fn, p }` on escalation, null otherwise.
  let lastGroupVal = null;
  let lastGroupIdx = 0;
  for (let i = 1; i < len; i++) {
    const hole = arguments[i];
    const ht = typeof hole;
    if (ht === "string") {
      if (result === null) s += hole;
      else result.t[result.t.length - 1] += hole;
    } else if (ht === "number") {
      if (result === null) s += hole;
      else result.t[result.t.length - 1] += hole;
    } else if (hole == null || ht === "boolean") {
      // skip
    } else if (ht === "function" && hole.$g) {
      let value;
      let hasValue = false;
      if (lastGroup !== hole) {
        const r = ssrFirstGroupHit(hole);
        if (r !== null) {
          lastGroup = hole;
          lastGroupVal = r;
          lastGroupIdx = 0;
          if (!Array.isArray(r) && result === null) {
            result = { t: [s], h: [], p: [] };
            s = "";
          }
        }
        // r === null: non-NotReady error, contribute nothing — matches
        // the `return ""` path in `tryResolveString`.
      }
      if (lastGroup === hole) {
        if (Array.isArray(lastGroupVal)) {
          value = lastGroupVal[lastGroupIdx++];
          hasValue = true;
        } else {
          result.h.push(ssrGroupSlot(lastGroupVal.fn, lastGroupIdx++));
          result.p.push(lastGroupVal.p);
          result.t.push("");
        }
      }
      if (hasValue) {
        // Type dispatch on the dequeued value. textContent expressions
        // (e.g., `_$escape(item().title)`) can return arrays when the
        // input is an array, so we cannot assume strings here.
        const vt = typeof value;
        if (vt === "string" || vt === "number") {
          if (result === null) s += value;
          else result.t[result.t.length - 1] += value;
        } else if (value == null || vt === "boolean") {
          // skip
        } else if (result !== null) {
          resolveSSRNode(value, result);
        } else {
          const rs = tryResolveString(value);
          if (typeof rs === "string") {
            s += rs;
          } else {
            result = { t: [s], h: [], p: [] };
            s = "";
            if (rs.merge !== undefined) mergeTemplateInto(result, rs.merge);
            else resolveSSRNode(rs.bail, result);
          }
        }
      }
    } else if (result !== null) {
      resolveSSRNode(hole, result);
    } else if (ht === "function") {
      const r = tryResolveFunctionHole(hole);
      if (typeof r === "string") s += r;
      else {
        result = { t: [s], h: [], p: [] };
        s = "";
        appendResolvedNode(result, r);
      }
    } else {
      const r = tryResolveString(hole);
      if (typeof r === "string") {
        s += r;
      } else {
        // Escalation: allocate the heavy `{ t, h, p }` result shape and
        // splice in the sync prefix we accumulated.
        result = { t: [s], h: [], p: [] };
        s = "";
        appendResolvedNode(result, r);
      }
    }
    const next = t[i];
    if (result === null) s += next;
    else result.t[result.t.length - 1] += next;
  }
  if (result === null) return { t: s };
  return result;
}

export function ssrClassName(value) {
  if (!value) return "";
  if (typeof value === "string") return escape(value, true);
  value = classListToObject(value);
  let classKeys = Object.keys(value),
    result = "";
  for (let i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key];
    if (!key || key === "undefined" || !classValue) continue;
    i && (result += " ");
    // Object keys land inside class="..." so they must be attribute-escaped.
    result += escape(key, true);
  }
  return result;
}

export function ssrStyle(value) {
  if (!value) return "";
  if (typeof value === "string") return escape(value, true);

  let result = "";
  const k = Object.keys(value);
  for (let i = 0; i < k.length; i++) {
    // Object keys land inside style="..." so they must be attribute-escaped
    // to prevent breaking out via `"`.
    const s = escape(k[i], true);
    const v = value[k[i]];
    if (v != undefined) {
      if (i) result += ";";
      const r = escape(v, true);
      if (r != undefined && r !== "undefined") {
        result += `${s}:${r}`;
      }
    }
  }
  return result;
}

export function ssrStyleProperty(name, value) {
  // Compiler contract: for literal-key `style={{ color: v }}` the compiler
  // passes a fixed string like `"color:"`; for computed-key
  // `style={{ [k]: v }}` the compiler wraps the key with `_$escape(k, true)`
  // before concatenating the `:` suffix. Either way `name` is safe to splice
  // into style="..." without further escaping.
  return value != null ? name + value : "";
}

// review with new ssr
export function ssrElement(tag, props, children, needsId) {
  // The hydration key must be allocated before the props thunk runs: dynamic
  // props (`mergeProps(() => ...)`) create a memo, which consumes a child id.
  // The client claims the element (getNextElement) before applying the spread,
  // so the server must allocate in the same order or the element's own id
  // shifts by one and it is left unclaimed on hydration.
  const hk = needsId ? ssrHydrationKey() : "";
  if (props == null) props = {};
  else if (typeof props === "function") props = props();
  const skipChildren = VOID_ELEMENTS.test(tag);
  const keys = Object.keys(props);
  let result = `<${tag}${hk} `;
  for (let i = 0; i < keys.length; i++) {
    const prop = keys[i];
    if (ChildProperties.has(prop)) {
      if (children === undefined && !skipChildren)
        children =
          tag === "script" || tag === "style" || prop === "innerHTML"
            ? props[prop]
            : escape(props[prop]);
      continue;
    }
    const value = props[prop];
    if (prop === "style") {
      result += `style="${ssrStyle(value)}"`;
    } else if (prop === "class") {
      result += `class="${ssrClassName(value)}"`;
    } else if (
      value == undefined ||
      prop === "ref" ||
      prop.slice(0, 2) === "on" ||
      prop.slice(0, 5) === "prop:"
    ) {
      continue;
    } else if (typeof value === "boolean") {
      if (!value) continue;
      result += escape(prop);
    } else {
      result += value === "" ? escape(prop) : `${escape(prop)}="${escape(value, true)}"`;
    }
    if (i !== keys.length - 1) result += " ";
  }

  if (skipChildren) return { t: result + "/>" };
  if (typeof children === "function") children = children();
  return ssr([result + ">", `</${tag}>`], resolveSSRNode(children, undefined, true));
}

export function ssrAttribute(key, value) {
  // Compiler contract: `key` is always a compile-time string literal emitted
  // from a JSX attribute name (see setAttr in babel-plugin/src/ssr/element.js)
  // which can never contain `"`, `<`, `&`, or `>`. `value` is already
  // attribute-escaped by the compiler via `_$escape(..., true)`. Both are
  // trusted here so this hot path stays a pure string concatenation.
  return value == null || value === false ? "" : value === true ? ` ${key}` : ` ${key}="${value}"`;
}

export function ssrHydrationKey() {
  const hk = getHydrationKey();
  return hk ? ` _hk=${hk}` : "";
}

export function escape(s, attr) {
  const t = typeof s;
  if (t !== "string") {
    if (!attr && Array.isArray(s)) {
      const joined = tryJoinPlainSSRArray(s);
      if (joined !== undefined) return joined;
      s = s.slice(); // avoids double escaping - https://github.com/ryansolid/dom-expressions/issues/393
      for (let i = 0; i < s.length; i++) s[i] = escape(s[i]);
      return s;
    }
    if (attr) {
      // Nullish and boolean values pass through so callers can omit the
      // attribute or emit it as a boolean attribute. Numbers can never
      // contain `&` or `"`. Everything else (arrays, objects, symbols)
      // would be stringified by the surrounding template literal anyway,
      // so coerce to the final string here first — matching what the
      // client DOM receives — and run it through the normal string path.
      if (s == null || t === "boolean" || t === "number") return s;
      return escape(String(s), attr);
    }
    return s;
  }
  // Fast path: one native regex scan. Most values (color names, ids, prop
  // strings, plain text) contain none of `&`, `<` / `"`, so we bail without
  // allocating; V8's regex scan is ~30x faster than a JS char loop on long
  // text runs (the dominant SSR payload). Slow path resumes from the first
  // hit so the clean prefix is never re-scanned.
  const i = s.search(attr ? ESCAPE_ATTR : ESCAPE_CONTENT);
  if (i < 0) return s;
  return escapeSlow(s, attr, i);
}

const ESCAPE_CONTENT = /[&<]/;
const ESCAPE_ATTR = /[&"]/;

// Slow path: at least one of `&`, `<`/`"` was found at position `start`.
// Kept separate so `escape()` stays small and inlinable in the hot path.
function escapeSlow(s, attr, start) {
  const delim = attr ? '"' : "<";
  const delimCode = attr ? 34 : 60;
  const escDelim = attr ? "&quot;" : "&lt;";
  // Seed iDelim/iAmp from the first hit we already found, so we don't
  // re-scan the prefix we just proved is clean.
  const c0 = s.charCodeAt(start);
  let iDelim = c0 === delimCode ? start : s.indexOf(delim, start);
  let iAmp = c0 === 38 ? start : s.indexOf("&", start);

  let left = 0,
    out = "";

  while (iDelim >= 0 && iAmp >= 0) {
    if (iDelim < iAmp) {
      if (left < iDelim) out += s.substring(left, iDelim);
      out += escDelim;
      left = iDelim + 1;
      iDelim = s.indexOf(delim, left);
    } else {
      if (left < iAmp) out += s.substring(left, iAmp);
      out += "&amp;";
      left = iAmp + 1;
      iAmp = s.indexOf("&", left);
    }
  }

  if (iDelim >= 0) {
    do {
      if (left < iDelim) out += s.substring(left, iDelim);
      out += escDelim;
      left = iDelim + 1;
      iDelim = s.indexOf(delim, left);
    } while (iDelim >= 0);
  } else
    while (iAmp >= 0) {
      if (left < iAmp) out += s.substring(left, iAmp);
      out += "&amp;";
      left = iAmp + 1;
      iAmp = s.indexOf("&", left);
    }

  return left < s.length ? out + s.substring(left) : out;
}

function tryJoinPlainSSRArray(nodes) {
  if (nodes.length === 0) return undefined;
  let out = "";
  for (let i = 0, len = nodes.length; i < len; i++) {
    const node = nodes[i];
    if (node == null || typeof node !== "object" || node.h || typeof node.t !== "string") {
      return undefined;
    }
    out += node.t;
  }
  return out;
}

export function getHydrationKey() {
  const hydrate = sharedConfig.context;
  return hydrate && sharedConfig.getNextContextId();
}

export function applyRef(r, element) {
  Array.isArray(r) ? r.flat(Infinity).forEach(f => f && f(element)) : r(element);
}

export function useAssets(fn) {
  sharedConfig.context.assets.push(() => resolveSSRSync(escape(fn())));
}

export function getAssets() {
  const assets = sharedConfig.context.assets;
  let out = "";
  for (let i = 0, len = assets.length; i < len; i++) out += assets[i]();
  return out;
}

// consider deprecating
export function Assets(props) {
  useAssets(() => props.children);
}

export function generateHydrationScript({ eventNames = ["click", "input"], nonce } = {}) {
  return `<script${
    nonce ? ` nonce="${nonce}"` : ""
  }>window._$HY||(e=>{let t=e=>e&&e.hasAttribute&&(e.hasAttribute("_hk")?e:t(e.host&&e.host.nodeType?e.host:e.parentNode));["${eventNames.join(
    '","'
  )}"].forEach((o=>document.addEventListener(o,(o=>{if(!e.events)return;let s=t(o.composedPath&&o.composedPath()[0]||o.target);s&&!e.completed.has(s)&&e.events.push([s,o])}))))})(_$HY={events:[],completed:new WeakSet,r:{},fe(){}});</script><!--xs-->`;
}

function queue(fn) {
  return Promise.resolve().then(fn);
}

function allSettled(promises) {
  let size = promises.size;
  return Promise.allSettled(promises).then(() => {
    if (promises.size !== size) return allSettled(promises);
    return;
  });
}

function resolveAssetsHtml(assets) {
  if (!assets || !assets.length) return "";
  let out = "";
  for (let i = 0, len = assets.length; i < len; i++) out += assets[i]();
  return out;
}

// Single-pass document assembly. This replaced four sequential inject passes
// (assets, preload links, inline styles, scripts), each of which searched for
// its anchor and rebuilt the whole document — four full copies of the shell,
// or of a 400KB SSR body. Head content is concatenated once and spliced with
// the script tag in one construction. Order is preserved exactly: assets,
// preload links, inline styles before `</head>`; accumulated tasks at the
// `<!--xs-->` marker, appended when the marker is absent. Inline-style entries
// are only marked emitted when something renders them — a `</head>` splice or
// an `onHead` delivery.
//
// Scans stay strictly demand-driven, which the old passes got for free from
// their early returns and a single pass has to reproduce deliberately: a
// missing-needle indexOf flattens the string and walks every character, so on a
// 400KB body one stray scan costs more than the render's own string work
// (measured ~0.75ms). An anchor is only searched for when there is content that
// needs it, keeping a body-only render a pure pass-through.
//
// `onHead` is the embedded-render contract (host owns the document): when the
// output contains no `</head>`, everything head-bound is delivered to the
// callback as one string — prelude first — instead of being dropped, and the
// output passes through with only the script splice. When the output does
// contain `</head>`, splicing is automatic and `onHead` is not called: one
// mode or the other, decided by the render output itself.
function assembleDocument(
  html,
  assetsHtml,
  emittedAssets,
  inlineStyles,
  scripts,
  nonce,
  headTags,
  onHead
) {
  const scriptTag = scripts ? `<script${nonce ? ` nonce="${nonce}"` : ""}>${scripts}</script>` : "";
  const headTagsHtml = headTags ? headTags.html : "";
  const headPrelude = headTags ? headTags.prelude : "";
  if (
    !onHead &&
    !assetsHtml &&
    !headTagsHtml &&
    !headPrelude &&
    !(emittedAssets && emittedAssets.size) &&
    !(inlineStyles && inlineStyles.size)
  ) {
    // Nothing head-bound: never look for `</head>`. Body-only renders (no
    // assets, no preloads, no inline styles) stay a pure pass-through.
    // (An `onHead` caller opted into the scan — it must learn which mode
    // this render is in even when there is nothing to deliver.)
    if (!scriptTag) return html;
    const xs = html.indexOf("<!--xs-->");
    return xs === -1 ? html + scriptTag : html.slice(0, xs) + scriptTag + html.slice(xs);
  }
  // The prelude (charset/base) splices right after the `<head>` open tag —
  // before any content the existing `</head>` splice could produce — so it is
  // applied first, shifting `</head>` but nothing this function has indexed.
  if (headPrelude) {
    const open = html.match(/<head(?:\s[^>]*)?>/);
    if (open) {
      const at = open.index + open[0].length;
      html = html.slice(0, at) + headPrelude + html.slice(at);
    }
  }
  const headIdx = html.indexOf("</head>");
  if (headIdx === -1) {
    if (onHead) {
      // Embedded mode: hand the host everything it would have received via
      // the `</head>` splice, prelude first (its placement constraints are
      // the host template's responsibility from here).
      onHead(
        headPrelude +
          headTagsHtml +
          (assetsHtml || "") +
          renderHeadAssets(emittedAssets, inlineStyles, nonce)
      );
    }
    // No head to splice into: without `onHead`, assets/preloads/styles are
    // dropped and left unemitted, exactly as the individual helpers'
    // `index === -1` returns did.
    if (!scriptTag) return html;
    const xs = html.indexOf("<!--xs-->");
    return xs === -1 ? html + scriptTag : html.slice(0, xs) + scriptTag + html.slice(xs);
  }
  const head =
    headTagsHtml + (assetsHtml || "") + renderHeadAssets(emittedAssets, inlineStyles, nonce);
  if (!scriptTag) return html.slice(0, headIdx) + head + html.slice(headIdx);
  const xsIdx = html.indexOf("<!--xs-->");
  if (xsIdx === -1) return html.slice(0, headIdx) + head + html.slice(headIdx) + scriptTag;
  return xsIdx < headIdx
    ? html.slice(0, xsIdx) + scriptTag + html.slice(xsIdx, headIdx) + head + html.slice(headIdx)
    : html.slice(0, headIdx) + head + html.slice(headIdx, xsIdx) + scriptTag + html.slice(xsIdx);
}

// Tracked asset links (stylesheet/modulepreload by URL) and unconsumed inline
// styles, rendered for a head splice or an `onHead` delivery. Inline-style
// entries are consumed (marked emitted) by whichever path renders them first.
function renderHeadAssets(emittedAssets, inlineStyles, nonce) {
  let head = "";
  if (emittedAssets && emittedAssets.size) {
    for (const url of emittedAssets) {
      head += isCssUrl(url)
        ? `<link rel="stylesheet" href="${url}">`
        : `<link rel="modulepreload" href="${url}">`;
    }
  }
  if (inlineStyles && inlineStyles.size) {
    for (const entry of inlineStyles.values()) {
      if (entry.emitted) continue;
      entry.emitted = true;
      head += renderInlineStyle(entry, nonce);
    }
  }
  return head;
}

function serializeFragmentAssets(key, boundaryModules, context) {
  const map = boundaryModules.get(key);
  if (!map || !Object.keys(map).length) return;
  context.serialize(key + "_assets", map);
}

function propagateBoundaryStyles(childKey, parentKey, tracking) {
  const childStyles = tracking.getBoundaryStyles(childKey);
  if (!childStyles) return;
  let parentStyles = tracking.boundaryStyles.get(parentKey);
  if (!parentStyles) {
    parentStyles = new Set();
    tracking.boundaryStyles.set(parentKey, parentStyles);
  }
  for (const url of childStyles) {
    parentStyles.add(url);
  }
}

// Boundary style sets hold three kinds of entries: url strings (tracked
// stylesheet links, load-gated via $dfs), gate entries (`{ href, attrHtml,
// attrs }` — useHead stylesheets carrying fetch-metadata attributes, gated
// the same way with attributes intact), and inline style entry objects
// (emitted as <style> tags, ready as soon as parsed). Splits them for the
// fragment flush, consuming object entries so they emit at most once.
function collectStreamStyles(key, tracking, headStyles) {
  const styles = tracking.getBoundaryStyles(key);
  const links = [];
  const inline = [];
  if (!styles) return { links, inline };
  for (const entry of styles) {
    if (typeof entry === "string") {
      if (!headStyles || !headStyles.has(entry)) links.push(entry);
    } else if (entry.emitted) {
      continue;
    } else if (entry.attrHtml !== undefined) {
      entry.emitted = true;
      links.push(entry);
    } else {
      entry.emitted = true;
      inline.push(entry);
    }
  }
  return { links, inline };
}

// `</style` inside content would close the tag early; escaping the slash is
// valid CSS and neutralizes the sequence.
function escapeStyleContent(content) {
  return content.replace(/<\/(style)/gi, "<\\/$1");
}

function renderInlineStyle(entry, nonce) {
  let attrs = "";
  if (entry.attrs) {
    for (const name in entry.attrs) {
      attrs += ` ${name}="${escape(String(entry.attrs[name]), true)}"`;
    }
  }
  return `<style${nonce ? ` nonce="${nonce}"` : ""} data-asset="${escape(
    entry.id,
    true
  )}"${attrs}>${escapeStyleContent(entry.content)}</style>`;
}

function waitForFragments(registry, key) {
  for (const k of [...registry.keys()].reverse()) {
    if (key.startsWith(k)) return k;
  }
  return false;
}

function replacePlaceholder(html, key, value) {
  const marker = `<template id="pl-${key}">`;
  const close = `<!--pl-${key}-->`;

  const first = html.indexOf(marker);
  if (first === -1) return html;
  const last = html.indexOf(close, first + marker.length);

  return html.slice(0, first) + value + html.slice(last + close.length);
}

function classListToObject(classList) {
  if (Array.isArray(classList)) {
    const result = {};
    flattenClassList(classList, result);
    return result;
  }
  return classList;
}

function flattenClassList(list, result) {
  for (let i = 0, len = list.length; i < len; i++) {
    const item = list[i];
    if (Array.isArray(item)) flattenClassList(item, result);
    else if (typeof item === "object" && item != null) Object.assign(result, item);
    else if (item || item === 0) result[item] = true;
  }
}

// Best-effort sync resolution. Returns a string when the entire `node`
// resolves synchronously to text. Otherwise returns one of three shapes
// shared with `ssrFirstGroupHit`:
//   `{ fn, p }` — function hole that threw `NotReadyError`; `fn` is
//                 wrapped in `runWithOwner(owner, ...)` so the streaming
//                 engine's retry sees the same context the original sync
//                 call did.
//   `{ merge }` — template object with non-empty `h`.
//   `{ bail }`  — interior contains async; `bail` carries the evaluated
//                 form (typically the array we walked) so the caller can
//                 hand it to `resolveSSRNode` without re-invoking the
//                 original closure. Re-invocation is unsafe — a hole may
//                 read stateful getters such as JSX `props.children`
//                 whose backing component rebuilds an owner subtree on
//                 each access, producing a divergent hydration tree.
function tryResolveString(node) {
  const t = typeof node;
  if (t === "string") return node;
  if (t === "number") return "" + node;
  if (node == null || t === "boolean") return "";
  if (t === "object") {
    if (Array.isArray(node)) {
      const joined = tryJoinPlainSSRArray(node);
      if (joined !== undefined) return joined;
      let s = "";
      let prevNonObj = false;
      for (let i = 0, len = node.length; i < len; i++) {
        const item = node[i];
        const itemNonObj = item !== null && typeof item !== "object";
        if (prevNonObj && itemNonObj) s += "<!--!$-->";
        prevNonObj = itemNonObj;
        const r = tryResolveString(item);
        if (typeof r !== "string") return { bail: node };
        s += r;
      }
      return s;
    }
    if (node.h && node.h.length > 0) return { merge: node };
    if (node.t === undefined) {
      // Not a template object — mirror the client's dev warn-and-skip
      // instead of crashing downstream on a malformed template shape.
      if ("_DX_DEV_") console.warn(`Unrecognized value. Skipped inserting`, node);
      return "";
    }
    return Array.isArray(node.t) ? node.t[0] : node.t;
  }
  if (t === "function") {
    let v;
    try {
      v = node();
    } catch (err) {
      return buildAsyncWrap(err, node) || "";
    }
    // Recurse on the evaluated value. If recursion bails, propagate the
    // bail object unchanged — its `bail` field already carries the
    // deepest evaluated form, so the caller never re-invokes `node`.
    return tryResolveString(v);
  }
  return "";
}

function resolveSSRNode(
  node,
  result = {
    t: [""],
    h: [],
    p: []
  },
  top
) {
  const t = typeof node;
  if (t === "string" || t === "number") {
    result.t[result.t.length - 1] += node;
  } else if (node == null || t === "boolean") {
  } else if (Array.isArray(node)) {
    let prevNonObj = false;
    for (let i = 0, len = node.length; i < len; i++) {
      const item = node[i];
      const itemNonObj = item !== null && typeof item !== "object";
      if (!top && prevNonObj && itemNonObj) result.t[result.t.length - 1] += `<!--!$-->`;
      prevNonObj = itemNonObj;
      resolveSSRNode(item, result);
    }
  } else if (t === "object") {
    if (node.h) {
      result.t[result.t.length - 1] += node.t[0];
      if (node.t.length > 1) {
        result.t.push(...node.t.slice(1));
        result.h.push(...node.h);
        result.p.push(...node.p);
      }
    } else if (node.t !== undefined) {
      result.t[result.t.length - 1] += node.t;
    } else if ("_DX_DEV_") console.warn(`Unrecognized value. Skipped inserting`, node);
  } else if (t === "function") {
    try {
      resolveSSRNode(node(), result);
    } catch (err) {
      const wrap = buildAsyncWrap(err, node);
      if (wrap) {
        result.h.push(wrap.fn);
        result.p.push(wrap.p);
        result.t.push("");
      }
    }
  }
  return result;
}

function resolveSSRSync(node) {
  const res = resolveSSRNode(node);
  if (!res.h.length) return res.t[0];
  throw new Error("This value cannot be rendered synchronously. Are you missing a boundary?");
}

// experimental
// Registered symbol: the AsyncLocalStorage parked on globalThis must be
// found by every copy of this module (core entry and server-functions entry
// bundle separately downstream).
export const RequestContext = Symbol.for("solid.RequestContext");

export function getRequestEvent() {
  return globalThis[RequestContext]
    ? globalThis[RequestContext].getStore() ||
        (sharedConfig.context && sharedConfig.context.event) ||
        console.warn(
          "RequestEvent is missing. This is most likely due to accessing `getRequestEvent` non-managed async scope in a partially polyfilled environment. Try moving it above all `await` calls."
        )
    : undefined;
}

/** @deprecated use renderToStream which also returns a promise */
export function renderToStringAsync(code, options = {}) {
  return new Promise(resolve => renderToStream(code, options).then(resolve));
}

// Element claims are a client-only concern (compiled DOM output claims
// navigation-relevant elements for consumers like a router's link-state
// layer), but consumers may register isomorphically — so these are silent
// no-ops rather than loud stubs. Claims never fire during SSR.
export function registerElementClaim() {
  return noopCleanup;
}
function noopCleanup() {}
export function claimElement(node) {
  return node;
}
export function claimElementTree(root) {
  return root;
}

// client-only APIs

export {
  notSup as style,
  notSup as insert,
  notSup as spread,
  notSup as delegateEvents,
  notSup as registerDelegatedRoot,
  notSup as unregisterDelegatedRoot,
  notSup as registerDelegatedContainer,
  notSup as unregisterDelegatedContainer,
  notSup as getDelegatedRoot,
  notSup as dynamicProperty,
  notSup as setAttribute,
  notSup as setAttributeNS,
  notSup as addEvent,
  notSup as render,
  notSup as template,
  notSup as setProperty,
  notSup as className,
  notSup as assign,
  notSup as hydrate,
  notSup as getNextElement,
  notSup as getNextMatch,
  notSup as getNextMarker,
  notSup as runHydrationEvents,
  notSup as ref,
  notSup as setStyleProperty,
  notSup as acquireAsset
};

function notSup() {
  throw new Error(
    "Client-only API called on the server side. Run client-only code in onMount, or conditionally run client-only component with <Show>."
  );
}
