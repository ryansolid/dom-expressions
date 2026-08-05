/**
 * @jest-environment jsdom
 *
 * The hydration walk inside <head> tolerates foreign injected nodes.
 *
 * <head> is the tool-injection zone: vite prepends its dev client script,
 * HMR inserts style tags, extensions add scripts — none of which the server
 * rendered. A strictly positional claim adopted the first foreign node as
 * the component's element and drifted every subsequent sibling claim by one
 * (metas claimed as title, title as link), including insert anchors computed
 * off the walked nodes. With the expected tag in hand the walk now scans
 * forward to the first match — head only; body walks stay strict so genuine
 * structure mismatches keep surfacing.
 */
import { getFirstChild, getNextSibling } from "../../src/client";
import { sharedConfig } from "../core";

describe("head hydration walk", () => {
  beforeEach(() => {
    sharedConfig.hydrating = true;
  });
  afterEach(() => {
    sharedConfig.hydrating = false;
    document.head.innerHTML = "";
  });

  function seedHead(html) {
    document.head.innerHTML = html;
    return document.head;
  }

  it("skips a dev-server script prepended before the first claimed element", () => {
    const head = seedHead(
      '<script data-injected="vite"></script>' +
        '<meta charset="utf-8"><meta name="viewport"><title>T</title><link rel="icon">'
    );
    const meta1 = getFirstChild(head, "meta");
    expect(meta1.getAttribute("charset")).toBe("utf-8");
    const meta2 = getNextSibling(meta1, "meta");
    expect(meta2.getAttribute("name")).toBe("viewport");
    const title = getNextSibling(meta2, "title");
    expect(title.localName).toBe("title");
    const link = getNextSibling(title, "link");
    expect(link.localName).toBe("link");
  });

  it("skips an injected style between claimed siblings", () => {
    const head = seedHead(
      '<meta charset="utf-8"><style data-injected="hmr"></style><title>T</title>'
    );
    const meta = getFirstChild(head, "meta");
    const title = getNextSibling(meta, "title");
    expect(title.localName).toBe("title");
  });

  it("returns the positional node (and warns) when the expected tag never appears", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const head = seedHead('<script data-injected></script><meta charset="utf-8">');
      const node = getFirstChild(head, "link");
      expect(node.localName).toBe("script");
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("stays strictly positional outside head", () => {
    const div = document.createElement("div");
    div.innerHTML = "<span></span><p></p>";
    document.body.appendChild(div);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      // A body-side mismatch must NOT be papered over by scanning ahead.
      const first = getFirstChild(div, "p");
      expect(first.localName).toBe("span");
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      div.remove();
    }
  });

  it("does nothing outside hydration", () => {
    sharedConfig.hydrating = false;
    const head = seedHead('<script data-injected></script><meta charset="utf-8">');
    expect(getFirstChild(head, "meta").localName).toBe("script");
  });
});
