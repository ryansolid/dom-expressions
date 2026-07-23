/**
 * @jest-environment jsdom
 */
// Element claims for server content (the router link-state contract).
// Compiled client output claims `a[href]`/`form[action]` per element at
// creation; frame content becomes live DOM from serialized HTML with no
// compiled creation code, so the frame client sweeps every subtree it
// materializes — and re-claims elements whose `href`/`action` the policy-A
// morph rewrites in place — against the same registry, read through the
// registered-symbol seam (`Symbol.for`, importless like the FRAME brand).
import { createFrame } from "../../src/frame-client";
import { registerElementClaim, claimElementTree } from "../../src/client";

let boundary;
let claimed;
let unregister;

beforeEach(() => {
  document.body.innerHTML = "";
  boundary = document.createElement("div");
  document.body.appendChild(boundary);
  claimed = [];
});

afterEach(() => {
  unregister?.();
  unregister = undefined;
});

const html = value => ({ kind: "html", value });
const register = handler =>
  (unregister = registerElementClaim(handler ?? (el => claimed.push(el))));

describe("claims on materialization", () => {
  it("root materialize claims anchors and forms, pre-insert nodes ARE the live nodes", () => {
    register();
    const frame = createFrame(boundary);
    frame.apply({
      version: 1,
      r: { "": html('<nav><a href="/a">A</a></nav><form action="/f"><button>go</button></form>') }
    });
    expect(claimed.map(el => el.tagName)).toEqual(["A", "FORM"]);
    // The sweep ran on the parsed fragment (creation time, like compiled
    // output) — the claimed references are the nodes now living in the DOM.
    expect(claimed[0]).toBe(boundary.querySelector("a"));
    expect(claimed[1]).toBe(boundary.querySelector("form"));
  });

  it("segment reveal claims the revealed content", () => {
    register();
    const frame = createFrame(boundary);
    frame.apply({
      version: 1,
      r: {
        "": html('<div><template id="pl-c"></template><!--pl-c--></div>'),
        "seg:c": html('<a href="/seg">S</a>'),
        "seg:c:reveal": true
      }
    });
    expect(claimed.map(el => el.getAttribute("href"))).toEqual(["/seg"]);
    expect(claimed[0]).toBe(boundary.querySelector("a"));
  });

  it("fallback materialization claims the fallback's elements", () => {
    register();
    const frame = createFrame(boundary);
    frame.apply({
      version: 1,
      r: {
        "": html('<div><template id="pl-c"><a href="/fb">fb</a></template><!--pl-c--></div>'),
        "seg:c:fallback": true
      }
    });
    expect(claimed.map(el => el.getAttribute("href"))).toEqual(["/fb"]);
  });

  it("without a registered consumer nothing fires and applies are unaffected", () => {
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html('<a href="/a">A</a>') } });
    expect(boundary.querySelector("a").getAttribute("href")).toBe("/a");
    expect(claimed).toEqual([]);
  });

  it("unregistering stops subsequent sweeps", () => {
    register();
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html('<a href="/a">A</a>') } });
    expect(claimed).toHaveLength(1);
    unregister();
    frame.apply({ version: 2, r: { "": html('<a href="/b">B</a>') } });
    expect(claimed).toHaveLength(1);
  });
});

