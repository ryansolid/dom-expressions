const children = <div />;
const dynamic = {
  children
};
const template = <Module children={children} />;
const template2 = <module children={children} />;
const template3 = <module children={children}>Hello</module>;
const template4 = (
  <module children={children}>
    <Hello />
  </module>
);
const template5 = <module children={dynamic.children} />;
const template6 = <Module children={dynamic.children} />;
const template7 = <module {...dynamic} />;
const template8 = <module {...dynamic}>Hello</module>;
const template9 = <module {...dynamic}>{dynamic.children}</module>;
const template10 = <Module {...dynamic}>Hello</Module>;
const template11 = <module children={/*@once*/ state.children} />;
const template12 = <Module children={/*@once*/ state.children} />;
