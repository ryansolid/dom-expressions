import * as styles from "./styles.module.css";

const selected = true;
let id = "my-h1";
let link;
const template = (
  <div id="main" {...results} classList={{ selected: unknown }} style={{ color }}>
    <h1
      class="base"
      id={id}
      {...results()}
      foo
      disabled
      title={welcoming()}
      style={{ "background-color": color(), "margin-right": "40px" }}
      classList={{ dynamic: dynamic(), selected }}
    >
      <a href={"/"} ref={link} classList={{ "ccc ddd": true }}>
        Welcome
      </a>
    </h1>
  </div>
);

const template2 = (
  <div {...getProps("test")}>
    <div textContent={rowId} />
    <div textContent={row.label} />
    <div innerHTML={"<div/>"} />
  </div>
);

const template3 = (
  <div
    foo
    id={/*@once*/ state.id}
    style={/*@once*/ { "background-color": state.color }}
    name={state.name}
    textContent={/*@once*/ state.content}
  />
);

const template4 = <div class="hi" className={state.class} classList={{ "ccc:ddd": true }} />;

const template5 = <div class="a" className="b"></div>;

const template6 = <div style={someStyle()} textContent="Hi" />;

let undefVar;
const template7 = (
  <div
    style={{ "background-color": color(), "margin-right": "40px", ...props.style }}
    style:padding-top={props.top}
    class:my-class={props.active}
    class:other-class={undefVar}
    classList={{ "other-class2": undefVar }}
  />
);

let refTarget;
const template8 = <div ref={refTarget} />;

const template9 = <div ref={e => console.log(e)} />;

const template10 = <div ref={refFactory()} />;

const template11 = <div use:something use:another={thing} use:zero={0} />;

const template12 = <div prop:htmlFor={thing} prop:number={123} attr:onclick="console.log('hi')" />;

const template13 = <input type="checkbox" checked={true} />;

const template14 = <input type="checkbox" checked={state.visible} />;

const template15 = <div class="`a">`$`</div>;

const template16 = (
  <button
    class="static"
    classList={{
      hi: "k"
    }}
    type="button"
  >
    Write
  </button>
);

const template17 = (
  <button
    classList={{
      a: true,
      b: true,
      c: true
    }}
    onClick={increment}
  >
    Hi
  </button>
);

const template18 = (
  <div
    {...{
      get [key()]() {
        return props.value;
      }
    }}
  />
);

const template19 = <div classList={{ "bg-red-500": true }} class="flex flex-col" />;

const template20 = (
  <div>
    <input value={s()} min={min()} max={max()} onInput={doSomething} readonly="" />
    <input checked={s2()} min={min()} max={max()} onInput={doSomethingElse} readonly={value} />
  </div>
);

const template21 = <div style={{ e: "static", ...rest}}></div>;

const template22 = <div data='"hi"' data2={'"'} />;

const template23 = <div disabled={"t" in test}>{"t" in test && "true"}</div>;

const template24 = <a {...props} something />;

const template25 = (
  <div>
    {props.children}
    <a {...props} something />
  </div>
);

const template26 = (
  <div start="Hi" middle={middle} {...spread}>
    Hi
  </div>
);

const template27 = (
  <div start="Hi" {...first} middle={middle} {...second}>
    Hi
  </div>
);

const template28 = (
  <label {...api()}>
    <span {...api()}>Input is {api() ? "checked" : "unchecked"}</span>
    <input {...api()} />
    <div {...api()} />
  </label>
);

const template29 = <div attribute={!!someValue}>{!!someValue}</div>;

const template30 = (
  <div
    class="class1 class2
    class3 class4
    class5 class6"
    style="color: red;
    background-color: blue !important;
    border: 1px solid black;
    font-size: 12px;"
    random="random1 random2
    random3 random4"
  />
);

const template31 = <div style={{ "background-color": getStore.itemProperties.color }} />;

const template32 = <div style={{ "background-color": undefined }} />;

const template33 = (
  <>
    <button class={styles.button}></button>
    <button class={styles["foo--bar"]}></button>
    <button class={styles.foo.bar}></button>
    <button class={styles[foo()]}></button>
  </>
);

