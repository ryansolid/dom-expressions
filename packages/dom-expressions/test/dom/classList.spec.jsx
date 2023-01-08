/**
 * @jest-environment jsdom
 */
import * as S from "s-js";

describe("Test classList binding", () => {
  test("Single binding", () => {
    let div;
    S.root(() => {
      const color = S.data(true),
        danger = S.data(false);
      div = <div classList={{ color: color(), danger: danger() }} />;
      expect(div.className).toBe("color");
      danger(true);
      expect(div.className).toBe("color danger");
    });
  });

  test("Multi binding", () => {
    let div;
    S.root(() => {
      const title = S.data("title"),
        color = S.data(true),
        danger = S.data(false);
      div = <div title={title()} classList={{ color: color(), danger: danger() }} />;
      expect(div.className).toBe("color");
      danger(true);
      expect(div.className).toBe("color danger");
    });
  });

  test("Computed binding", () => {
    let div;
    S.root(() => {
      const className = S.data("active");
      div = <div classList={{ [className()]: true }} />;
      expect(div.className).toBe("active");
      className("danger");
      expect(div.className).toBe("danger");
      className(undefined);
      expect(div.className).toBe("");
    });
  });

  test("With leading/trailing spaces", () => {
    let div;
    S.root(() => {
      div = <div classList={{ " color ": S.data(true) }} />;
      expect(div.className).toBe("color");
    });
  });

  test("Tailwind Style", () => {
    let div;
    S.root(() => {
      div = (
        <div
          classList={{
            "px-2.5 py-1.5 text-xs": false,
            "px-3 py-2 text-sm": false,
            "px-4 py-2 text-sm": true,
            "px-4 py-2 text-base": false,
            "px-6 py-3 text-base": false
          }}
        />
      );
      expect(div.className).toBe("px-4 py-2 text-sm");
    });
  });

  test("With prop class and className", () => {
    let div;
    S.root(() => {
      div = <div
        className="px-1"
        class="py-2"
        classList={{ "text-sm": true, "danger": false }}
      />;
      expect(div.className).toBe("px-1 py-2 text-sm");
    });
  })
});
