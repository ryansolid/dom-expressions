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
  }
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