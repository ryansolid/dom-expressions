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
      className: "Hello",
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
      className: "Other",
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
      className: "Hello",
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
  });
});
