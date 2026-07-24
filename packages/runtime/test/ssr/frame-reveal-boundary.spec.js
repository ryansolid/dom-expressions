/**
 * @jest-environment jsdom
 *
 * Boundary-driven segment reveal (the "per-`<Loading>`" model). When the
 * creator supplies an `options.reveal` hook, `#revealSegment` no longer swaps
 * the placeholder imperatively — it hands the seam to the hook, which (in the
 * real Solid binding) reconstructs a client `<Loading>` boundary there: fallback
 * = the placeholder's own template content, children = the segment content +
 * its client fills, rendered INSIDE the boundary so their readiness gates the
 * reveal. Here the hook is mocked (hold fallback, swap on a manual "settle") to
 * pin frame-client's half of the contract: it delegates, it defers the content,
 * and the content thunk renders the segment's fills. The hold-until-ready
 * itself is the binding's job (validated over the local link).
 *
 * With no hook, the imperative swap is unchanged — the framework-agnostic
 * default, covered by the existing integration tests.
 */
import { createFrame, createFrameHost } from "../../src/frame-client";

function mockReveal() {
  const pending = [];
  const reveal = ({ before, fallback, content }) => {
    const parent = before.parentNode;
    // The boundary is holding: show the fallback in place now.
    for (const n of fallback) parent.insertBefore(n, before);
    // Defer the content until the (simulated) subtree settles.
    pending.push(() => {
      for (const n of fallback) if (n.parentNode) parent.removeChild(n);
      parent.insertBefore(content(), before);
    });
  };
  return { reveal, settle: () => pending.shift()() };
}

describe("boundary-driven segment reveal", () => {
  let boundary;
  beforeEach(() => {
    boundary = document.createElement("div");
    document.body.appendChild(boundary);
  });
  afterEach(() => boundary.remove());

  it("holds the placeholder fallback until the segment settles, then swaps to content", () => {
    const host = createFrameHost();
    const { reveal, settle } = mockReveal();
    createFrame(boundary, { id: "f", host, reveal });

    host.apply({
      type: "html",
      id: "f",
      version: 1,
      html: '<section><template id="pl-s1"><em>loading</em></template><!--pl-s1--></section>'
    });
    host.apply({ type: "fragment", id: "f", version: 1, key: "s1", html: "<p>done</p>" });
    host.apply({ type: "reveal", id: "f", version: 1, keys: ["s1"], waitForStyles: false });

    // Boundary is holding: the fallback is shown, the content is not.
    expect(boundary.querySelector("em")?.textContent).toBe("loading");
    expect(boundary.querySelector("p")).toBeNull();

    // The subtree settles -> the boundary swaps fallback for content.
    settle();
    expect(boundary.querySelector("em")).toBeNull();
    expect(boundary.querySelector("p")?.textContent).toBe("done");
  });

  it("renders the revealed segment's client fills inside the content", () => {
    const host = createFrameHost();
    const { reveal, settle } = mockReveal();
    createFrame(boundary, {
      id: "f",
      host,
      reveal,
      slots: {
        widget: () => {
          const b = document.createElement("button");
          b.textContent = "click";
          return b;
        }
      }
    });

    host.apply({
      type: "html",
      id: "f",
      version: 1,
      html: '<div><template id="pl-s1"></template><!--pl-s1--></div>'
    });
    // The segment content carries a client slot — it must be filled by the
    // content thunk (frame-client's scoped fill), inside the boundary.
    host.apply({
      type: "fragment",
      id: "f",
      version: 1,
      key: "s1",
      html: "<article><!--slot:widget:start--><!--slot:widget:end--></article>"
    });
    host.apply({ type: "reveal", id: "f", version: 1, keys: ["s1"], waitForStyles: false });

    settle();
    const article = boundary.querySelector("article");
    expect(article).toBeTruthy();
    expect(article.querySelector("button")?.textContent).toBe("click");
  });

  it("without a reveal hook, still swaps imperatively (framework-agnostic default)", () => {
    const host = createFrameHost();
    createFrame(boundary, { id: "f", host });
    host.apply({
      type: "html",
      id: "f",
      version: 1,
      html: '<section><template id="pl-s1"><em>loading</em></template><!--pl-s1--></section>'
    });
    host.apply({ type: "fragment", id: "f", version: 1, key: "s1", html: "<p>done</p>" });
    host.apply({ type: "reveal", id: "f", version: 1, keys: ["s1"], waitForStyles: false });
    // No hook: content is in place immediately, no fallback left behind.
    expect(boundary.querySelector("p")?.textContent).toBe("done");
    expect(boundary.querySelector("em")).toBeNull();
  });
});
