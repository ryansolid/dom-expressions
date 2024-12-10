import { render } from "./dom.js";
import * as s from "./rxcore.js";

const count = s.value(0);
const increment = () => count(count() + 1);
const s0 = () => (count() % 2 ? "ok" : [1, 2]);

render(function App() {
  return (
    <>
      <button type="button" onClick={increment}>
        {s0()}
      </button>
      <pre
        ref={ref => {
          ref.prepend("x");
          queueMicrotask(() => ref.append("y"));
        }}
      >
        {s0()}
      </pre>
    </>
  );
}, document.getElementById("root"));