describe("claims across morphs (policy A)", () => {
  it("an in-place href rewrite re-claims the SAME element", () => {
    register();
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html('<a href="/one">x</a>') } });
    const anchor = boundary.querySelector("a");
    expect(claimed).toEqual([anchor]);
    frame.apply({ version: 2, r: { "": html('<a href="/two">x</a>') } });
    // Morphed, not replaced: same node, fresh claim, final attribute value.
    expect(claimed).toEqual([anchor, anchor]);
    expect(boundary.querySelector("a")).toBe(anchor);
    expect(anchor.getAttribute("href")).toBe("/two");
  });

  it("a morph-inserted anchor is claimed; an unchanged sibling is not re-claimed", () => {
    register();
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html('<ul><li><a href="/1">1</a></li></ul>') } });
    expect(claimed).toHaveLength(1);
    frame.apply({
      version: 2,
      r: { "": html('<ul><li><a href="/1">1</a></li><li><a href="/2">2</a></li></ul>') }
    });
    expect(claimed).toHaveLength(2);
    expect(claimed[1].getAttribute("href")).toBe("/2");
    expect(claimed[1]).toBe(boundary.querySelectorAll("a")[1]);
  });

  it("a morph changing NON-claim attributes on a claimable element re-claims it (consumer-applied state was overwritten)", () => {
    register();
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html('<a href="/one" aria-current="page">x</a>') } });
    expect(claimed).toHaveLength(1);
    // Server output never carries consumer state: the morph strips
    // aria-current — the re-claim lets the consumer reassert it.
    frame.apply({ version: 2, r: { "": html('<a href="/one" class="hot">x</a>') } });
    expect(claimed).toHaveLength(2);
    expect(claimed[1]).toBe(claimed[0]);
    expect(claimed[1].hasAttribute("aria-current")).toBe(false);
    expect(claimed[1].getAttribute("class")).toBe("hot");
  });

  it("attribute changes on non-claimable elements never claim", () => {
    register();
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html('<div class="a">x</div>') } });
    frame.apply({ version: 2, r: { "": html('<div class="b">x</div>') } });
    expect(claimed).toEqual([]);
  });

  it("removing an href stops future claims only via consumer filtering — the removal itself re-claims", () => {
    register();
    const frame = createFrame(boundary);
    frame.apply({ version: 1, r: { "": html('<a href="/one">x</a>') } });
    frame.apply({ version: 2, r: { "": html("<a>x</a>") } });
    // Mirrors compiled setAttribute: the recheck fires on removal too, so
    // consumers observe the transition instead of holding a stale claim.
    expect(claimed).toHaveLength(2);
    expect(claimed[1].hasAttribute("href")).toBe(false);
  });
});

describe("claims at adoption (document SSR)", () => {
  it("adopting a frame element sweeps the existing server-rendered content", () => {
    // The document producer emits the boundary AS an element (`<dx-frame>`);
    // adoption binds a frame over it and sweeps its server-rendered interior.
    boundary.innerHTML =
      '<nav><a href="/top">top</a><a href="/new">new</a></nav><form action="/s"></form>';
    register();
    createFrame(boundary, { adopt: true });
    expect(claimed.map(el => el.getAttribute("href") ?? el.getAttribute("action"))).toEqual([
      "/top",
      "/new",
      "/s"
    ]);
  });
});

describe("ownerScope", () => {
  it("every sweep — materialize, morph re-claim, adoption — runs inside ownerScope", () => {
    let depth = 0;
    const seen = [];
    register(() => seen.push(depth > 0));
    const ownerScope = fn => {
      depth++;
      try {
        return fn();
      } finally {
        depth--;
      }
    };
    const frame = createFrame(boundary, { ownerScope });
    frame.apply({ version: 1, r: { "": html('<a href="/one">x</a>') } });
    frame.apply({ version: 2, r: { "": html('<a href="/two">x</a>') } });

    const host = document.createElement("div");
    document.body.appendChild(host);
    host.innerHTML = '<a href="/adopted">a</a>';
    createFrame(host, { adopt: true, ownerScope });

    expect(seen).toEqual([true, true, true]);
    frame.dispose();
  });
});

describe("claimElementTree (client runtime export)", () => {
  it("claims a matching root plus its claimable interior, and is dormant without consumers", () => {
    const form = document.createElement("form");
    form.setAttribute("action", "/f");
    form.innerHTML = '<a href="/inside">i</a>';
    expect(claimElementTree(form)).toBe(form);
    expect(claimed).toEqual([]);
    register();
    claimElementTree(form);
    expect(claimed).toEqual([form, form.firstChild]);
  });
});
