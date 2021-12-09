import { Aliases, BooleanAttributes } from "./constants";
import { sharedConfig } from "rxcore";
import devalue from "devalue";
export { createComponent } from "rxcore";

const REPLACE_SCRIPT = `function $df(e,t){t=document.getElementById(e),document.getElementById("pl"+e).replaceWith(...t.childNodes),_$HY.set(e)}`;

export function renderToString(code, options = {}) {
  sharedConfig.context = { id: "", count: 0, suspense: {}, assets: [], nonce: options.nonce };
  let html = resolveSSRNode(escape(code()));
  return injectAssets(sharedConfig.context.assets, html);
}

export function renderToStringAsync(code, options = {}) {
  const { nonce, timeoutMs = 30000 } = options;
  const context = (sharedConfig.context = {
    id: "",
    count: 0,
    resources: {},
    suspense: {},
    assets: [],
    async: true,
    nonce
  });
  let scripts = "";
  sharedConfig.context.writeResource = (id, p) =>
    p.then(d => (scripts += `_$HY.set("${id}", ${devalue(d)});`));
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject("renderToString timed out"), timeoutMs)
  );
  return Promise.race([asyncWrap(() => escape(code())), timeout]).then(res => {
    let html = injectAssets(context.assets, resolveSSRNode(res));
    if (scripts.length) html = injectScripts(html, scripts, nonce);
    return html;
  });
}

export function renderToPipeableStream(code, options) {
  const { nonce, onCompleteShell, onCompleteAll, dataOnly } = options;
  const tmp = [];
  const tasks = [];
  const registry = new Map();
  const checkEnd = () => {
    if (!registry.size && !completed) {
      onCompleteAll && onCompleteAll(result);
      writable && writable.end();
      completed = true;
    }
  };
  const writeInitialScript = () => {
    if (tasks.length) {
      buffer.write(`<script${nonce ? ` nonce="${nonce}"` : ""}>${tasks.join(";")}</script>`);
      tasks.length = 0;
    }
    scheduled = false;
  };

  let writable;
  let completed = false;
  let scriptFlushed = false;
  let scheduled = true;
  let buffer = {
    write(payload) {
      tmp.push(payload);
    }
  };
  sharedConfig.context = {
    id: "",
    count: 0,
    async: true,
    streaming: true,
    dataOnly,
    resources: {},
    suspense: {},
    assets: [],
    nonce,
    writeResource(id, p) {
      if (!scheduled) {
        Promise.resolve().then(writeInitialScript);
        scheduled = true;
      }
      tasks.push(`_$HY.init("${id}")`);
      p.then(d => {
        buffer.write(
          `<script${nonce ? ` nonce="${nonce}"` : ""}>_$HY.set("${id}", ${devalue(d)})</script>`
        );
      });
    },
    registerFragment(key) {
      registry.set(key, []);
      if (!dataOnly) {
        if (!scheduled) {
          Promise.resolve().then(writeInitialScript);
          scheduled = true;
        }
        tasks.push(`_$HY.init("${key}")`);
      }
      return value => {
        const keys = registry.get(key);
        registry.delete(key);
        if (waitForFragments(registry, key)) return;
        if (value) {
          buffer.write(
            `<div hidden id="${key}">${value}</div><script${nonce ? ` nonce="${nonce}"` : ""}>${
              !scriptFlushed ? REPLACE_SCRIPT : ""
            }${keys.length ? keys.map(k => `_$HY.unset("${k}");`) : ""}$df("${key}")</script>`
          );
          scriptFlushed = true;
        }
        checkEnd();
      };
    }
  };

  let html = resolveSSRNode(escape(code()));
  html = injectAssets(sharedConfig.context.assets, html);
  Promise.resolve().then(() => {
    if (tasks.length) html = injectScripts(html, tasks.join(";"), nonce);
    buffer.write(html);
    tasks.length = 0;
    scheduled = false;
    onCompleteShell && onCompleteShell();
  });

  return {
    pipe(w) {
      buffer = writable = w;
      tmp.forEach(chunk => buffer.write(chunk));
      if (completed) writable.end();
      else setTimeout(checkEnd);
    }
  };
}

