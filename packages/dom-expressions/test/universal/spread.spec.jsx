import * as S from "s-js";

describe("create element with various spreads", () => {
  it("should properly spread ref, click, attribute, and children", () => {
    let span, disposer;

    const Component = props => <span {...props} />;

    S.root(dispose => {
      disposer = dispose;
      <Component class="Hello" ref={span} data-mode="stealth">
        Hi
      </Component>;
    });

    expect(span).toBeDefined();
    expect(span.className).toBe("Hello")
    expect(span.textContent).toBe("Hi");
    expect(span.getAttribute("data-mode")).toBe("stealth");
    disposer();
  });

  it("should properly prioritize children over spread", () => {
    let span, disposer;

    const Component = props => <span {...props}>Holla</span>;

    S.root(dispose => {
      disposer = dispose;
      <Component ref={span}>
        Hi
      </Component>;
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

    S.root(dispose => {
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

    S.root(dispose => {
      disposer = dispose;
      <Component {...props}>
        Hi
      </Component>;
    });

    expect(span).toBeDefined();
    expect(span.textContent).toBe("Holla");
    disposer();
  });
});
