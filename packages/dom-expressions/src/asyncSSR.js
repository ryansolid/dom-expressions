import { root, memo } from "rxcore";
import { insert } from "./runtime";

export function renderToString(code, options = {}) {
  options = { timeoutMs: 30000, ...options };
  const hydration = globalThis._$HYDRATION || (globalThis._$HYDRATION = {});
  hydration.context = { id: "0", count: 0 };
  hydration.resources = {};
  hydration.asyncSSR = true;
  return root(() => {
    const rendered = code();
    if (typeof rendered === "object" && "then" in rendered) {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject("renderToString timed out"), options.timeoutMs)
      );
      return Promise.race([rendered, timeout]).then(resolveSSRNode);
    }
    return resolveSSRNode(rendered);
  });
}

export function renderDOMToString(code, options = {}) {
  options = { timeoutMs: 30000, ...options };
  const hydration = globalThis._$HYDRATION || (globalThis._$HYDRATION = {});
  hydration.context = { id: "0", count: 0 };
  hydration.resources = {};
  hydration.asyncSSR = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  return root(d1 => {
    const rendered = code();

    function resolve(rendered) {
      root(d2 => (insert(container, rendered), d1(), d2()));
      const html = container.innerHTML;
      document.body.removeChild(container);
      return html;
    }

    if (typeof rendered === "object" && "then" in rendered) {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject("renderToString timed out"), options.timeoutMs)
      );
      return Promise.race([rendered, timeout]).then(resolve);
    }
    return resolve(rendered);
  });
}

export function ssr(t, ...nodes) {
  if (!nodes.length) return { t };

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (typeof n === "function") nodes[i] = memo(() => resolveSSRNode(n()));
  }

  return {
    t: () => {
      let result = "";
      for (let i = 0; i < t.length; i++) {
        result += t[i];
        const node = nodes[i];
        if (node !== undefined) result += resolveSSRNode(node);
      }
      return result;
    }
  };
}

export function resolveSSRNode(node) {
  if (Array.isArray(node)) return node.map(resolveSSRNode).join("");
  const t = typeof node;
  if (node && t === "object") return resolveSSRNode(node.t);
  if (t === "function") return resolveSSRNode(node());
  return t === "string" ? node : JSON.stringify(node);
}
