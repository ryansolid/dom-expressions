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

  it("an async-iterable arg ships as a data ref and streams every yield before complete", async () => {
    // The token-stream shape: an async iterable passed WHOLE. The record
    // must not wait on the iterator; each yield rides the data channel as a
    // seroval enqueue patch, and the stream holds `complete` until the
    // iterator finishes (the client's read follows the yields live).
    const results = [];
    const source = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise(res => results.push(res))
      })
    };
    const pending = collectStream(props => r.ssr`<div>${[props.row({ tokens: source })]}</div>`);
    await Promise.resolve();
    results.shift()({ value: "Hello", done: false });
    await Promise.resolve();
    results.shift()({ value: "Hello world", done: false });
    await Promise.resolve();
    results.shift()({ value: undefined, done: true });
    const chunks = await pending;
    const slot = chunks.find(c => c.type === "slot");
    expect(slot.args.tokens.$ref).toBe("arg:row#0:tokens");
    const dataChunks = chunks.filter(c => c.type === "data" && c.key === "arg:row#0:tokens");
    const payload = JSON.stringify(dataChunks.map(c => c.node));
    expect(payload).toContain("Hello");
    expect(payload).toContain("Hello world");
    // The initial pending node emits as the arg classifies (before the slot
    // record — the ref must exist before the record naming it); the yields
    // patch after, and complete ships after the last.
    expect(chunks.indexOf(slot)).toBeLessThan(chunks.indexOf(dataChunks[dataChunks.length - 1]));
    const completeIdx = chunks.findIndex(c => c.type === "complete");
    expect(chunks.indexOf(dataChunks[dataChunks.length - 1])).toBeLessThan(completeIdx);
  });
});

