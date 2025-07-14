// @ts-nocheck
/* eslint-disable */

import { render } from "solid-js/web";
import { createSignal, createMemo } from "solid-js";

import { xml as sld, XML } from "./xml";

function App() {
  debugEnsureNoRerenders("App");

  return sld`
    <header><h1>Hello ! sld</h1></header>
    <main>
      <Counter/>
      <List/>
      <Toggle/>
      <CustomComponent name="quack" description="${() => "meow meow milch"}"/>
      <ParserErrorExample/>
    </main>
    <footer>thats all folks!</footer>`;
}

function Counter() {
  debugEnsureNoRerenders("Counter");

  const [count, setCount] = createSignal(1);
  const increment = () => setCount(count => count + 1);

  const nssld = new XML();

  const double = () => createMemo(() => count() * 2);

  nssld.define({ double });

  return nssld`
    <h2>Simple Counter</h2>
    <label>
      Inline a signal, define it as a tag, or just inline a function

      <button type="button" on:click="${increment}">
        ${count} <double/> ${() => count() * 3}
      </button>
    </label>
    <hr/>
  `;
}

function List(props) {
  debugEnsureNoRerenders("List");

  const [count, setCount] = createSignal(0);
  setInterval(() => setCount(count => count + 1), 1000);

  return sld`
    <h2>Rendering a list</h2>
    <For each="${[{ val: count }, { val: 1 }, { val: 2 }, { val: 3 }]}">
    ${(value, index) => {
      debugEnsureNoRerenders("List index " + index());
      return sld`<div>value is ${value.val}, index is ${index}</div>`;
    }}
    </For>
    <hr/>
  `;
}

function Toggle(props) {
  debugEnsureNoRerenders("Toggle");

  const [showing, setShowing] = createSignal(false);
  const toggle = () => setShowing(showing => !showing);

  return sld`
    <h2>Toggling something</h2>
    <div>doesnt work, something wrong with \`h\` maybe</div>
    <label>
      <button type="button" on:click="${toggle}">
        Toggle!
      </button>
      is it showing? ${showing}
    </label>
    <Show when="${showing}" >
      ${showing => {
        debugEnsureNoRerenders("Show callback " + showing());
        return sld`<div>🦆 🐈‍⬛</div>`;
      }}
    </Show>
    <hr/>
  `;
}

function CustomComponent(props) {
  return sld`
    <h2>Custom component example</h2>
    ${props.name} ${props.description.toUpperCase()}
    <hr/>
  `;
}

function ParserErrorExample() {
  return [
    sld`
      <h2>Parser error example</h2>
      when a tagged template has an syntax error it renders a helpful message
      `,
    sld`
      <div>oops`
  ];
}

sld.define({ Counter, List, Toggle, CustomComponent, ParserErrorExample });

render(App, document.getElementById("app")!);

// debug stuff

// ensure no re-renders sanity check
function debugEnsureNoRerenders(name) {
  const [count, setCount] = createSignal(1);
  setInterval(() => setCount(count => count + 1), 1000);
  count();
  console.log("rendered", name);
}
