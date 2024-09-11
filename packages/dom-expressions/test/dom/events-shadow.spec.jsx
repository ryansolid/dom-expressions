/**
 * @jest-environment jsdom
 */
import * as r from "../../src/client";
import * as S from "s-js";

describe("Synthetic event target with shadow DOM web components", () => {
  const Elements = {
    button: null,
    slotButton: null,
    outerContainer: null,
    innerContainer: null,
    myComponent: null,
  };

  let innerOnClickHandler = null;
  const innerOnClick = (e) => {
    innerOnClickHandler?.(e);
  }

  let outerOnClickHandler = null;
  const outerOnClick = (e) => {
    outerOnClickHandler?.(e);
  }

  class MyComponent extends HTMLElement {
    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: 'open' });
      S.root(() =>
        shadowRoot.appendChild(
          <div ref={Elements.innerContainer} onClick={innerOnClick}>
            <button ref={Elements.button} />
            <slot name="theslot"></slot>
          </div>
        )
      );
    }
  }

  customElements.define('my-component', MyComponent);

  document.body.innerHTML = "";
  S.root(() =>
    document.body.appendChild(
      <div ref={Elements.outerContainer} onClick={outerOnClick}>
        <my-component id="mycomponent" ref={Elements.myComponent}>
          <button slot="theslot" id="slotbutton" ref={Elements.slotButton}></button>
        </my-component>
      </div>
    )
  );

  r.delegateEvents(['click'], document);

  test("Events inside web component have target button", () => {
    let target = null;
    innerOnClickHandler = (e) => target = e.target;
    Elements.button.click();
    innerOnClickHandler = null;
    expect(target.tagName).toBe("BUTTON");
  });

  test("Events outside web component have target my-component", () => {
    let target = null;
    outerOnClickHandler = (e) => target = e.target;
    Elements.button.click();
    outerOnClickHandler = null;
    expect(target.tagName).toBe('MY-COMPONENT');
  });

  test("Events on document (non-delegated) have target my-component", () => {
    let target = null;
    const handler = (e) => target = e.target;
    document.addEventListener('click', handler);
    Elements.button.click();
    document.removeEventListener('click', handler);
    expect(target.tagName).toBe('MY-COMPONENT');
  });

  test("Events outside web component but from slot have target slotbutton", () => {
    let target = null;
    outerOnClickHandler = (e) => target = e.target;
    Elements.slotButton.click();
    outerOnClickHandler = null;
    expect(target.id).toBe('slotbutton');
  });

  test("Events inside web component but from slot have target slotbutton", () => {
    let target = null;
    innerOnClickHandler = (e) => target = e.target;
    Elements.slotButton.click();
    innerOnClickHandler = null;
    expect(target.id).toBe('slotbutton');
  })
});

