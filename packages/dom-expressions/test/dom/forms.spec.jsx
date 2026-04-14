/**
 * @jest-environment jsdom
 *
 * Asserts that JSX `default*` props (defaultValue, defaultChecked,
 * defaultSelected, defaultMuted) reach the corresponding IDL property and
 * survive `form.reset()`, while the dynamic props (value/checked/selected/
 * muted) drive the live state through the reactive system.
 *
 * The babel-plugin-jsx-dom-expressions pipeline must:
 *   1. Set the *default* on the element so the browser uses it for reset.
 *   2. Set the *current* via a reactive effect so updates flow through.
 *   3. Not conflate the two — `form.reset()` walks defaults, signals stay put.
 */
import { createRoot, createSignal, flush } from "@solidjs/signals";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("form reset restores default* props", () => {
  it("text input: defaultValue persists, dynamic value drives current state", () => {
    let input, form, dispose;
    const [text, setText] = createSignal("dynamic initial");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <input ref={input} type="text" defaultValue="static default" value={text()} />
          <button type="reset">Reset</button>
        </form>
      );
    });

    expect(input.value).toBe("dynamic initial");
    expect(input.defaultValue).toBe("static default");

    setText("dynamic changed");
    flush();
    expect(input.value).toBe("dynamic changed");
    expect(input.defaultValue).toBe("static default");

    form.reset();
    expect(input.value).toBe("static default");
    expect(text()).toBe("dynamic changed"); // signal untouched by reset

    setText("dynamic after reset");
    flush();
    expect(input.value).toBe("dynamic after reset");

    dispose();
  });

  it("number input: defaultValue persists, dynamic value drives current state", () => {
    let input, form, dispose;
    const [num, setNum] = createSignal("7");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <input
            ref={input}
            type="number"
            min="0"
            max="100"
            defaultValue="42"
            value={num()}
          />
          <button type="reset">Reset</button>
        </form>
      );
    });

    expect(input.value).toBe("7");
    expect(input.defaultValue).toBe("42");

    setNum("13");
    flush();
    expect(input.value).toBe("13");

    form.reset();
    expect(input.value).toBe("42");

    dispose();
  });

  it("checkbox: defaultChecked persists, dynamic checked drives current state", () => {
    let input, form, dispose;
    const [flag, setFlag] = createSignal(false);

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <input ref={input} type="checkbox" defaultChecked={true} checked={flag()} />
          <button type="reset">Reset</button>
        </form>
      );
    });

    expect(input.checked).toBe(false); // dynamic wins
    expect(input.defaultChecked).toBe(true);

    setFlag(true);
    flush();
    expect(input.checked).toBe(true);
    expect(input.defaultChecked).toBe(true);

    form.reset();
    expect(input.checked).toBe(true); // back to default (which happens to also be true)
    expect(flag()).toBe(true);

    setFlag(false);
    flush();
    expect(input.checked).toBe(false);

    form.reset();
    expect(input.checked).toBe(true); // reset restores defaultChecked
    expect(flag()).toBe(false); // signal untouched

    dispose();
  });

  it("radio group: defaultChecked on one radio is the reset target", () => {
    let r1, r2, r3, form, dispose;
    const [selected, setSelected] = createSignal("1");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <input
            ref={r1}
            type="radio"
            name="g"
            value="1"
            checked={selected() === "1"}
          />
          <input
            ref={r2}
            type="radio"
            name="g"
            value="2"
            defaultChecked={true}
            checked={selected() === "2"}
          />
          <input
            ref={r3}
            type="radio"
            name="g"
            value="3"
            checked={selected() === "3"}
          />
          <button type="reset">Reset</button>
        </form>
      );
    });

    expect(r1.checked).toBe(true);
    expect(r2.checked).toBe(false);
    expect(r3.checked).toBe(false);
    expect(r2.defaultChecked).toBe(true);

    setSelected("3");
    flush();
    expect(r1.checked).toBe(false);
    expect(r2.checked).toBe(false);
    expect(r3.checked).toBe(true);

    form.reset();
    expect(r1.checked).toBe(false);
    expect(r2.checked).toBe(true); // the defaulted radio
    expect(r3.checked).toBe(false);

    dispose();
  });

  it("textarea: defaultValue persists, dynamic value drives current state", () => {
    let textarea, form, dispose;
    const [body, setBody] = createSignal("dynamic body");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <textarea ref={textarea} defaultValue="static default body" value={body()} />
          <button type="reset">Reset</button>
        </form>
      );
    });

    expect(textarea.value).toBe("dynamic body");
    expect(textarea.defaultValue).toBe("static default body");

    setBody("changed");
    flush();
    expect(textarea.value).toBe("changed");
    expect(textarea.defaultValue).toBe("static default body");

    form.reset();
    expect(textarea.value).toBe("static default body");
    expect(body()).toBe("changed"); // signal untouched

    dispose();
  });

  it("select with defaultSelected option: reset returns to that option", () => {
    let select, form, dispose;
    const [sel, setSel] = createSignal("3");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <select ref={select} value={sel()}>
            <option value="1">One</option>
            <option value="2" defaultSelected={true}>
              Two
            </option>
            <option value="3">Three</option>
          </select>
          <button type="reset">Reset</button>
        </form>
      );
    });

    // queueMicrotask wrapping in select prop:value handler — flush microtasks
    return Promise.resolve().then(() => {
      expect(select.value).toBe("3");
      expect(select.options[1].defaultSelected).toBe(true);

      setSel("1");
      flush();
      return Promise.resolve().then(() => {
        expect(select.value).toBe("1");

        form.reset();
        expect(select.value).toBe("2"); // back to defaulted option
        expect(sel()).toBe("1"); // signal untouched

        dispose();
      });
    });
  });

  it("multi-select: defaultSelected on multiple options is the reset target", () => {
    let select, form, dispose;
    // Two options have defaultSelected={true}; the dynamic `selected` signals
    // initially override them so we can prove that reset puts the defaults back.
    const [s2, setS2] = createSignal(false);
    const [s4, setS4] = createSignal(false);
    const [s5, setS5] = createSignal(true);

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <select ref={select} multiple>
            <option value="1">Item 1</option>
            <option value="2" defaultSelected={true} selected={s2()}>
              Item 2
            </option>
            <option value="3">Item 3</option>
            <option value="4" defaultSelected={true} selected={s4()}>
              Item 4
            </option>
            <option value="5" selected={s5()}>
              Item 5
            </option>
          </select>
          <button type="reset">Reset</button>
        </form>
      );
    });

    // Initial: dynamic `selected` wins on options 2 and 4 (overriding the
    // defaults), and option 5 is dynamically selected.
    expect(select.options[0].selected).toBe(false);
    expect(select.options[1].selected).toBe(false);
    expect(select.options[2].selected).toBe(false);
    expect(select.options[3].selected).toBe(false);
    expect(select.options[4].selected).toBe(true);

    // defaultSelected on options 2 and 4 must be preserved regardless.
    expect(select.options[1].defaultSelected).toBe(true);
    expect(select.options[3].defaultSelected).toBe(true);

    // Move the dynamic selection around.
    setS2(true);
    setS5(false);
    flush();
    expect(select.options[1].selected).toBe(true);
    expect(select.options[4].selected).toBe(false);

    // form.reset() walks every option and sets selected ← defaultSelected.
    form.reset();
    expect(select.options[0].selected).toBe(false);
    expect(select.options[1].selected).toBe(true); // defaulted
    expect(select.options[2].selected).toBe(false);
    expect(select.options[3].selected).toBe(true); // defaulted
    expect(select.options[4].selected).toBe(false);

    // Signals untouched by reset.
    expect(s2()).toBe(true);
    expect(s4()).toBe(false);
    expect(s5()).toBe(false);

    dispose();
  });

  it("video: defaultMuted persists, dynamic muted drives current state", () => {
    // <video> isn't reset by form.reset(), but defaultMuted/muted should still
    // be wired to the right IDL properties.
    let video, dispose;
    const [muted, setMuted] = createSignal(false);

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <video ref={video} defaultMuted={true} muted={muted()} />
      );
    });

    expect(video.muted).toBe(false); // dynamic wins
    expect(video.defaultMuted).toBe(true);

    setMuted(true);
    flush();
    expect(video.muted).toBe(true);
    expect(video.defaultMuted).toBe(true);

    setMuted(false);
    flush();
    expect(video.muted).toBe(false);
    expect(video.defaultMuted).toBe(true); // never overwritten

    dispose();
  });
});

