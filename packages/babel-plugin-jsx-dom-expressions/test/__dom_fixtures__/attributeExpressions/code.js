import * as styles from "./styles.module.css";
import { binding } from "somewhere";

function refFn() {}
const refConst = null;

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

const template21 = <div style={{ a: "static", ...rest }}></div>;

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

// bool:
function boolTest(){return true}
const boolTestBinding = false
const boolTestObjBinding = {value:false}

const template42 = <div bool:quack="">empty string</div>;
const template43 = <div bool:quack={""}>js empty</div>;
const template44 = <div bool:quack="hola">hola</div>;
const template45 = <div bool:quack={"hola js"}>"hola js"</div>;
const template46 = <div bool:quack={true}>true</div>;
const template47 = <div bool:quack={false}>false</div>;
const template48 = <div bool:quack={1}>1</div>;
const template49 = <div bool:quack={0}>0</div>;
const template50 = <div bool:quack={"1"}>"1"</div>;
const template51 = <div bool:quack={"0"}>"0"</div>;
const template52 = <div bool:quack={undefined}>undefined</div>;
const template53 = <div bool:quack={null}>null</div>;
const template54 = <div bool:quack={boolTest()}>boolTest()</div>;
const template55 = <div bool:quack={boolTest}>boolTest</div>;
const template56 = <div bool:quack={boolTestBinding}>boolTestBinding</div>;
const template57 = <div bool:quack={boolTestObjBinding.value}>boolTestObjBinding.value</div>;
const template58 = <div bool:quack={()=>false}>fn</div>;

const template59 = <div before bool:quack="true">should have space before</div>;
const template60 = <div before bool:quack="true" after>should have space before/after</div>;
const template61 = <div bool:quack="true" after>should have space before/after</div>;
// this crash it for some reason- */ const template62 = <div bool:quack>really empty</div>;

const template63 = <img src="" />;
const template64 = <div><img src=""/></div>;

const template65 = <img src="" loading="lazy"/>;
const template66 = <div><img src="" loading="lazy"/></div>;

const template67 = <iframe src=""></iframe>;
const template68 = <div><iframe src=""></iframe></div>;

const template69 = <iframe src="" loading="lazy"></iframe>;
const template70 = <div><iframe src="" loading="lazy"></iframe></div>;

const template71 = <div title="<u>data</u>"/>

const template72 = <div ref={binding} />;
const template73 = <div ref={binding.prop} />;
const template74 = <div ref={refFn} />
const template75 = <div ref={refConst} />

const template76 = <div ref={refUnknown} />

const template77 = <div true={true} truestr="true" truestrjs={"true"}/>
const template78 = <div false={false} falsestr="false" falsestrjs={"false"} />
const template79 = <div prop:true={true} prop:false={false}/>
const template80 = <div attr:true={true} attr:false={false}/>

const template81 = <math display="block"><mrow></mrow></math>
const template82 = <mrow><mi>x</mi><mo>=</mo></mrow>

const template83 = <div style={{"background":"red"}}/>
const template84 = <div style={{"background":"red", "color":"green", "margin":3, "padding":0.4}}/>
const template85 = <div style={{"background":"red", "color":"green", "border":undefined}}/>
const template86 = <div style={{"background":"red", "color":"green", "border":signal()}}/>
const template87 = <div style={{"background":"red", "color":"green", "border":somevalue}}/>
const template88 = <div style={{"background":"red", "color":"green", "border":some.access}}/>
const template89 = <div style={{"background":"red", "color":"green", "border":null}}/>
