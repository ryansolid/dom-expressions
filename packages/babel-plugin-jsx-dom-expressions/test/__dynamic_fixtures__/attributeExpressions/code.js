const selected = true;
let id = "my-h1";
let link;
const template = (
  <div id="main" {...results} classList={{ selected: unknown }} style={{ color }}>
    <h1
      class="base"
      id={id}
      {...results()}
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
    id={/*@once*/ state.id}
    style={/*@once*/ { "background-color": state.color }}
    name={state.name}
    textContent={/*@once*/ state.content}
  />
);

const template4 = <div class="hi" className={state.class} classList={{ "ccc:ddd": true }} />;

const template5 = <div class="a" className="b"></div>;

const template6 = <div style={someStyle()} textContent="Hi" />;

const template7 = (
  <div
    style={{ "background-color": color(), "margin-right": "40px", ...props.style }}
    style:padding-top={props.top}
    class:my-class={props.active}
  />
);

let refTarget;
const template8 = <div ref={refTarget} />;

const template9 = <div ref={e => console.log(e)} />;

const template10 = <div ref={refFactory()} />;

const template11 = <div use:something use:another={thing} />;

const template12 = <div prop:htmlFor={thing} />;

const template13 = <input type="checkbox" checked={true} readonly="" />;

const template14 = <input type="checkbox" checked={state.visible} readonly={value} />;

const template15 = <mesh scale={[1, 1, 1]} rotateX={0} />;

const template16 = <div use:something {...somethingElse} use:zero={0} />;

const template17 = <div ref={a().b.c} />;

const template18 = <div ref={a().b?.c} />;

const template19 = <div ref={a() ? b : c} />;

const template20 = <div ref={a() ?? b} />;

const template21 = <div style={{ color: a() }} />;

// ONCE TESTS

const template22 = <div style={/*@once*/ { width: props.width, height: props.height }} />;

const template23 = (
  <div style={/*@once*/ { width: props.width, height: props.height }} something={color()} />
);

const template24 = (
  <div
    style={{ width: props.width, height: /* @once */ props.height }}
    something={/*@once*/ color()}
  />
);

// ONCE TESTS SPREADS

const propsSpread = {
  something: color(),
  style: {
    "background-color": color(),
    color: /* @once*/ color(),
    "margin-right": /* @once */ props.right
  }
};

const template25 = <div {...propsSpread} />;
const template26 = <div {/* @once */ ...propsSpread} />;

const template27 = (
  <div {...propsSpread} data-dynamic={color()} data-static={/* @once */ color()} />
);

const template28 = (
  <div {/* @once */ ...propsSpread} data-dynamic={color()} data-static={/* @once */ color()} />
);

const template29 = (
  <div
    {
      /* @once */ ...propsSpread1
    }
    {...propsSpread2}
    {
      /* @once */ ...propsSpread3
    }
    data-dynamic={color()}
    data-static={/* @once */ color()}
  />
);

// ONCE PROPERTY OF OBJECT ACCESS

// https://github.com/ryansolid/dom-expressions/issues/252#issuecomment-1572220563
const styleProp = { style: { width: props.width, height: props.height } };
const template30 = <div style={/* @once */ styleProp.style} />;
const template31 = <div style={styleProp.style} />;

const style = {
  background: "red",
  border: "solid black " + count() + "px"
};

const template32 = (
  <button type="button" aria-label={count()} style={style} classList={style}>
    {count()}
  </button>
);

const template33 = (
  <button type="button" aria-label={count()} style={/* @once*/ style} classList={/* @once*/ style}>
    {count()}
  </button>
);
