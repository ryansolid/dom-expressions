import * as S from "s-js";

describe("create element with various spreads", () => {
  it("should properly spread ref, click, and children", () => {
    let span, disposer;

    const Component = props => <span {...props} />;

    S.root(dispose => {
      disposer = dispose;
      <Component ref={span} onClick={() => console.log("click")}>
        Hi
      </Component>;
    });

    expect(span).toBeDefined();
    expect(span.textContent).toBe("Hi");
    expect(span.__click).toBeDefined();
    disposer();
  });
});
