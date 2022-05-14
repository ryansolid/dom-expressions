import { Aliases, BooleanAttributes } from "./constants";
import { sharedConfig } from "rxcore";
import devalue from "devalue";
export { createComponent } from "rxcore";

const REPLACE_SCRIPT = `function $df(e,t,d,l){d=document.getElementById(e),(l=document.getElementById("pl-"+e))&&l.replaceWith(...d.childNodes),d.remove(),_$HY.set(e,t||null)}`;
const FRAGMENT_REPLACE = /<!\[([\d-]+)\]>/;

export function renderToString(code, options = {}) {
  let scripts = "";
  sharedConfig.context = {
    id: options.renderId || "",
    count: 0,
    suspense: {},
    assets: [],
    nonce: options.nonce,
    writeResource(id, p, error) {
      if (error) return (scripts += `_$HY.set("${id}", ${serializeError(p)});`);
      scripts += `_$HY.set("${id}", ${devalue(p)});`;
    }
  };
  let html = injectAssets(sharedConfig.context.assets, resolveSSRNode(escape(code())));
  if (scripts.length) html = injectScripts(html, scripts, options.nonce);
  return html;
}

export function renderToStringAsync(code, options = {}) {
  let scripts = "";
  const { nonce, renderId, timeoutMs = 30000 } = options;
  const dedupe = new WeakMap();
  const context = (sharedConfig.context = {
    id: renderId || "",
    count: 0,
    resources: {},
    suspense: {},
    assets: [],
    async: true,
    nonce,
    writeResource(id, p, error) {
      if (error) return (scripts += `_$HY.set("${id}", ${serializeError(p)});`);
      if (!p || typeof p !== "object" || !("then" in p))
        return (scripts += serializeSet(dedupe, id, p) + ";");
      p.then(d => (scripts += serializeSet(dedupe, id, d) + ";")).catch(
        () => (scripts += `_$HY.set("${id}", {});`)
      );
    }
  });
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject("renderToString timed out"), timeoutMs)
  );

  function asyncWrap(fn) {
    return new Promise(resolve => {
      const registry = new Set();
      const cache = Object.create(null);
      sharedConfig.context.registerFragment = register;
      const rendered = fn();
      if (!registry.size) resolve(rendered);
      function register(key) {
        registry.add(key);
        return (value = "", error) => {
          if (!registry.has(key)) return;
          cache[key] = value;
          registry.delete(key);
          if (error) scripts += `_$HY.set("${key}", Promise.resolve(${serializeError(error)}));`;
          else scripts += `_$HY.set("${key}", null);`;
          if (!registry.size)
            Promise.resolve().then(() => {
              let source = resolveSSRNode(rendered);
              let final = "";
              let match;
              while ((match = source.match(FRAGMENT_REPLACE))) {
                final += source.substring(0, match.index);
                source = cache[match[1]] + source.substring(match.index + match[0].length);
              }
              resolve(final + source);
            });
          return true;
        };
      }
    });
  }
  return Promise.race([asyncWrap(() => escape(code())), timeout]).then(res => {
    let html = injectAssets(context.assets, resolveSSRNode(res));
    if (scripts.length) html = injectScripts(html, scripts, nonce);
    return html;
  });
}

