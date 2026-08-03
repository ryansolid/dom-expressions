/**
 * @jest-environment jsdom
 *
 * Late-arriving fragment swaps vs. completed hydration (#2964).
 *
 * `_$HY.done` used to make $df discard a late fragment's content wholesale —
 * correct only when the client re-rendered the range from data. Boundaries
 * inside deferred claim scopes (frames slot fills, lazy route modules)
 * register against a pending `<id>_fr` AFTER global hydration completes, and
 * for server components the markup IS the content: discarding it left the
 * region permanently blank. The protocol now:
 *
 * - a claimant on record (`_$HY.fk[id]`) lets the swap proceed normally even
 *   after done,
 * - with no claimant the swap is HELD (placeholder, fallback, and template
 *   stay put; id noted in `_$HY.hq`) so a claimant that registers later can
 *   replay `$df(id)` and then claim the revealed content.
 *
 * Exercised against the actual emitted stream scripts, like head-hydrate.
 */
import * as r2 from "../../src/server";
import { sharedConfig } from "../core";

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

// One deferred fragment "ev1": shell shows the fallback inside pl- markers,
// the content template + $df + `_fr` resolution stream afterwards.
async function renderLateFragmentStream() {
  const html = await pipeToString(
    r2.renderToStream(() => {
      const ctx = sharedConfig.context;
      const done = ctx.registerFragment("ev1");
      setTimeout(() => done("<span>revealed</span>"), 10);
      return r2.ssr`<div id="host"><template id="pl-ev1"></template>loading<!--pl-ev1--></div>`;
    })
  );
  const scripts = [];
  const markup = html.replace(/<script>([\s\S]*?)<\/script>/g, (m, s) => (scripts.push(s), ""));
  return { markup, scripts };
}

function boot(markup) {
  globalThis._$HY = { events: [], completed: new WeakSet(), r: {}, fe: jest.fn() };
  document.body.innerHTML = markup;
}

const host = () => document.getElementById("host");

describe("$df after _$HY.done (late fragments keep their content claimable)", () => {
  it("baseline: before done, the swap replaces the fallback", async () => {
    const { markup, scripts } = await renderLateFragmentStream();
    boot(markup);
    for (const s of scripts) window.eval(s);

    expect(host().textContent).toBe("revealed");
    expect(document.getElementById("pl-ev1")).toBe(null);
    expect(document.getElementById("ev1")).toBe(null);
    expect(globalThis._$HY.fe).toHaveBeenCalledWith("ev1", host());
  });

  it("done with a claimant on record (_$HY.fk): the swap proceeds", async () => {
    const { markup, scripts } = await renderLateFragmentStream();
    boot(markup);
    globalThis._$HY.done = true;
    globalThis._$HY.fk = { ev1: 1 };
    for (const s of scripts) window.eval(s);

    expect(host().textContent).toBe("revealed");
    expect(document.getElementById("pl-ev1")).toBe(null);
    expect(globalThis._$HY.fe).toHaveBeenCalledWith("ev1", host());
    expect(globalThis._$HY.hq).toBeUndefined();
  });

  it("done with no claimant: the swap is held intact, and a late claimant replays it", async () => {
    const { markup, scripts } = await renderLateFragmentStream();
    boot(markup);
    globalThis._$HY.done = true;
    for (const s of scripts) window.eval(s);

    // Held, not discarded: fallback still showing, placeholder and content
    // template both still present, id queued for a claimant.
    expect(host().textContent).toBe("loading");
    expect(document.getElementById("pl-ev1")).not.toBe(null);
    expect(document.getElementById("ev1")).not.toBe(null);
    expect(globalThis._$HY.hq).toEqual({ ev1: 1 });
    expect(globalThis._$HY.fe).not.toHaveBeenCalled();

    // A claimant registers later (markFragmentClaim in the hydration
    // runtime): mark, drop the hold, replay.
    globalThis._$HY.fk = { ev1: 1 };
    delete globalThis._$HY.hq.ev1;
    window.$df("ev1");

    expect(host().textContent).toBe("revealed");
    expect(document.getElementById("pl-ev1")).toBe(null);
    expect(document.getElementById("ev1")).toBe(null);
    expect(globalThis._$HY.fe).toHaveBeenCalledWith("ev1", host());
  });
});
