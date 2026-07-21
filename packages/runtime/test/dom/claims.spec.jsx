/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import { createRoot, createSignal, flush } from "@solidjs/signals";

// Element claims: compiled DOM output calls claimElement for
// navigation-relevant elements (a[href], form[action]) at creation, and
// compiler-owned href/action writes (which all land in setAttribute)
// re-invoke the same handlers. Dormant until a consumer registers.
describe("element claims", () => {
  it("claimElement is a pass-through no-op with no handler registered", () => {
    const el = document.createElement("a");
    expect(r.claimElement(el)).toBe(el);
  });

  it("invokes registered handlers with the claimed element", () => {
    const seen = [];
    const unregister = r.registerElementClaim(el => seen.push(el));
    const a = document.createElement("a");
    const form = document.createElement("form");
    expect(r.claimElement(a)).toBe(a);
    r.claimElement(form);
    expect(seen).toEqual([a, form]);
    unregister();
  });

  it("supports multiple handlers and unregisters independently", () => {
    const first = [];
    const second = [];
    const unregisterFirst = r.registerElementClaim(el => first.push(el));
    const unregisterSecond = r.registerElementClaim(el => second.push(el));
    const el = document.createElement("a");
    r.claimElement(el);
    expect(first).toEqual([el]);
    expect(second).toEqual([el]);

    unregisterFirst();
    r.claimElement(el);
    expect(first).toEqual([el]);
    expect(second).toEqual([el, el]);
    unregisterSecond();
  });

  it("rechecks claims on href/action attribute writes", () => {
    const seen = [];
    const unregister = r.registerElementClaim(el => seen.push(el));

    const a = document.createElement("a");
    r.setAttribute(a, "href", "/users/1");
    expect(a.getAttribute("href")).toBe("/users/1");
    expect(seen).toEqual([a]);

    // removal is also a write the consumer must observe
    r.setAttribute(a, "href", undefined);
    expect(a.hasAttribute("href")).toBe(false);
    expect(seen).toEqual([a, a]);

    const form = document.createElement("form");
    r.setAttribute(form, "action", "/actions/save");
    expect(seen).toEqual([a, a, form]);

    // unrelated attributes never notify
    r.setAttribute(a, "title", "hello");
    r.setAttribute(a, "rel", "external");
    expect(seen).toEqual([a, a, form]);

    unregister();
  });

  it("does not recheck attribute writes when dormant", () => {
    const seen = [];
    const a = document.createElement("a");
    // no handler registered — plain write path
    r.setAttribute(a, "href", "/x");
    expect(a.getAttribute("href")).toBe("/x");

    const unregister = r.registerElementClaim(el => seen.push(el));
    unregister();
    // registration existed once but is empty again — still no notification
    r.setAttribute(a, "href", "/y");
    expect(seen).toEqual([]);
  });

  it("rechecks through spread-driven attribute assignment", () => {
    const seen = [];
    const unregister = r.registerElementClaim(el => seen.push(el));
    const a = document.createElement("a");
    // spread assigns land in the same setAttribute write path
    r.assign(a, { href: "/spread", title: "t" });
    expect(a.getAttribute("href")).toBe("/spread");
    expect(seen).toEqual([a]);
    unregister();
  });
});

// End-to-end through compiled JSX: the babel plugin emits claimElement for
// a[href] / form[action] at creation, and dynamic href writes recheck.
describe("element claims through compiled output", () => {
  it("claims static anchors and forms at creation", () => {
    const seen = [];
    const unregister = r.registerElementClaim(el => seen.push(el));
    const view = (
      <div>
        <a href="/about">About</a>
        <a name="unclaimed-anchor">No href</a>
        <form action="/actions/save">
          <button type="submit">Save</button>
        </form>
      </div>
    );
    const anchors = view.querySelectorAll("a");
    const form = view.querySelector("form");
    expect(seen).toEqual([anchors[0], form]);
    expect(seen[0].getAttribute("href")).toBe("/about");
    unregister();
  });

  it("claims dynamic-href anchors at creation and rechecks on writes", () => {
    const seen = [];
    const unregister = r.registerElementClaim(el => seen.push(el));
    createRoot(dispose => {
      const [href, setHref] = createSignal("/users/1");
      const view = <a href={href()}>User</a>;
      flush();
      // claim at creation + the initial dynamic href write
      expect(seen.length).toBe(2);
      expect(seen[0]).toBe(view);
      expect(view.getAttribute("href")).toBe("/users/1");

      setHref("/users/2");
      flush();
      expect(view.getAttribute("href")).toBe("/users/2");
      expect(seen.length).toBe(3);
      expect(seen[2]).toBe(view);
      dispose();
    });
    unregister();
  });

  it("claims spread anchors and rechecks spread href updates", () => {
    const seen = [];
    const unregister = r.registerElementClaim(el => seen.push(el));
    createRoot(dispose => {
      const [props, setProps] = createSignal({ href: "/a" });
      const view = <a {...props()}>Spread</a>;
      flush();
      expect(seen[0]).toBe(view);
      expect(view.getAttribute("href")).toBe("/a");
      const count = seen.length;

      setProps({ href: "/b" });
      flush();
      expect(view.getAttribute("href")).toBe("/b");
      expect(seen.length).toBeGreaterThan(count);
      expect(seen[seen.length - 1]).toBe(view);
      dispose();
    });
    unregister();
  });
});
