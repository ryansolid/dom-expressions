/**
 * @jest-environment jsdom
 *
 * Fragment reveal routing: mechanics inline, policy in the runtime.
 *
 * The inline stream script owns only the parse-time swap mechanics ($dfr).
 * Reveal POLICY — what to do with late arrivals after hydration completes,
 * who may claim a fragment (#2964) — belongs to the hydration runtime: once
 * it installs `_$HY.f`, every `$df(id)` the stream emits routes through it,
 * and the runtime calls back into `$dfr(id)` for swaps it approves. One
 * owner at any moment, mirroring the `$dh`/`_$HY.h` head-patch handoff.
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

describe("$df routing (inline mechanics, runtime policy)", () => {
  it("no runtime installed: the swap replaces the fallback immediately", async () => {
    const { markup, scripts } = await renderLateFragmentStream();
    boot(markup);
    for (const s of scripts) window.eval(s);

    expect(host().textContent).toBe("revealed");
    expect(document.getElementById("pl-ev1")).toBe(null);
    expect(document.getElementById("ev1")).toBe(null);
    expect(globalThis._$HY.fe).toHaveBeenCalledWith("ev1", host());
  });

  it("runtime installed: $df routes to _$HY.f and nothing swaps on its own", async () => {
    const { markup, scripts } = await renderLateFragmentStream();
    boot(markup);
    const policy = jest.fn(() => 0);
    globalThis._$HY.f = policy;
    for (const s of scripts) window.eval(s);

    // The decision was delegated: fallback, placeholder, and template all
    // stay in place until the policy approves.
    expect(policy).toHaveBeenCalledWith("ev1");
    expect(host().textContent).toBe("loading");
    expect(document.getElementById("pl-ev1")).not.toBe(null);
    expect(document.getElementById("ev1")).not.toBe(null);
    expect(globalThis._$HY.fe).not.toHaveBeenCalled();
  });

  it("an approved swap runs through $dfr regardless of _$HY.done", async () => {
    const { markup, scripts } = await renderLateFragmentStream();
    boot(markup);
    // Policy that approves everything, standing in for the hydration
    // runtime's claimed/held bookkeeping.
    globalThis._$HY.f = id => window.$dfr(id);
    globalThis._$HY.done = true;
    for (const s of scripts) window.eval(s);

    expect(host().textContent).toBe("revealed");
    expect(document.getElementById("pl-ev1")).toBe(null);
    expect(document.getElementById("ev1")).toBe(null);
    expect(globalThis._$HY.fe).toHaveBeenCalledWith("ev1", host());
  });

  it("a held swap replays later through $dfr", async () => {
    const { markup, scripts } = await renderLateFragmentStream();
    boot(markup);
    const held = [];
    globalThis._$HY.f = id => (held.push(id), 0);
    for (const s of scripts) window.eval(s);

    expect(host().textContent).toBe("loading");
    expect(held).toEqual(["ev1"]);

    // The runtime replays when a claimant registers: mechanics are intact,
    // so the swap lands exactly as it would have at arrival time.
    window.$dfr(held[0]);
    expect(host().textContent).toBe("revealed");
    expect(document.getElementById("pl-ev1")).toBe(null);
    expect(globalThis._$HY.fe).toHaveBeenCalledWith("ev1", host());
  });
});
