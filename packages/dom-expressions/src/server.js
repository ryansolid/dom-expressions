import { Aliases, BooleanAttributes } from "./constants";
import { sharedConfig, asyncWrap } from "rxcore";
import devalue from "devalue";
export { createComponent } from "rxcore";

export function renderToString(code, options = {}) {
  sharedConfig.context = Object.assign({ id: "", count: 0, assets: [] }, options);
  let html = resolveSSRNode(escape(code()));
  return injectAssets(sharedConfig.context.assets, html);
}

export function renderToStringAsync(code, options = {}) {
  options = { timeoutMs: 30000, ...options };
  const context = (sharedConfig.context = Object.assign(
    {
      id: "",
      count: 0,
      resources: {},
      suspense: {},
      assets: [],
      async: true
    },
    options
  ));
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject("renderToString timed out"), options.timeoutMs)
  );
  return Promise.race([asyncWrap(() => escape(code())), timeout]).then(res => {
    let html = resolveSSRNode(res);
    return injectAssets(context.assets, html);
  });
}

export function pipeToNodeWritable(code, writable, options = {}) {
  const { nonce, onReady = ({ startWriting }) => startWriting(), onComplete } = options;
  const tmp = [];
  let count = 0,
    completed = 0,
    buffer = {
      write(payload) {
        tmp.push(payload);
      }
    };
  const result = {
    startWriting() {
      buffer = writable;
      tmp.forEach(chunk => buffer.write(chunk));
      setTimeout(checkEnd);
    },
    write(c) {
      writable.write(c);
    },
    abort() {
      completed = count;
      checkEnd();
    }
  };
  const checkEnd = () => {
    if (completed === count) {
      onComplete && onComplete(result);
      writable.end();
    }
  };

  sharedConfig.context = Object.assign(
    { id: "", count: 0, streaming: true, suspense: {}, assets: [] },
    options
  );
  sharedConfig.context.writeResource = (id, p) => {
    count++;
    Promise.resolve().then(() =>
      buffer.write(
        `<script${nonce ? ` nonce="${nonce}"` : ""}>_$HYDRATION.startResource("${id}")</script>`
      )
    );
    p.then(d => {
      buffer.write(
        `<script${nonce ? ` nonce="${nonce}"` : ""}>_$HYDRATION.resolveResource("${id}", ${devalue(
          d
        )})</script>`
      );
      ++completed && checkEnd();
    });
  };

  let html = resolveSSRNode(escape(code()));
  html = injectAssets(sharedConfig.context.assets, html);
  buffer.write(html);
  onReady(result);
}

export function pipeToWritable(code, writable, options = {}) {
  const { nonce, onReady = ({ startWriting }) => startWriting(), onComplete } = options;
  const tmp = [];
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  sharedConfig.context = Object.assign(
    { id: "", count: 0, streaming: true, suspense: {}, assets: [] },
    options
  );
  let count = 0,
    completed = 0,
    buffer = {
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
      completed = count;
      checkEnd();
    }
  };
  const checkEnd = () => {
    if (completed === count) {
      onComplete && onComplete(result);
      writable.close();
    }
  };

  sharedConfig.context.writeResource = (id, p) => {
    count++;
    Promise.resolve().then(() =>
      buffer.write(
        encoder.encode(
          `<script${nonce ? ` nonce="${nonce}"` : ""}>_$HYDRATION.startResource("${id}")</script>`
        )
      )
    );
    p.then(d => {
      buffer.write(
        encoder.encode(
          `<script${
            nonce ? ` nonce="${nonce}"` : ""
          }>_$HYDRATION.resolveResource("${id}", ${devalue(d)})</script>`
        )
      );
      ++completed && checkEnd();
    });
  };

  let html = resolveSSRNode(escape(code()));
  html = injectAssets(sharedConfig.context.assets, html);
  buffer.write(encoder.encode(html));
  onReady(result);
}

// components
export function Assets(props) {
  sharedConfig.context.assets.push(() => NoHydration({
    get children() {
      return resolveSSRNode(props.children);
    }
  }));
  return ssr(`%%$${sharedConfig.context.assets.length - 1}%%`);
}

export function HydrationScript() {
  sharedConfig.context.assets.push(generateHydrationScript);
  return ssr(`%%$${sharedConfig.context.assets.length - 1}%%`);
}

export function NoHydration(props) {
  const c = sharedConfig.context;
  delete sharedConfig.context;
  const children = props.children;
  sharedConfig.context = c;
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
    const descriptors = Object.getOwnPropertyDescriptors(sources[i]);
    Object.defineProperties(target, descriptors);
  }
  return target;
}

export function getHydrationKey() {
  const hydrate = sharedConfig.context;
  return hydrate && `${hydrate.id}${hydrate.count++}`;
}

export function generateHydrationScript() {
  const { nonce, streaming, resources, eventNames = ["click", "input"] } = sharedConfig.context;
  let s = `<script${
    nonce ? ` nonce="${nonce}"` : ""
  }>(()=>{_$HYDRATION={events:[],completed:new WeakSet};const t=e=>e&&e.hasAttribute&&(e.hasAttribute("data-hk")&&e||t(e.host&&e.host instanceof Node?e.host:e.parentNode)),e=e=>{let o=e.composedPath&&e.composedPath()[0]||e.target,s=t(o);s&&!_$HYDRATION.completed.has(s)&&_$HYDRATION.events.push([s,e])};["${eventNames.join(
    '","'
  )}"].forEach(t=>document.addEventListener(t,e))})();`;
  if (streaming) {
    s += `(()=>{const e=_$HYDRATION,o={};e.startResource=e=>{let r;o[e]=[new Promise(e=>r=e),r]},e.resolveResource=(e,r)=>{const n=o[e];if(!n)return o[e]=[r];n[1](r)},e.loadResource=e=>{const r=o[e];if(r)return r[0]}})();`;
  }
  if (resources) {
    s += `_$HYDRATION.resources = ${devalue(
      Object.keys(resources).reduce((r, k) => {
        r[k] = resources[k].data;
        return r;
      }, {})
    )};`;
  }
  return s + `</script>`;
}

function injectAssets(assets, html) {
  for (let i = 0; i < assets.length; i++) {
    html = html.replace(`%%$${i}%%`, assets[i]());
  }
  return html;
}
