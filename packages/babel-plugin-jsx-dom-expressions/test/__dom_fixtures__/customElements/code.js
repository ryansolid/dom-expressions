const template = (
  <my-element some-attr={name} notProp={data} attr:my-attr={data} prop:someProp={data} />
);

const template2 = (
  <my-element
    some-attr={state.name}
    notProp={state.data}
    attr:my-attr={state.data}
    prop:someProp={state.data}
  />
);

const template3 = (
  <my-element>
    <header slot="head">Title</header>
  </my-element>
);

const template4 = (
  <>
    <slot name="head"></slot>
  </>
);

const template5 = <a is="my-element" />;

// bool:
function boolTest(){return true}
const boolTestBinding = false
const boolTestObjBinding = {value:false}

const template42 = <my-el bool:quack="">empty string</my-el>;
const template43 = <my-el bool:quack={""}>js empty</my-el>;
const template44 = <my-el bool:quack="hola">hola</my-el>;
const template45 = <my-el bool:quack={"hola js"}>"hola js"</my-el>;
const template46 = <my-el bool:quack={true}>true</my-el>;
const template47 = <my-el bool:quack={false}>false</my-el>;
const template48 = <my-el bool:quack={1}>1</my-el>;
const template49 = <my-el bool:quack={0}>0</my-el>;
const template50 = <my-el bool:quack={"1"}>"1"</my-el>;
const template51 = <my-el bool:quack={"0"}>"0"</my-el>;
const template52 = <my-el bool:quack={undefined}>undefined</my-el>;
const template53 = <my-el bool:quack={null}>null</my-el>;
const template54 = <my-el bool:quack={boolTest()}>boolTest()</my-el>;
const template55 = <my-el bool:quack={boolTest}>boolTest</my-el>;
const template56 = <my-el bool:quack={boolTestBinding}>boolTestBinding</my-el>;
const template57 = <my-el bool:quack={boolTestObjBinding.value}>boolTestObjBinding.value</my-el>;
const template58 = <my-el bool:quack={()=>false}>fn</my-el>;

const template59 = <my-el before bool:quack="true">should have space before</my-el>;
const template60 = <my-el before bool:quack="true" after>should have space before/after</my-el>;
const template61 = <my-el bool:quack="true" after>should have space before/after</my-el>;
// this crash it for some reason- */ const template62 = <div bool:quack>really empty</div>;
