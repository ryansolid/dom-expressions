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

  it("throws when pipe/pipeTo follow a readable claim", async () => {
    const viaPipe = r.renderToStream(Comp);
    const readable = viaPipe.readable;
    expect(() => viaPipe.pipe({ write() {}, end() {} })).toThrow(
      "renderToStream result was already consumed via `readable`; cannot also consume it via `pipe`."
    );

    const viaPipeTo = r.renderToStream(Comp);
    void viaPipeTo.readable;
    expect(() => viaPipeTo.pipeTo(new WritableStream())).toThrow(
      "renderToStream result was already consumed via `readable`; cannot also consume it via `pipeTo`."
    );

    // the original claim keeps working
    expect(concatToString(await readAllBytes(readable))).toBe(fixture);
  });

  it("throws when readable follows a pipe/pipeTo claim", async () => {
    const viaPipe = r.renderToStream(Comp);
    viaPipe.pipe({ write() {}, end() {} });
    expect(() => viaPipe.readable).toThrow(
      "renderToStream result was already consumed via `pipe`; cannot also consume it via `readable`."
    );

    const viaPipeTo = r.renderToStream(Comp);
    const piped = viaPipeTo.pipeTo(new WritableStream({ write() {} }));
    expect(() => viaPipeTo.readable).toThrow(
      "renderToStream result was already consumed via `pipeTo`; cannot also consume it via `readable`."
    );
    await piped;
  });

  it("survives cancellation of the readable", async () => {
    const unhandled = [];
    const onUnhandled = reason => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const stream = asyncComp().readable;
      const reader = stream.getReader();
      await reader.read();
      await reader.cancel("client went away");
      // Let the rest of the render (the late hole) settle against the
      // cancelled stream.
      await new Promise(resolve => setTimeout(resolve, 20));
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
    expect(unhandled).toEqual([]);
  });

  it("survives a failing pipeTo sink", async () => {
    const unhandled = [];
    const onUnhandled = reason => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const settled = await asyncComp().pipeTo(
        new WritableStream({
          write() {
            throw new Error("sink failed");
          }
        })
      );
      expect(settled).toBeUndefined();
      await new Promise(resolve => setTimeout(resolve, 20));
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
    expect(unhandled).toEqual([]);
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
