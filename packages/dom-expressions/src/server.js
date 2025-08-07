import { ChildProperties } from "./constants";
import { sharedConfig, root, ssrHandleError } from "rxcore";
import { createSerializer, getLocalHeaderScript } from "./serializer";

export { getOwner, createComponent, effect, memo, untrack, ssrRunInScope } from "rxcore";

export {
  Properties,
  ChildProperties,
  DOMElements,
  SVGElements,
  SVGNamespace,
  DelegatedEvents
} from "./constants.js";

// Based on https://github.com/WebReflection/domtagger/blob/master/esm/sanitizer.js
const VOID_ELEMENTS =
  /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;
const REPLACE_SCRIPT = `function $df(e,n,o,t){if(n=document.getElementById(e),o=document.getElementById("pl-"+e)){for(;o&&8!==o.nodeType&&o.nodeValue!=="pl-"+e;)t=o.nextSibling,o.remove(),o=t;_$HY.done?o.remove():o.replaceWith(n.content)}n.remove(),_$HY.fe(e)}`;

export function renderToString(code, options = {}) {
  const { renderId = "", nonce, noScripts } = options;
  let scripts = "";
  const serializer = createSerializer({
    scopeId: renderId,
    onData(script) {
      if (noScripts) return;
      if (!scripts) {
        scripts = getLocalHeaderScript(renderId);
      }
      scripts += script + ";";
    },
    onError: options.onError
  });
  sharedConfig.context = {
    assets: [],
    nonce,
    escape: escape,
    resolve: resolveSSRNode,
    ssr: ssr,
    serialize(id, p) {
      !sharedConfig.context.noHydrate && serializer.write(id, p);
    }
  };
  let html = root(
    d => {
      setTimeout(d);
      return resolveSSRSync(escape(code()));
    },
    { id: renderId }
  );
  sharedConfig.context.noHydrate = true;
  serializer.close();
  html = injectAssets(sharedConfig.context.assets, html);
  if (scripts.length) html = injectScripts(html, scripts, options.nonce);
  return html;
}

