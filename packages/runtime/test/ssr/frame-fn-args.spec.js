/**
 * @jest-environment jsdom
 *
 * Function-valued slot args. A function cannot be serialized, so a
 * function-valued arg must be a thunk producing content (or a getter
 * producing a scalar): the producer resolves it one-shot, then classifies
 * the result — content ships as a region, a scalar ships as data. This is
 * how top-level one-shot reactive control flow (`<For>`/`<Show>`, which the
 * compiler may hand over as a thunk/memo) reaches the region path, and it
 * fixes the latent bug where a function arg fell into `serialize()` and
 * broke on seroval. Covered on both the stream face (renderServerComponent)
 * and the document face (frameTransformDirectResult).
 */
import * as r from "../../src/server";
import {
  renderServerComponent,
  frameTransformDirectResult,
  ServerComponentPlugin
} from "../../src/frame-sink";

function collectStream(component, frame = { id: "f", version: 1 }) {
  return new Promise(resolve => {
    const chunks = [];
    renderServerComponent(component, { frame }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks)
    });
  });
}

function collectDocument(component, clientProps, id = "f") {
  return new Promise(resolve => {
    const Inline = frameTransformDirectResult(component, { id });
    const chunks = [];
    r.renderToStream(() => Inline(clientProps), { plugins: [ServerComponentPlugin] }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks.join(""))
    });
  });
}

// Flatten an SSR node (the `{t}` / array shapes) to its html string — enough
// to inspect what a captured region thunk would emit.
function ssrString(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(ssrString).join("");
  if (node.t !== undefined) return Array.isArray(node.t) ? node.t.map(ssrString).join("") : node.t;
  return "";
}

describe("function-valued slot args — stream face", () => {
  it("a thunk producing JSX is content: ships as a region, not serialized", async () => {
    const chunks = await collectStream(
      props => r.ssr`<div>${[props.row({ body: () => r.ssr`<p>hi</p>` })]}</div>`
    );
    const slot = chunks.find(c => c.type === "slot");
    // The arg resolved to content -> a frame ref, and its html rode a region
    // chunk addressed to the child id (NOT a serialized data arg).
    const childId = slot.args.body.$frame;
    expect(typeof childId).toBe("string");
    const region = chunks.find(c => c.type === "html" && c.id === childId);
    expect(region.html).toBe("<p>hi</p>");
  });

  it("a thunk producing an array of JSX (fragment / <For>) is content", async () => {
    const chunks = await collectStream(
      props =>
        r.ssr`<div>${[props.row({ items: () => [r.ssr`<li>a</li>`, r.ssr`<li>b</li>`] })]}</div>`
    );
    const slot = chunks.find(c => c.type === "slot");
    const childId = slot.args.items.$frame;
    expect(typeof childId).toBe("string");
    const region = chunks.find(c => c.type === "html" && c.id === childId);
    expect(region.html).toBe("<li>a</li><li>b</li>");
  });

  it("a getter producing a scalar is data: ships as the arg value", async () => {
    const chunks = await collectStream(
      props => r.ssr`<div>${[props.row({ n: () => 5, label: () => "hi" })]}</div>`
    );
    const slot = chunks.find(c => c.type === "slot");
    expect(slot.args.n).toBe(5);
    expect(slot.args.label).toBe("hi");
    // No stray region chunks for scalar args.
    expect(chunks.filter(c => c.type === "html").length).toBe(1); // just the root
  });

  it("unwraps a nested thunk (thunk returning a thunk) before classifying", async () => {
    const chunks = await collectStream(
      props => r.ssr`<div>${[props.row({ body: () => () => r.ssr`<p>deep</p>` })]}</div>`
    );
    const slot = chunks.find(c => c.type === "slot");
    const region = chunks.find(c => c.type === "html" && c.id === slot.args.body.$frame);
    expect(region.html).toBe("<p>deep</p>");
  });
});

