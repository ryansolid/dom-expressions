/**
 * @jest-environment jsdom
 */
import * as S from "s-js";describe("Test style binding", () => {
  test("var from function", () => {
    S.root(() => {
      {
        // defined
        const nope = () => "green";
        const div = (
          <div
            class="bg-(--bg)"
            style={{
              "--bg": nope(),
            }}
          />
        );
        expect(div.style.cssText).toBe("--bg: green;");
      }

      {
        // undefined - https://github.com/ryansolid/dom-expressions/issues/429
        const nope = () => undefined;
        const div = (
          <div
            class="bg-(--bg)"
            style={{
              "--bg": nope(),
            }}
          />
        );
        expect(div.style.cssText).toBe("");
      }
    });
  });
});