export function renderToStream(code, options = {}) {
  const { nonce, onCompleteShell, onCompleteAll, renderId } = options;
  const tmp = [];
  const tasks = [];
  const blockingResources = [];
  const registry = new Map();
  const dedupe = new WeakMap();
  const checkEnd = () => {
    if (!registry.size && !completed) {
      writeTasks();
      onCompleteAll &&
        onCompleteAll({
          write(v) {
            !completed && buffer.write(v);
          }
        });
      writable && writable.end();
      completed = true;
    }
  };
  const pushTask = task => {
    tasks.push(task);
    if (!scheduled) {
      Promise.resolve().then(writeTasks);
      scheduled = true;
    }
  };
  const writeTasks = () => {
    if (tasks.length && !completed) {
      buffer.write(`<script${nonce ? ` nonce="${nonce}"` : ""}>${tasks.join(";")}</script>`);
      tasks.length = 0;
    }
    scheduled = false;
  };

  let writable;
  let firstFlushed = false;
  let completed = false;
  let scriptFlushed = false;
  let scheduled = true;
  let buffer = {
    write(payload) {
      tmp.push(payload);
    }
  };
  sharedConfig.context = {
    id: renderId || "",
    count: 0,
    async: true,
    streaming: true,
    resources: {},
    suspense: {},
    assets: [],
    nonce,
    writeResource(id, p, error, wait) {
      if (error) return pushTask(`_$HY.set("${id}", ${serializeError(p)})`);
      if (!p || typeof p !== "object" || !("then" in p))
        return pushTask(serializeSet(dedupe, id, p));
      if (wait && !firstFlushed) blockingResources.push(p);
      else pushTask(`_$HY.init("${id}")`);
      p.then(d => {
        !completed && pushTask(serializeSet(dedupe, id, d));
      }).catch(() => {
        !completed && pushTask(`_$HY.set("${id}", {})`);
      });
    },
    registerFragment(key) {
      if (!registry.has(key)) {
        registry.set(key, []);
        pushTask(`_$HY.init("${key}")`);
      }
      return (value, error) => {
        if (registry.has(key)) {
          const keys = registry.get(key);
          registry.delete(key);
          if (waitForFragments(registry, key)) return;
          if ((value !== undefined || error) && !completed) {
            if (!firstFlushed) {
              Promise.resolve().then(
                () => (html = replacePlaceholder(html, key, value !== undefined ? value : ""))
              );
              pushTask(
                `${keys.length ? keys.map(k => `_$HY.unset("${k}");`) : ""}_$HY.set("${key}",${
                  error ? serializeError(error) : "null"
                })`
              );
            } else {
              buffer.write(`<div hidden id="${key}">${value !== undefined ? value : " "}</div>`);
              pushTask(
                `${keys.length ? keys.map(k => `_$HY.unset("${k}")`).join(";") : ""}$df("${key}"${
                  error ? "," + serializeError(error) : ""
                })${!scriptFlushed ? ";" + REPLACE_SCRIPT : ""}`
              );
              scriptFlushed = true;
            }
          }
        }
        if (firstFlushed) checkEnd();
        return true;
      };
    }
  };

  let html = resolveSSRNode(escape(code()));
  function doShell() {
    html = injectAssets(sharedConfig.context.assets, html);
    if (tasks.length) html = injectScripts(html, tasks.join(";"), nonce);
    buffer.write(html);
    tasks.length = 0;
    scheduled = false;
    onCompleteShell &&
      onCompleteShell({
        write(v) {
          !completed && buffer.write(v);
        }
      });
  }

  return {
    pipe(w) {
      Promise.allSettled(blockingResources).then(() => {
        doShell();
        buffer = writable = w;
        tmp.forEach(chunk => buffer.write(chunk));
        firstFlushed = true;
        if (completed) writable.end();
        else setTimeout(checkEnd);
      });
    },
    pipeTo(w) {
      Promise.allSettled(blockingResources).then(() => {
        doShell();
        const encoder = new TextEncoder();
        const writer = w.getWriter();
        writable = {
          end() {
            writer.releaseLock();
            w.close();
          }
        };
        buffer = {
          write(payload) {
            writer.write(encoder.encode(payload));
          }
        };
        tmp.forEach(chunk => buffer.write(chunk));
        firstFlushed = true;
        if (completed) writable.end();
        else setTimeout(checkEnd);
      });
    }
  };
}

