import { Readable } from "stream";

const hydration = globalThis._$HYDRATION || (globalThis._$HYDRATION = {});

export function renderToNodeStream(code) {
  const stream = new Readable({
    read() {}
  });
  hydration.context = { id: "0", count: 0 };
  let count = 0,
    completed = 0;
  hydration.register = p => {
    const id = ++count;
    p.then(d => {
      stream.push(`<script>_$HYDRATION.resolveResource(${id}, ${d})</script>`);
      if (completed === count) stream.push(null);
    });
  };
  stream.push(code());
  delete hydration.context;
  return stream;
}
