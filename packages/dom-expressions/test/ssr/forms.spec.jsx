/**
 * @jest-environment jsdom
 *
 * Asserts that JSX `default*` props end up in the SSR-rendered HTML so that:
 *   - The browser parses the HTML with the correct initial state.
 *   - After hydration, dynamic effects can override `.value`/`.checked`/etc.
 *   - `form.reset()` returns to the SSR-rendered defaults.
 *
 * The babel plugin (with `generate: "ssr"`) should:
 *   - Rename `defaultValue` → `value` (HTML attribute) for inputs/select/etc.
 *   - For textarea, fold the default into children (`<textarea>x</textarea>`).
 *   - Drop `prop:*` from the SSR HTML output (those are runtime-only).
 */
import * as r from "../../src/server";
import { createSignal } from "@solidjs/signals";

describe("SSR renders default* props as HTML", () => {
  it("input: static defaultValue + dynamic value → default in HTML", () => {
    const [cur] = createSignal("dynamic current");
    const html = r.renderToString(() => (
      <input type="text" defaultValue="static default" value={cur()} />
    ));
    expect(html).toContain('value="static default"');
    expect(html).not.toContain('value="dynamic current"');
  });

  it("input: dynamic defaultValue + dynamic value → default in HTML", () => {
    const [def] = createSignal("dynamic default");
    const [cur] = createSignal("dynamic current");
    const html = r.renderToString(() => (
      <input type="text" defaultValue={def()} value={cur()} />
    ));
    expect(html).toContain('value="dynamic default"');
    expect(html).not.toContain('value="dynamic current"');
  });

  it("input: dynamic defaultValue alone → in HTML", () => {
    const [def] = createSignal("the default");
    const html = r.renderToString(() => <input type="text" defaultValue={def()} />);
    expect(html).toContain('value="the default"');
  });

  it("input: static defaultValue alone → in HTML", () => {
    const html = r.renderToString(() => <input type="text" defaultValue="the default" />);
    expect(html).toContain('value="the default"');
  });

  it("input: dynamic value alone → current in HTML (no default sibling)", () => {
    const [cur] = createSignal("current only");
    const html = r.renderToString(() => <input type="text" value={cur()} />);
    expect(html).toContain('value="current only"');
  });

  it("checkbox: defaultChecked={true} + checked={false} → HTML has checked", () => {
    const html = r.renderToString(() => (
      <input type="checkbox" defaultChecked={true} checked={false} />
    ));
    expect(html).toContain("checked");
  });

  it("checkbox: defaultChecked={true} + dynamic checked={false} → HTML has checked", () => {
    const [flag] = createSignal(false);
    const html = r.renderToString(() => (
      <input type="checkbox" defaultChecked={true} checked={flag()} />
    ));
    expect(html).toContain("checked");
  });

  it("checkbox: defaultChecked={false} + dynamic checked={true} → HTML has no checked", () => {
    const [flag] = createSignal(true);
    const html = r.renderToString(() => (
      <input type="checkbox" defaultChecked={false} checked={flag()} />
    ));
    // The default is unchecked; runtime override happens after hydration.
    expect(html).not.toContain("checked");
  });

  it("radio: defaultChecked={true} + dynamic checked={false} → HTML has checked", () => {
    const [flag] = createSignal(false);
    const html = r.renderToString(() => (
      <input type="radio" name="g" value="1" defaultChecked={true} checked={flag()} />
    ));
    expect(html).toContain("checked");
  });

  it("radio group: only the defaulted radio is checked in HTML", () => {
    const [s1] = createSignal(false);
    const [s2] = createSignal(false);
    const [s3] = createSignal(false);
    const html = r.renderToString(() => (
      <div>
        <input type="radio" name="g" value="1" checked={s1()} />
        <input type="radio" name="g" value="2" defaultChecked={true} checked={s2()} />
        <input type="radio" name="g" value="3" checked={s3()} />
      </div>
    ));
    // Only the second radio should be checked in the HTML.
    expect(html).toMatch(/<input[^>]*value="2"[^>]*checked/);
    expect(html).not.toMatch(/<input[^>]*value="1"[^>]*checked/);
    expect(html).not.toMatch(/<input[^>]*value="3"[^>]*checked/);
  });

  it("textarea: static defaultValue + dynamic value → default in text content", () => {
    const [cur] = createSignal("dynamic body");
    const html = r.renderToString(() => (
      <textarea defaultValue="static default body" value={cur()} />
    ));
    expect(html).toContain("<textarea>static default body</textarea>");
  });

  it("textarea: dynamic defaultValue + dynamic value → default in text content", () => {
    const [def] = createSignal("dynamic default body");
    const [cur] = createSignal("dynamic body");
    const html = r.renderToString(() => (
      <textarea defaultValue={def()} value={cur()} />
    ));
    expect(html).toContain("<textarea>dynamic default body</textarea>");
  });

  it("textarea: dynamic value alone → current in text content (no default)", () => {
    const [cur] = createSignal("current only body");
    const html = r.renderToString(() => <textarea value={cur()} />);
    expect(html).toContain("<textarea>current only body</textarea>");
  });

  it("textarea: static defaultValue alone → in text content", () => {
    const html = r.renderToString(() => <textarea defaultValue="just the default" />);
    expect(html).toContain("<textarea>just the default</textarea>");
  });

  it("select with defaultSelected option: HTML has selected on the defaulted option", () => {
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
    // The option with defaultSelected should carry the `selected` HTML attr.
    // We don't pin down exactly where the attribute lands within the option,
    // just that it's present on the second option's text.
    expect(html).toMatch(/<option[^>]*value="2"[^>]*selected[^>]*>Two<\/option>|<option[^>]*selected[^>]*value="2"[^>]*>Two<\/option>/);
  });

  it("multi-select: HTML has selected on each defaulted option", () => {
    const [s2] = createSignal(false);
    const [s4] = createSignal(false);
    const html = r.renderToString(() => (
      <select multiple>
        <option value="1">Item 1</option>
        <option value="2" defaultSelected={true} selected={s2()}>
          Item 2
        </option>
        <option value="3">Item 3</option>
        <option value="4" defaultSelected={true} selected={s4()}>
          Item 4
        </option>
        <option value="5">Item 5</option>
      </select>
    ));
    // Both defaulted options should carry the `selected` HTML attribute
    // regardless of the dynamic signals' values.
    expect(html).toMatch(/<option[^>]*value="2"[^>]*selected[^>]*>[\s\S]*?Item 2/);
    expect(html).toMatch(/<option[^>]*value="4"[^>]*selected[^>]*>[\s\S]*?Item 4/);
    // Non-defaulted options must not be selected.
    expect(html).not.toMatch(/<option[^>]*value="1"[^>]*selected/);
    expect(html).not.toMatch(/<option[^>]*value="3"[^>]*selected/);
    expect(html).not.toMatch(/<option[^>]*value="5"[^>]*selected/);
  });

  it("video: defaultMuted={true} + muted={false} → HTML has muted attribute", () => {
    const html = r.renderToString(() => <video defaultMuted={true} muted={false} />);
    expect(html).toContain("muted");
  });
});
