import { Aliases } from "../constants";

// SSR
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
      } else {
        result += `${Aliases[prop] || prop}="${escape(value, true)}"`;
      }
      if (i !== keys.length - 1) result += " ";
    }
    return result;
  };
}

export function escape(s, attr) {
  if (typeof s !== "string") return s;
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

export function generateHydrationScript({
  eventNames = ["click", "input", "blur"],
  streaming,
  resolved
} = {}) {
  let s = `(()=>{_$HYDRATION={events:[],completed:new WeakSet};const t=e=>e&&e.hasAttribute&&(e.hasAttribute("data-hk")&&e||t(e.host&&e.host instanceof Node?e.host:e.parentNode)),e=e=>{let o=e.composedPath&&e.composedPath()[0]||e.target,s=t(o);s&&!_$HYDRATION.completed.has(s)&&_$HYDRATION.events.push([s,e])};["${eventNames.join(
    '","'
  )}"].forEach(t=>document.addEventListener(t,e))})();`;
  if (streaming) {
    s += `(()=>{const e=_$HYDRATION,r={};let o=0;e.resolveResource=((e,o)=>{const t=r[e];if(!t)return r[e]=o;delete r[e],t(o)}),e.loadResource=(()=>{const e=++o,t=r[e];if(!t){let o,t=new Promise(e=>o=e);return r[e]=o,t}return delete r[e],Promise.resolve(t)})})();`;
  }
  if (resolved)
    s += `_$HYDRATION.resources = JSON.parse('${JSON.stringify(_$HYDRATION.resources || {})}');`;
  return s;
}