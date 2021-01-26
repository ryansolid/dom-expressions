import { Readable } from "stream";
import { Aliases, BooleanAttributes } from "./constants";
import { sharedConfig } from "rxcore";
export { createComponent } from "rxcore";
export { assignProps, dynamicProperty, getHydrationKey } from "./shared";

export function renderToString(code, options = {}) {
  sharedConfig.context = { id: "", count: 0 };
  return resolveSSRNode(code()) + generateHydrationScript(options);
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
  return Promise.race([code(), timeout]).then(res => {
    return resolveSSRNode(res) + generateHydrationScript({ resources, ...options });
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
      if (completed === count) {
        stream.push(null);
        delete sharedConfig.context;
      }
    };
  sharedConfig.context.writeResource = (id, p) => {
    count++;
    p.then(d => {
      stream.push( `<script>_$HYDRATION.resolveResource("${id}", ${JSON.stringify(d)
        .replace(/'/g, "\\'")
        .replace(/\\\"/g, '\\\\\\"')})</script>`);
      ++completed && checkEnd();
    });
  };
  stream.push(resolveSSRNode(code()) + generateHydrationScript({ streaming: true, ...options }));
  setTimeout(checkEnd);
  return stream;
}

export function renderToWebStream(code, options = {}) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  sharedConfig.context = { id: "", count: 0, streaming: true };
  let count = 0,
    completed = 0,
    checkEnd = () => {
      if (sharedConfig.context && completed === count) {
        writer.close();
        delete sharedConfig.context;
      }
    };
  sharedConfig.context.writeResource = (id, p) => {
    count++;
    p.then(d => {
      writer.write(
        encoder.encode(
          `<script>_$HYDRATION.resolveResource("${id}", ${JSON.stringify(d)
            .replace(/'/g, "\\'")
            .replace(/\\\"/g, '\\\\\\"')})</script>`
        )
      );
      ++completed && checkEnd();
    });
  };
  writer.write(
    encoder.encode(
      resolveSSRNode(code()) + generateHydrationScript({ streaming: true, ...options })
    )
  );
  setTimeout(checkEnd);
  return readable;
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

export function ssrSpread(props) {
  return () => {
    if (typeof props === "function") props = props();
    // TODO: figure out how to handle props.children
    const keys = Object.keys(props);
    let result = "";
    for (let i = 0; i < keys.length; i++) {
      const prop = keys[i];
      if (prop === "children") {
        console.warn(`SSR currently does not support spread children.`);
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
  };
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

function generateHydrationScript({
  eventNames = ["click", "input", "blur"],
  streaming,
  resources
} = {}) {
  let s = `<script>(()=>{_$HYDRATION={events:[],completed:new WeakSet};const t=e=>e&&e.hasAttribute&&(e.hasAttribute("data-hk")&&e||t(e.host&&e.host instanceof Node?e.host:e.parentNode)),e=e=>{let o=e.composedPath&&e.composedPath()[0]||e.target,s=t(o);s&&!_$HYDRATION.completed.has(s)&&_$HYDRATION.events.push([s,e])};["${eventNames.join(
    '","'
  )}"].forEach(t=>document.addEventListener(t,e))})();`;
  if (streaming) {
    s += `(()=>{const e=_$HYDRATION,r={};let o=0;e.resolveResource=((e,o)=>{const t=r[e];if(!t)return r[e]=o;delete r[e],t(o)}),e.loadResource=(()=>{const e=++o,t=r[e];if(!t){let o,t=new Promise(e=>o=e);return r[e]=o,t}return delete r[e],Promise.resolve(t)})})();`;
  }
  if (resources)
    s += `_$HYDRATION.resources = JSON.parse('${JSON.stringify(resources || {})
      .replace(/'/g, "\\'")
      .replace(/\\\"/g, '\\\\\\"')}');`;
  return s + `</script>`;
}
