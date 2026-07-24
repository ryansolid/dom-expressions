/**
 * @jest-environment jsdom
 *
 * Async server content inside a region (a `{$frame}` slot arg). A region is a
 * nested frame the client binds under its own `childId` and owns end-to-end
 * (its range, its morph, its reveal). So a Suspense boundary rendered INSIDE
 * region content must stream its fragment + reveal addressed to the region's
 * `childId`, not the enclosing frame's root id — otherwise the root frame's
 * store carries segment state that belongs to the region, and the region's
 * independent morph across responses desynchronizes from it.
 *
 * The fix keys each fragment registered while a region resolves to that
 * region's id (producer side), so `sink.fragment` / `sink.reveal` route to the
 * region frame. This test pins the routing on the stream face
 * (renderServerComponent).
 */
import * as r from "../../src/server";
import { renderServerComponent } from "../../src/frame-sink";
import { createFrame, createFrameHost } from "../../src/frame-client";
import { sharedConfig } from "rxcore";

globalThis.TextEncoder = function () {
  return { encode: v => v };
};

function collectLive(component, onChunk, frame = { id: "f", version: 1 }) {
  return new Promise(resolve => {
    const chunks = [];
    renderServerComponent(component, { frame }).pipe({
      write(c) {
        chunks.push(c);
        onChunk && onChunk(c);
      },
      end: () => resolve(chunks)
    });
  });
}

describe("async server content in a region (slot arg)", () => {
  it("routes a region's Suspense fragment + reveal to the region id, not the root", async () => {
    let fragDone;
    const chunks = await collectLive(
      props =>
        r.ssr`<div>${[
          props.row({
            body: () => {
              // A Suspense boundary inside the region registers a fragment as
              // it renders; its placeholder rides the region's html.
              fragDone = sharedConfig.context.registerFragment("rp1");
              return r.ssr`<section><template id="pl-rp1"></template><!--pl-rp1--></section>`;
            }
          })
        ]}</div>`,
      c => {
        // Resolve the region fragment once the region html has streamed (a
        // post-shell fragment goes out as its own chunk).
        if (c.type === "html" && c.id !== "f") setTimeout(() => fragDone("<p>late</p>"));
      }
    );

    const slot = chunks.find(c => c.type === "slot");
    const childId = slot.args.body.$frame;
    expect(typeof childId).toBe("string");
    expect(childId).not.toBe("f");

    const fragment = chunks.find(c => c.type === "fragment");
    expect(fragment).toBeDefined();
    expect(fragment.key).toBe("rp1");
    expect(fragment.html).toBe("<p>late</p>");
    // The routing assertion: the fragment belongs to the region frame.
    expect(fragment.id).toBe(childId);

    const reveal = chunks.find(c => c.type === "reveal");
    expect(reveal).toBeDefined();
    expect(reveal.keys).toEqual(["rp1"]);
    expect(reveal.id).toBe(childId);
  });

  it("leaves a non-region (root) fragment addressed to the root frame", async () => {
    let fragDone;
    const chunks = await collectLive(
      () => {
        fragDone = sharedConfig.context.registerFragment("root1");
        return r.ssr`<div><template id="pl-root1"></template><!--pl-root1--></div>`;
      },
      c => {
        if (c.type === "html") setTimeout(() => fragDone("<p>root late</p>"));
      }
    );
    const fragment = chunks.find(c => c.type === "fragment");
    expect(fragment.key).toBe("root1");
    expect(fragment.id).toBe("f");
    const reveal = chunks.find(c => c.type === "reveal");
    expect(reveal.id).toBe("f");
  });
});

describe("client reveals a region-addressed fragment inside the region", () => {
  let boundary;
  beforeEach(() => {
    boundary = document.createElement("div");
    document.body.appendChild(boundary);
  });
  afterEach(() => boundary.remove());

  it("reveals a fragment routed to the region frame within the region's own DOM", () => {
    // End-to-end of the producer fix: a fragment/reveal addressed to the
    // region's childId (not the root) must reveal into the placeholder that
    // lives inside the region frame's range — proving the region frame owns
    // its async, independent of the enclosing frame.
    const host = createFrameHost();
    createFrame(boundary, {
      id: "outer",
      host,
      slots: {
        children: props => {
          const el = document.createElement("div");
          el.append(props.children); // place the region element
          return el;
        }
      }
    });

    host.apply({
      type: "slot",
      id: "outer",
      version: 1,
      key: "children",
      args: { children: { $frame: "child" } }
    });
    host.apply({
      type: "html",
      id: "outer",
      version: 1,
      html: "<section><!--slot:children:start--><!--slot:children:end--></section>"
    });
    // The region's own html carries a Suspense placeholder (fallback shown).
    host.apply({
      type: "html",
      id: "child",
      version: 1,
      html: '<template id="pl-rp1"><em>loading</em></template><!--pl-rp1-->'
    });

    const region = boundary.querySelector("dx-frame");
    expect(region).toBeTruthy();
    expect(region.querySelector('template[id="pl-rp1"]')).toBeTruthy();

    // The region's deferred fragment + reveal arrive addressed to the REGION
    // (id: "child"), the way the producer now routes them.
    host.apply({ type: "fragment", id: "child", version: 1, key: "rp1", html: "<p>late</p>" });
    host.apply({ type: "reveal", id: "child", version: 1, keys: ["rp1"], waitForStyles: false });

    // Revealed inside the region element, placeholder gone.
    expect(region.innerHTML).toBe("<p>late</p>");
    expect(boundary.querySelector('template[id="pl-rp1"]')).toBeNull();
    expect(boundary.querySelector("section > div").contains(region)).toBe(true);
  });
});
