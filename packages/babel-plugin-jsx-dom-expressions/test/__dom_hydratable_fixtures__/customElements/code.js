const template = <my-element some-attr={name} notProp={data} />;

const template2 = <my-element some-attr={state.name} notProp={state.data} />;

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
