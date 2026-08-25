/**
 * Live markup holes, document face (Stage 4, producer half): the same
 * Stage 3 ledger, armed for DOCUMENT SSR by the first server component
 * that renders inline (frameTransformDirectResult).
 *
 * What changes against the stream face is the sink and the scope:
 *   - ops ride ONE `sc:live` hydration record whose value is a
 *     ReadableStream the document's data scripts keep feeding — the
 *     record serializes eagerly at arming so adoption's drain always
 *     finds it, and it closes at the response latch (flushEnd);
 *   - the engine gates minting on the server-component context barrier:
 *     holes inside a component's scope mark and bind, while plain
 *     document content keeps its t=0 latch and its exact bytes.
 *
 * The consumer half (adoption pumping the channel into frame stores,
 * catch-up replay, live morphs) is client work pinned by the solid-web
 * suite; this spec pins the produced document bytes and channel ops.
 */
import * as r from "../../src/server";
import { sharedConfig } from "../core";
import { frameTransformDirectResult, ServerComponentPlugin } from "../../src/frame-sink";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

// Render a document (the code thunk is arbitrary render output — a lone
// inline component, or an array mixing it with plain content). Resolves
// with the full html once the response completes.
function renderDocument(code) {
  return new Promise(resolve => {
    const chunks = [];
    r.renderToStream(code, { plugins: [ServerComponentPlugin] }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks.join(""))
    });
  });
}

const inline = (component, id = "f") => frameTransformDirectResult(component, { id });

describe("document face — marking under the component barrier", () => {
  it("a thunk content hole inside a server component is marker-wrapped in the page bytes", async () => {
    const Inline = inline(() => r.ssr(["<section>", "</section>"], () => r.escape("v1")));
    const html = await renderDocument(() => Inline({}));
    expect(html).toMatch(/<section><!--lh:(\d+)-->v1<!--lh:\/\1--><\/section>/);
  });

  it("a thunk hole in plain document content stays unmarked: bytes outside the barrier never change", async () => {
    const Inline = inline(() => r.ssr(["<section>", "</section>"], () => r.escape("in")));
    const html = await renderDocument(() => [
      Inline({}),
      r.ssr(["<aside>", "</aside>"], () => r.escape("out"))
    ]);
    expect(html).toMatch(/<section><!--lh:(\d+)-->in<!--lh:\/\1--><\/section>/);
    expect(html).toContain("<aside>out</aside>");
    expect(html).not.toMatch(/<aside><!--lh:/);
  });

  it("an in-tag hole inside a server component is element-addressed (data-lha)", async () => {
    const Inline = inline(() => r.ssr(['<div class="', '">x</div>'], () => r.escape("v1", true)));
    const html = await renderDocument(() => Inline({}));
    expect(html).toMatch(/<div data-lha="\d+" class="v1">x<\/div>/);
  });

  it("an in-tag hole in plain document content gets no data-lha", async () => {
    const Inline = inline(() => r.ssr(["<section>", "</section>"], () => r.escape("in")));
    const html = await renderDocument(() => [
      Inline({}),
      r.ssr(['<div class="', '">x</div>'], () => r.escape("out", true))
    ]);
    expect(html).toContain('<div class="out">x</div>');
  });

  it("a document with no server component ships neither markers nor the channel: byte-identical to pre-Stage-4", async () => {
    const html = await renderDocument(() => r.ssr(["<main>", "</main>"], () => r.escape("plain")));
    expect(html).toContain("<main>plain</main>");
    expect(html).not.toContain("lh:");
    expect(html).not.toContain("sc:live");
  });
});