describe("watched slot args — expression bindings (DR-2 case 1)", () => {
  // The compiled form of `<props.slot thing={thing()} />` is a props object
  // with a GETTER per dynamic expression — the same shape solid compiles for
  // any component. These args are re-runnable: the producer opens a binding
  // at emission and re-evaluates it at every commit the response observes,
  // re-emitting the occurrence's record when the value changed. Eagerly
  // evaluated call-expression args (`props.slot({ thing: thing() })`) stay
  // write-once by JS semantics — nothing here changes that.

  it("a not-ready compiled getter ships the record immediately and settles (getter form of the retry loop)", async () => {
    // The getter twin of the not-ready thunk test above. `raw[key]` THROWS
    // for a compiled getter (the thunk form merely returns the function), so
    // the catch path must capture the getter without re-evaluating it.
    let release;
    const source = new Promise(r => (release = r));
    let ready = false;
    source.then(() => (ready = true));
    const raw = {
      plain: 1,
      get value() {
        if (!ready) {
          const err = new Error("not ready");
          err._promise = source;
          throw err;
        }
        return "settled!";
      }
    };
    const pending = collectStream(props => r.ssr`<div>${[props.row(raw)]}</div>`);
    await Promise.resolve();
    release();
    const chunks = await pending;
    expect(chunks.find(c => c.type === "error")).toBeUndefined();
    const slot = chunks.find(c => c.type === "slot");
    expect(slot.args.plain).toBe(1);
    expect(slot.args.value.$ref).toBe("arg:row#0:value");
    const dataChunks = chunks.filter(c => c.type === "data" && c.key === "arg:row#0:value");
    expect(JSON.stringify(dataChunks.map(c => c.node))).toContain("settled!");
    expect(chunks.findIndex(c => c.type === "complete")).toBe(chunks.length - 1);
  });

  it("a getter arg stays live within the response: a commit re-emits the record", async () => {
    // The Q1 shape: the getter succeeds at emission, then its value changes
    // when async work commits later in the same response. The commit (the
    // serialized promise's resolution flushing through the sink) sweeps the
    // ledger; the changed value re-emits the occurrence's record and the
    // client's live props update in place.
    let n = 1;
    let resolveGate;
    const gate = new Promise(r => (resolveGate = r));
    const pending = collectStream(
      props =>
        r.ssr`<div>${[
          props.row({
            gate,
            get n() {
              return n;
            }
          })
        ]}</div>`
    );
    await Promise.resolve();
    n = 2;
    resolveGate("done");
    const chunks = await pending;
    const slots = chunks.filter(c => c.type === "slot" && c.key === "row#0");
    expect(slots.length).toBeGreaterThan(1);
    expect(slots[0].args.n).toBe(1);
    expect(slots[slots.length - 1].args.n).toBe(2);
    // Re-emits precede completion — the final value is latched before complete.
    expect(chunks.indexOf(slots[slots.length - 1])).toBeLessThan(
      chunks.findIndex(c => c.type === "complete")
    );
  });

  it("an unchanged getter does not re-emit: the sweep is equality-gated", async () => {
    let resolveGate;
    const gate = new Promise(r => (resolveGate = r));
    const pending = collectStream(
      props =>
        r.ssr`<div>${[
          props.row({
            gate,
            get n() {
              return 5;
            }
          })
        ]}</div>`
    );
    await Promise.resolve();
    resolveGate("done");
    const chunks = await pending;
    const slots = chunks.filter(c => c.type === "slot" && c.key === "row#0");
    expect(slots.length).toBe(1);
    expect(slots[0].args.n).toBe(5);
  });

  it("a changed object value ships under a versioned ref and resolves through the data channel", async () => {
    // Reference equality gates the sweep, and a ref key is write-once in the
    // serializer — a changed object arg mints `arg:<occ>:<key>@<n>`.
    const first = { x: 1 };
    const second = { x: 2 };
    let obj = first;
    let resolveGate;
    const gate = new Promise(r => (resolveGate = r));
    const pending = collectStream(
      props =>
        r.ssr`<div>${[
          props.row({
            gate,
            get obj() {
              return obj;
            }
          })
        ]}</div>`
    );
    await Promise.resolve();
    obj = second;
    resolveGate("done");
    const chunks = await pending;
    const slots = chunks.filter(c => c.type === "slot" && c.key === "row#0");
    expect(slots[0].args.obj.$ref).toBe("arg:row#0:obj");
    const lastRef = slots[slots.length - 1].args.obj.$ref;
    expect(lastRef).toBe("arg:row#0:obj@1");
    const dataChunks = chunks.filter(c => c.type === "data" && c.key === lastRef);
    expect(JSON.stringify(dataChunks.map(c => c.node))).toContain("2");
  });

  it("a settled arg that turns not-ready re-enters pending with its previous value intact", async () => {
    // Phase 0: the getter succeeds ("a"). Phase 1 (after the first commit):
    // it throws not-ready on a new source — the binding re-enters pending
    // under a versioned ref while the client keeps reading "a" (its live
    // prop becomes a pending promise; latest-read semantics hold the
    // previous value). Phase 2: the source settles and the versioned ref
    // resolves with "b".
    let phase = 0;
    let releaseSecond;
    const secondSource = new Promise(r => (releaseSecond = r));
    secondSource.then(() => (phase = 2));
    let resolveGate;
    const gate = new Promise(r => (resolveGate = r));
    const pending = collectStream(
      props =>
        r.ssr`<div>${[
          props.row({
            gate,
            get value() {
              if (phase === 0) return "a";
              if (phase === 1) {
                const err = new Error("not ready");
                err._promise = secondSource;
                throw err;
              }
              return "b";
            }
          })
        ]}</div>`
    );
    await Promise.resolve();
    phase = 1;
    resolveGate("done"); // commit 1: sweep sees not-ready
    await new Promise(r => setTimeout(r, 0));
    releaseSecond(); // the versioned ref's retry succeeds with "b"
    const chunks = await pending;
    const slots = chunks.filter(c => c.type === "slot" && c.key === "row#0");
    expect(slots[0].args.value).toBe("a");
    const lastRef = slots[slots.length - 1].args.value.$ref;
    expect(lastRef).toBe("arg:row#0:value@1");
    const dataChunks = chunks.filter(c => c.type === "data" && c.key === lastRef);
    expect(JSON.stringify(dataChunks.map(c => c.node))).toContain("b");
    expect(chunks.findIndex(c => c.type === "complete")).toBe(chunks.length - 1);
  });

  it("an unstable getter re-emits at most once per commit — no self-triggered loop", async () => {
    // A getter minting a fresh object each evaluation defeats the reference
    // gate by construction. Sweep-minted refs are excluded from the commit
    // funnel, so each REAL commit produces at most one re-emit and the
    // stream still completes.
    let calls = 0;
    let resolveGate;
    const gate = new Promise(r => (resolveGate = r));
    const pending = collectStream(
      props =>
        r.ssr`<div>${[
          props.row({
            gate,
            get obj() {
              return { call: ++calls };
            }
          })
        ]}</div>`
    );
    await Promise.resolve();
    resolveGate("done");
    const chunks = await pending;
    expect(chunks.findIndex(c => c.type === "complete")).toBe(chunks.length - 1);
    const slots = chunks.filter(c => c.type === "slot" && c.key === "row#0");
    // Initial emission plus a bounded number of commit-driven re-emits
    // (the gate resolution, the end-of-response latch) — not one per
    // evaluation, and never unbounded.
    expect(slots.length).toBeLessThanOrEqual(3);
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
