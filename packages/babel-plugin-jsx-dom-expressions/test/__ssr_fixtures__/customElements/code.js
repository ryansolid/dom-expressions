const template = <my-element some-attr={name} someProp={data} />;

const template2 = <my-element some-attr={state.name} someProp={state.data} />;

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
