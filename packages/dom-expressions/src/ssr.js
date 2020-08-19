import { Readable } from "stream";

const hydration = globalThis._$HYDRATION || (globalThis._$HYDRATION = {});

export function renderToNodeStream(code) {
  const stream = new Readable({
    read() {}
  });
  hydration.context = { id: "0", count: 0 };
  let count = 0,
    completed = 0,
    checkEnd = () => {
      if (completed === count) {
        stream.push(null);
        delete hydration.context;
      }
    };
  hydration.register = p => {
    const id = ++count;
    p.then(d => {
      stream.push(`<script>_$HYDRATION.resolveResource(${id}, ${d})</script>`);
      ++completed && checkEnd();
    });
  };
  stream.push(resolveSSRNode(code()));
  setTimeout(checkEnd);
  return stream;
}

export function renderToString(code) {
  hydration.context = { id: "0", count: 0 };
  return resolveSSRNode(code());
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

function resolveSSRNode(node) {
  if (Array.isArray(node)) return node.map(resolveSSRNode).join("");
  const t = typeof node;
  if (node && t === "object") return resolveSSRNode(node.t);
  if (t === "function") return resolveSSRNode(node());
  return t === "string" ? node : JSON.stringify(node);
}
