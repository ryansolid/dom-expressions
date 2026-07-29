/**
 * @jest-environment node
 *
 * renderToStream().readable — the lazy, cached ReadableStream<Uint8Array>
 * view of the render. Runs under the node environment for the real
 * TransformStream / TextEncoder / Response globals (pipeTo encodes chunks
 * itself, so the readable side must yield Response-body-ready bytes).
 */
import * as r from "../../src/server";

const Comp = () => {
  const greeting = "Hello",
    name = "<div/>";
  return r.ssrElement(
    "span",
    { class: ["Hello", { John: true }] },
    ` ${r.escape(greeting)} ${r.escape(name)} `,
    true
  );
};
const fixture = `<span _hk=0 class="Hello John"> Hello &lt;div/> </span>`;

function asyncError() {
  let resolve;
  const promise = new Promise(r => (resolve = r));
  const err = new Error("async");
  err._promise = promise;
  return { err, resolve };
}

// A render with a genuinely-pending hole: content arrives across multiple
// flushes, exercising post-shell writes through the readable.
function asyncComp() {
  const gate = asyncError();
  let calls = 0;
  const stream = r.renderToStream(() => {
    return r.ssr`<div>${() => {
      if (++calls === 1) throw gate.err;
      return "late";
    }}</div>`;
  });
  setTimeout(() => gate.resolve(), 5);
  return stream;
}

async function readAllBytes(readable) {
  const reader = readable.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return chunks;
}

function concatToString(chunks) {
  const decoder = new TextDecoder();
  return chunks.map(c => decoder.decode(c, { stream: true })).join("") + decoder.decode();
}

describe("renderToStream readable", () => {
  it("produces the full document as Uint8Array bytes", async () => {
    const chunks = await readAllBytes(r.renderToStream(Comp).readable);
    for (const chunk of chunks) expect(chunk).toBeInstanceOf(Uint8Array);
    expect(concatToString(chunks)).toBe(fixture);
  });

  it("emits identical content to pipeTo into a manual sink", async () => {
    const piped = [];
    await r.renderToStream(Comp).pipeTo(
      new WritableStream({
        write(chunk) {
          piped.push(chunk);
        }
      })
    );
    const read = await readAllBytes(r.renderToStream(Comp).readable);
    expect(concatToString(read)).toBe(concatToString(piped));
  });

  it("returns the same cached stream on repeated access", () => {
    const stream = r.renderToStream(Comp);
    const first = stream.readable;
    expect(first).toBeInstanceOf(ReadableStream);
    expect(stream.readable).toBe(first);
  });

  it("streams async content resolved after the shell", async () => {
    const html = concatToString(await readAllBytes(asyncComp().readable));
    expect(html).toContain("<div>");
    expect(html).toContain("late");
  });

  it("works as a Response body", async () => {
    const response = new Response(asyncComp().readable, {
      headers: { "content-type": "text/html" }
    });
    const html = await response.text();
    expect(html).toContain("<div>");
    expect(html).toContain("late");
  });
});
