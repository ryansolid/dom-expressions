/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";

describe("r.setTrustedTypesPolicy", () => {
  afterEach(() => r.setTrustedTypesPolicy(undefined));

  it("assigns the TrustedHTML the policy creates", () => {
    const assigned = [];
    const setter = jest
      .spyOn(Element.prototype, "innerHTML", "set")
      .mockImplementation(function (value) {
        assigned.push(value);
        this.content.appendChild(document.createElement("div"));
      });
    const createHTML = jest.fn(html => ({ html }));
    r.setTrustedTypesPolicy({ createHTML });

    r.template("<div>First</div>")();
    setter.mockRestore();

    expect(createHTML.mock.calls).toEqual([["<div>First</div>"]]);
    expect(assigned).toEqual([createHTML.mock.results[0].value]);
  });

  it("creates each template once", () => {
    const createHTML = jest.fn(html => html);
    r.setTrustedTypesPolicy({ createHTML });
    const tmpl = r.template("<span>Second</span>");

    expect(tmpl().outerHTML).toBe("<span>Second</span>");
    expect(tmpl().outerHTML).toBe("<span>Second</span>");
    expect(createHTML).toHaveBeenCalledTimes(1);
  });

  it("assigns the string without a policy", () => {
    expect(r.template("<div>First</div>")().outerHTML).toBe("<div>First</div>");
  });
});
