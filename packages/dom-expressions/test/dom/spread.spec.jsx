/**
 * @jest-environment jsdom
 */
import { createRoot, createSignal, flush } from "@solidjs/signals";

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