describe("document face — the sc:live channel", () => {
  it("arming serializes the channel record eagerly: present even when nothing ever re-emits", async () => {
    const Inline = inline(() => r.ssr(["<section>", "</section>"], () => r.escape("v1")));
    const html = await renderDocument(() => Inline({}));
    expect(html).toContain("sc:live");
  });

  it("a commit re-emits a changed hole as a channel op; the response latch closes the stream", async () => {
    let text = "v1";
    let ctx;
    let release;
    const Inline = inline(() => {
      // Stash the render context and hold the response open — the shape a
      // bounded async trace (Solid's iterable-memo pump) produces.
      ctx = sharedConfig.context;
      release = ctx.hold();
      return r.ssr(["<section>", "</section>"], () => r.escape(text));
    });
    const done = renderDocument(() => Inline({}));
    // Let the shell settle, then land a commit with a changed value.
    await new Promise(res => setTimeout(res, 0));
    text = "v2";
    ctx.commit();
    await new Promise(res => setTimeout(res, 0));
    release();
    const html = await done;
    // V1 stays the page markup (the hydration truth); v2 rides the channel.
    expect(html).toMatch(/<section><!--lh:(\d+)-->v1<!--lh:\/\1--><\/section>/);
    expect(html).toContain("v2");
    const afterShell = html.slice(html.indexOf("</section>"));
    expect(afterShell).toContain("v2");
  });

  it("an unchanged value never re-emits: the channel stays quiet under commits", async () => {
    let ctx;
    let release;
    const Inline = inline(() => {
      ctx = sharedConfig.context;
      release = ctx.hold();
      return r.ssr(["<section>", "</section>"], () => r.escape("same"));
    });
    const done = renderDocument(() => Inline({}));
    await new Promise(res => setTimeout(res, 0));
    ctx.commit();
    await new Promise(res => setTimeout(res, 0));
    release();
    const html = await done;
    // One occurrence: the page markup. No op carried a second copy.
    expect(html.split("same").length).toBe(2);
  });

  it("an attr hole re-emits element-keyed attrs ops over the channel", async () => {
    let cls = "a";
    let ctx;
    let release;
    const Inline = inline(() => {
      ctx = sharedConfig.context;
      release = ctx.hold();
      return r.ssr(['<div class="', '">x</div>'], () => r.escape(cls, true));
    });
    const done = renderDocument(() => Inline({}));
    await new Promise(res => setTimeout(res, 0));
    cls = "b";
    ctx.commit();
    await new Promise(res => setTimeout(res, 0));
    release();
    const html = await done;
    expect(html).toMatch(/<div data-lha="\d+" class="a">x<\/div>/);
    // The op ships the rebuilt attribute text.
    expect(html).toContain("attr");
    expect(html).toContain('class=\\"b\\"');
  });

  it("a swept re-emission keeps minting _bnd: the mint-time context rides the sweep", async () => {
    // The greeting-copy-button regression: markup that GROWS a claim-carrying
    // element only in a later value of a live hole. Sweeps re-evaluate under
    // `runWithOwner`, which restores the owner but not `sharedConfig.context`
    // — and on the document face the module global has long moved past the
    // component by the time a commit lands, so the compiled guard read
    // `claims: undefined` and the button shipped inert. (The stream face
    // never noticed: its whole response is one render, so the global still
    // pointed at the armed context.) The engine now captures the render
    // context at hole mint and restores it around sweep evaluation.
    const claim = map =>
      sharedConfig.context && sharedConfig.context.claims ? r.ssrClaim(map) : "";
    let ctx;
    let release;
    let grown = false;
    const Inline = inline(props => {
      ctx = sharedConfig.context;
      release = ctx.hold();
      return r.ssr(["<section>", "</section>"], () =>
        grown ? r.ssr`<button${claim({ click: props.onCopy })}>Copy</button>` : r.escape("wait")
      );
    });
    const done = renderDocument(() => Inline({}));
    await new Promise(res => setTimeout(res, 0));
    // Another request renders while this response is held open — on a real
    // server the module global always points somewhere else by commit time.
    await renderDocument(() => r.ssr(["<i>", "</i>"], () => r.escape("other")));
    grown = true;
    ctx.commit();
    await new Promise(res => setTimeout(res, 0));
    release();
    const html = await done;
    // V1 page markup: no button, no marker (nothing claimed at t=0).
    expect(html).toMatch(/<section><!--lh:(\d+)-->wait<!--lh:\/\1--><\/section>/);
    // The channel op carries the grown button WITH its claim marker.
    expect(html).toContain(`_bnd=`);
    expect(html).toContain("click=onCopy");
  });

  it("a getter slot arg re-emits the occurrence's record as a fid-tagged slot op on commit", async () => {
    // The natural authored shape — `arg={expr()}`, a compiled getter — is
    // the SAME shape as a markup hole and must be exactly as live at t=0:
    // the document arg ledger sweeps it on commits and re-ships the whole
    // record as a `slot` op on the sc:live channel (values inline; slot
    // ops are store-keyed, so they carry the producing frame's id).
    let text = "v1";
    let ctx;
    let release;
    const Inline = inline(props => {
      ctx = sharedConfig.context;
      release = ctx.hold();
      return props.status({
        get text() {
          return text;
        }
      });
    });
    const done = renderDocument(() =>
      Inline({ status: p => r.ssr(["<b>", "</b>"], () => r.escape(String(p.text))) })
    );
    await new Promise(res => setTimeout(res, 0));
    text = "v2";
    ctx.commit();
    await new Promise(res => setTimeout(res, 0));
    release();
    const html = await done;
    // Markup and the initial record read v1 (the hydration truth) …
    expect(html).toContain("<b>v1</b>");
    expect(html).toContain("sc:slot:f:status");
    // … and exactly one op carried v2, tagged with the frame id.
    expect(html.split("v2").length).toBe(2);
    expect(html).toContain("fid");
  });

  it("an unchanged getter arg stays quiet under commits", async () => {
    let ctx;
    let release;
    const Inline = inline(props => {
      ctx = sharedConfig.context;
      release = ctx.hold();
      return props.status({
        get text() {
          return "same";
        }
      });
    });
    const done = renderDocument(() =>
      Inline({ status: p => r.ssr(["<b>", "</b>"], () => r.escape(String(p.text))) })
    );
    await new Promise(res => setTimeout(res, 0));
    ctx.commit();
    await new Promise(res => setTimeout(res, 0));
    release();
    const html = await done;
    // Two copies total: the markup and the initial record. No op re-shipped it.
    expect(html.split("same").length).toBe(3);
  });

  it("the end latch ships the last arg value", async () => {
    let text = "a1";
    let ctx;
    let release;
    const Inline = inline(props => {
      ctx = sharedConfig.context;
      release = ctx.hold();
      return props.status({
        get text() {
          return text;
        }
      });
    });
    const done = renderDocument(() =>
      Inline({ status: p => r.ssr(["<b>", "</b>"], () => r.escape(String(p.text))) })
    );
    await new Promise(res => setTimeout(res, 0));
    // No commit lands before the hold releases: the end-of-response sweep
    // is the floor for args exactly as it is for holes.
    text = "a2";
    release();
    const html = await done;
    expect(html).toContain("a2");
    expect(html.split("a2").length).toBe(2);
  });

  it("the end latch ships the last value exactly once", async () => {
    let text = "v1";
    let ctx;
    let release;
    const Inline = inline(() => {
      ctx = sharedConfig.context;
      release = ctx.hold();
      return r.ssr(["<section>", "</section>"], () => r.escape(text));
    });
    const done = renderDocument(() => Inline({}));
    await new Promise(res => setTimeout(res, 0));
    // The value changes but no commit lands before the hold releases: the
    // end-of-response sweep is the floor — the last value still ships.
    text = "v3";
    release();
    const html = await done;
    expect(html).toContain("v3");
    expect(html.split("v3").length).toBe(2);
  });
});
