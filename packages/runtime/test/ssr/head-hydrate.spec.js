/**
 * @jest-environment jsdom
 *
 * Server → client head handoff (docs/head-management-rfc.md):
 * - the inline patch runtime ($dh/$dha) applies streamed ops at the owning
 *   fragment's $df reveal, exercised by evaluating the actual emitted
 *   scripts against a document,
 * - hydration claims server-rendered marked tags instead of duplicating
 *   them, and owns them afterwards (disposal retracts),
 * - once the client registry is live, patches route through _$HY.h:
 *   client-owned identities win, unowned ones apply as server state.
 *
 * The client registry is a module singleton whose hydration bootstrap runs
 * on the first useHead call, so test order in this file is meaningful: the
 * inline-runtime test runs before the registry exists, matching the real
 * loading sequence (streamed patches land before the bundle).
 */
import * as r from "../../src/client";
import * as r2 from "../../src/server";
import { createRoot } from "@solidjs/signals";
import { sharedConfig } from "../core";

globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, fe() {} };

const tick = () => Promise.resolve();

function pipeToString(stream) {
  return new Promise(resolve => {
    const chunks = [];
    stream.pipe({
      write(v) {
        chunks.push(v);
      },
      end() {
        resolve(chunks.join(""));
      }
    });
  });
}

describe("inline head patch runtime (pre-bundle)", () => {
  it("applies streamed ops at the fragment's reveal, exercising the emitted scripts", async () => {
    let done;
    const html = await pipeToString(
      r2.renderToStream(() => {
        const ctx = sharedConfig.context;
        r2.useHead({ tag: "title", props: { children: "Shell" } });
        done = ctx.registerFragment("ev1");
        ctx._currentBoundaryId = "ev1";
        r2.useHead([
          { tag: "title", props: { children: "Page" } },
          { tag: "meta", props: { name: "streamed", content: "yes" } }
        ]);
        ctx._currentBoundaryId = null;
        setTimeout(() => done("<span>revealed</span>"), 10);
        return r2.ssr`<html><head></head><body><div><template id="pl-ev1"></template><!--pl-ev1--></div></body></html>`;
      })
    );

    // Replay the stream: markup into the document, scripts evaluated in
    // arrival order (innerHTML never executes them).
    const scripts = [];
    const markup = html.replace(/<script>([\s\S]*?)<\/script>/g, (m, s) => (scripts.push(s), ""));
    document.head.innerHTML = markup.slice(markup.indexOf("<head>") + 6, markup.indexOf("</head>"));
    // Post-shell chunks (fragment templates) stream after </body></html>;
    // the browser parser reparents them into body, mirrored here.
    document.body.innerHTML = markup
      .slice(markup.indexOf("<body>") + 6)
      .replace("</body></html>", "");
    expect(document.title).toBe("Shell");

    for (const s of scripts) window.eval(s);

    // The reveal applied the parked ops: retitle + meta, marked for the
    // registry to claim later, and the parking slot was consumed.
    expect(document.title).toBe("Page");
    expect(document.querySelector("title").getAttribute("data-dh")).toBe("title");
    const meta = document.head.querySelector('meta[name="streamed"]');
    expect(meta.getAttribute("content")).toBe("yes");
    expect(meta.getAttribute("data-dh")).toBe("meta:name:streamed");
    expect(document.body.textContent).toContain("revealed");
    expect(globalThis._$HY.hp["ev1"]).toBeUndefined();
  });
});

describe("hydration claim and registry handoff", () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const _tmpl = r.template(`<div>home</div>`);

  it("claims server-rendered head tags on hydration without duplication", async () => {
    const rendered = r2.renderToString(() => r2.ssr(["<div", ">home</div>"], r2.ssrHydrationKey()));
    container.innerHTML = rendered;
    // Server-rendered winners with ownership markers (wire format pinned by
    // ssr/head.spec.js).
    document.head.innerHTML =
      '<title data-dh="title">Store</title>' +
      '<meta name="description" content="d1" data-dh="meta:name:description">';
    const serverMeta = document.head.querySelector("meta");

    const dispose = r.hydrate(() => {
      r.useHead([
        { tag: "title", props: { children: "Store" } },
        { tag: "meta", props: { name: "description", content: "d1" } }
      ]);
      const el = r.getNextElement(_tmpl);
      r.insert(container, el, undefined, [...container.childNodes]);
      r.runHydrationEvents();
    }, container);
    await tick();

    expect(document.title).toBe("Store");
    expect(document.querySelectorAll("title").length).toBe(1);
    const metas = document.head.querySelectorAll('meta[name="description"]');
    expect(metas.length).toBe(1);
    // Claimed in place, not recreated.
    expect(metas[0]).toBe(serverMeta);

    dispose();
    await tick();
    // The registry owned the claimed tags: disposal retracts them.
    expect(document.head.querySelector('meta[name="description"]')).toBe(null);
    container.innerHTML = "";
  });

  it("routes late server patches through the live registry", async () => {
    let dispose;
    createRoot(d => {
      dispose = d;
      r.useHead({ tag: "title", props: { children: "Owned" } });
    });
    await tick();
    expect(document.title).toBe("Owned");

    // A stale streamed patch for an identity the client owns is ignored —
    // client registrations are newer commits by definition.
    globalThis._$HY.h([["t", "Server Late"]]);
    expect(document.title).toBe("Owned");

    // An unowned identity applies as server state, marked.
    globalThis._$HY.h([["a", "meta:name:late", "meta", { name: "late", content: "z" }, null]]);
    const late = document.head.querySelector('meta[name="late"]');
    expect(late.getAttribute("data-dh")).toBe("meta:name:late");

    dispose();
    await tick();
    // Server-owned elements survive client disposals: the registry only
    // retracts what it owns.
    expect(late.isConnected).toBe(true);
    late.remove();
  });
});