describe("various default/current combinations", () => {
  // Each test pins down a different combination of static/dynamic default
  // and static/dynamic current value, so we know which babel branch is
  // being exercised: template-inlined HTML attribute, prop:* runtime
  // assignment, or (for textarea) children-as-default.

  it("input: dynamic defaultValue + dynamic value (both via prop:*)", () => {
    let input, form, dispose;
    const [def, setDef] = createSignal("default A");
    const [cur, setCur] = createSignal("current X");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <input ref={input} type="text" defaultValue={def()} value={cur()} />
          <button type="reset">Reset</button>
        </form>
      );
    });

    expect(input.value).toBe("current X");
    expect(input.defaultValue).toBe("default A");

    // Update the default — value should not be touched (input is dirty
    // because the prop:value effect set it).
    setDef("default B");
    flush();
    expect(input.defaultValue).toBe("default B");
    expect(input.value).toBe("current X");

    // Update the current — defaultValue should not be touched.
    setCur("current Y");
    flush();
    expect(input.value).toBe("current Y");
    expect(input.defaultValue).toBe("default B");

    // Reset goes to whatever the latest default was.
    form.reset();
    expect(input.value).toBe("default B");
    expect(def()).toBe("default B");
    expect(cur()).toBe("current Y"); // signal untouched

    dispose();
  });

  it("input: dynamic defaultValue alone", () => {
    let input, form, dispose;
    const [def, setDef] = createSignal("default A");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <input ref={input} type="text" defaultValue={def()} />
          <button type="reset">Reset</button>
        </form>
      );
    });

    expect(input.defaultValue).toBe("default A");

    setDef("default B");
    flush();
    expect(input.defaultValue).toBe("default B");

    form.reset();
    expect(input.value).toBe("default B");

    dispose();
  });

  it("input: static defaultValue alone (template-inlined)", () => {
    let input, form, dispose;

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <input ref={input} type="text" defaultValue="static default" />
          <button type="reset">Reset</button>
        </form>
      );
    });

    // Static literal default gets renamed to the bare HTML attribute, which
    // initializes both .value and .defaultValue on parse.
    expect(input.value).toBe("static default");
    expect(input.defaultValue).toBe("static default");

    // Simulate user editing.
    input.value = "user typed";
    expect(input.value).toBe("user typed");
    expect(input.defaultValue).toBe("static default");

    form.reset();
    expect(input.value).toBe("static default");

    dispose();
  });

  it("input: dynamic value alone leaves defaultValue empty", () => {
    let input, form, dispose;
    const [cur, setCur] = createSignal("current X");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <input ref={input} type="text" value={cur()} />
          <button type="reset">Reset</button>
        </form>
      );
    });

    expect(input.value).toBe("current X");
    expect(input.defaultValue).toBe("");

    setCur("current Y");
    flush();
    expect(input.value).toBe("current Y");
    expect(input.defaultValue).toBe("");

    // No default to fall back to, so reset clears the field.
    form.reset();
    expect(input.value).toBe("");
    expect(cur()).toBe("current Y"); // signal untouched

    dispose();
  });

  it("textarea: dynamic value alone leaves defaultValue empty (matches input semantics)", () => {
    // Mirrors the input test above. In DOM, `<textarea value={dyn}/>` is a
    // controlled component: prop:value sets `.value`, `.defaultValue` is left
    // empty, and `form.reset()` returns to "".
    //
    // SSR diverges intentionally: the SSR HTML output puts the dynamic value
    // into the textarea's text content, which the browser uses to initialize
    // both `.value` and `.defaultValue` on parse — see the SSR test
    // `"textarea: dynamic value alone → current in text content (no default)"`.
    let textarea, form, dispose;
    const [v, setV] = createSignal("current only body");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <textarea ref={textarea} value={v()} />
          <button type="reset">Reset</button>
        </form>
      );
    });

    expect(textarea.value).toBe("current only body");
    expect(textarea.defaultValue).toBe("");

    setV("changed");
    flush();
    expect(textarea.value).toBe("changed");
    expect(textarea.defaultValue).toBe("");

    // No default to fall back to, so reset clears the field.
    form.reset();
    expect(textarea.value).toBe("");
    expect(v()).toBe("changed"); // signal untouched

    dispose();
  });

  it("textarea: dynamic defaultValue alone (children-as-default)", () => {
    let textarea, form, dispose;
    const [def, setDef] = createSignal("dynamic default");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <textarea ref={textarea} defaultValue={def()} />
          <button type="reset">Reset</button>
        </form>
      );
    });

    // The babel transform turns dynamic textarea defaultValue into children
    // (an _$insert call). The browser/jsdom mirrors text content into both
    // .defaultValue and .value while the textarea isn't dirty.
    expect(textarea.defaultValue).toBe("dynamic default");
    expect(textarea.value).toBe("dynamic default");

    setDef("changed default");
    flush();
    expect(textarea.defaultValue).toBe("changed default");

    // Simulate user editing.
    textarea.value = "user typed";
    expect(textarea.defaultValue).toBe("changed default");

    form.reset();
    expect(textarea.value).toBe("changed default");

    dispose();
  });

  it("textarea: dynamic defaultValue + dynamic value", () => {
    let textarea, form, dispose;
    const [def, setDef] = createSignal("default A");
    const [cur, setCur] = createSignal("current X");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <form ref={form}>
          <textarea ref={textarea} defaultValue={def()} value={cur()} />
          <button type="reset">Reset</button>
        </form>
      );
    });

    expect(textarea.value).toBe("current X");
    expect(textarea.defaultValue).toBe("default A");

    setDef("default B");
    flush();
    expect(textarea.defaultValue).toBe("default B");

    setCur("current Y");
    flush();
    expect(textarea.value).toBe("current Y");
    expect(textarea.defaultValue).toBe("default B");

    form.reset();
    expect(textarea.value).toBe("default B");
    expect(def()).toBe("default B");
    expect(cur()).toBe("current Y"); // signal untouched

    dispose();
  });
});