// components
export function Assets(props) {
  sharedConfig.context.assets.push(() =>
    NoHydration({
      get children() {
        return resolveSSRNode(props.children);
      }
    })
  );
  return ssr(`%%$${sharedConfig.context.assets.length - 1}%%`);
}

export function HydrationScript(props) {
  const { nonce } = sharedConfig.context;
  sharedConfig.context.assets.push(() => generateHydrationScript({ nonce, ...props }));
  return ssr(`%%$${sharedConfig.context.assets.length - 1}%%`);
}

export function NoHydration(props) {
  const c = sharedConfig.context;
  c.noHydrate = true;
  const children = props.children;
  c.noHydrate = false;
  return children;
}

// rendering
export function ssr(t, ...nodes) {
  if (nodes.length) {
    let result = "";
    for (let i = 0; i < t.length; i++) {
      result += t[i];
      const node = nodes[i];
      if (node !== undefined) result += resolveSSRNode(node);
    }
    t = result;
  }
  return { t };
}

export function ssrClassList(value) {
  if (!value) return "";
  let classKeys = Object.keys(value),
    result = "";
  for (let i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key];
    if (!key || !classValue) continue;
    i && (result += " ");
    result += key;
  }
  return result;
}

export function ssrStyle(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  let result = "";
  const k = Object.keys(value);
  for (let i = 0; i < k.length; i++) {
    const s = k[i];
    if (i) result += ";";
    result += `${s}:${escape(value[s], true)}`;
  }
  return result;
}

export function ssrSpread(props, isSVG, skipChildren) {
  let result = "";
  if (props == null) return results;
  if (typeof props === "function") props = props();
  // TODO: figure out how to handle props.children
  const keys = Object.keys(props);
  let classResolved;
  for (let i = 0; i < keys.length; i++) {
    const prop = keys[i];
    if (prop === "children") {
      !skipChildren && console.warn(`SSR currently does not support spread children.`);
      continue;
    }
    const value = props[prop];
    if (prop === "style") {
      result += `style="${ssrStyle(value)}"`;
    } else if (prop === "class" || prop === "className" || prop === "classList") {
      if (classResolved) continue;
      let n;
      result += `class="${(n = props.class) ? n + " " : ""}${
        (n = props.className) ? n + " " : ""
      }${ssrClassList(props.classList)}"`;
      classResolved = true;
    } else if (BooleanAttributes.has(prop)) {
      if (value) result += prop;
      else continue;
    } else if (value == undefined || prop === "ref" || prop.slice(0, 2) === "on") {
      continue;
    } else {
      result += `${Aliases[prop] || prop}="${escape(value, true)}"`;
    }
    if (i !== keys.length - 1) result += " ";
  }
  return result;
}

export function ssrAttribute(key, value, isBoolean) {
  return isBoolean ? (value ? " " + key : "") : value != null ? ` ${key}="${value}"` : "";
}

export function ssrHydrationKey() {
  const hk = getHydrationKey();
  return hk ? ` data-hk="${hk}"` : "";
}