// Atleast until Cloudflare gets ReadableStreams
export function pipeToWritable(code, writable, options = {}) {
  const {
    nonce,
    onCompleteShell = ({ startWriting }) => startWriting(),
    onCompleteAll,
    dataOnly
  } = options;
  const tmp = [];
  const tasks = [];
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const registry = new Map();
  const checkEnd = () => {
    if (!registry.size && !completed) {
      onCompleteAll && onCompleteAll(result);
      writable && writable.close();
      completed = true;
    }
  };
  const writeInitialScript = () => {
    if (tasks.length) {
      buffer.write(
        encoder.encode(`<script${nonce ? ` nonce="${nonce}"` : ""}>${tasks.join(";")}</script>`)
      );
      tasks.length = 0;
    }
    scheduled = false;
  };

  let completed = false;
  let scriptFlushed = false;
  let scheduled = true;
  let buffer = {
    write(payload) {
      tmp.push(payload);
    }
  };

  const result = {
    startWriting() {
      buffer = writer;
      tmp.forEach(chunk => writer.write(chunk));
      setTimeout(checkEnd);
    },
    write(c) {
      writer.write(encoder.encode(c));
    },
    abort() {
      registry.clear();
      checkEnd();
    }
  };

  sharedConfig.context = {
    id: "",
    count: 0,
    async: true,
    streaming: true,
    dataOnly,
    resources: {},
    suspense: {},
    assets: [],
    nonce,
    writeResource(id, p) {
      if (!scheduled) {
        Promise.resolve().then(writeInitialScript);
        scheduled = true;
      }
      tasks.push(`_$HY.init("${id}")`);
      p.then(d => {
        buffer.write(
          encoder.encode(
            `<script${nonce ? ` nonce="${nonce}"` : ""}>_$HY.set("${id}", ${devalue(d)})</script>`
          )
        );
      });
    },
    registerFragment(key) {
      registry.set(key, []);
      if (!dataOnly) {
        if (!scheduled) {
          Promise.resolve().then(writeInitialScript);
          scheduled = true;
        }
        tasks.push(`_$HY.init("${key}")`);
      }
      return value => {
        const keys = registry.get(key);
        registry.delete(key);
        if (waitForFragments(registry, key, keys)) return;
        if (value) {
          buffer.write(
            encoder.encode(
              `<div hidden id="${key}">${value}</div><script${nonce ? ` nonce="${nonce}"` : ""}>${
                !scriptFlushed ? REPLACE_SCRIPT : ""
              }${keys.length ? keys.map(k => `_$HY.set("${k}");`) : ""}$df("${key}")</script>`
            )
          );
          scriptFlushed = true;
        }
        checkEnd();
      };
    }
  };

  let html = resolveSSRNode(escape(code()));
  html = injectAssets(sharedConfig.context.assets, html);
  Promise.resolve().then(() => {
    if (tasks.length) html = injectScripts(html, tasks.join(";"), nonce);
    buffer.write(encoder.encode(html));
    tasks.length = 0;
    scheduled = false;
    onCompleteShell && onCompleteShell(result);
  });
}

/**
 * @deprecated Replaced by renderToPipeableStream
 */
export function pipeToNodeWritable(code, writable, options = {}) {
  renderToPipeableStream(code, options).pipe(writable);
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
  if (typeof props === "function") props = props();
  // TODO: figure out how to handle props.children
  const keys = Object.keys(props);
  let result = "";
  for (let i = 0; i < keys.length; i++) {
    const prop = keys[i];
    if (prop === "children") {
      !skipChildren && console.warn(`SSR currently does not support spread children.`);
      continue;
    }
    const value = props[prop];
    if (prop === "style") {
      result += `style="${ssrStyle(value)}"`;
    } else if (prop === "classList") {
      result += `class="${ssrClassList(value)}"`;
    } else if (BooleanAttributes.has(prop)) {
      if (value) result += prop;
      else continue;
    } else if (prop === "ref" || prop.slice(0, 2) === "on") {
      continue;
    } else {
      result += `${Aliases[prop] || prop}="${escape(value, true)}"`;
    }
    if (i !== keys.length - 1) result += " ";
  }
  return result;
}

export function ssrBoolean(key, value) {
  return value ? " " + key : "";
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
  if (Array.isArray(node)) return node.map(resolveSSRNode).join("");
  if (t === "object") return resolveSSRNode(node.t);
  if (t === "function") return resolveSSRNode(node());
  return String(node);
}

export function mergeProps(...sources) {
  const target = {};
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    if (typeof source === "function") source = source();
    const descriptors = Object.getOwnPropertyDescriptors(source);
    Object.defineProperties(target, descriptors);
  }
  return target;
}

export function getHydrationKey() {
  const hydrate = sharedConfig.context;
  return hydrate && !hydrate.noHydrate && `${hydrate.id}${hydrate.count++}`;
}

export function generateHydrationScript({ eventNames = ["click", "input"], nonce }) {
  return `<script${
    nonce ? ` nonce="${nonce}"` : ""
  }>((e,t,o={})=>{t=e=>e&&e.hasAttribute&&(e.hasAttribute("data-hk")?e:t(e.host&&e.host instanceof Node?e.host:e.parentNode)),["${eventNames.join(
    '","'
  )}"].forEach((o=>document.addEventListener(o,(o=>{let n=o.composedPath&&o.composedPath()[0]||o.target,s=t(n);s&&!e.completed.has(s)&&e.events.push([s,o])})))),e.init=(e,t)=>{o[e]=[new Promise((e=>t=e)),t]},e.set=(e,t,n)=>{if(!(n=o[e]))return o[e]=[t];n[1](t)},e.unset=(e)=>{delete o[e]},e.load=(e,t)=>{if(t=o[e])return t[0]}})(window._$HY||(_$HY={events:[],completed:new WeakSet}));</script><!xs>`;
}

function injectAssets(assets, html) {
  for (let i = 0; i < assets.length; i++) {
    html = html.replace(`%%$${i}%%`, assets[i]());
  }
  return html;
}

function injectScripts(html, scripts, nonce) {
  const tag = `<script${nonce ? ` nonce="${nonce}"` : ""}>${scripts}</script>`;
  const index = html.indexOf("<!xs>");
  if (index > -1) {
    return html.slice(0, index) + tag + html.slice(index);
  }
  return html + tag;
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

const FRAGMENT_REPLACE = /<!\[([\d.]+)\]>/;
function asyncWrap(fn) {
  return new Promise(resolve => {
    const registry = new Set();
    const cache = Object.create(null);
    sharedConfig.context.registerFragment = register;
    const rendered = fn();
    if (!registry.size) resolve(rendered);
    function register(key) {
      registry.add(key);
      return value => {
        if (value) cache[key] = value;
        registry.delete(key);
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
      };
    }
  });
}
