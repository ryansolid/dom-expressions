import * as S from "s-js";

describe("create element with various spreads", () => {
  it("should properly spread ref, click, attribute, and children", () => {
    let span, disposer;

    const Component = props => <span {...props} />;

    S.root(dispose => {
      disposer = dispose;
      <Component class="Hello" ref={span} onClick={() => console.log("click")} data-mode="stealth">
        Hi
      </Component>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("Hello")
    expect(span.textContent).toBe("Hi");
    expect(span.$$click).toBeDefined();
    expect(span.getAttribute("data-mode")).toBe("stealth");
    disposer();
  });

  it("should properly prioritize children over spread", () => {
    let span, disposer;

    const Component = props => <span {...props}>Holla</span>;

    S.root(dispose => {
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

    const s = S.data({
      ref(el) { span = el; },
      class: "Hello",
      children: "Hi",
      onClick() { console.log("click") },
      align: "center",
      "data-mode": "stealth"
    })
    S.root(dispose => {
      disposer = dispose;
      <span {...s()} />;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("Hello");
    expect(span.textContent).toBe("Hi");
    expect(span.$$click).toBeDefined();
    expect(span.getAttribute("align")).toBe("center");
    expect(span.getAttribute("data-mode")).toBe("stealth");
    s({
      ref(el) { span = el; },
      class: "Other",
      children: "Holla",
      onClick() { console.log("click") },
      "data-mode": "visible"
    });
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

    S.root(dispose => {
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

    S.root(dispose => {
      disposer = dispose;
      <Component {...props}>
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

    const s = S.data({
      ref(el) { span = el; },
      class: "Hello",
      onClick() { console.log("click") },
      "data-mode": "stealth"
    })
    const Component = props => <span {...props}/>;

    S.root(dispose => {
      disposer = dispose;
      <Component {...s()}>
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
});

describe("ref scope for cleanup in the spread for elements and components", () => {
  it("should not crash when ref is no longer in props", () => {
    let span, disposer;
    const ref = el => { span = el; };

    const p = S.data({
      ref,
      className: "class1"
    });

    S.root(dispose => {
      disposer = dispose;
      <span {...p()}>
        Hi
      </span>
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("class1");
    expect(span.textContent).toBe("Hi");

    p({
      className: "class2"
    });
    expect(span.className).toBe("class2");
    expect(span).toBeDefined();
    disposer();
  });

  it("should call ref outside of the non-function spread effect (no ref cleanup)", () => {
    let span, disposer, refCount = 0, refCleanupCount = 0;

    const Component = props => <span {...props}/>;
    const ref = el => { ++refCount; span = el; S.cleanup(() => { ++refCleanupCount; }); };
    const c = S.data("class1");

    S.root(dispose => {
      disposer = dispose;
      <Component className={c()} ref={ref}>
        Hi
      </Component>
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("class1");
    expect(span.textContent).toBe("Hi");
    expect(refCount).toBe(1);
    expect(refCleanupCount).toBe(0);

    c("class2");
    expect(span.className).toBe("class2");
    expect(refCount).toBe(1);
    expect(refCleanupCount).toBe(0);

    disposer();
    expect(refCleanupCount).toBe(1);
  });
  
  it("should call ref again after cleanup when used in a function spread", () => {
    let span, disposer, refCount = 0, refCleanupCount = 0;

    const ref = el => { ++refCount; span = el; S.cleanup(() => { ++refCleanupCount; }); };
    const p = S.data({
      ref,
      className: "class1"
    });

    S.root(dispose => {
      disposer = dispose;
      <span {...p()}>
        Hi
      </span>
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("class1");
    expect(span.textContent).toBe("Hi");
    expect(refCount).toBe(1);
    expect(refCleanupCount).toBe(0);

    p({
      ref,
      className: "class2"
    });
    expect(span.className).toBe("class2");
    expect(refCount).toBe(2);
    expect(refCleanupCount).toBe(1);

    disposer();
    expect(refCleanupCount).toBe(2);
  });

});
