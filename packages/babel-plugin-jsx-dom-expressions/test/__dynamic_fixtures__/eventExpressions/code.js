function hoisted1() { console.log("hoisted"); }
const hoisted2 = () => console.log("hoisted delegated")

const template = (
  <div id="main">
    <button onchange={() => console.log("bound")}>Change Bound</button>
    <button onChange={[id => console.log("bound", id), id]}>Change Bound</button>
    <button onchange={handler}>Change Bound</button>
    <button onchange={[handler]}>Change Bound</button>
    <button onchange={hoisted1}>Change Bound</button>
    <button onclick={() => console.log("delegated")}>Click Delegated</button>
    <button onClick={[id => console.log("delegated", id), rowId]}>Click Delegated</button>
    <button onClick={handler}>Click Delegated</button>
    <button onClick={[handler]}>Click Delegated</button>
    <button onClick={hoisted2}>Click Delegated</button>
    <button
      on:click={() => console.log("listener")}
      on:CAPS-ev3={() => console.log("custom")}

      on:hoisted-custom-event1={hoistedCustomEvent1}
      on:hoisted-custom-event2={hoistedCustomEvent2}
      on:inlined={()=> console.log("listener")}
      on:inlined-with-options={{handleEvent:()=> console.log("listener"), once:false}}
      on:inlined-to-hoisted1={{handleEvent:hoistedCustomEvent1}}
      on:inlined-to-hoisted2={{handleEvent:hoistedcustomevent2}}
    >
      Click Listener
    </button>
    <button
      oncapture:camelClick={() => console.log("listener")}
    >
      Click Capture
    </button>
  </div>
);
