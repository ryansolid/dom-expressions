/**
 * @jest-environment jsdom
 *
 * <select value> resolution (solidjs/solid#3013).
 *
 * HTML has no `value` attribute on <select>: the initial selection comes from
 * `selected` on an <option>. The compiler emits the bound value as a `value`
 * attribute marker; a flush-time pass resolves it into `selected` on the
 * matching option(s) and strips the attribute, so no-JS clients and crawlers
 * see the right selection. When an option carries `selected` already (a
 * defaultSelected), the default wins — same contract as defaultValue + value
 * on an <input>.
 */
import * as r from "../../src/server";
import { createSignal } from "@solidjs/signals";

describe("SSR <select value> resolves to selected options", () => {
  it("marks the matching option and strips the value attribute", () => {
    const [lang] = createSignal("fr");
    const html = r.renderToString(() => (
      <select value={lang()}>
        <option value="en">English</option>
        <option value="fr">French</option>
        <option value="de">German</option>
      </select>
    ));
    expect(html).toMatch(/<option value="fr" selected>French<\/option>/);
    expect(html).not.toMatch(/<select[^>]*value=/);
    expect(html).not.toMatch(/value="en"[^>]*selected/);
    expect(html).not.toMatch(/value="de"[^>]*selected/);
  });

  it("static select value works the same as a bound one", () => {
    const html = r.renderToString(() => (
      <select value="de">
        <option value="en">English</option>
        <option value="de">German</option>
      </select>
    ));
    expect(html).toMatch(/<option value="de" selected>/);
    expect(html).not.toMatch(/<select[^>]*value=/);
  });

  it("matches options by text content when they have no value attribute", () => {
    const [lang] = createSignal("French");
    const html = r.renderToString(() => (
      <select value={lang()}>
        <option>English</option>
        <option>French</option>
      </select>
    ));
    expect(html).toMatch(/<option selected>French<\/option>/);
    expect(html).not.toMatch(/<option selected>English/);
  });

  it("multiple: marks every value in the array", () => {
    const [langs] = createSignal(["en", "de"]);
    const html = r.renderToString(() => (
      <select multiple value={langs()}>
        <option value="en">English</option>
        <option value="fr">French</option>
        <option value="de">German</option>
      </select>
    ));
    expect(html).toMatch(/value="en" selected/);
    expect(html).toMatch(/value="de" selected/);
    expect(html).not.toMatch(/value="fr" selected/);
  });

  it("dynamic options (mapped) are matched too", () => {
    const [lang] = createSignal("fr");
    const langs = ["en", "fr", "de"];
    const html = r.renderToString(() => (
      <select value={lang()}>
        {langs.map(l => (
          <option value={l}>{l}</option>
        ))}
      </select>
    ));
    expect(html).toMatch(/value="fr"[^>]*selected/);
    expect(html).not.toMatch(/value="en"[^>]*selected/);
  });

  it("an option with defaultSelected wins over the bound value (forms contract)", () => {
    const [cur] = createSignal("3");
    const html = r.renderToString(() => (
      <select value={cur()}>
        <option value="1">One</option>
        <option value="2" defaultSelected={true}>
          Two
        </option>
        <option value="3">Three</option>
      </select>
    ));
    expect(html).toMatch(/value="2"[^>]*selected/);
    expect(html).not.toMatch(/value="3"[^>]*selected/);
    expect(html).not.toMatch(/<select[^>]*value=/);
  });

  it("compares escaped values correctly", () => {
    const [v] = createSignal('a"b&c');
    const html = r.renderToString(() => (
      <select value={v()}>
        <option value='a"b&c'>weird</option>
        <option value="plain">plain</option>
      </select>
    ));
    expect(html).toMatch(/value="a&quot;b&amp;c" selected/);
  });

  it("a sibling select without a bound value is untouched", () => {
    const [lang] = createSignal("fr");
    const html = r.renderToString(() => (
      <div>
        <select value={lang()}>
          <option value="fr">French</option>
        </select>
        <select>
          <option value="fr">French</option>
        </select>
      </div>
    ));
    // Only the first select's option gains selected.
    expect(html.match(/ selected/g)).toHaveLength(1);
  });
});

describe("resolveSSRSelectValues string safety", () => {
  const resolve = r.resolveSSRSelectValues;

  it("ignores > and </select> inside quoted attribute values", () => {
    const html =
      '<select title="a > b" value="x"><option label="</select>" value="x">X</option><option value="y">Y</option></select>';
    expect(resolve(html)).toBe(
      '<select title="a > b"><option label="</select>" value="x" selected>X</option><option value="y">Y</option></select>'
    );
  });

  it("does not treat <selectedcontent> or its close as select tags", () => {
    const html =
      '<select value="x"><selectedcontent></selectedcontent><option value="x">X</option></select>';
    expect(resolve(html)).toBe(
      '<select><selectedcontent></selectedcontent><option value="x" selected>X</option></select>'
    );
  });

  it("collects option text across hydration marker comments", () => {
    const html = '<select value="French"><option><!--#-->French<!--/--></option></select>';
    expect(resolve(html)).toBe("<select><option selected><!--#-->French<!--/--></option></select>");
  });

  it("leaves a select that does not close in this chunk byte-identical", () => {
    const html = '<select value="x"><option value="x">X</option>';
    expect(resolve(html)).toBe(html);
  });

  it("a <select occurrence inside an attribute value cannot start a select", () => {
    const html = '<div title="a <select value="><option value="x">X</option></div>';
    expect(resolve(html)).toBe(html);
  });

  it("empty single value matches an empty-valued option", () => {
    const html =
      '<select value=""><option value="">none</option><option value="a">A</option></select>';
    expect(resolve(html)).toBe(
      '<select><option value="" selected>none</option><option value="a">A</option></select>'
    );
  });
});
