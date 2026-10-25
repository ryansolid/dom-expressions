/**
 * @jest-environment jsdom
 */
import * as S from "s-js";
import { spread } from "./custom";

describe("spread prop cleanup", () => {
  it("clears a conditional spread when its condition becomes false", () => {
    let span, disposer;
    const enabled = S.data(true);

    S.root(dispose => {
      disposer = dispose;
      <span ref={span} {...(enabled() && { "data-mode": "active" })}>Hi</span>;
    });

    expect(span.getAttribute("data-mode")).toBe("active");
    enabled(false);
    expect(span.getAttribute("data-mode")).toBe(null);
    expect(span.textContent).toBe("Hi");
    enabled(true);
    expect(span.getAttribute("data-mode")).toBe("active");
    disposer();
  });

  it("clears an accessor spread when its source becomes true", () => {
    let disposer;
    const span = document.createElement("span");
    const initialProps = { "data-mode": "active" };
    const props = S.data(initialProps);

    S.root(dispose => {
      disposer = dispose;
      spread(span, props, true);
    });

    expect(span.getAttribute("data-mode")).toBe("active");
    props(true);
    expect(span.getAttribute("data-mode")).toBe(null);
    props(initialProps);
    expect(span.getAttribute("data-mode")).toBe("active");
    disposer();
  });

  it("clears removed properties and reapplies the same values", () => {
    let span, disposer;
    const initialProps = {
      ref: el => (span = el),
      className: "active",
      "data-mode": "stealth"
    };
    const props = S.data(initialProps);

    S.root(dispose => {
      disposer = dispose;
      <span {...props()}>Hi</span>;
    });

    expect(span.className).toBe("active");
    expect(span.getAttribute("data-mode")).toBe("stealth");

    props({});
    expect(span.className).toBe("");
    expect(span.getAttribute("data-mode")).toBe(null);
    expect(span.textContent).toBe("Hi");

    props(initialProps);
    expect(span.className).toBe("active");
    expect(span.getAttribute("data-mode")).toBe("stealth");
    expect(span.textContent).toBe("Hi");
    disposer();
  });

  it("preserves fallback properties when an override disappears", () => {
    let span, disposer;
    const defaults = {
      ref: el => (span = el),
      "data-mode": "fallback"
    };
    const props = S.data({ "data-mode": "override", "data-state": "active" });

    S.root(dispose => {
      disposer = dispose;
      <span {...defaults} {...props()} />;
    });

    expect(span.getAttribute("data-mode")).toBe("override");
    expect(span.getAttribute("data-state")).toBe("active");

    props({});
    expect(span.getAttribute("data-mode")).toBe("fallback");
    expect(span.getAttribute("data-state")).toBe(null);
    disposer();
  });
});
