/**
 * @jest-environment jsdom
 *
 * Marker-injection safety (the Qwik marker-XSS class, GHSA-m6jq-g7gq-5w3c):
 * `$key` is user data that lands in HTML comment markers, unquoted `_hk`
 * attribute values, and the `#` occurrence separator. It must be encoded at
 * the point occurrences are minted so a hostile or merely awkward key cannot
 * terminate a comment (`-->`), split an attribute, or collide with the
 * separator — while a plain key still round-trips to a readable, stable id.
 * Encoding must also be identical on the stream and document faces, or t=0
 * adoption (which matches occurrences by byte-identical id) breaks.
 */
import * as r from "../../src/server";
import {
  renderServerComponent,
  frameTransformDirectResult,
  ServerComponentPlugin
} from "../../src/frame-sink";

function collectStream(component, frame) {
  return new Promise(resolve => {
    const chunks = [];
    renderServerComponent(component, { frame }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks)
    });
  });
}

function collectDocument(component, clientProps, id) {
  return new Promise(resolve => {
    const Inline = frameTransformDirectResult(component, { id });
    const chunks = [];
    r.renderToStream(() => Inline(clientProps), { plugins: [ServerComponentPlugin] }).pipe({
      write: c => chunks.push(c),
      end: () => resolve(chunks.join(""))
    });
  });
}

describe("occurrence key marker safety (stream face)", () => {
  it("a key containing --> cannot break out of a slot comment marker", async () => {
    const key = "x--><script>alert(1)</script><!--y";
    const chunks = await collectStream(
      props => r.ssr`<div>${[props.row({ $key: key, cid: 1 })]}</div>`,
      { id: "f", version: 1 }
    );
    const slot = chunks.find(c => c.type === "slot");
    const html = chunks.find(c => c.type === "html");
    expect(slot.key).not.toContain("-->");
    expect(slot.key).not.toContain("<");
    expect(html.html).not.toContain("<script>");
    expect(html.html).toContain(`slot:${slot.key}:start`);
    expect(html.html).toContain(`slot:${slot.key}:end`);
  });

  it("encodes the # separator so a key cannot forge a prop boundary", async () => {
    const chunks = await collectStream(
      props => r.ssr`<div>${[props.row({ $key: "a#b", cid: 1 })]}</div>`,
      { id: "f", version: 1 }
    );
    const slot = chunks.find(c => c.type === "slot");
    // Exactly one '#' — the prop/occurrence separator; the key's own '#' is
    // encoded, so propOf("row#a%23b") === "row".
    expect(slot.key.split("#").length).toBe(2);
    expect(slot.key).toBe("row#a%23b");
  });

  it("a plain alphanumeric key rides through unchanged (readable ids)", async () => {
    const chunks = await collectStream(
      props => r.ssr`<div>${[props.row({ $key: "c1", cid: 1 })]}</div>`,
      { id: "f", version: 1 }
    );
    expect(chunks.find(c => c.type === "slot").key).toBe("row#c1");
  });

  it("distinct keys never collide after encoding (injective)", async () => {
    const one = await collectStream(props => r.ssr`<div>${[props.row({ $key: "a#b" })]}</div>`, {
      id: "f",
      version: 1
    });
    const two = await collectStream(props => r.ssr`<div>${[props.row({ $key: "a%23b" })]}</div>`, {
      id: "f",
      version: 1
    });
    expect(one.find(c => c.type === "slot").key).not.toBe(two.find(c => c.type === "slot").key);
  });
});

describe("occurrence key marker safety (document face parity)", () => {
  it("the document proxy encodes keys identically to the stream proxy", async () => {
    const key = "a b/c#d";
    // Stream face id for this key.
    const streamChunks = await collectStream(
      props => r.ssr`<div>${[props.row({ $key: key, cid: 1 })]}</div>`,
      { id: "f", version: 1 }
    );
    const streamKey = streamChunks.find(c => c.type === "slot").key;
    // Document face: the same occurrence must appear in the inline markers.
    const html = await collectDocument(
      props => r.ssr`<div>${[props.row({ $key: key, cid: 1 })]}</div>`,
      { row: p => r.ssr`<i>${p.cid}</i>` },
      "f"
    );
    expect(html).toContain(`slot:${streamKey}:start`);
    expect(html).toContain(`slot:${streamKey}:end`);
    // And the raw key characters are not loose in the markup.
    expect(html).not.toContain("row#a b/c#d");
  });
});