describe("file input ordering", () => {
  it("does not throw when component props set value before file type", () => {
    let input, dispose;

    const Input = props => <input ref={input} value={props.a} type={props.a} />;

    expect(() => {
      createRoot(d => {
        dispose = d;
        document.body.appendChild(<Input a="file" />);
      });
    }).not.toThrow();

    expect(input.type).toBe("file");
    expect(input.value).toBe("");

    dispose();
  });
});

describe("textarea edge cases (suspected bugs)", () => {
  // These tests document expected behaviour that the current babel transform
  // does NOT yet honour. They may fail until `transformSpecialCaseAttributes`
  // stops folding `<textarea value={...}/>` into children when there's no
  // `defaultValue` sibling, and stops overwriting user-supplied children.

  it("textarea: dynamic value alone — updates after user typing (Bug B)", () => {
    let textarea, dispose;
    const [v, setV] = createSignal("initial");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(<textarea ref={textarea} value={v()} />);
    });

    expect(textarea.value).toBe("initial");

    // Simulate the user typing — this marks the textarea as "dirty".
    // Once dirty, replacing child nodes does NOT update `.value` per HTML spec.
    textarea.value = "user typed";
    expect(textarea.value).toBe("user typed");

    // Reactive update to the signal: should still flow into `.value` because
    // the user wrote `value={...}`. With the current babel transform this is
    // compiled as `_$insert(textarea, v)` (children-based), which silently
    // stops working after the first user interaction.
    setV("updated");
    flush();
    expect(textarea.value).toBe("updated"); // EXPECTED TO FAIL with current transform

    dispose();
  });

  it("textarea: dynamic value + dynamic children — children updates remain observable (Bug A)", () => {
    let textarea, dispose;
    const [v] = createSignal("from value");
    const [c, setC] = createSignal("c1");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(
        <textarea ref={textarea} value={v()}>
          {c()}
        </textarea>
      );
    });

    // The user wrote BOTH a `value` attribute and explicit children. With the
    // fix, value drives `.value` (via prop:value) and the user's children are
    // rendered into the textarea's text content (and stay reactive). They no
    // longer get silently overwritten by the value-as-children insert.
    expect(textarea.value).toBe("from value"); // value wins for .value
    expect(textarea.textContent).toBe("c1"); // children rendered into the textarea

    setC("c2");
    flush();
    expect(textarea.textContent).toBe("c2"); // children update is observable

    dispose();
  });

  it("textarea: dynamic children alone — works as plain reactive children", () => {
    let textarea, dispose;
    const [c, setC] = createSignal("initial children");

    createRoot(d => {
      dispose = d;
      document.body.appendChild(<textarea ref={textarea}>{c()}</textarea>);
    });

    // Sanity case: no `value`, no `defaultValue`, just reactive children.
    // `transformSpecialCaseAttributes` should not touch this element at all.
    expect(textarea.value).toBe("initial children");

    setC("updated children");
    flush();
    expect(textarea.value).toBe("updated children");

    dispose();
  });
});
