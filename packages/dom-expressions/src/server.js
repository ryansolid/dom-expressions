import { Readable } from "stream";
import { Aliases, BooleanAttributes } from "./constants";
import { sharedConfig, asyncWrap } from "rxcore";
export { createComponent } from "rxcore";

export function renderToString(code, options = {}) {
  sharedConfig.context = { id: "", count: 0 };
  return { html: resolveSSRNode(code()), script: generateHydrationScript(options) };
}

export function renderToStringAsync(code, options = {}) {
  options = { timeoutMs: 30000, ...options };
  let resources;
  sharedConfig.context = {
    id: "",
    count: 0,
    resources: (resources = {}),
    suspense: {},
    async: true
  };
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject("renderToString timed out"), options.timeoutMs)
  );
  return Promise.race([asyncWrap(code), timeout]).then(res => {
    return {
      html: resolveSSRNode(res),
      script: generateHydrationScript({ resources, ...options })
    };
  });
}

export function renderToNodeStream(code, options = {}) {
  const stream = new Readable({
    read() {}
  });
  sharedConfig.context = { id: "", count: 0, streaming: true, suspense: {} };
  let count = 0,
    completed = 0,
    checkEnd = () => {
      if (completed === count) stream.push(null);
    };
  sharedConfig.context.writeResource = (id, p) => {
    count++;
    Promise.resolve().then(() =>
      stream.push(
        `<script${
          options.nonce ? ` nonce="${options.nonce}"` : ""
        }>_$HYDRATION.startResource("${id}")</script>`
      )
    );
    p.then(d => {
      stream.push(
        `<script${
          options.nonce ? ` nonce="${options.nonce}"` : ""
        }>_$HYDRATION.resolveResource("${id}", ${JSON.stringify(d)
          .replace(/'/g, "\\'")
          .replace(/\\\"/g, '\\\\\\"')})</script>`
      );
      ++completed && checkEnd();
    });
  };
  stream.push(resolveSSRNode(code()));
  setTimeout(checkEnd);
  return { stream, script: generateHydrationScript({ streaming: true, ...options }) };
}

export function renderToWebStream(code, options = {}) {
  let checkEnd;
  const tmp = [];
  const encoder = new TextEncoder();
  const done = new Promise(resolve => {
    checkEnd = () => {
      if (completed === count) resolve();
    };
  });
  sharedConfig.context = { id: "", count: 0, streaming: true };
  let count = 0,
    completed = 0,
    writer = {
      write(payload) {
        tmp.push(payload);
      }
    };
  sharedConfig.context.writeResource = (id, p) => {
    count++;
    Promise.resolve().then(() =>
      writer.write(
        encoder.encode(
          `<script${
            options.nonce ? ` nonce="${options.nonce}"` : ""
          }>_$HYDRATION.startResource("${id}")</script>`
        )
      )
    );
    p.then(d => {
      writer.write(
        encoder.encode(
          `<script${
            options.nonce ? ` nonce="${options.nonce}"` : ""
          }>_$HYDRATION.resolveResource("${id}", ${JSON.stringify(d)
            .replace(/'/g, "\\'")
            .replace(/\\\"/g, '\\\\\\"')})</script>`
        )
      );
      ++completed && checkEnd();
    });
  };
  writer.write(encoder.encode(resolveSSRNode(code())));
  return {
    writeTo(w) {
      writer = w;
      tmp.map(chunk => writer.write(chunk));
      setTimeout(checkEnd);
      return done;
    },
    script: generateHydrationScript({ streaming: true, ...options })
  };
}

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

export function escape(s, attr) {
  const t = typeof s;
  if (t !== "string") {
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
    const descriptors = Object.getOwnPropertyDescriptors(sources[i]);
    Object.defineProperties(target, descriptors);
  }
  return target;
}

export function getHydrationKey() {
  const hydrate = sharedConfig.context;
  return `${hydrate.id}${hydrate.count++}`;
}

function generateHydrationScript({
  eventNames = ["click", "input"],
  streaming,
  resources,
  nonce
} = {}) {
  let s = `<script${
    nonce ? ` nonce="${nonce}"` : ""
  }>(()=>{_$HYDRATION={events:[],completed:new WeakSet};const t=e=>e&&e.hasAttribute&&(e.hasAttribute("data-hk")&&e||t(e.host&&e.host instanceof Node?e.host:e.parentNode)),e=e=>{let o=e.composedPath&&e.composedPath()[0]||e.target,s=t(o);s&&!_$HYDRATION.completed.has(s)&&_$HYDRATION.events.push([s,e])};["${eventNames.join(
    '","'
  )}"].forEach(t=>document.addEventListener(t,e))})();`;
  if (streaming) {
    s += `(()=>{const e=_$HYDRATION,o={};e.startResource=e=>{let r;o[e]=[new Promise(e=>r=e),r]},e.resolveResource=(e,r)=>{const n=o[e];if(!n)return o[e]=[r];n[1](r)},e.loadResource=e=>{const r=o[e];if(r)return r[0]}})();`;
  }
  if (resources)
    s += `_$HYDRATION.resources = JSON.parse('${JSON.stringify(
      Object.keys(resources).reduce((r, k) => {
        r[k] = resources[k].data;
        return r;
      }, {})
    )
      .replace(/'/g, "\\'")
      .replace(/\\\"/g, '\\\\\\"')}');`;
  return s + `</script>`;
}