export function renderToStream(code, options = {}) {
  let { nonce, onCompleteShell, onCompleteAll, renderId = "", noScripts } = options;
  let dispose;
  const blockingPromises = [];
  const pushTask = task => {
    if (noScripts) return;
    if (!tasks && !firstFlushed) {
      tasks = getLocalHeaderScript(renderId);
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
  const serializer = createSerializer({
    scopeId: options.renderId,
    onData: pushTask,
    onDone,
    onError: options.onError
  });
  const flushEnd = () => {
    if (!registry.size) {
      // We are no longer writing any resource
      // now we just need to wait for the pending promises
      // to resolve
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
  let timer = null;
  let buffer = {
    write(payload) {
      tmp += payload;
    }
  };
  sharedConfig.context = context = {
    async: true,
    assets: [],
    nonce,
    block(p) {
      if (!firstFlushed) blockingPromises.push(p);
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
    serialize(id, p, wait) {
      const serverOnly = sharedConfig.context.noHydrate;
      if (!firstFlushed && wait && typeof p === "object" && "then" in p) {
        blockingPromises.push(p);
        !serverOnly &&
          p
            .then(d => {
              serializer.write(id, d);
            })
            .catch(e => {
              serializer.write(id, e);
            });
      } else if (!serverOnly) serializer.write(id, p);
    },
    escape: escape,
    resolve: resolveSSRNode,
    ssr: ssr,
    registerFragment(key) {
      if (!registry.has(key)) {
        let resolve, reject;
        const p = new Promise((r, rej) => ((resolve = r), (reject = rej)));
        // double queue to ensure that Suspense is last but in same flush
        registry.set(key, {
          resolve: err =>
            queue(() =>
              queue(() => {
                err ? reject(err) : resolve(true);
                queue(flushEnd);
              })
            )
        });
        serializer.write(key, p);
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
            item.resolve();
            return;
          }
          if (!completed) {
            if (!firstFlushed) {
              queue(() => (html = replacePlaceholder(html, key, value !== undefined ? value : "")));
              item.resolve(error);
            } else {
              buffer.write(`<template id="${key}">${value !== undefined ? value : " "}</template>`);
              pushTask(`$df("${key}")${!scriptFlushed ? ";" + REPLACE_SCRIPT : ""}`);
              item.resolve(error);
              scriptFlushed = true;
            }
          }
        }
        return firstFlushed;
      };
    }
  };

  let html = root(
    d => {
      dispose = d;
      return resolveSSRSync(escape(code()));
    },
    { id: renderId }
  );
  function doShell() {
    if (shellCompleted) return;
    sharedConfig.context = context;
    // context.noHydrate = true;
    html = injectAssets(context.assets, html);
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
      queue(flushEnd);
    },
    pipe(w) {
      allSettled(blockingPromises).then(() => {
        setTimeout(() => {
          doShell();
          buffer = writable = w;
          buffer.write(tmp);
          firstFlushed = true;
          if (completed) {
            dispose();
            writable.end();
          } else flushEnd();
        });
      });
    },
    pipeTo(w) {
      return allSettled(blockingPromises).then(() => {
        let resolve;
        const p = new Promise(r => (resolve = r));
        setTimeout(() => {
          doShell();
          const encoder = new TextEncoder();
          const writer = w.getWriter();
          writable = {
            end() {
              writer.releaseLock();
              w.close();
              resolve();
            }
          };
          buffer = {
            write(payload) {
              writer.write(encoder.encode(payload));
            }
          };
          buffer.write(tmp);
          firstFlushed = true;
          if (completed) {
            dispose();
            writable.end();
          } else flushEnd();
        });
        return p;
      });
    }
  };
}

// components
export function HydrationScript(props) {
  const { nonce } = sharedConfig.context;
  return ssr(generateHydrationScript({ nonce, ...props }));
}

// rendering
export function ssr(t, ...nodes) {
  if (nodes.length) return resolveSSR(t, nodes);
  return { t };
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
    result += escape(key);
  }
  return result;
}

export function ssrStyle(value) {
  if (!value) return "";
  if (typeof value === "string") return escape(value, true);

  let result = "";
  const k = Object.keys(value);
  for (let i = 0; i < k.length; i++) {
    const s = k[i];
    const v = value[s];
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
  return value != null ? name + value : "";
}

// review with new ssr
export function ssrElement(tag, props, children, needsId) {
  if (props == null) props = {};
  else if (typeof props === "function") props = props();
  const skipChildren = VOID_ELEMENTS.test(tag);
  const keys = Object.keys(props);
  let result = `<${tag}${needsId ? ssrHydrationKey() : ""} `;
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
  return value == null || value === false ? "" : value === true ? ` ${key}` : ` ${key}="${value}"`;
}

export function ssrHydrationKey() {
  const hk = getHydrationKey();
  return hk ? ` _hk=${hk}` : "";
}

export function escape(s, attr) {
  const t = typeof s;
  if (t !== "string") {
    // if (!attr && t === "function") return escape(s());
    if (!attr && Array.isArray(s)) {
      s = s.slice(); // avoids double escaping - https://github.com/ryansolid/dom-expressions/issues/393
      for (let i = 0; i < s.length; i++) s[i] = escape(s[i]);
      return s;
    }
    if (attr && t === "boolean") return s;
    return s;
  }
  const delim = attr ? '"' : "<";
  const escDelim = attr ? "&quot;" : "&lt;";
  let iDelim = s.indexOf(delim);
  let iAmp = s.indexOf("&");

  if (iDelim < 0 && iAmp < 0) return s;

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

export function mergeProps(...sources) {
  const target = {};
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    if (typeof source === "function") source = source();
    if (source) {
      const descriptors = Object.getOwnPropertyDescriptors(source);
      for (const key in descriptors) {
        if (key in target) continue;
        Object.defineProperty(target, key, {
          enumerable: true,
          get() {
            for (let i = sources.length - 1; i >= 0; i--) {
              const v = (sources[i] || {})[key];
              if (v !== undefined) return v;
            }
          }
        });
      }
    }
  }
  return target;
}

export function getHydrationKey() {
  const hydrate = sharedConfig.context;
  return hydrate && !hydrate.noHydrate && sharedConfig.getNextContextId();
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

export function generateHydrationScript({ eventNames = ["click", "input"], nonce } = {}) {
  return `<script${
    nonce ? ` nonce="${nonce}"` : ""
  }>window._$HY||(e=>{let t=e=>e&&e.hasAttribute&&(e.hasAttribute("_hk")?e:t(e.host&&e.host.nodeType?e.host:e.parentNode));["${eventNames.join(
    '", "'
  )}"].forEach((o=>document.addEventListener(o,(o=>{if(!e.events)return;let s=t(o.composedPath&&o.composedPath()[0]||o.target);s&&!e.completed.has(s)&&e.events.push([s,o])}))))})(_$HY={events:[],completed:new WeakSet,r:{},fe(){}});</script><!--xs-->`;
}

export function Hydration(props) {
  if (!sharedConfig.context.noHydrate) return props.children;
  const context = sharedConfig.context;
  sharedConfig.context = {
    ...context,
    noHydrate: false
  };
  const res = props.children;
  sharedConfig.context = context;
  return res;
}

export function NoHydration(props) {
  let context = sharedConfig.context;
  if (context) sharedConfig.context = { ...context, noHydrate: true };
  const res = props.children;
  if (context) sharedConfig.context = context;
  return res;
}

function queue(fn) {
  return Promise.resolve().then(fn);
}

function allSettled(promises) {
  let length = promises.length;
  return Promise.allSettled(promises).then(() => {
    if (promises.length !== length) return allSettled(promises);
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

function resolveSSR(
  template,
  holes,
  result = {
    t: [""],
    h: [],
    p: []
  }
) {
  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i];
    result.t[result.t.length - 1] += template[i];
    if (hole == null || hole === true || hole === false) continue;
    resolveSSRNode(hole, result);
  }
  result.t[result.t.length - 1] += template[template.length - 1];
  return result;
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
    let prev = {};
    for (let i = 0, len = node.length; i < len; i++) {
      if (!top && typeof prev !== "object" && typeof node[i] !== "object")
        result.t[result.t.length - 1] += `<!--!$-->`;
      resolveSSRNode((prev = node[i]), result);
    }
  } else if (t === "object") {
    if (node.h) {
      result.t[result.t.length - 1] += node.t[0];
      if (node.t.length > 1) {
        result.t.push(...node.t.slice(1));
        result.h.push(...node.h);
        result.p.push(...node.p);
      }
    } else result.t[result.t.length - 1] += node.t;
  } else if (t === "function") {
    try {
      resolveSSRNode(node(), result);
    } catch (err) {
      const p = ssrHandleError(err);
      if (p) {
        result.h.push(node);
        result.p.push(p);
        result.t.push("");
      }
    }
  }
  return result;
}

function resolveSSRSync(node) {
  const res = resolveSSRNode(node);
  if (!res.h.length) return res.t[0];
  throw new Error(
    "This value cannot be rendered synchronously. Are you missing a Suspsense boundary?"
  );
}

// experimental
export const RequestContext = Symbol();

export function getRequestEvent() {
  return globalThis[RequestContext]
    ? globalThis[RequestContext].getStore() ||
        (sharedConfig.context && sharedConfig.context.event) ||
        console.log(
          "RequestEvent is missing. This is most likely due to accessing `getRequestEvent` non-managed async scope in a partially polyfilled environment. Try moving it above all `await` calls."
        )
    : undefined;
}

/** @deprecated use renderToStream which also returns a promise */
export function renderToStringAsync(code, options = {}) {
  return renderToStream(code, options).then(html => html);
}

// client-only APIs

export {
  notSup as style,
  notSup as insert,
  notSup as spread,
  notSup as delegateEvents,
  notSup as dynamicProperty,
  notSup as setAttribute,
  notSup as setAttributeNS,
  notSup as addEventListener,
  notSup as render,
  notSup as template,
  notSup as setProperty,
  notSup as className,
  notSup as assign,
  notSup as hydrate,
  notSup as getNextElement,
  notSup as getNextMatch,
  notSup as getNextMarker,
  notSup as runHydrationEvents
};

function notSup() {
  throw new Error(
    "Client-only API called on the server side. Run client-only code in onMount, or conditionally run client-only component with <Show>."
  );
}
