import { ChildProperties } from "./constants";
import { sharedConfig, root, ssrHandleError, getOwner, runWithOwner } from "rxcore";
import { createHydrationSerializer, getLocalHeaderScript } from "./serializer";

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

function applyAssetTracking(context, tracking, manifest) {
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
    context.resolveAssets = manifest;
  } else if (manifest && typeof manifest.resolve === "function") {
    context.resolveAssets = key => manifest.resolve(key);
    if (typeof manifest.resolveSync === "function") {
      context.resolveAssetsSync = key => manifest.resolveSync(key);
    }
  } else if (manifest) {
    const resolve = moduleUrl => resolveAssets(moduleUrl, manifest);
    context.resolveAssets = resolve;
    context.resolveAssetsSync = resolve;
  }
}

// Based on https://github.com/WebReflection/domtagger/blob/master/esm/sanitizer.js
const VOID_ELEMENTS =
  /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;
// Fragment replacement helpers emitted into stream task scripts:
// - $df(id): swap template payload into the `pl-*` marker range. A marker that
//   isn't in the live DOM yet (it sits inside a flushed-but-unactivated ancestor
//   template held by a reveal group) queues the id in `_$HY.dq` for retry instead
//   of dropping the swap. A missing content template means the swap already ran —
//   that stays a plain no-op and is never queued.
// - $dfl(id): materialize fallback from `pl-*` template content without resolving.
//   Marker misses queue in `_$HY.dlq`, same reasoning as $df.
// - $dflj(ids): materialize fallback content for every id in the list.
// - $dfd(): drain both retry queues. Runs after every successful swap or fallback
//   materialization — the only events that can bring queued markers into the live
//   document. Content swaps ($df) drain before fallbacks ($dfl) so a settled
//   fragment wins over its own pending fallback. Each pass snapshots the queue,
//   so still-inert entries simply re-queue and wait for the next swap.
// - $dfs(id, count, defer): register pending stylesheet count for fragment `id`.
// - $dfc(id): style completion callback; reveals when the fragment/group is unblocked.
// - $dfg(id): group-style gate check; reveals a waiting group once all style counts hit zero.
// - $dfj(ids): reveal a group in registration order, waiting if any member still has pending styles.
const REPLACE_SCRIPT = `function $df(e,n,o,t){if(!(n=document.getElementById(e)))return 0;if(!(o=document.getElementById("pl-"+e)))return(_$HY.dq=_$HY.dq||{})[e]=1,0;for(;o&&(8!==o.nodeType||o.nodeValue!=="pl-"+e);)t=o.nextSibling,o.remove(),o=t;_$HY.done?o.remove():o.replaceWith(n.content),n.remove(),_$HY.fe(e),$dfd();return 1}function $dfl(e,o,n){if(!(o=document.getElementById("pl-"+e)))return(_$HY.dlq=_$HY.dlq||{})[e]=1,0;if(o._$fl)return 1;for(n=o.nextSibling;n;){if(8===n.nodeType&&n.nodeValue==="pl-"+e){o.parentNode&&o.parentNode.insertBefore(o.content.cloneNode(!0),n),o._$fl=1,$dfd();return 1}n=n.nextSibling}return 0}function $dflj(e,i){for(i=0;i<e.length;i++)$dfl(e[i])}function $dfd(e,i){if(e=_$HY.dq){_$HY.dq=0;for(i in e)$df(i)}if(e=_$HY.dlq){_$HY.dlq=0;for(i in e)$dfl(i)}}function $dfs(e,c,d){(_$HY.sc=_$HY.sc||{})[e]=c,d&&((_$HY.sd=_$HY.sd||{})[e]=1)}function $dfg(e,g,i,k){if(!(g=_$HY.sg&&_$HY.sg[e]))return;for(i=0;i<g.length;i++)if(_$HY.sc&&_$HY.sc[g[i]]>0)return;for(i=0;i<g.length;i++)k=g[i],delete _$HY.sg[k],$df(k)}function $dfc(e){if(--_$HY.sc[e]<=0){delete _$HY.sc[e],_$HY.sg&&_$HY.sg[e]?$dfg(e):!(_$HY.sd&&_$HY.sd[e])&&$df(e);_$HY.sd&&delete _$HY.sd[e]}}function $dfj(e,i,n){for(i=0;i<e.length;i++)if(_$HY.sc&&_$HY.sc[e[i]]>0){for(n=0;n<e.length;n++)(_$HY.sg=_$HY.sg||{})[e[n]]=e;return}for(i=0;i<e.length;i++)$df(e[i])}`;

