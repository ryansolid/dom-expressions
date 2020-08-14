const template = (
  <div id="main" {...results} classList={{ selected: selected }} style={{ color }}>
    <h1
      {...results()}
      disabled
      title={welcoming()}
      style={{ "background-color": color(), "margin-right": "40px" }}
      classList={{ selected: selected() }}
    >
      <a href={"/"} ref={link}>
        Welcome
      </a>
    </h1>
  </div>
);

const template2 = (
  <div>
    <div textContent={rowId} />
    <div textContent={row.label} />
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

const template4 = <div class="hi" className={state.class} />;

const template5 = <div style={someStyle()} />;

const template6 = <div style={{ "background-color": color(), "margin-right": "40px", ...props.style }} />;

let refTarget;
const template7 = <div ref={refTarget} />;

const template8 = <div ref={e => console.log(e)} />;
