const template = (
  <svg width="400" height="180">
    <rect
      strokeWidth="2"
      x="50"
      y="20"
      rx="20"
      ry="20"
      width="150"
      height="150"
      style="fill:red;stroke:black;stroke-width:5;opacity:0.5"
    />
    <linearGradient gradientTransform="rotate(25)">
      <stop offset="0%"></stop>
    </linearGradient>
  </svg>
);

const template2 = (
  <svg width="400" height="180">
    <rect
      className={state.name}
      strokeWidth={state.width}
      x={state.x}
      y={state.y}
      rx="20"
      ry="20"
      width="150"
      height="150"
      style={{
        fill: "red",
        stroke: "black",
        "stroke-width": props.stroke,
        opacity: 0.5
      }}
    />
  </svg>
);

const template3 = (
  <svg width="400" height="180">
    <rect {...props} />
  </svg>
);

const template4 = <rect x="50" y="20" width="150" height="150" />;

const template5 = (
  <>
    <rect x="50" y="20" width="150" height="150" />
  </>
);

const template6 = (
  <Component>
    <rect x="50" y="20" width="150" height="150" />
  </Component>
);
