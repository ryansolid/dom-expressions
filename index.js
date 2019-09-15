const Types = {
  ATTRIBUTE: 'attribute',
  PROPERTY: 'property'
},
Attributes = {
  href: {
    type: Types.ATTRIBUTE
  },
  style: {
    type: Types.PROPERTY,
    alias: 'style.cssText'
  },
  for: {
    type: Types.PROPERTY,
    alias: 'htmlFor'
  },
  class: {
    type: Types.PROPERTY,
    alias: 'className'
  },
  // React compat
  spellCheck: {
    type: Types.PROPERTY,
    alias: 'spellcheck'
  },
  allowFullScreen: {
    type: Types.PROPERTY,
    alias: 'allowFullscreen'
  },
  autoCapitalize: {
    type: Types.PROPERTY,
    alias: 'autocapitalize'
  },
  autoFocus: {
    type: Types.PROPERTY,
    alias: 'autofocus'
  },
  autoPlay: {
    type: Types.PROPERTY,
    alias: 'autoplay'
  },
  // Svg Attributes
  accumulate: {
    type: Types.ATTRIBUTE
  },
  additive: {
    type: Types.ATTRIBUTE
  },
  allowReorder: {
    type: Types.ATTRIBUTE
  },
  alphabetic: {
    type: Types.ATTRIBUTE
  },
  amplitude: {
    type: Types.ATTRIBUTE
  },
  ascent: {
    type: Types.ATTRIBUTE
  },
  attributeName: {
    type: Types.ATTRIBUTE
  },
  attributeType: {
    type: Types.ATTRIBUTE
  },
  autoReverse: {
    type: Types.ATTRIBUTE
  },
  azimuth: {
    type: Types.ATTRIBUTE
  },
  baseFrequency: {
    type: Types.ATTRIBUTE
  },
  baseProfile: {
    type: Types.ATTRIBUTE
  },
  bbox: {
    type: Types.ATTRIBUTE
  },
  begin: {
    type: Types.ATTRIBUTE
  },
  bias: {
    type: Types.ATTRIBUTE
  },
  by: {
    type: Types.ATTRIBUTE
  },
  calcMode: {
    type: Types.ATTRIBUTE
  },
  clip: {
    type: Types.ATTRIBUTE
  },
  clipPathUnits: {
    type: Types.ATTRIBUTE
  },
  color: {
    type: Types.ATTRIBUTE
  },
  contentScriptType: {
    type: Types.ATTRIBUTE
  },
  contentStyleType: {
    type: Types.ATTRIBUTE
  },
  cursor: {
    type: Types.ATTRIBUTE
  },
  cx: {
    type: Types.ATTRIBUTE
  },
  cy: {
    type: Types.ATTRIBUTE
  },
  d: {
    type: Types.ATTRIBUTE
  },
  decelerate: {
    type: Types.ATTRIBUTE
  },
  descent: {
    type: Types.ATTRIBUTE
  },
  diffuseConstant: {
    type: Types.ATTRIBUTE
  },
  direction: {
    type: Types.ATTRIBUTE
  },
  display: {
    type: Types.ATTRIBUTE
  },
  divisor: {
    type: Types.ATTRIBUTE
  },
  dur: {
    type: Types.ATTRIBUTE
  },
  dx: {
    type: Types.ATTRIBUTE
  },
  dy: {
    type: Types.ATTRIBUTE
  },
  edgeMode: {
    type: Types.ATTRIBUTE
  },
  elevation: {
    type: Types.ATTRIBUTE
  },
  end: {
    type: Types.ATTRIBUTE
  },
  exponent: {
    type: Types.ATTRIBUTE
  },
  externalResourcesRequired: {
    type: Types.ATTRIBUTE
  },
  fill: {
    type: Types.ATTRIBUTE
  },
  filter: {
    type: Types.ATTRIBUTE
  },
  filterRes: {
    type: Types.ATTRIBUTE
  },
  filterUnits: {
    type: Types.ATTRIBUTE
  },
  format: {
    type: Types.ATTRIBUTE
  },
  from: {
    type: Types.ATTRIBUTE
  },
  fr: {
    type: Types.ATTRIBUTE
  },
  fx: {
    type: Types.ATTRIBUTE
  },
  fy: {
    type: Types.ATTRIBUTE
  },
  g1: {
    type: Types.ATTRIBUTE
  },
  g2: {
    type: Types.ATTRIBUTE
  },
  glyphRef: {
    type: Types.ATTRIBUTE
  },
  gradientTransform: {
    type: Types.ATTRIBUTE
  },
  gradientUnits: {
    type: Types.ATTRIBUTE
  },
  hanging: {
    type: Types.ATTRIBUTE
  },
  height: {
    type: Types.ATTRIBUTE
  },
  hreflang: {
    type: Types.ATTRIBUTE
  },
  ideographic: {
    type: Types.ATTRIBUTE
  },
  in: {
    type: Types.ATTRIBUTE
  },
  in2: {
    type: Types.ATTRIBUTE
  },
  intercept: {
    type: Types.ATTRIBUTE
  },
  k: {
    type: Types.ATTRIBUTE
  },
  k1: {
    type: Types.ATTRIBUTE
  },
  k2: {
    type: Types.ATTRIBUTE
  },
  k3: {
    type: Types.ATTRIBUTE
  },
  k4: {
    type: Types.ATTRIBUTE
  },
  kernelMatrix: {
    type: Types.ATTRIBUTE
  },
  kernelUnitLength: {
    type: Types.ATTRIBUTE
  },
  kerning: {
    type: Types.ATTRIBUTE
  },
  keyPoints: {
    type: Types.ATTRIBUTE
  },
  keySplines: {
    type: Types.ATTRIBUTE
  },
  keyTimes: {
    type: Types.ATTRIBUTE
  },
  lang: {
    type: Types.ATTRIBUTE
  },
  lengthAdjust: {
    type: Types.ATTRIBUTE
  },
  limitingConeAngle: {
    type: Types.ATTRIBUTE
  },
  local: {
    type: Types.ATTRIBUTE
  },
  markerHeight: {
    type: Types.ATTRIBUTE
  },
  markerUnits: {
    type: Types.ATTRIBUTE
  },
  markerWidth: {
    type: Types.ATTRIBUTE
  },
  mask: {
    type: Types.ATTRIBUTE
  },
  maskContentUnits: {
    type: Types.ATTRIBUTE
  },
  maskUnits: {
    type: Types.ATTRIBUTE
  },
  mathematical: {
    type: Types.ATTRIBUTE
  },
  max: {
    type: Types.ATTRIBUTE
  },
  media: {
    type: Types.ATTRIBUTE
  },
  method: {
    type: Types.ATTRIBUTE
  },
  min: {
    type: Types.ATTRIBUTE
  },
  mode: {
    type: Types.ATTRIBUTE
  },
  numOctaves: {
    type: Types.ATTRIBUTE
  },
  offset: {
    type: Types.ATTRIBUTE
  },
  opacity: {
    type: Types.ATTRIBUTE
  },
  operator: {
    type: Types.ATTRIBUTE
  },
  order: {
    type: Types.ATTRIBUTE
  },
  orient: {
    type: Types.ATTRIBUTE
  },
  orientation: {
    type: Types.ATTRIBUTE
  },
  origin: {
    type: Types.ATTRIBUTE
  },
  overflow: {
    type: Types.ATTRIBUTE
  },
  path: {
    type: Types.ATTRIBUTE
  },
  pathLength: {
    type: Types.ATTRIBUTE
  },
  patternContentUnits: {
    type: Types.ATTRIBUTE
  },
  patternTransform: {
    type: Types.ATTRIBUTE
  },
  patternUnits: {
    type: Types.ATTRIBUTE
  },
  ping: {
    type: Types.ATTRIBUTE
  },
  points: {
    type: Types.ATTRIBUTE
  },
  pointsAtX: {
    type: Types.ATTRIBUTE
  },
  pointsAtY: {
    type: Types.ATTRIBUTE
  },
  pointsAtZ: {
    type: Types.ATTRIBUTE
  },
  preserveAlpha: {
    type: Types.ATTRIBUTE
  },
  preserveAspectRatio: {
    type: Types.ATTRIBUTE
  },
  primitiveUnits: {
    type: Types.ATTRIBUTE
  },
  r: {
    type: Types.ATTRIBUTE
  },
  radius: {
    type: Types.ATTRIBUTE
  },
  referrerPolicy: {
    type: Types.ATTRIBUTE
  },
  refX: {
    type: Types.ATTRIBUTE
  },
  refY: {
    type: Types.ATTRIBUTE
  },
  rel: {
    type: Types.ATTRIBUTE
  },
  repeatCount: {
    type: Types.ATTRIBUTE
  },
  repeatDur: {
    type: Types.ATTRIBUTE
  },
  restart: {
    type: Types.ATTRIBUTE
  },
  result: {
    type: Types.ATTRIBUTE
  },
  rotate: {
    type: Types.ATTRIBUTE
  },
  rx: {
    type: Types.ATTRIBUTE
  },
  ry: {
    type: Types.ATTRIBUTE
  },
  scale: {
    type: Types.ATTRIBUTE
  },
  seed: {
    type: Types.ATTRIBUTE
  },
  slope: {
    type: Types.ATTRIBUTE
  },
  spacing: {
    type: Types.ATTRIBUTE
  },
  specularConstant: {
    type: Types.ATTRIBUTE
  },
  specularExponent: {
    type: Types.ATTRIBUTE
  },
  speed: {
    type: Types.ATTRIBUTE
  },
  spreadMethod: {
    type: Types.ATTRIBUTE
  },
  startOffset: {
    type: Types.ATTRIBUTE
  },
  stdDeviation: {
    type: Types.ATTRIBUTE
  },
  stemh: {
    type: Types.ATTRIBUTE
  },
  stemv: {
    type: Types.ATTRIBUTE
  },
  stitchTiles: {
    type: Types.ATTRIBUTE
  },
  string: {
    type: Types.ATTRIBUTE
  },
  stroke: {
    type: Types.ATTRIBUTE
  },
  style: {
    type: Types.ATTRIBUTE
  },
  surfaceScale: {
    type: Types.ATTRIBUTE
  },
  systemLanguage: {
    type: Types.ATTRIBUTE
  },
  tabindex: {
    type: Types.ATTRIBUTE
  },
  tableValues: {
    type: Types.ATTRIBUTE
  },
  target: {
    type: Types.ATTRIBUTE
  },
  targetX: {
    type: Types.ATTRIBUTE
  },
  targetY: {
    type: Types.ATTRIBUTE
  },
  textLength: {
    type: Types.ATTRIBUTE
  },
  to: {
    type: Types.ATTRIBUTE
  },
  transform: {
    type: Types.ATTRIBUTE
  },
  type: {
    type: Types.ATTRIBUTE
  },
  u1: {
    type: Types.ATTRIBUTE
  },
  u2: {
    type: Types.ATTRIBUTE
  },
  unicode: {
    type: Types.ATTRIBUTE
  },
  values: {
    type: Types.ATTRIBUTE
  },
  version: {
    type: Types.ATTRIBUTE
  },
  viewBox: {
    type: Types.ATTRIBUTE
  },
  viewTarget: {
    type: Types.ATTRIBUTE
  },
  visibility: {
    type: Types.ATTRIBUTE
  },
  width: {
    type: Types.ATTRIBUTE
  },
  widths: {
    type: Types.ATTRIBUTE
  },
  x: {
    type: Types.ATTRIBUTE
  },
  x1: {
    type: Types.ATTRIBUTE
  },
  x2: {
    type: Types.ATTRIBUTE
  },
  xChannelSelector: {
    type: Types.ATTRIBUTE
  },
  y: {
    type: Types.ATTRIBUTE
  },
  y1: {
    type: Types.ATTRIBUTE
  },
  y2: {
    type: Types.ATTRIBUTE
  },
  yChannelSelector: {
    type: Types.ATTRIBUTE
  },
  z: {
    type: Types.ATTRIBUTE
  },
  zoomAndPan: {
    type: Types.ATTRIBUTE
  },
};


// list of Element events that will not be delegated even if camelCased
const NonComposedEvents = new Set([
  'abort',
  'animationstart',
  'animationend',
  'animationiteration',
  'blur',
  'change',
  'copy',
  'cut',
  'error',
  'focus',
  'load',
  'loadend',
  'loadstart',
  'mouseenter',
  'mouseleave',
  'paste',
  'progress',
  'reset',
  'select',
  'submit',
  'transitionstart',
  'transitioncancel',
  'transitionend',
  'transitionrun',
]);

export { Attributes, NonComposedEvents };