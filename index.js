const Types = {
    ATTRIBUTE: "attribute",
    PROPERTY: "property"
  },
  Attributes = {
    href: {
      type: Types.ATTRIBUTE
    },
    style: {
      type: Types.PROPERTY,
      alias: "style.cssText"
    },
    for: {
      type: Types.PROPERTY,
      alias: "htmlFor"
    },
    class: {
      type: Types.PROPERTY,
      alias: "className"
    },
    // React compat
    spellCheck: {
      type: Types.PROPERTY,
      alias: "spellcheck"
    },
    allowFullScreen: {
      type: Types.PROPERTY,
      alias: "allowFullscreen"
    },
    autoCapitalize: {
      type: Types.PROPERTY,
      alias: "autocapitalize"
    },
    autoFocus: {
      type: Types.PROPERTY,
      alias: "autofocus"
    },
    autoPlay: {
      type: Types.PROPERTY,
      alias: "autoplay"
    }
  };

// list of Element events that will not be delegated even if camelCased
const NonComposedEvents = new Set([
  "abort",
  "animationstart",
  "animationend",
  "animationiteration",
  "blur",
  "change",
  "copy",
  "cut",
  "error",
  "focus",
  "load",
  "loadend",
  "loadstart",
  "mouseenter",
  "mouseleave",
  "paste",
  "progress",
  "reset",
  "select",
  "submit",
  "transitionstart",
  "transitioncancel",
  "transitionend",
  "transitionrun"
]);

const SVGElements = new Set([
  // "a",
  "altGlyph",
  "altGlyphDef",
  "altGlyphItem",
  "animate",
  "animateColor",
  "animateMotion",
  "animateTransform",
  "circle",
  "clipPath",
  "color-profile",
  "cursor",
  "defs",
  "desc",
  "ellipse",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "filter",
  "font",
  "font-face",
  "font-face-format",
  "font-face-name",
  "font-face-src",
  "font-face-uri",
  "foreignObject",
  "g",
  "glyph",
  "glyphRef",
  "hkern",
  "image",
  "line",
  "linearGradient",
  "marker",
  "mask",
  "metadata",
  "missing-glyph",
  "mpath",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  // "script",
  "set",
  "stop",
  // "style",
  "svg",
  "switch",
  "symbol",
  "text",
  "textPath",
  // "title",
  "tref",
  "tspan",
  "use",
  "view",
  "vkern"
]);

export { Attributes, NonComposedEvents, SVGElements };
