/**
 * @jest-environment jsdom
 */
describe("template with Trusted Types", () => {
  afterEach(() => {
    delete window.trustedTypes;
    jest.resetModules();
  });

  it("creates templates through a named policy", () => {
    const createHTML = jest.fn(html => ({ toString: () => html }));
    const createPolicy = jest.fn(() => ({ createHTML }));
    window.trustedTypes = { createPolicy };
    const r = require("../../src/client");

    const first = r.template("<div>First</div>")();
    const second = r.template("<span>Second</span>")();

    expect(first.outerHTML).toBe("<div>First</div>");
    expect(second.outerHTML).toBe("<span>Second</span>");
    expect(createPolicy).toHaveBeenCalledTimes(1);
    expect(createPolicy.mock.calls[0][0]).toBe("dom-expressions");
    expect(createPolicy.mock.calls[0][1].createHTML("<p></p>")).toBe("<p></p>");
    expect(createHTML.mock.calls).toEqual([["<div>First</div>"], ["<span>Second</span>"]]);
  });

  it("falls back to a string when the policy is not allowed", () => {
    const createPolicy = jest.fn(() => {
      throw new TypeError("Policy dom-expressions disallowed.");
    });
    window.trustedTypes = { createPolicy };
    const r = require("../../src/client");

    expect(r.template("<div>First</div>")().outerHTML).toBe("<div>First</div>");
    expect(r.template("<span>Second</span>")().outerHTML).toBe("<span>Second</span>");
    expect(createPolicy).toHaveBeenCalledTimes(1);
  });

  it("falls back to a string without Trusted Types support", () => {
    const r = require("../../src/client");

    expect(r.template("<div>First</div>")().outerHTML).toBe("<div>First</div>");
  });
});