describe("async slot args — value tier (DR-2)", () => {
  it("a promise arg ships as a data ref and streams its resolution before complete", async () => {
    let resolveIt;
    const p = new Promise(r => (resolveIt = r));
    const pending = collectStream(props => r.ssr`<div>${[props.row({ value: p })]}</div>`);
    // The record must not wait for the promise: release it after a tick.
    await Promise.resolve();
    resolveIt("later");
    const chunks = await pending;
    const slot = chunks.find(c => c.type === "slot");
    expect(slot.args.value.$ref).toBe("arg:row#0:value");
    // Seroval streamed the resolution as data chunks keyed to the arg ref.
    const dataChunks = chunks.filter(c => c.type === "data" && c.key === "arg:row#0:value");
    expect(dataChunks.length).toBeGreaterThan(1); // initial pending node + resolution patch
    expect(JSON.stringify(dataChunks.map(c => c.node))).toContain("later");
    // Order: the slot record shipped before the resolution patch, complete after.
    const slotIdx = chunks.indexOf(slot);
    const patchIdx = chunks.indexOf(dataChunks[dataChunks.length - 1]);
    const completeIdx = chunks.findIndex(c => c.type === "complete");
    expect(slotIdx).toBeLessThan(patchIdx);
    expect(patchIdx).toBeLessThan(completeIdx);
  });

  it("a not-ready thunk ships the record immediately and settles at first success", async () => {
    // An async-memo-shaped arg: throws not-ready (error with a blocking
    // promise, the ssrHandleError convention) until the source settles.
    let release;
    const source = new Promise(r => (release = r));
    let ready = false;
    source.then(() => (ready = true));
    const memoLike = () => {
      if (!ready) {
        const err = new Error("not ready");
        err._promise = source;
        throw err;
      }
      return "settled!";
    };
    const pending = collectStream(
      props => r.ssr`<div>${[props.row({ value: memoLike, plain: 1 })]}</div>`
    );
    await Promise.resolve();
    release();
    const chunks = await pending;
    // The stream did not error and did not hold: the slot record shipped
    // with the sibling arg intact and the not-ready arg as a pending ref.
    expect(chunks.find(c => c.type === "error")).toBeUndefined();
    const slot = chunks.find(c => c.type === "slot");
    expect(slot.args.plain).toBe(1);
    expect(slot.args.value.$ref).toBe("arg:row#0:value");
    // The settled value rode the data channel before complete.
    const dataChunks = chunks.filter(c => c.type === "data" && c.key === "arg:row#0:value");
    expect(JSON.stringify(dataChunks.map(c => c.node))).toContain("settled!");
    const completeIdx = chunks.findIndex(c => c.type === "complete");
    expect(chunks.indexOf(dataChunks[dataChunks.length - 1])).toBeLessThan(completeIdx);
  });

  it("a thunk that stays not-ready until the source rejects settles the arg as rejected", async () => {
    let reject;
    const source = new Promise((_, rj) => (reject = rj));
    // A real async memo re-throws the underlying error on the re-pull after
    // its source rejects (not another not-ready).
    let failed = null;
    source.catch(e => (failed = e));
    const memoLike = () => {
      if (failed) throw failed;
      const err = new Error("not ready");
      err._promise = source;
      throw err;
    };
    const pending = collectStream(props => r.ssr`<div>${[props.row({ value: memoLike })]}</div>`);
    await Promise.resolve();
    reject(new Error("boom"));
    const chunks = await pending;
    // No stream-level error; the arg's promise rejects through the data
    // channel (seroval serializes rejections) and the stream completes.
    const slot = chunks.find(c => c.type === "slot");
    expect(slot.args.value.$ref).toBe("arg:row#0:value");
    expect(chunks.findIndex(c => c.type === "complete")).toBe(chunks.length - 1);
    const dataChunks = chunks.filter(c => c.type === "data" && c.key === "arg:row#0:value");
    expect(JSON.stringify(dataChunks.map(c => c.node))).toContain("boom");
  });
});

describe("function-valued slot args — document face (t=0)", () => {
  it("a thunk producing JSX renders inline as a region element when the wrapper uses it", async () => {
    const html = await collectDocument(
      props => r.ssr`<article>${[props.row({ body: () => r.ssr`<p>hi</p>` })]}</article>`,
      { row: p => r.ssr`<div class="row">${p.body}</div>` }
    );
    // Rendered inline as a region element, content present once, not serialized.
    expect(html).toContain('<dx-frame data-fid="f.row#0.body"');
    expect(html.split("hi").length).toBe(2);
  });

  it("an occluded thunk-content ships once as a region record (not markup)", async () => {
    const html = await collectDocument(
      // The wrapper does NOT render p.body -> the region is occluded.
      props => r.ssr`<article>${[props.row({ body: () => r.ssr`<p>secret</p>` })]}</article>`,
      { row: () => r.ssr`<div class="row">shown</div>` }
    );
    // Occluded content is serialized once as a region record, absent from markup.
    expect(html).toContain('"sc:region:f.row#0.body"');
    expect(html.split("secret").length).toBe(2); // once, in the record
    expect(html).not.toContain("<p>secret</p>"); // not in markup
  });

  it("a getter producing a scalar arms as data", async () => {
    const html = await collectDocument(
      props => r.ssr`<article>${[props.row({ n: () => 7 })]}</article>`,
      { row: () => r.ssr`<div class="row">x</div>` }
    );
    expect(html).toContain('"sc:slot:f:row#0"');
    expect(html).toContain("n:7");
  });

  it("locks an occluded region so a late (async) placement cannot double-ship it", async () => {
    // The usage flip runs synchronously right after the wrapper returns: a
    // region the wrapper hasn't placed yet is deemed occluded and serialized
    // once as data. But a wrapper that places the region behind an async
    // boundary calls its thunk LATER — after the flip. Without a lock that late
    // call re-emits the content as markup, so the same content ships BOTH as a
    // data record and inline: a single-copy violation. The lock makes the late
    // call contribute nothing (identical to a never-placed region — the client
    // mounts it from the record).
    let placeLate;
    const html = await collectDocument(
      props => r.ssr`<article>${[props.row({ body: () => r.ssr`<p>secret</p>` })]}</article>`,
      {
        // Capture the region thunk but don't place it synchronously (as if it
        // were behind a Suspense that resolves after the shell flush).
        row: resolved => {
          placeLate = resolved.body;
          return r.ssr`<div class="row">shown</div>`;
        }
      }
    );
    // Occluded at the sync boundary: shipped once as a region record.
    expect(html).toContain('"sc:region:f.row#0.body"');
    expect(html).not.toContain("<p>secret</p>");

    // The late placement runs after the flip locked the region. It must not
    // re-emit the content — no double-ship.
    const lateHtml = ssrString(placeLate());
    expect(lateHtml).not.toContain("secret");
    expect(lateHtml).not.toContain("dx-frame");
  });

  it("a synchronously placed region still ships inline (the lock does not fire)", async () => {
    // Control: the common case is unchanged — a region the wrapper places
    // during its own render is used before the flip, never locked, ships as
    // content, and is not also serialized.
    const html = await collectDocument(
      props => r.ssr`<article>${[props.row({ body: () => r.ssr`<p>shown</p>` })]}</article>`,
      { row: resolved => r.ssr`<div class="row">${resolved.body}</div>` }
    );
    expect(html).toContain("<p>shown</p>");
    expect(html).not.toContain('"sc:region:f.row#0.body"');
  });
});
