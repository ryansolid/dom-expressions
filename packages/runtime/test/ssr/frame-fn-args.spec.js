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
});
