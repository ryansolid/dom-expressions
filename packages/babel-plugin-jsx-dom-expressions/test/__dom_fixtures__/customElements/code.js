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

const template6 = <my-el bool:quack="">empty string</my-el>;
const template7 = <my-el bool:quack={""}>js empty</my-el>;
const template8 = <my-el bool:quack="hola">hola</my-el>;
const template9 = <my-el bool:quack={"hola"}>hola js</my-el>;
const template10 = <my-el bool:quack={true}>true</my-el>;
const template11 = <my-el bool:quack={false}>false</my-el>;
const template12 = <my-el bool:quack={1}>1</my-el>;
const template13 = <my-el bool:quack={0}>0</my-el>;
const template14 = <my-el bool:quack={undefined}>undefined</my-el>;
const template15 = <my-el bool:quack={null}>null</my-el>;
const template16 = <my-el bool:quack={boolTest()}>boolTest()</my-el>;
const template17 = <my-el bool:quack={boolTest}>boolTest</my-el>;
const template18 = <my-el bool:quack={boolTestBinding}>boolTestBinding</my-el>;
const template19 = <my-el bool:quack={boolTestObjBinding.value}>boolTestObjBinding.value</my-el>;
const template20 = <my-el bool:quack={()=>false}>fn</my-el>;

const template21 = <my-el before bool:quack="true">should have space before</my-el>;
const template22 = <my-el before bool:quack="true" after>should have space before/after</my-el>;
const template23 = <my-el bool:quack="true" after>should have space before/after</my-el>;
// this crash it for some reason- */ const template60 = <my-el bool:quack>really empty</my-el>;
