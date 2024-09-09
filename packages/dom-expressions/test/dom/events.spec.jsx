/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import * as S from "s-js";

describe("Test Synthetic event bubbling", () => {
  const Elements = {
    el1: null,
    el2: null,
    el3: null
  };
  let eventTarget = null,
    count = 0,
    stopPropagation = false;
  function handleClick(data, e) {
    expect(e.currentTarget).toBe(Elements[`el${data}`]);
    expect(e.target).toBe(eventTarget);
    if (stopPropagation) e.stopPropagation();
    count++;
  }

  document.body.innerHTML = "";
  S.root(() =>
    document.body.appendChild(
      <div ref={Elements.el1} onClick={[handleClick, 1]}>
        <div ref={Elements.el2} onClick={[handleClick, 2]}>
          <div ref={Elements.el3} onClick={[handleClick, 3]} />
        </div>
      </div>
    )
  );

  test("Fire top level event", () => {
    eventTarget = Elements.el1;
    count = 0;
    var event = new MouseEvent("click", { bubbles: true });
    eventTarget.dispatchEvent(event);
    expect(count).toBe(1);
  });

  test("Fire 2nd level event", () => {
    eventTarget = Elements.el2;
    count = 0;
    var event = new MouseEvent("click", { bubbles: true });
    eventTarget.dispatchEvent(event);
    expect(count).toBe(2);
  });

  test("Fire 3rd level event", () => {
    eventTarget = Elements.el3;
    count = 0;
    var event = new MouseEvent("click", { bubbles: true });
    eventTarget.dispatchEvent(event);
    expect(count).toBe(3);
  });

  test("Fire 3rd level event and stop propagation", () => {
    eventTarget = Elements.el3;
    count = 0;
    stopPropagation = true;
    var event = new MouseEvent("click", { bubbles: true });
    eventTarget.dispatchEvent(event);
    expect(count).toBe(1);
  });

  test("clear events", () => {
    r.clearDelegatedEvents();
    eventTarget = Elements.el1;
    count = 0;
    stopPropagation = false;
    var event = new MouseEvent("click", { bubbles: true });
    eventTarget.dispatchEvent(event);
    expect(count).toBe(0);
  })
});


// custom event
describe("Custom Events", () => {
  test("custom event with event listener options", () => {
    let elementRegular;
    let elementOnce;

    let count = 0;
    let eventTarget;

    function handleClick(e) {
      expect(e.currentTarget).toBe(eventTarget);
      expect(e.target).toBe(eventTarget);
      count++;
    }

    S.root(() =>
      document.body.appendChild(
        <div>
          <div ref={elementRegular} on:click={{ handleEvent: handleClick }} />
          <div ref={elementOnce} on:click={{ handleEvent: handleClick, once: true }} />
        </div>
      )
    );

    const event = new MouseEvent("click", { bubbles: true });

    /** Dispatch a click twice to the regular element to check `count` is working a expected */

    eventTarget = elementRegular;

    count = 0;

    eventTarget.dispatchEvent(event);
    expect(count).toBe(1);

    eventTarget.dispatchEvent(event);
    expect(count).toBe(2);

    /** Dispatch a click twice to the `once` event handler */

    eventTarget = elementOnce;

    count = 0;

    eventTarget.dispatchEvent(event);
    expect(count).toBe(1);

    eventTarget.dispatchEvent(event);
    expect(count).toBe(1);
  });
});