const template34 = <div use:something {...somethingElse} use:zero={0} />;

const template35 = <div ref={a().b.c} />;

const template36 = <div ref={a().b?.c} />;

const template37 = <div ref={a() ? b : c} />;

const template38 = <div ref={a() ?? b} />;

const template39 = <input value={10} />;

const template40 = <div style={{ color: a() }} />;

const template41 = (
  <select value={state.color}>
    <option value={Color.Red}>Red</option>
    <option value={Color.Blue}>Blue</option>
  </select>
);

const template42 = <div style={{ }} />;

const template43 = <div>
  {/* ─── your original cases ─── */}
  <div attribute={!!someValue}/>
  <div attribute={!!someValue ? escapeMe : escapeMe}/>
  <div attribute={escapeMe || escapeMe || escapeMe}/>
  <div attribute={someValue ? escapeMe : escapeMe}/>
  <div attribute={escapeMe || (someValue ? escapeMe : escapeMe)}/>
  <div attribute={someValue && escapeMe}/>
  <div attribute={someValue++ && escapeMe}/>

  {/* ─── more conditional shapes ─── */}
  <div attribute={someValue ? escapeMe : someValue ? escapeMe : escapeMe}/>
  <div attribute={someValue && otherValue ? escapeMe : escapeMe}/>
  <div attribute={!(someValue || otherValue) ? escapeMe : escapeMe}/>
  <div attribute={someValue ? (otherValue ? escapeMe : escapeMe) : escapeMe}/>

  {/* ─── logical with side-effects / unusual precedence ─── */}
  <div attribute={someValue || escapeMe && escapeMe}/>
  <div attribute={someValue && escapeMe || escapeMe}/>
  <div attribute={escapeMe ?? someValue ? escapeMe : escapeMe}/>
  <div attribute={someValue ? escapeMe ?? escapeMe : escapeMe}/>

  {/* ─── comparisons & equality traps ─── */}
  <div attribute={someValue == true ? escapeMe : escapeMe}/>
  <div attribute={someValue === "text" ? escapeMe : escapeMe}/>
  <div attribute={0 == someValue ? escapeMe : escapeMe}/>
  <div attribute={someValue != null ? escapeMe : escapeMe}/>

  {/* ─── function calls, method calls, property access ─── */}
  <div attribute={someValue.toString() && escapeMe}/>
  <div attribute={String(someValue) ? escapeMe : escapeMe}/>
  <div attribute={someFunc() ? escapeMe : escapeMe}/>
  <div attribute={obj?.prop ? escapeMe : escapeMe}/>
  <div attribute={obj?.escapeMe}/>
  <div attribute={obj?.escapeMe || obj?.escapeMe}/>
  <div attribute={obj.escapeMe}/>
  <div attribute={arr.includes(someValue) ? escapeMe : escapeMe}/>

  {/* ─── arithmetic & bitwise that can be falsy/truthy ─── */}
  <div attribute={someValue + 1 && escapeMe}/>
  <div attribute={someValue - 1 ? escapeMe : escapeMe}/>
  <div attribute={escapeMe * 0 || escapeMe}/>
  <div attribute={~someValue && escapeMe}/>

  {/* ─── comma operator traps ─── */}
  <div attribute={someValue, escapeMe}/>
  <div attribute={(someValue = 42, escapeMe)}/>
  <div attribute={someValue && (0, escapeMe)}/>

  {/* ─── ternary + logical nesting ─── */}
  <div attribute={someValue ? escapeMe || escapeMe : someValue && escapeMe}/>
  <div attribute={someValue ? otherValue ? escapeMe : escapeMe && escapeMe : escapeMe}/>
  <div attribute={someValue && otherValue || thirdValue ? escapeMe : escapeMe}/>

  {/* ─── immediately invoked expressions ─── */}
  <div attribute={(()=> escapeMe )()}/>
  <div attribute={(() => someValue ? escapeMe : escapeMe)()}/>
  <div attribute={(function(){ return escapeMe })()}/>
  <div attribute={(function(){ return someValue ? escapeMe : escapeMe })()}/>

</div>