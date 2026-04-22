/**
 * @jest-environment jsdom
 */
import { createMemo, createRoot, createSignal, flush } from "@solidjs/signals";

describe("create element with various spreads", () => {
  it("should properly spread ref, click, attribute, and children", () => {
    let span, disposer;

    const Component = props => <span {...props} />;

    createRoot(dispose => {
      disposer = dispose;
      <Component class="Hello" ref={span} data-mode="stealth">
        Hi
      </Component>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("Hello");
    expect(span.textContent).toBe("Hi");
    expect(span.getAttribute("data-mode")).toBe("stealth");
    disposer();
  });

  it("should properly spread false", () => {
    let span, disposer;

    const Component = props => <span ref={props.ref} {...false} />;

    createRoot(dispose => {
      disposer = dispose;
      <Component class="Hello" ref={span} data-mode="stealth">
        Hi
      </Component>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBeFalsy();
    disposer();
  });

  it("should properly prioritize children over spread", () => {
    let span, disposer;

    const Component = props => <span {...props}>Holla</span>;

    createRoot(dispose => {
      disposer = dispose;
      <Component ref={span}>Hi</Component>;
    });

    expect(span).toBeDefined();
    expect(span.textContent).toBe("Holla");
    disposer();
  });
});

describe("create component with various spreads", () => {
  it("should properly spread ref, click, attribute, and children", () => {
    let span, disposer;

    const Component = props => <span {...props} />;
    const props = {
      ref: e => (span = e),
      "data-mode": "stealth"
    };

    createRoot(dispose => {
      disposer = dispose;
      <Component {...props}>Hi</Component>;
    });

    expect(span).toBeDefined();
    expect(span.textContent).toBe("Hi");
    expect(span.getAttribute("data-mode")).toBe("stealth");
    disposer();
  });

  it("should properly prioritize children over spread", () => {
    let span, disposer;
    const props = {
      ref: e => (span = e),
      "data-mode": "stealth"
    };

    const Component = props => <span {...props}>Holla</span>;

    createRoot(dispose => {
      disposer = dispose;
      <Component {...props}>Hi</Component>;
    });

    expect(span).toBeDefined();
    expect(span.textContent).toBe("Holla");
    disposer();
  });
});

describe("ref scope for cleanup in the spread for elements and components", () => {
  it("should not crash when ref is no longer in props", () => {
    let span, disposer;
    const ref = el => {
      span = el;
    };

    const [p, setP] = createSignal({
      ref,
      className: "class1"
    });

    createRoot(dispose => {
      disposer = dispose;
      <span {...p()}>Hi</span>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("class1");
    expect(span.textContent).toBe("Hi");

    setP({
      className: "class2"
    });
    flush();
    expect(span.className).toBe("class2");
    expect(span).toBeDefined();
    disposer();
  });

  it("should call ref outside of the non-function spread effect (no ref cleanup)", () => {
    let span,
      disposer,
      refCount = 0;

    const Component = props => <span {...props} />;
    const ref = el => {
      ++refCount;
      span = el;
    };
    const [c, setC] = createSignal("class1");

    createRoot(dispose => {
      disposer = dispose;
      <Component className={c()} ref={ref}>
        Hi
      </Component>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("class1");
    expect(span.textContent).toBe("Hi");
    expect(refCount).toBe(1);

    setC("class2");
    flush();
    expect(span.className).toBe("class2");
    expect(refCount).toBe(1);

    disposer();
  });

  it("should call ref again when used in a function spread", () => {
    let span,
      disposer,
      refCount = 0;

    const ref = el => {
      ++refCount;
      span = el;
    };
    const [p, setP] = createSignal({
      ref,
      className: "class1"
    });

    createRoot(dispose => {
      disposer = dispose;
      <span {...p()}>Hi</span>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("class1");
    expect(span.textContent).toBe("Hi");
    expect(refCount).toBe(1);

    setP({
      ref,
      className: "class2"
    });
    flush();
    expect(span.className).toBe("class2");
    expect(refCount).toBe(2);

    disposer();
  });
});

describe("spread prop cleanup", () => {
  it("clears removed props from function spreads", () => {
    let span, disposer;
    const ref = el => {
      span = el;
    };
    const [p, setP] = createSignal({
      ref,
      align: "center",
      "data-mode": "stealth"
    });

    createRoot(dispose => {
      disposer = dispose;
      <span {...p()}>Hi</span>;
    });

    expect(span.getAttribute("align")).toBe("center");
    expect(span.getAttribute("data-mode")).toBe("stealth");

    setP({
      ref,
      "data-mode": "visible"
    });
    flush();

    expect(span.getAttribute("align")).toBe(null);
    expect(span.getAttribute("data-mode")).toBe("visible");
    disposer();
  });
});

describe("spread children caching", () => {
  it("preserves isolated child slots", () => {
    let div, disposer, setShow;
    const rendered = jest.fn(() => undefined);
    createRoot(dispose => {
      disposer = dispose;
      const [show, _setShow] = createSignal(true);
      const stableRendered = createMemo(() => rendered(), undefined, { lazy: true });
      setShow = _setShow;
      div = (
        <div
          {...{
            get children() {
              return [<button />, stableRendered, show() ? "hide" : null];
            },
            ref(el) {
              div = el;
            }
          }}
        />
      );
    });

    expect(rendered).toHaveBeenCalledTimes(1);
    expect(div.innerHTML).toBe("<button></button>hide");

    setShow(false);
    flush();
    expect(rendered).toHaveBeenCalledTimes(1);
    expect(div.innerHTML).toBe("<button></button>");
    disposer();
  });

  it("keeps reactive arrays live", () => {
    let div, disposer, setList;
    createRoot(dispose => {
      disposer = dispose;
      const [list, _setList] = createSignal(["a", "b"]);
      setList = _setList;
      div = (
        <div
          {...{
            get children() {
              return list();
            },
            ref(el) {
              div = el;
            }
          }}
        />
      );
    });

    expect(div.innerHTML).toBe("ab");
    setList(["x"]);
    flush();
    expect(div.innerHTML).toBe("x");
    disposer();
  });
});
