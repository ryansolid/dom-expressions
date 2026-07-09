/**
 * @jest-environment jsdom
 */
// FrameSink seam tests (see src/frame-sink.js). Each extracted seam gets a
// recording-sink test here: `options.sink` overrides one semantic method and
// the test asserts the calls the render core makes, while everything not yet
// extracted keeps writing document output. Full chunk-sequence tests replace
// these once the whole sink surface is routed.
import * as r from "../../src/server";
import { sharedConfig } from "rxcore";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

describe("renderToStream options.sink — data seam", () => {
  it("routes serialized data through sink.data instead of inline scripts", done => {
    const payloads = [];
    const chunks = [];
    const Comp = () => {
      sharedConfig.context.serialize("pt", { x: 8 });
      return r.ssr`<span>sink</span>`;
    };
    r.renderToStream(Comp, { sink: { data: p => payloads.push(p) } }).pipe({
      write(v) {
        chunks.push(v);
      },
      end() {
        const html = chunks.join("");
        expect(html).toContain("<span>sink</span>");
        // With data intercepted and no fragments, no document script remains.
        expect(html).not.toContain("<script");
        expect(payloads.length).toBeGreaterThan(0);
        expect(payloads.join(";")).toContain("pt");
        done();
      }
    });
  });

  it("routes post-shell streamed data through sink.data while fragment output stays document-owned", done => {
    const payloads = [];
    const chunks = [];
    let fragDone;
    const stream = r.renderToStream(
      () => {
        const ctx = sharedConfig.context;
        fragDone = ctx.registerFragment("b1");
        return r.ssr`<div><template id="pl-b1"></template><!--pl-b1--></div>`;
      },
      { sink: { data: p => payloads.push(p) } }
    );
    stream.pipe({
      write(v) {
        chunks.push(v);
        if (chunks.length === 1) setTimeout(() => fragDone("<span>B</span>"));
      },
      end() {
        const html = chunks.join("");
        // Fragment emission is not extracted yet: template payload + $df task
        // still stream as document output.
        expect(html).toContain('<template id="b1"><span>B</span></template>');
        expect(html).toContain('$df("b1")');
        // The fragment's promise record flows through the serializer, so it
        // lands in sink.data, not in the document stream.
        expect(payloads.join(";")).toContain("b1_fr");
        expect(html).not.toContain("b1_fr");
        done();
      }
    });
  });

  it("document behavior is unchanged when no sink is passed", done => {
    const chunks = [];
    const Comp = () => {
      sharedConfig.context.serialize("pt", { x: 8 });
      return r.ssr`<span>doc</span>`;
    };
    r.renderToStream(Comp).pipe({
      write(v) {
        chunks.push(v);
      },
      end() {
        const html = chunks.join("");
        expect(html).toContain("<span>doc</span>");
        expect(html).toContain("<script");
        expect(html).toContain("pt");
        done();
      }
    });
  });
});