export function escape(s, attr) {
  const t = typeof s;
  if (t !== "string") {
    if (!attr && t === "function") return escape(s(), attr);
    if (attr && t === "boolean") return String(s);
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

export function resolveSSRNode(node) {
  const t = typeof node;
  if (t === "string") return node;
  if (node == null || t === "boolean") return "";
  if (Array.isArray(node)) {
    let mapped = "";
    for (let i = 0, len = node.length; i < len; i++) mapped += resolveSSRNode(node[i]);
    return mapped;
  }
  if (t === "object") return resolveSSRNode(node.t);
  if (t === "function") return resolveSSRNode(node());
  return String(node);
}

export function mergeProps(...sources) {
  const target = {};
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    if (typeof source === "function") source = source();
    if (source) Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
  }
  return target;
}

export function getHydrationKey() {
  const hydrate = sharedConfig.context;
  return hydrate && !hydrate.noHydrate && `${hydrate.id}${hydrate.count++}`;
}

export function generateHydrationScript({ eventNames = ["click", "input"], nonce } = {}) {
  return `<script${
    nonce ? ` nonce="${nonce}"` : ""
  }>var e,t;e=window._$HY||(_$HY={events:[],completed:new WeakSet,r:{}}),t=e=>e&&e.hasAttribute&&(e.hasAttribute("data-hk")?e:t(e.host&&e.host instanceof Node?e.host:e.parentNode)),["${eventNames.join(
    '","'
  )}"].forEach((o=>document.addEventListener(o,(o=>{let s=o.composedPath&&o.composedPath()[0]||o.target,a=t(s);a&&!e.completed.has(a)&&e.events.push([a,o])})))),e.init=(t,o)=>{e.r[t]=[new Promise(((e,t)=>o=e)),o]},e.set=(t,o,s)=>{(s=e.r[t])&&s[1](o),e.r[t]=[o]},e.unset=t=>{delete e.r[t]},e.load=(t,o)=>{if(o=e.r[t])return o[0]};</script><!--xs-->`;
}

function injectAssets(assets, html) {
  for (let i = 0; i < assets.length; i++) {
    html = html.replace(`%%$${i}%%`, assets[i]());
  }
  return html;
}

function injectScripts(html, scripts, nonce) {
  const tag = `<script${nonce ? ` nonce="${nonce}"` : ""}>${scripts}</script>`;
  const index = html.indexOf("<!--xs-->");
  if (index > -1) {
    return html.slice(0, index) + tag + html.slice(index);
  }
  return html + tag;
}

function serializeError(error) {
  if (error.message) {
    const fields = {};
    const keys = Object.getOwnPropertyNames(error);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = error[key];
      if (!value || (key !== "message" && typeof value !== "function")) {
        fields[key] = value;
      }
    }
    return `Object.assign(new Error(${devalue(error.message)}), ${devalue(fields)})`;
  }
  return devalue(error);
}

function waitForFragments(registry, key) {
  for (const k of [...registry.keys()].reverse()) {
    if (key.startsWith(k)) {
      registry.get(k).push(key);
      return true;
    }
  }
  return false;
}

function serializeSet(registry, key, value) {
  const exist = registry.get(value);
  if (exist) return `_$HY.set("${key}", _$HY.r["${exist}"][0])`;
  value !== null && typeof value === "object" && registry.set(value, key);
  return `_$HY.set("${key}", ${devalue(value)})`;
}

function replacePlaceholder(html, key, value) {
  const nextRegex = /(<[/]?span[^>]*>)/g;
  const marker = `<span id="pl-${key}">`;

  const first = html.indexOf(marker);
  if (first === -1) return html;
  nextRegex.lastIndex = first + marker.length;
  let match;
  let open = 0,
    close = 0;
  while ((match = nextRegex.exec(html))) {
    if (match[0][1] === "/") {
      close++;
      if (close > open) break;
    } else open++;
  }
  return html.slice(0, first) + value + html.slice(nextRegex.lastIndex);
}

/* istanbul ignore next */
/**
 * @deprecated Replaced by renderToStream
 */
export function pipeToNodeWritable(code, writable, options = {}) {
  if (options.onReady) {
    options.onCompleteShell = ({ write }) => {
      options.onReady({
        write,
        startWriting() {
          stream.pipe(writable);
        }
      });
    };
  }
  const stream = renderToStream(code, options);
  if (!options.onReady) stream.pipe(writable);
}

/* istanbul ignore next */
/**
 * @deprecated Replaced by renderToStream
 */
export function pipeToWritable(code, writable, options = {}) {
  if (options.onReady) {
    options.onCompleteShell = ({ write }) => {
      options.onReady({
        write,
        startWriting() {
          stream.pipeTo(writable);
        }
      });
    };
  }
  const stream = renderToStream(code, options);
  if (!options.onReady) stream.pipeTo(writable);
}