export function renderToString(code, options = {}) {
  const { renderId = "", nonce, noScripts, manifest } = options;
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
  sharedConfig.context = {
    assets: [],
    nonce,
    escape: escape,
    resolve: resolveSSRNode,
    ssr: ssr,
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
  applyAssetTracking(sharedConfig.context, tracking, manifest);
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
  html = injectAssets(sharedConfig.context.assets, html);
  html = injectPreloadLinks(tracking.emittedAssets, html, nonce);
  html = injectInlineStyles(tracking.inlineStyles, html, nonce);
  if (scripts.length) html = injectScripts(html, scripts, options.nonce);
  return html;
}

export function renderToStream(code, options = {}) {
  let { nonce, onCompleteShell, onCompleteAll, renderId = "", noScripts, manifest } = options;
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
      timer = setTimeout(writeTasks);
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
  const serializer = createHydrationSerializer({
    scopeId: options.renderId,
    plugins: options.plugins,
    onData: pushTask,
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
    timer && clearTimeout(timer);
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

  sharedConfig.context = context = {
    async: true,
    assets: [],
    nonce,
    registerAsset(type, value) {
      if (type === "inline-style") {
        const entry = tracking.registerInlineStyle(value);
        // Boundary-attributed inline styles flush with their fragment; a late
        // registration outside any boundary has no other emission point, so
        // write the tag into the stream immediately.
        if (firstFlushed && !tracking.currentBoundaryId && !entry.emitted) {
          entry.emitted = true;
          buffer.write(renderInlineStyle(entry, nonce));
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
        if (firstFlushed && type === "module") {
          buffer.write(`<link rel="modulepreload" href="${value}">`);
        }
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
            item.resolve();
            return;
          }
          if (!completed) {
            if (!firstFlushed) {
              queue(() => (html = replacePlaceholder(html, key, value !== undefined ? value : "")));
              serializeFragmentAssets(key, tracking.boundaryModules, context);
              item.resolve(error);
            } else {
              serializeFragmentAssets(key, tracking.boundaryModules, context);
              const styles = collectStreamStyles(key, tracking, headStyles);
              const deferActivation = !!revealGroup;
              // Inline styles apply as soon as the parser sees them — emit
              // before the template, no load gating needed.
              for (let i = 0; i < styles.inline.length; i++) {
                buffer.write(renderInlineStyle(styles.inline[i], nonce));
              }
              if (styles.links.length) {
                emitTask(`$dfs("${key}",${styles.links.length},${deferActivation ? 1 : 0})`);
                writeTasks();
                for (const url of styles.links) {
                  buffer.write(
                    `<link rel="stylesheet" href="${url}" onload="$dfc('${key}')" onerror="$dfc('${key}')">`
                  );
                }
                buffer.write(
                  `<template id="${key}">${value !== undefined ? value : " "}</template>`
                );
              } else {
                buffer.write(
                  `<template id="${key}">${value !== undefined ? value : " "}</template>`
                );
                if (!deferActivation) {
                  emitTask(`$df("${key}")`);
                }
              }
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
      emitTask(`$dfj(${JSON.stringify(keys)})`);
    },
    revealFallbacks(groupOrKeys) {
      const keys = resolveRevealKeys(groupOrKeys, false, false);
      if (!keys) return;
      emitTask(`$dflj(${JSON.stringify(keys)})`);
    }
  };
  applyAssetTracking(context, tracking, manifest);
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
    html = injectAssets(context.assets, html);
    headStyles = new Set();
    for (const url of tracking.emittedAssets) {
      if (url.endsWith(".css")) headStyles.add(url);
    }
    html = injectPreloadLinks(tracking.emittedAssets, html, nonce);
    html = injectInlineStyles(tracking.inlineStyles, html, nonce);
    serializeRootAssets();
    if (tasks.length) html = injectScripts(html, tasks, nonce);
    buffer.write(html);
    tasks = "";
    onCompleteShell &&
      onCompleteShell({
        write(v) {
          !completed && buffer.write(v);
        }
      });
    shellCompleted = true;
  }
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
          setTimeout(() => {
            if (!resolveRootHoles()) return flush();
            queue(flushEnd);
          });
        });
      }
      flush();
    },
    pipe(w) {
      function flush() {
        allSettled(blockingPromises).then(() => {
          setTimeout(() => {
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
      let resolve;
      const p = new Promise(r => (resolve = r));
      function flush() {
        allSettled(blockingPromises).then(() => {
          setTimeout(() => {
            doShell();
            if (!shellCompleted) return flush();
            const encoder = new TextEncoder();
            const writer = w.getWriter();
            writable = {
              end() {
                writer.releaseLock();
                w.close().catch(() => {});
                resolve();
              }
            };
            buffer = {
              write(payload) {
                writer.write(encoder.encode(payload)).catch(() => {});
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
  // Fast path: single forward pass over the string. Most values (color
  // names, ids, prop strings, plain text) contain none of `&`, `<`, or
  // `"`, so we bail without allocating. Slow path resumes from the first
  // hit so we don't re-scan the clean prefix.
  // Char codes: `&` = 38, `<` = 60, `"` = 34.
  const delimCode = attr ? 34 : 60;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    const c = s.charCodeAt(i);
    if (c === 38 || c === delimCode) return escapeSlow(s, attr, i);
  }
  return s;
}

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

function injectAssets(assets, html) {
  if (!assets || !assets.length) return html;
  let out = "";
  for (let i = 0, len = assets.length; i < len; i++) out += assets[i]();
  const index = html.indexOf("</head>");
  if (index === -1) return html;
  return html.slice(0, index) + out + html.slice(index);
}

function injectPreloadLinks(emittedAssets, html, nonce) {
  if (!emittedAssets.size) return html;
  let links = "";
  for (const url of emittedAssets) {
    if (url.endsWith(".css")) {
      links += `<link rel="stylesheet" href="${url}">`;
    } else {
      links += `<link rel="modulepreload" href="${url}">`;
    }
  }
  const index = html.indexOf("</head>");
  if (index === -1) return html;
  return html.slice(0, index) + links + html.slice(index);
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

// Boundary style sets hold two kinds of entries: url strings (stylesheet
// links, load-gated via $dfs) and inline style entry objects (emitted as
// <style> tags, ready as soon as parsed). Splits them for the fragment
// flush, consuming inline entries so they emit at most once.
function collectStreamStyles(key, tracking, headStyles) {
  const styles = tracking.getBoundaryStyles(key);
  const links = [];
  const inline = [];
  if (!styles) return { links, inline };
  for (const entry of styles) {
    if (typeof entry === "string") {
      if (!headStyles || !headStyles.has(entry)) links.push(entry);
    } else if (!entry.emitted) {
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

function injectInlineStyles(inlineStyles, html, nonce) {
  if (!inlineStyles.size) return html;
  const index = html.indexOf("</head>");
  if (index === -1) return html;
  let out = "";
  for (const entry of inlineStyles.values()) {
    if (entry.emitted) continue;
    entry.emitted = true;
    out += renderInlineStyle(entry, nonce);
  }
  return out ? html.slice(0, index) + out + html.slice(index) : html;
}

function injectScripts(html, scripts, nonce) {
  const tag = `<script${nonce ? ` nonce="${nonce}"` : ""}>${scripts}</script>`;
  const index = html.indexOf("<!--xs-->");
  if (index > -1) {
    return html.slice(0, index) + tag + html.slice(index);
  }
  return html + tag;
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
