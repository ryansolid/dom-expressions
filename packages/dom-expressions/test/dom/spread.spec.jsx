/**
 * @jest-environment jsdom
 */
import { createMemo, createRoot, createSignal, flush, omit } from "@solidjs/signals";

describe("create element with various spreads", () => {
  it("should properly spread ref, click, attribute, and children", () => {
    let span, disposer;

    const Component = props => <span {...props} />;

    createRoot(dispose => {
      disposer = dispose;
      <Component class="Hello" ref={span} onClick={() => console.log("click")} data-mode="stealth">
        Hi
      </Component>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("Hello");
    expect(span.textContent).toBe("Hi");
    expect(span.$$click).toBeDefined();
    expect(span.getAttribute("data-mode")).toBe("stealth");
    disposer();
  });

  it("should properly prioritize children over spread", () => {
    let span, disposer;

    const Component = props => <span {...props}>Holla</span>;

    createRoot(dispose => {
      disposer = dispose;
      <Component ref={span} onClick={() => console.log("click")}>
        Hi
      </Component>;
    });

    expect(span).toBeDefined();
    expect(span.textContent).toBe("Holla");
    expect(span.$$click).toBeDefined();
    disposer();
  });

  it("should properly spread functions", () => {
    let span, disposer;

    const [s, setS] = createSignal({
      ref(el) {
        span = el;
      },
      class: "Hello",
      children: "Hi",
      onClick() {
        console.log("click");
      },
      align: "center",
      "data-mode": "stealth"
    });
    createRoot(dispose => {
      disposer = dispose;
      <span {...s()} />;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("Hello");
    expect(span.textContent).toBe("Hi");
    expect(span.$$click).toBeDefined();
    expect(span.getAttribute("align")).toBe("center");
    expect(span.getAttribute("data-mode")).toBe("stealth");

    setS({
      ref(el) {
        span = el;
      },
      class: "Other",
      children: "Holla",
      onClick() {
        console.log("click");
      },
      "data-mode": "visible"
    });
    flush();
    expect(span).toBeDefined();
    expect(span.className).toBe("Other");
    expect(span.textContent).toBe("Holla");
    expect(span.$$click).toBeDefined();
    expect(span.getAttribute("align")).toBe(null);
    expect(span.getAttribute("data-mode")).toBe("visible");
    disposer();
  });
});

describe("create component with various spreads", () => {
  it("should properly spread ref, click, attribute, and children", () => {
    let span, disposer;

    const Component = props => <span {...props} />;
    const props = {
      ref: e => (span = e),
      onClick: () => console.log("click"),
      "data-mode": "stealth"
    };

    createRoot(dispose => {
      disposer = dispose;
      <Component {...props}>Hi</Component>;
    });

    expect(span).toBeDefined();
    expect(span.textContent).toBe("Hi");
    expect(span.$$click).toBeDefined();
    expect(span.getAttribute("data-mode")).toBe("stealth");
    disposer();
  });

  it("should properly prioritize children over spread", () => {
    let span, disposer;
    const props = {
      ref: e => (span = e),
      onClick: () => console.log("click"),
      "data-mode": "stealth"
    };

    const Component = props => <span {...props}>Holla</span>;

    createRoot(dispose => {
      disposer = dispose;
      <Component {...props}>Hi</Component>;
    });

    expect(span).toBeDefined();
    expect(span.textContent).toBe("Holla");
    expect(span.$$click).toBeDefined();
    disposer();
  });

  it("should properly spread functions", () => {
    let span, disposer;

    const [s] = createSignal({
      ref(el) {
        span = el;
      },
      class: "Hello",
      onClick() {
        console.log("click");
      },
      "data-mode": "stealth"
    });
    const Component = props => <span {...props} />;

    createRoot(dispose => {
      disposer = dispose;
      <Component {...s()}>Hi</Component>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("Hello");
    expect(span.textContent).toBe("Hi");
    expect(span.$$click).toBeDefined();
    expect(span.getAttribute("data-mode")).toBe("stealth");
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
      class: "class1"
    });

    createRoot(dispose => {
      disposer = dispose;
      <span {...p()}>Hi</span>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("class1");
    expect(span.textContent).toBe("Hi");

    setP({
      class: "class2"
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
      <Component class={c()} ref={ref}>
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
      class: "class1"
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
      class: "class2"
    });
    flush();
    expect(span.className).toBe("class2");
    expect(refCount).toBe(2);

    disposer();
  });

  it("should handle array refs in a spread", () => {
    let span,
      disposer,
      refCount1 = 0,
      refCount2 = 0;

    const ref1 = el => {
      ++refCount1;
      span = el;
    };
    const ref2 = el => {
      ++refCount2;
    };

    createRoot(dispose => {
      disposer = dispose;
      <span {...{ ref: [ref1, ref2], class: "test" }}>Hi</span>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("test");
    expect(refCount1).toBe(1);
    expect(refCount2).toBe(1);

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
      div = <div
        {...{
          get children() {
            return [<button />, stableRendered, show() ? "hide" : null];
          },
          ref(el) {
            div = el;
          }
        }}
      />;
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
      div = <div
        {...{
          get children() {
            return list();
          },
          ref(el) {
            div = el;
          }
        }}
      />;
    });

    expect(div.innerHTML).toBe("ab");
    setList(["x"]);
    flush();
    expect(div.innerHTML).toBe("x");
    disposer();
  });
});

describe("video with static muted", () => {
  it("should set defaultMuted via the muted HTML attribute", () => {
    let video, disposer;

    createRoot(dispose => {
      disposer = dispose;
      video = <video ref={video} src="test.mp4" muted />;
    });

    expect(video).toBeDefined();
    expect(video.defaultMuted).toBe(true);
    expect(video.getAttribute("src")).toBe("test.mp4");
    disposer();
  });
});

describe("component with ref, omit, spread, and children", () => {
  it("should forward ref, spread remaining props, and render children", () => {
    let el, disposer;

    function MyComponent(props) {
      const others = omit(props, "children");
      return (
        <div ref={el} {...others}>
          {props.children}
        </div>
      );
    }

    createRoot(dispose => {
      disposer = dispose;
      <MyComponent class="test" data-id="123">
        <span>Hello</span>
      </MyComponent>;
    });

    expect(el).toBeInstanceOf(HTMLDivElement);
    expect(el.className).toBe("test");
    expect(el.getAttribute("data-id")).toBe("123");
    expect(el.innerHTML).toBe("<span>Hello</span>");
    disposer();
  });

  it("should work with a function ref", () => {
    let el, disposer;

    function MyComponent(props) {
      const others = omit(props, "children");
      return (
        <div ref={e => (el = e)} {...others}>
          {props.children}
        </div>
      );
    }

    createRoot(dispose => {
      disposer = dispose;
      <MyComponent class="test">
        <span>Hello</span>
      </MyComponent>;
    });

    expect(el).toBeInstanceOf(HTMLDivElement);
    expect(el.className).toBe("test");
    expect(el.innerHTML).toBe("<span>Hello</span>");
    disposer();
  });

  it("should work with a signal ref", () => {
    let disposer;
    const [ref, setRef] = createSignal();

    function MyComponent(props) {
      const others = omit(props, "children");
      return (
        <div ref={setRef} {...others}>
          {props.children}
        </div>
      );
    }

    createRoot(dispose => {
      disposer = dispose;
      <MyComponent class="test">
        <span>Hello</span>
      </MyComponent>;
    });

    flush();
    expect(ref()).toBeInstanceOf(HTMLDivElement);
    expect(ref().className).toBe("test");
    expect(ref().innerHTML).toBe("<span>Hello</span>");
    disposer();
  });
});

describe("DOM with state props", () => {
  it("resyncs spread input value when the DOM drifts", () => {
    let input, disposer;
    const [tick, setTick] = createSignal(0);

    createRoot(dispose => {
      disposer = dispose;
      <input
        ref={input}
        {...{
          get value() {
            tick();
            return "fixed";
          }
        }}
      />;
    });

    expect(input.value).toBe("fixed");
    input.value = "typed";
    expect(input.value).toBe("typed");

    setTick(1);
    flush();
    expect(input.value).toBe("fixed");
    disposer();
  });

  it("resyncs spread textarea value when the DOM drifts", () => {
    let textarea, disposer;
    const [tick, setTick] = createSignal(0);

    createRoot(dispose => {
      disposer = dispose;
      <textarea
        ref={textarea}
        {...{
          get value() {
            tick();
            return "fixed";
          }
        }}
      />;
    });

    expect(textarea.value).toBe("fixed");
    textarea.value = "typed";
    expect(textarea.value).toBe("typed");

    setTick(1);
    flush();
    expect(textarea.value).toBe("fixed");
    disposer();
  });

  it("keeps static value attributes while prop:value drives the live value", () => {
    let input, disposer;
    const [value, setValue] = createSignal("live");

    createRoot(dispose => {
      disposer = dispose;
      <input ref={input} value="default value" prop:value={value()} />;
    });

    expect(input.getAttribute("value")).toBe("default value");
    expect(input.value).toBe("live");

    setValue("next");
    flush();

    expect(input.getAttribute("value")).toBe("default value");
    expect(input.value).toBe("next");
    disposer();
  });

  it("normalizes nullish input values to an empty string", () => {
    let input, disposer;
    const [value, setValue] = createSignal("start");

    createRoot(dispose => {
      disposer = dispose;
      <input ref={input} value={value()} />;
    });

    expect(input.value).toBe("start");

    setValue(undefined);
    flush();
    expect(input.value).toBe("");

    setValue(null);
    flush();
    expect(input.value).toBe("");
    disposer();
  });

  it("normalizes nullish textarea values to an empty string", () => {
    let textarea, disposer;
    const [value, setValue] = createSignal("start");

    createRoot(dispose => {
      disposer = dispose;
      <textarea ref={textarea} value={value()} />;
    });

    expect(textarea.value).toBe("start");

    setValue(undefined);
    flush();
    expect(textarea.value).toBe("");

    setValue(null);
    flush();
    expect(textarea.value).toBe("");
    disposer();
  });
});
