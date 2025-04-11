import * as csstype from "csstype";

/**
 * Originally based on JSX types for Surplus and Inferno and adapted for `dom-expressions`.
 *
 * - https://github.com/adamhaile/surplus/blob/master/index.d.ts
 * - https://github.com/infernojs/inferno/blob/master/packages/inferno/src/core/types.ts
 *
 * MathML typings coming mostly from Preact
 *
 * - https://github.com/preactjs/preact/blob/07dc9f324e58569ce66634aa03fe8949b4190358/src/jsx.d.ts#L2575
 *
 * Checked against other frameworks via the following table:
 *
 * - https://potahtml.github.io/namespace-jsx-project/index.html
 *
 * # Typings on elements
 *
 * ## Attributes
 *
 * - Typings include attributes and not properties (unless the property Is special-cased, such
 *   textContent, event handlers, etc).
 * - Attributes are lowercase to avoid confusion with properties.
 * - Attributes are used "as is" and won't be transformed in any way (such to `lowercase` or from
 *   `dashed-case` to `camelCase`).
 *
 * ## Event Handlers
 *
 * - Event handlers use `camelCase` such `onClick` and will be delegated when possible, bubbling
 *   through the component tree, not the dom tree.
 * - Native event handlers use the namespace `on:` such `on:click`, and wont be delegated. bubbling
 *   the dom tree.
 *
 * ## Boolean Attributes (property setter that accepts `true | false`):
 *
 * - `(bool)true` adds the attribute `<video autoplay={true}/>` or in JSX as `<video autoplay/>`
 * - `(bool)false` removes the attribute from the DOM `<video autoplay={false}/>`
 * - `=""` may be accepted for the sake of parity with html `<video autoplay=""/>`
 * - `"true" | "false"` are NOT allowed, these are strings that evaluate to `(bool)true`
 *
 * ## Enumerated Attributes (attribute accepts 1 string value out of many)
 *
 * - Accepts any of the enumerated values, such: `"perhaps" | "maybe"`
 * - When one of the possible values is empty(in html that's for the attribute to be present), then it
 *   will also accept `(bool)true` to make it consistent with boolean attributes.
 *
 * Such `popover` attribute provides `"" | "manual" | "auto" | "hint"`.
 *
 * By NOT allowing `(bool)true` we will have to write `<div popover="" />`. Therefore, To make it
 * consistent with Boolean Attributes we accept `true | "" | "manual" | "auto" | "hint"`, such as:
 * `<div popover={true} />` or in JSX `<div popover />` is allowed and equivalent to `<div
 * popover="" />`
 *
 * ## Pseudo-Boolean Attributes (enumerated attributes that happen to accept the strings `"true" | "false"`)
 *
 * - Such `<div draggable="true"/>` or `<div draggable="false"/>`. The value of the attribute is a
 *   string not a boolean.
 * - `<div draggable={true}/>` is not valid because `(bool)true` is NOT transformed to the string
 *   `"true"`. Likewise `<div draggable={false}/>` removes the attribute from the element.
 * - MDN documentation https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/draggable
 *
 * ## All Of The Above In a nutshell
 *
 * - `(bool)true` adds an empty attribute
 * - `(bool)false` removes the attribute
 * - Attributes are lowercase
 * - Event handlers are camelCase
 * - Anything else is a `string` and used "as is"
 * - Additionally, an attribute may be removed by `undefined`
 *
 * ## Using Properties
 *
 * - The namespace `prop:` could be used to directly set properties in native elements and
 *   custom-elements. `<custom-element prop:myProp={true}/>` equivalent to `el.myProp = true`
 */

type DOMElement = Element;

export namespace JSX {
  type Element = Node | ArrayElement | (string & {}) | number | boolean | null | undefined;
  interface ArrayElement extends Array<Element> {}

  interface ElementClass {
    // empty, libs can define requirements downstream
  }
  interface ElementAttributesProperty {
    // empty, libs can define requirements downstream
  }
  interface ElementChildrenAttribute {
    children: {};
  }

  interface EventHandler<T, E extends Event> {
    (
      e: E & {
        currentTarget: T;
        target: DOMElement;
      }
    ): void;
  }

  interface BoundEventHandler<
    T,
    E extends Event,
    EHandler extends EventHandler<T, any> = EventHandler<T, E>
  > {
    0: (data: any, ...e: Parameters<EHandler>) => void;
    1: any;
  }
  type EventHandlerUnion<
    T,
    E extends Event,
    EHandler extends EventHandler<T, any> = EventHandler<T, E>
  > = EHandler | BoundEventHandler<T, E, EHandler>;

  interface EventHandlerWithOptions<T, E extends Event, EHandler = EventHandler<T, E>>
    extends AddEventListenerOptions {
    handleEvent: EHandler;
  }

  type EventHandlerWithOptionsUnion<
    T,
    E extends Event,
    EHandler extends EventHandler<T, any> = EventHandler<T, E>
  > = EHandler | EventHandlerWithOptions<T, E, EHandler>;

  interface InputEventHandler<T, E extends InputEvent> {
    (
      e: E & {
        currentTarget: T;
        target: T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          ? T
          : DOMElement;
      }
    ): void;
  }
  type InputEventHandlerUnion<T, E extends InputEvent> = EventHandlerUnion<
    T,
    E,
    InputEventHandler<T, E>
  >;

  interface ChangeEventHandler<T, E extends Event> {
    (
      e: E & {
        currentTarget: T;
        target: T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          ? T
          : DOMElement;
      }
    ): void;
  }
  type ChangeEventHandlerUnion<T, E extends Event> = EventHandlerUnion<
    T,
    E,
    ChangeEventHandler<T, E>
  >;

  interface FocusEventHandler<T, E extends FocusEvent> {
    (
      e: E & {
        currentTarget: T;
        target: T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          ? T
          : DOMElement;
      }
    ): void;
  }
  type FocusEventHandlerUnion<T, E extends FocusEvent> = EventHandlerUnion<
    T,
    E,
    FocusEventHandler<T, E>
  >;

  type ClassList =
    | Record<string, boolean>
    | Array<string | number | boolean | null | undefined | Record<string, boolean>>;

  const SERIALIZABLE: unique symbol;
  interface SerializableAttributeValue {
    toString(): string;
    [SERIALIZABLE]: never;
  }

  interface IntrinsicAttributes {
    ref?: unknown | ((e: unknown) => void) | undefined;
  }
  interface CustomAttributes<T> {
    ref?: T | ((el: T) => void) | undefined;
    $ServerOnly?: boolean | undefined;
  }
  type Accessor<T> = () => T;
  interface Directives {}
  interface DirectiveFunctions {
    [x: string]: (el: DOMElement, accessor: Accessor<any>) => void;
  }
  interface ExplicitProperties {}
  interface ExplicitAttributes {}
  interface ExplicitBoolAttributes {}
  interface CustomEvents {}
  type DirectiveAttributes = {
    [Key in keyof Directives as `use:${Key}`]?: Directives[Key];
  };
  type DirectiveFunctionAttributes<T> = {
    [K in keyof DirectiveFunctions as string extends K
      ? never
      : `use:${K}`]?: DirectiveFunctions[K] extends (
      el: infer E, // will be unknown if not provided
      ...rest: infer R // use rest so that we can check whether it's provided or not
    ) => void
      ? T extends E // everything extends unknown if E is unknown
        ? R extends [infer A] // check if has accessor provided
          ? A extends Accessor<infer V>
            ? V // it's an accessor
            : never // it isn't, type error
          : true // no accessor provided
        : never // T is the wrong element
      : never; // it isn't a function
  };
  type PropAttributes = {
    [Key in keyof ExplicitProperties as `prop:${Key}`]?: ExplicitProperties[Key];
  };
  type AttrAttributes = {
    [Key in keyof ExplicitAttributes as `attr:${Key}`]?: ExplicitAttributes[Key];
  };
  type BoolAttributes = {
    [Key in keyof ExplicitBoolAttributes as `bool:${Key}`]?: ExplicitBoolAttributes[Key];
  };
  type OnAttributes<T> = {
    [Key in keyof CustomEvents as `on:${Key}`]?: EventHandlerWithOptionsUnion<T, CustomEvents[Key]>;
  };
  interface DOMAttributes<T>
    extends CustomAttributes<T>,
      DirectiveAttributes,
      DirectiveFunctionAttributes<T>,
      PropAttributes,
      AttrAttributes,
      BoolAttributes,
      OnAttributes<T>,
      CustomEventHandlersCamelCase<T>,
      CustomEventHandlersLowerCase<T>,
      CustomEventHandlersNamespaced<T> {
    children?: Element | undefined;
    innerHTML?: string | undefined;
    innerText?: string | number | undefined;
    textContent?: string | number | undefined;
    // camel case events
    onCopy?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    onCut?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    onPaste?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    onCompositionEnd?: EventHandlerUnion<T, CompositionEvent> | undefined;
    onCompositionStart?: EventHandlerUnion<T, CompositionEvent> | undefined;
    onCompositionUpdate?: EventHandlerUnion<T, CompositionEvent> | undefined;
    onFocusOut?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    onFocusIn?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    onEncrypted?: EventHandlerUnion<T, MediaEncryptedEvent> | undefined;
    onDragExit?: EventHandlerUnion<T, DragEvent> | undefined;
    // lower case events
    /** @deprecated Use camelCase event handlers */
    oncopy?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    oncut?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onpaste?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    oncompositionend?: EventHandlerUnion<T, CompositionEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    oncompositionstart?: EventHandlerUnion<T, CompositionEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    oncompositionupdate?: EventHandlerUnion<T, CompositionEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onfocusout?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onfocusin?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onencrypted?: EventHandlerUnion<T, MediaEncryptedEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ondragexit?: EventHandlerUnion<T, DragEvent> | undefined;
    // namespaced events
    "on:copy"?: EventHandlerWithOptionsUnion<T, ClipboardEvent> | undefined;
    "on:cut"?: EventHandlerWithOptionsUnion<T, ClipboardEvent> | undefined;
    "on:paste"?: EventHandlerWithOptionsUnion<T, ClipboardEvent> | undefined;
    "on:compositionend"?: EventHandlerWithOptionsUnion<T, CompositionEvent> | undefined;
    "on:compositionstart"?: EventHandlerWithOptionsUnion<T, CompositionEvent> | undefined;
    "on:compositionupdate"?: EventHandlerWithOptionsUnion<T, CompositionEvent> | undefined;
    "on:focusout"?:
      | EventHandlerWithOptionsUnion<T, FocusEvent, FocusEventHandler<T, FocusEvent>>
      | undefined;
    "on:focusin"?:
      | EventHandlerWithOptionsUnion<T, FocusEvent, FocusEventHandler<T, FocusEvent>>
      | undefined;
    "on:encrypted"?: EventHandlerWithOptionsUnion<T, MediaEncryptedEvent> | undefined;
    "on:dragexit"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
  }
  interface CustomEventHandlersCamelCase<T> {
    onAbort?: EventHandlerUnion<T, UIEvent> | undefined;
    onAnimationEnd?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onAnimationIteration?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onAnimationStart?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onAuxClick?: EventHandlerUnion<T, MouseEvent> | undefined;
    onBeforeInput?: InputEventHandlerUnion<T, InputEvent> | undefined;
    onBeforeToggle?: EventHandlerUnion<T, ToggleEvent> | undefined;
    onBlur?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    onCanPlay?: EventHandlerUnion<T, Event> | undefined;
    onCanPlayThrough?: EventHandlerUnion<T, Event> | undefined;
    onChange?: ChangeEventHandlerUnion<T, Event> | undefined;
    onClick?: EventHandlerUnion<T, MouseEvent> | undefined;
    onContextMenu?: EventHandlerUnion<T, MouseEvent> | undefined;
    onDblClick?: EventHandlerUnion<T, MouseEvent> | undefined;
    onDrag?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragEnd?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragEnter?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragLeave?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragOver?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragStart?: EventHandlerUnion<T, DragEvent> | undefined;
    onDrop?: EventHandlerUnion<T, DragEvent> | undefined;
    onDurationChange?: EventHandlerUnion<T, Event> | undefined;
    onEmptied?: EventHandlerUnion<T, Event> | undefined;
    onEnded?: EventHandlerUnion<T, Event> | undefined;
    onError?: EventHandlerUnion<T, ErrorEvent> | undefined;
    onFocus?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    onGotPointerCapture?: EventHandlerUnion<T, PointerEvent> | undefined;
    onInput?: InputEventHandlerUnion<T, InputEvent> | undefined;
    onInvalid?: EventHandlerUnion<T, Event> | undefined;
    onKeyDown?: EventHandlerUnion<T, KeyboardEvent> | undefined;
    onKeyPress?: EventHandlerUnion<T, KeyboardEvent> | undefined;
    onKeyUp?: EventHandlerUnion<T, KeyboardEvent> | undefined;
    onLoad?: EventHandlerUnion<T, Event> | undefined;
    onLoadedData?: EventHandlerUnion<T, Event> | undefined;
    onLoadedMetadata?: EventHandlerUnion<T, Event> | undefined;
    onLoadStart?: EventHandlerUnion<T, Event> | undefined;
    onLostPointerCapture?: EventHandlerUnion<T, PointerEvent> | undefined;
    onMouseDown?: EventHandlerUnion<T, MouseEvent> | undefined;
    onMouseEnter?: EventHandlerUnion<T, MouseEvent> | undefined;
    onMouseLeave?: EventHandlerUnion<T, MouseEvent> | undefined;
    onMouseMove?: EventHandlerUnion<T, MouseEvent> | undefined;
    onMouseOut?: EventHandlerUnion<T, MouseEvent> | undefined;
    onMouseOver?: EventHandlerUnion<T, MouseEvent> | undefined;
    onMouseUp?: EventHandlerUnion<T, MouseEvent> | undefined;
    onPause?: EventHandlerUnion<T, Event> | undefined;
    onPlay?: EventHandlerUnion<T, Event> | undefined;
    onPlaying?: EventHandlerUnion<T, Event> | undefined;
    onPointerCancel?: EventHandlerUnion<T, PointerEvent> | undefined;
    onPointerDown?: EventHandlerUnion<T, PointerEvent> | undefined;
    onPointerEnter?: EventHandlerUnion<T, PointerEvent> | undefined;
    onPointerLeave?: EventHandlerUnion<T, PointerEvent> | undefined;
    onPointerMove?: EventHandlerUnion<T, PointerEvent> | undefined;
    onPointerOut?: EventHandlerUnion<T, PointerEvent> | undefined;
    onPointerOver?: EventHandlerUnion<T, PointerEvent> | undefined;
    onPointerUp?: EventHandlerUnion<T, PointerEvent> | undefined;
    onProgress?: EventHandlerUnion<T, ProgressEvent> | undefined;
    onRateChange?: EventHandlerUnion<T, Event> | undefined;
    onReset?: EventHandlerUnion<T, Event> | undefined;
    onScroll?: EventHandlerUnion<T, Event> | undefined;
    onScrollEnd?: EventHandlerUnion<T, Event> | undefined;
    onSeeked?: EventHandlerUnion<T, Event> | undefined;
    onSeeking?: EventHandlerUnion<T, Event> | undefined;
    onSelect?: EventHandlerUnion<T, Event> | undefined;
    onStalled?: EventHandlerUnion<T, Event> | undefined;
    onSubmit?: EventHandlerUnion<T, SubmitEvent> | undefined;
    onSuspend?: EventHandlerUnion<T, Event> | undefined;
    onTimeUpdate?: EventHandlerUnion<T, Event> | undefined;
    onToggle?: EventHandlerUnion<T, ToggleEvent> | undefined;
    onTouchCancel?: EventHandlerUnion<T, TouchEvent> | undefined;
    onTouchEnd?: EventHandlerUnion<T, TouchEvent> | undefined;
    onTouchMove?: EventHandlerUnion<T, TouchEvent> | undefined;
    onTouchStart?: EventHandlerUnion<T, TouchEvent> | undefined;
    onTransitionStart?: EventHandlerUnion<T, TransitionEvent> | undefined;
    onTransitionEnd?: EventHandlerUnion<T, TransitionEvent> | undefined;
    onTransitionRun?: EventHandlerUnion<T, TransitionEvent> | undefined;
    onTransitionCancel?: EventHandlerUnion<T, TransitionEvent> | undefined;
    onVolumeChange?: EventHandlerUnion<T, Event> | undefined;
    onWaiting?: EventHandlerUnion<T, Event> | undefined;
    onWheel?: EventHandlerUnion<T, WheelEvent> | undefined;
  }
  /** @type {GlobalEventHandlers} */
  interface CustomEventHandlersLowerCase<T> {
    /** @deprecated Use camelCase event handlers */
    onabort?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onanimationend?: EventHandlerUnion<T, AnimationEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onanimationiteration?: EventHandlerUnion<T, AnimationEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onanimationstart?: EventHandlerUnion<T, AnimationEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onauxclick?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onbeforeinput?: InputEventHandlerUnion<T, InputEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onbeforetoggle?: EventHandlerUnion<T, ToggleEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onblur?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    oncanplay?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    oncanplaythrough?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onchange?: ChangeEventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onclick?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    oncontextmenu?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ondblclick?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ondrag?: EventHandlerUnion<T, DragEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ondragend?: EventHandlerUnion<T, DragEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ondragenter?: EventHandlerUnion<T, DragEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ondragleave?: EventHandlerUnion<T, DragEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ondragover?: EventHandlerUnion<T, DragEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ondragstart?: EventHandlerUnion<T, DragEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ondrop?: EventHandlerUnion<T, DragEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ondurationchange?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onemptied?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onended?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onerror?: EventHandlerUnion<T, ErrorEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onfocus?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ongotpointercapture?: EventHandlerUnion<T, PointerEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    oninput?: InputEventHandlerUnion<T, InputEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    oninvalid?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onkeydown?: EventHandlerUnion<T, KeyboardEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onkeypress?: EventHandlerUnion<T, KeyboardEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onkeyup?: EventHandlerUnion<T, KeyboardEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onload?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onloadeddata?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onloadedmetadata?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onloadstart?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onlostpointercapture?: EventHandlerUnion<T, PointerEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onmousedown?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onmouseenter?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onmouseleave?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onmousemove?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onmouseout?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onmouseover?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onmouseup?: EventHandlerUnion<T, MouseEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onpause?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onplay?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onplaying?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onpointercancel?: EventHandlerUnion<T, PointerEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onpointerdown?: EventHandlerUnion<T, PointerEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onpointerenter?: EventHandlerUnion<T, PointerEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onpointerleave?: EventHandlerUnion<T, PointerEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onpointermove?: EventHandlerUnion<T, PointerEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onpointerout?: EventHandlerUnion<T, PointerEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onpointerover?: EventHandlerUnion<T, PointerEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onpointerup?: EventHandlerUnion<T, PointerEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onprogress?: EventHandlerUnion<T, ProgressEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onratechange?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onreset?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onscroll?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onscrollend?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onseeked?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onseeking?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onselect?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onstalled?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onsubmit?: EventHandlerUnion<T, SubmitEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onsuspend?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    ontimeupdate?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    ontoggle?: EventHandlerUnion<T, ToggleEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ontouchcancel?: EventHandlerUnion<T, TouchEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ontouchend?: EventHandlerUnion<T, TouchEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ontouchmove?: EventHandlerUnion<T, TouchEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ontouchstart?: EventHandlerUnion<T, TouchEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ontransitionstart?: EventHandlerUnion<T, TransitionEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ontransitionend?: EventHandlerUnion<T, TransitionEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ontransitionrun?: EventHandlerUnion<T, TransitionEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    ontransitioncancel?: EventHandlerUnion<T, TransitionEvent> | undefined;
    /** @deprecated Use camelCase event handlers */
    onvolumechange?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onwaiting?: EventHandlerUnion<T, Event> | undefined;
    /** @deprecated Use camelCase event handlers */
    onwheel?: EventHandlerUnion<T, WheelEvent> | undefined;
  }
  interface CustomEventHandlersNamespaced<T> {
    "on:abort"?: EventHandlerWithOptionsUnion<T, UIEvent> | undefined;
    "on:animationend"?: EventHandlerWithOptionsUnion<T, AnimationEvent> | undefined;
    "on:animationiteration"?: EventHandlerWithOptionsUnion<T, AnimationEvent> | undefined;
    "on:animationstart"?: EventHandlerWithOptionsUnion<T, AnimationEvent> | undefined;
    "on:auxclick"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:beforeinput"?:
      | EventHandlerWithOptionsUnion<T, InputEvent, InputEventHandler<T, InputEvent>>
      | undefined;
    "on:beforetoggle"?: EventHandlerWithOptionsUnion<T, ToggleEvent> | undefined;
    "on:blur"?:
      | EventHandlerWithOptionsUnion<T, FocusEvent, FocusEventHandler<T, FocusEvent>>
      | undefined;
    "on:canplay"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:canplaythrough"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:change"?: EventHandlerWithOptionsUnion<T, Event, ChangeEventHandler<T, Event>> | undefined;
    "on:click"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:contextmenu"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:dblclick"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:drag"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
    "on:dragend"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
    "on:dragenter"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
    "on:dragleave"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
    "on:dragover"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
    "on:dragstart"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
    "on:drop"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
    "on:durationchange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:emptied"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:ended"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:error"?: EventHandlerWithOptionsUnion<T, ErrorEvent> | undefined;
    "on:focus"?:
      | EventHandlerWithOptionsUnion<T, FocusEvent, FocusEventHandler<T, FocusEvent>>
      | undefined;
    "on:gotpointercapture"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:input"?:
      | EventHandlerWithOptionsUnion<T, InputEvent, InputEventHandler<T, InputEvent>>
      | undefined;
    "on:invalid"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:keydown"?: EventHandlerWithOptionsUnion<T, KeyboardEvent> | undefined;
    "on:keypress"?: EventHandlerWithOptionsUnion<T, KeyboardEvent> | undefined;
    "on:keyup"?: EventHandlerWithOptionsUnion<T, KeyboardEvent> | undefined;
    "on:load"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:loadeddata"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:loadedmetadata"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:loadstart"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:lostpointercapture"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:mousedown"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:mouseenter"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:mouseleave"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:mousemove"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:mouseout"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:mouseover"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:mouseup"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:pause"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:play"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:playing"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:pointercancel"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:pointerdown"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:pointerenter"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:pointerleave"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:pointermove"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:pointerout"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:pointerover"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:pointerup"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:progress"?: EventHandlerWithOptionsUnion<T, ProgressEvent> | undefined;
    "on:ratechange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:reset"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:scroll"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:scrollend"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:seeked"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:seeking"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:select"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:stalled"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:submit"?: EventHandlerWithOptionsUnion<T, SubmitEvent> | undefined;
    "on:suspend"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:timeupdate"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:toggle"?: EventHandlerWithOptionsUnion<T, ToggleEvent> | undefined;
    "on:touchcancel"?: EventHandlerWithOptionsUnion<T, TouchEvent> | undefined;
    "on:touchend"?: EventHandlerWithOptionsUnion<T, TouchEvent> | undefined;
    "on:touchmove"?: EventHandlerWithOptionsUnion<T, TouchEvent> | undefined;
    "on:touchstart"?: EventHandlerWithOptionsUnion<T, TouchEvent> | undefined;
    "on:transitionstart"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:transitionend"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:transitionrun"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:transitioncancel"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:volumechange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:waiting"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:wheel"?: EventHandlerWithOptionsUnion<T, WheelEvent> | undefined;
  }

  interface CSSProperties extends csstype.PropertiesHyphen {
    // Override
    [key: `-${string}`]: string | number | undefined;
  }

  /**
   * Boolean and Pseudo-Boolean Attributes Helpers.
   *
   * Please use the helpers to describe boolean and pseudo boolean attributes to make this file and
   * also the typings easier to understand and explain.
   */

  type BooleanAttribute = true | false | "";

  type EnumeratedPseudoBoolean = "false" | "true";

  type EnumeratedAcceptsEmpty = "" | true;

  type RemoveAttribute = undefined | false;

  /** Enumerated Attributes */
  type HTMLAutocapitalize = "off" | "none" | "on" | "sentences" | "words" | "characters";
  type HTMLDir = "ltr" | "rtl" | "auto";
  type HTMLFormEncType = "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain";
  type HTMLFormMethod = "post" | "get" | "dialog";
  type HTMLCrossorigin = "anonymous" | "use-credentials" | EnumeratedAcceptsEmpty;
  type HTMLReferrerPolicy =
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";
  type HTMLIframeSandbox =
    | "allow-downloads-without-user-activation"
    | "allow-downloads"
    | "allow-forms"
    | "allow-modals"
    | "allow-orientation-lock"
    | "allow-pointer-lock"
    | "allow-popups"
    | "allow-popups-to-escape-sandbox"
    | "allow-presentation"
    | "allow-same-origin"
    | "allow-scripts"
    | "allow-storage-access-by-user-activation"
    | "allow-top-navigation"
    | "allow-top-navigation-by-user-activation"
    | "allow-top-navigation-to-custom-protocols";
  type HTMLLinkAs =
    | "audio"
    | "document"
    | "embed"
    | "fetch"
    | "font"
    | "image"
    | "object"
    | "script"
    | "style"
    | "track"
    | "video"
    | "worker";

  // All the WAI-ARIA 1.1 attributes from https://www.w3.org/TR/wai-aria-1.1/
  interface AriaAttributes {
    /**
     * Identifies the currently active element when DOM focus is on a composite widget, textbox,
     * group, or application.
     */
    "aria-activedescendant"?: string | RemoveAttribute;
    /**
     * Indicates whether assistive technologies will present all, or only parts of, the changed
     * region based on the change notifications defined by the aria-relevant attribute.
     */
    "aria-atomic"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /**
     * Indicates whether inputting text could trigger display of one or more predictions of the
     * user's intended value for an input and specifies how predictions would be presented if they
     * are made.
     */
    "aria-autocomplete"?: "none" | "inline" | "list" | "both" | RemoveAttribute;
    /**
     * Indicates an element is being modified and that assistive technologies MAY want to wait until
     * the modifications are complete before exposing them to the user.
     */
    "aria-busy"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /**
     * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
     *
     * @see aria-pressed @see aria-selected.
     */
    "aria-checked"?: EnumeratedPseudoBoolean | "mixed" | RemoveAttribute;
    /**
     * Defines the total number of columns in a table, grid, or treegrid.
     *
     * @see aria-colindex.
     */
    "aria-colcount"?: number | string | RemoveAttribute;
    /**
     * Defines an element's column index or position with respect to the total number of columns
     * within a table, grid, or treegrid.
     *
     * @see aria-colcount @see aria-colspan.
     */
    "aria-colindex"?: number | string | RemoveAttribute;
    /**
     * Defines the number of columns spanned by a cell or gridcell within a table, grid, or
     * treegrid.
     *
     * @see aria-colindex @see aria-rowspan.
     */
    "aria-colspan"?: number | string | RemoveAttribute;
    /**
     * Identifies the element (or elements) whose contents or presence are controlled by the current
     * element.
     *
     * @see aria-owns.
     */
    "aria-controls"?: string | RemoveAttribute;
    /**
     * Indicates the element that represents the current item within a container or set of related
     * elements.
     */
    "aria-current"?:
      | EnumeratedPseudoBoolean
      | "page"
      | "step"
      | "location"
      | "date"
      | "time"
      | RemoveAttribute;
    /**
     * Identifies the element (or elements) that describes the object.
     *
     * @see aria-labelledby
     */
    "aria-describedby"?: string | RemoveAttribute;
    /**
     * Identifies the element that provides a detailed, extended description for the object.
     *
     * @see aria-describedby.
     */
    "aria-details"?: string | RemoveAttribute;
    /**
     * Indicates that the element is perceivable but disabled, so it is not editable or otherwise
     * operable.
     *
     * @see aria-hidden @see aria-readonly.
     */
    "aria-disabled"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /**
     * Indicates what functions can be performed when a dragged object is released on the drop
     * target.
     *
     * @deprecated In ARIA 1.1
     */
    "aria-dropeffect"?: "none" | "copy" | "execute" | "link" | "move" | "popup" | RemoveAttribute;
    /**
     * Identifies the element that provides an error message for the object.
     *
     * @see aria-invalid @see aria-describedby.
     */
    "aria-errormessage"?: string | RemoveAttribute;
    /**
     * Indicates whether the element, or another grouping element it controls, is currently expanded
     * or collapsed.
     */
    "aria-expanded"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /**
     * Identifies the next element (or elements) in an alternate reading order of content which, at
     * the user's discretion, allows assistive technology to override the general default of reading
     * in document source order.
     */
    "aria-flowto"?: string | RemoveAttribute;
    /**
     * Indicates an element's "grabbed" state in a drag-and-drop operation.
     *
     * @deprecated In ARIA 1.1
     */
    "aria-grabbed"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /**
     * Indicates the availability and type of interactive popup element, such as menu or dialog,
     * that can be triggered by an element.
     */
    "aria-haspopup"?:
      | EnumeratedPseudoBoolean
      | "menu"
      | "listbox"
      | "tree"
      | "grid"
      | "dialog"
      | RemoveAttribute;
    /**
     * Indicates whether the element is exposed to an accessibility API.
     *
     * @see aria-disabled.
     */
    "aria-hidden"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /**
     * Indicates the entered value does not conform to the format expected by the application.
     *
     * @see aria-errormessage.
     */
    "aria-invalid"?: EnumeratedPseudoBoolean | "grammar" | "spelling" | RemoveAttribute;
    /**
     * Indicates keyboard shortcuts that an author has implemented to activate or give focus to an
     * element.
     */
    "aria-keyshortcuts"?: string | RemoveAttribute;
    /**
     * Defines a string value that labels the current element.
     *
     * @see aria-labelledby.
     */
    "aria-label"?: string | RemoveAttribute;
    /**
     * Identifies the element (or elements) that labels the current element.
     *
     * @see aria-describedby.
     */
    "aria-labelledby"?: string | RemoveAttribute;
    /** Defines the hierarchical level of an element within a structure. */
    "aria-level"?: number | string | RemoveAttribute;
    /**
     * Indicates that an element will be updated, and describes the types of updates the user
     * agents, assistive technologies, and user can expect from the live region.
     */
    "aria-live"?: "off" | "assertive" | "polite" | RemoveAttribute;
    /** Indicates whether an element is modal when displayed. */
    "aria-modal"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /** Indicates whether a text box accepts multiple lines of input or only a single line. */
    "aria-multiline"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /**
     * Indicates that the user may select more than one item from the current selectable
     * descendants.
     */
    "aria-multiselectable"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
    "aria-orientation"?: "horizontal" | "vertical" | RemoveAttribute;
    /**
     * Identifies an element (or elements) in order to define a visual, functional, or contextual
     * parent/child relationship between DOM elements where the DOM hierarchy cannot be used to
     * represent the relationship.
     *
     * @see aria-controls.
     */
    "aria-owns"?: string | RemoveAttribute;
    /**
     * Defines a short hint (a word or short phrase) intended to aid the user with data entry when
     * the control has no value. A hint could be a sample value or a brief description of the
     * expected format.
     */
    "aria-placeholder"?: string | RemoveAttribute;
    /**
     * Defines an element's number or position in the current set of listitems or treeitems. Not
     * required if all elements in the set are present in the DOM.
     *
     * @see aria-setsize.
     */
    "aria-posinset"?: number | string | RemoveAttribute;
    /**
     * Indicates the current "pressed" state of toggle buttons.
     *
     * @see aria-checked @see aria-selected.
     */
    "aria-pressed"?: EnumeratedPseudoBoolean | "mixed" | RemoveAttribute;
    /**
     * Indicates that the element is not editable, but is otherwise operable.
     *
     * @see aria-disabled.
     */
    "aria-readonly"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /**
     * Indicates what notifications the user agent will trigger when the accessibility tree within a
     * live region is modified.
     *
     * @see aria-atomic.
     */
    "aria-relevant"?:
      | "additions"
      | "additions removals"
      | "additions text"
      | "all"
      | "removals"
      | "removals additions"
      | "removals text"
      | "text"
      | "text additions"
      | "text removals"
      | RemoveAttribute;
    /** Indicates that user input is required on the element before a form may be submitted. */
    "aria-required"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /** Defines a human-readable, author-localized description for the role of an element. */
    "aria-roledescription"?: string | RemoveAttribute;
    /**
     * Defines the total number of rows in a table, grid, or treegrid.
     *
     * @see aria-rowindex.
     */
    "aria-rowcount"?: number | string | RemoveAttribute;
    /**
     * Defines an element's row index or position with respect to the total number of rows within a
     * table, grid, or treegrid.
     *
     * @see aria-rowcount @see aria-rowspan.
     */
    "aria-rowindex"?: number | string | RemoveAttribute;
    /**
     * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
     *
     * @see aria-rowindex @see aria-colspan.
     */
    "aria-rowspan"?: number | string | RemoveAttribute;
    /**
     * Indicates the current "selected" state of various widgets.
     *
     * @see aria-checked @see aria-pressed.
     */
    "aria-selected"?: EnumeratedPseudoBoolean | RemoveAttribute;
    /**
     * Defines the number of items in the current set of listitems or treeitems. Not required if all
     * elements in the set are present in the DOM.
     *
     * @see aria-posinset.
     */
    "aria-setsize"?: number | string | RemoveAttribute;
    /** Indicates if items in a table or grid are sorted in ascending or descending order. */
    "aria-sort"?: "none" | "ascending" | "descending" | "other" | RemoveAttribute;
    /** Defines the maximum allowed value for a range widget. */
    "aria-valuemax"?: number | string | RemoveAttribute;
    /** Defines the minimum allowed value for a range widget. */
    "aria-valuemin"?: number | string | RemoveAttribute;
    /**
     * Defines the current value for a range widget.
     *
     * @see aria-valuetext.
     */
    "aria-valuenow"?: number | string | RemoveAttribute;
    /** Defines the human readable text alternative of aria-valuenow for a range widget. */
    "aria-valuetext"?: string | RemoveAttribute;
    role?:
      | "alert"
      | "alertdialog"
      | "application"
      | "article"
      | "banner"
      | "button"
      | "cell"
      | "checkbox"
      | "columnheader"
      | "combobox"
      | "complementary"
      | "contentinfo"
      | "definition"
      | "dialog"
      | "directory"
      | "document"
      | "feed"
      | "figure"
      | "form"
      | "grid"
      | "gridcell"
      | "group"
      | "heading"
      | "img"
      | "link"
      | "list"
      | "listbox"
      | "listitem"
      | "log"
      | "main"
      | "marquee"
      | "math"
      | "menu"
      | "menubar"
      | "menuitem"
      | "menuitemcheckbox"
      | "menuitemradio"
      | "meter"
      | "navigation"
      | "none"
      | "note"
      | "option"
      | "presentation"
      | "progressbar"
      | "radio"
      | "radiogroup"
      | "region"
      | "row"
      | "rowgroup"
      | "rowheader"
      | "scrollbar"
      | "search"
      | "searchbox"
      | "separator"
      | "slider"
      | "spinbutton"
      | "status"
      | "switch"
      | "tab"
      | "table"
      | "tablist"
      | "tabpanel"
      | "term"
      | "textbox"
      | "timer"
      | "toolbar"
      | "tooltip"
      | "tree"
      | "treegrid"
      | "treeitem"
      | RemoveAttribute;
  }

  // TODO: Should we allow this?
  // type ClassKeys = `class:${string}`;
  // type CSSKeys = Exclude<keyof csstype.PropertiesHyphen, `-${string}`>;

  // type CSSAttributes = {
  //   [key in CSSKeys as `style:${key}`]: csstype.PropertiesHyphen[key];
  // };

  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // [key: ClassKeys]: boolean;
    about?: string | RemoveAttribute;
    accesskey?: string | RemoveAttribute;
    autocapitalize?: HTMLAutocapitalize | RemoveAttribute;
    class?: string | ClassList | RemoveAttribute;
    color?: string | RemoveAttribute;
    contenteditable?:
      | EnumeratedPseudoBoolean
      | EnumeratedAcceptsEmpty
      | "plaintext-only"
      | "inherit"
      | RemoveAttribute;
    contextmenu?: string | RemoveAttribute;
    datatype?: string | RemoveAttribute;
    dir?: HTMLDir | RemoveAttribute;
    draggable?: EnumeratedPseudoBoolean | RemoveAttribute;
    exportparts?: string | RemoveAttribute;
    hidden?: EnumeratedAcceptsEmpty | "hidden" | "until-found" | RemoveAttribute;
    id?: string | RemoveAttribute;
    inert?: BooleanAttribute | RemoveAttribute;
    inlist?: any | RemoveAttribute;
    inputmode?:
      | "decimal"
      | "email"
      | "none"
      | "numeric"
      | "search"
      | "tel"
      | "text"
      | "url"
      | RemoveAttribute;
    is?: string | RemoveAttribute;
    itemid?: string | RemoveAttribute;
    itemprop?: string | RemoveAttribute;
    itemref?: string | RemoveAttribute;
    itemscope?: BooleanAttribute | RemoveAttribute;
    itemtype?: string | RemoveAttribute;
    lang?: string | RemoveAttribute;
    part?: string | RemoveAttribute;
    popover?: EnumeratedAcceptsEmpty | "manual" | "auto" | RemoveAttribute;
    prefix?: string | RemoveAttribute;
    property?: string | RemoveAttribute;
    resource?: string | RemoveAttribute;
    slot?: string | RemoveAttribute;
    spellcheck?: EnumeratedPseudoBoolean | EnumeratedAcceptsEmpty | RemoveAttribute;
    style?: CSSProperties | string | RemoveAttribute;
    tabindex?: number | string | RemoveAttribute;
    title?: string | RemoveAttribute;
    translate?: "yes" | "no" | RemoveAttribute;
    typeof?: string | RemoveAttribute;
    vocab?: string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    accessKey?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    autoCapitalize?: HTMLAutocapitalize | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    contentEditable?: EnumeratedPseudoBoolean | "plaintext-only" | "inherit" | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    contextMenu?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    exportParts?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    inputMode?:
      | "none"
      | "text"
      | "tel"
      | "url"
      | "email"
      | "numeric"
      | "decimal"
      | "search"
      | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    itemId?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    itemProp?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    itemRef?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    itemScope?: BooleanAttribute | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    itemType?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    tabIndex?: number | string | RemoveAttribute;
  }
  interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
    download?: string | RemoveAttribute;
    href?: string | RemoveAttribute;
    hreflang?: string | RemoveAttribute;
    ping?: string | RemoveAttribute;
    referrerpolicy?: HTMLReferrerPolicy | RemoveAttribute;
    rel?: string | RemoveAttribute;
    target?: "_self" | "_blank" | "_parent" | "_top" | (string & {}) | RemoveAttribute;
    type?: string | RemoveAttribute;

    /** @experimental */
    attributionsrc?: string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    referrerPolicy?: HTMLReferrerPolicy | RemoveAttribute;

    /** @deprecated */
    charset?: string | RemoveAttribute;
    /** @deprecated */
    coords?: string | RemoveAttribute;
    /** @deprecated */
    name?: string | RemoveAttribute;
    /** @deprecated */
    rev?: string | RemoveAttribute;
    /** @deprecated */
    shape?: "rect" | "circle" | "poly" | "default" | RemoveAttribute;
  }
  interface AudioHTMLAttributes<T> extends MediaHTMLAttributes<T> {}
  interface AreaHTMLAttributes<T> extends HTMLAttributes<T> {
    alt?: string | RemoveAttribute;
    coords?: string | RemoveAttribute;
    download?: string | RemoveAttribute;
    href?: string | RemoveAttribute;
    ping?: string | RemoveAttribute;
    referrerpolicy?: HTMLReferrerPolicy | RemoveAttribute;
    rel?: string | RemoveAttribute;
    shape?: "rect" | "circle" | "poly" | "default" | RemoveAttribute;
    target?: "_self" | "_blank" | "_parent" | "_top" | (string & {}) | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    referrerPolicy?: HTMLReferrerPolicy | RemoveAttribute;

    /** @deprecated */
    nohref?: BooleanAttribute | RemoveAttribute;
  }
  interface BaseHTMLAttributes<T> extends HTMLAttributes<T> {
    href?: string | RemoveAttribute;
    target?: "_self" | "_blank" | "_parent" | "_top" | (string & {}) | RemoveAttribute;
  }
  interface BlockquoteHTMLAttributes<T> extends HTMLAttributes<T> {
    cite?: string | RemoveAttribute;
  }
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    autofocus?: BooleanAttribute | RemoveAttribute;
    disabled?: BooleanAttribute | RemoveAttribute;
    form?: string | RemoveAttribute;
    formaction?: string | SerializableAttributeValue | RemoveAttribute;
    formenctype?: HTMLFormEncType | RemoveAttribute;
    formmethod?: HTMLFormMethod | RemoveAttribute;
    formnovalidate?: BooleanAttribute | RemoveAttribute;
    formtarget?: "_self" | "_blank" | "_parent" | "_top" | (string & {}) | RemoveAttribute;
    popovertarget?: string | RemoveAttribute;
    popovertargetaction?: "hide" | "show" | "toggle" | RemoveAttribute;
    name?: string | RemoveAttribute;
    type?: "submit" | "reset" | "button" | "menu" | RemoveAttribute;
    value?: string | RemoveAttribute;

    /** @experimental */
    command?:
      | "show-modal"
      | "close"
      | "show-popover"
      | "hide-popover"
      | "toggle-popover"
      | (string & {})
      | RemoveAttribute;
    /** @experimental */
    commandfor?: string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    formAction?: string | SerializableAttributeValue | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    formEnctype?: HTMLFormEncType | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    formMethod?: HTMLFormMethod | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    formNoValidate?: boolean | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    formTarget?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    popoverTarget?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    popoverTargetAction?: "hide" | "show" | "toggle" | RemoveAttribute;
  }
  interface CanvasHTMLAttributes<T> extends HTMLAttributes<T> {
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;

    /**
     * @deprecated
     * @non-standard
     */
    "moz-opaque"?: BooleanAttribute | RemoveAttribute;
  }
  interface ColHTMLAttributes<T> extends HTMLAttributes<T> {
    span?: number | string | RemoveAttribute;

    /** @deprecated */
    align?: "left" | "center" | "right" | "justify" | "char" | RemoveAttribute;
    /** @deprecated */
    bgcolor?: string | RemoveAttribute;
    /** @deprecated */
    char?: string | RemoveAttribute;
    /** @deprecated */
    charoff?: string | RemoveAttribute;
    /** @deprecated */
    valign?: "baseline" | "bottom" | "middle" | "top" | RemoveAttribute;
    /** @deprecated */
    width?: number | string | RemoveAttribute;
  }
  interface ColgroupHTMLAttributes<T> extends HTMLAttributes<T> {
    span?: number | string | RemoveAttribute;

    /** @deprecated */
    align?: "left" | "center" | "right" | "justify" | "char" | RemoveAttribute;
    /** @deprecated */
    bgcolor?: string | RemoveAttribute;
    /** @deprecated */
    char?: string | RemoveAttribute;
    /** @deprecated */
    charoff?: string | RemoveAttribute;
    /** @deprecated */
    valign?: "baseline" | "bottom" | "middle" | "top" | RemoveAttribute;
    /** @deprecated */
    width?: number | string | RemoveAttribute;
  }
  interface DataHTMLAttributes<T> extends HTMLAttributes<T> {
    value?: string | string[] | number | RemoveAttribute;
  }
  interface DetailsHtmlAttributes<T> extends HTMLAttributes<T> {
    open?: BooleanAttribute | RemoveAttribute;
    onToggle?: EventHandlerUnion<T, Event> | undefined;

    /** @deprecated Use camelCase event handlers */
    ontoggle?: EventHandlerUnion<T, Event> | undefined;
  }
  interface DialogHtmlAttributes<T> extends HTMLAttributes<T> {
    open?: BooleanAttribute | RemoveAttribute;
    tabindex?: never;

    onclose?: EventHandlerUnion<T, Event> | undefined;
    onClose?: EventHandlerUnion<T, Event> | undefined;
    oncancel?: EventHandlerUnion<T, Event> | undefined;
    onCancel?: EventHandlerUnion<T, Event> | undefined;
  }
  interface EmbedHTMLAttributes<T> extends HTMLAttributes<T> {
    height?: number | string | RemoveAttribute;
    src?: string | RemoveAttribute;
    type?: string | RemoveAttribute;
    width?: number | string | RemoveAttribute;

    /** @deprecated */
    align?: "left" | "right" | "justify" | "center" | RemoveAttribute;
    /** @deprecated */
    name?: string | RemoveAttribute;
  }
  interface FieldsetHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: BooleanAttribute | RemoveAttribute;
    form?: string | RemoveAttribute;
    name?: string | RemoveAttribute;
  }
  interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
    "accept-charset"?: string | RemoveAttribute;
    action?: string | SerializableAttributeValue | RemoveAttribute;
    autocomplete?: "on" | "off" | RemoveAttribute;
    encoding?: HTMLFormEncType | RemoveAttribute;
    enctype?: HTMLFormEncType | RemoveAttribute;
    method?: HTMLFormMethod | RemoveAttribute;
    name?: string | RemoveAttribute;
    novalidate?: BooleanAttribute | RemoveAttribute;
    rel?: string | RemoveAttribute;
    target?: "_self" | "_blank" | "_parent" | "_top" | (string & {}) | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    noValidate?: boolean | RemoveAttribute;

    /** @deprecated */
    accept?: string | RemoveAttribute;
  }
  interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
    allow?: string | RemoveAttribute;
    allowfullscreen?: BooleanAttribute | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    loading?: "eager" | "lazy" | RemoveAttribute;
    name?: string | RemoveAttribute;
    referrerpolicy?: HTMLReferrerPolicy | RemoveAttribute;
    sandbox?: HTMLIframeSandbox | string | RemoveAttribute;
    src?: string | RemoveAttribute;
    srcdoc?: string | RemoveAttribute;
    width?: number | string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    referrerPolicy?: HTMLReferrerPolicy | RemoveAttribute;

    /** @experimental */
    adauctionheaders?: BooleanAttribute | RemoveAttribute;
    /**
     * @non-standard
     * @experimental
     */
    browsingtopics?: BooleanAttribute | RemoveAttribute;
    /** @experimental */
    credentialless?: BooleanAttribute | RemoveAttribute;
    /** @experimental */
    csp?: string | RemoveAttribute;
    /** @experimental */
    privatetoken?: string | RemoveAttribute;
    /** @experimental */
    sharedstoragewritable?: BooleanAttribute | RemoveAttribute;

    /** @deprecated */
    align?: string | RemoveAttribute;
    /**
     * @deprecated
     * @non-standard
     */
    allowpaymentrequest?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    allowtransparency?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    frameborder?: number | string | RemoveAttribute;
    /** @deprecated */
    longdesc?: string | RemoveAttribute;
    /** @deprecated */
    marginheight?: number | string | RemoveAttribute;
    /** @deprecated */
    marginwidth?: number | string | RemoveAttribute;
    /** @deprecated */
    scrolling?: "yes" | "no" | "auto" | RemoveAttribute;
    /** @deprecated */
    seamless?: BooleanAttribute | RemoveAttribute;
  }
  interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
    alt?: string | RemoveAttribute;
    crossorigin?: HTMLCrossorigin | RemoveAttribute;
    decoding?: "sync" | "async" | "auto" | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    ismap?: BooleanAttribute | RemoveAttribute;
    loading?: "eager" | "lazy" | RemoveAttribute;
    referrerpolicy?: HTMLReferrerPolicy | RemoveAttribute;
    sizes?: string | RemoveAttribute;
    src?: string | RemoveAttribute;
    srcset?: string | RemoveAttribute;
    usemap?: string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    elementtiming?: string | RemoveAttribute;
    fetchpriority?: "high" | "low" | "auto" | RemoveAttribute;

    /** @experimental */
    attributionsrc?: string | RemoveAttribute;
    /** @experimental */
    sharedstoragewritable?: BooleanAttribute | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    crossOrigin?: HTMLCrossorigin | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    isMap?: boolean | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    referrerPolicy?: HTMLReferrerPolicy | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    srcSet?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    useMap?: string | RemoveAttribute;

    /** @deprecated */
    align?: "top" | "middle" | "bottom" | "left" | "right" | RemoveAttribute;
    /** @deprecated */
    border?: string | RemoveAttribute;
    /** @deprecated */
    hspace?: number | string | RemoveAttribute;
    /** @deprecated */
    intrinsicsize?: string | RemoveAttribute;
    /** @deprecated */
    longdesc?: string | RemoveAttribute;
    /** @deprecated */
    lowsrc?: string | RemoveAttribute;
    /** @deprecated */
    name?: string | RemoveAttribute;
    /** @deprecated */
    vspace?: number | string | RemoveAttribute;
  }
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    accept?: string | RemoveAttribute;
    alt?: string | RemoveAttribute;
    autocomplete?:
      | "additional-name"
      | "address-level1"
      | "address-level2"
      | "address-level3"
      | "address-level4"
      | "address-line1"
      | "address-line2"
      | "address-line3"
      | "bday"
      | "bday-day"
      | "bday-month"
      | "bday-year"
      | "billing"
      | "cc-additional-name"
      | "cc-csc"
      | "cc-exp"
      | "cc-exp-month"
      | "cc-exp-year"
      | "cc-family-name"
      | "cc-given-name"
      | "cc-name"
      | "cc-number"
      | "cc-type"
      | "country"
      | "country-name"
      | "current-password"
      | "email"
      | "family-name"
      | "fax"
      | "given-name"
      | "home"
      | "honorific-prefix"
      | "honorific-suffix"
      | "impp"
      | "language"
      | "mobile"
      | "name"
      | "new-password"
      | "nickname"
      | "off"
      | "on"
      | "organization"
      | "organization-title"
      | "pager"
      | "photo"
      | "postal-code"
      | "sex"
      | "shipping"
      | "street-address"
      | "tel"
      | "tel-area-code"
      | "tel-country-code"
      | "tel-extension"
      | "tel-local"
      | "tel-local-prefix"
      | "tel-local-suffix"
      | "tel-national"
      | "transaction-amount"
      | "transaction-currency"
      | "url"
      | "username"
      | "work"
      | (string & {})
      | RemoveAttribute;
    autocorrect?: "on" | "off" | RemoveAttribute;
    autofocus?: BooleanAttribute | RemoveAttribute;
    capture?: "user" | "environment" | RemoveAttribute;
    checked?: BooleanAttribute | RemoveAttribute;
    crossorigin?: HTMLCrossorigin | RemoveAttribute;
    dirname?: string | RemoveAttribute;
    disabled?: BooleanAttribute | RemoveAttribute;
    enterkeyhint?:
      | "enter"
      | "done"
      | "go"
      | "next"
      | "previous"
      | "search"
      | "send"
      | RemoveAttribute;
    form?: string | RemoveAttribute;
    formaction?: string | SerializableAttributeValue | RemoveAttribute;
    formenctype?: HTMLFormEncType | RemoveAttribute;
    formmethod?: HTMLFormMethod | RemoveAttribute;
    formnovalidate?: BooleanAttribute | RemoveAttribute;
    formtarget?: string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    list?: string | RemoveAttribute;
    max?: number | string | RemoveAttribute;
    maxlength?: number | string | RemoveAttribute;
    min?: number | string | RemoveAttribute;
    minlength?: number | string | RemoveAttribute;
    multiple?: BooleanAttribute | RemoveAttribute;
    name?: string | RemoveAttribute;
    pattern?: string | RemoveAttribute;
    placeholder?: string | RemoveAttribute;
    popovertarget?: string | RemoveAttribute;
    popovertargetaction?: "hide" | "show" | "toggle" | RemoveAttribute;
    readonly?: BooleanAttribute | RemoveAttribute;
    required?: BooleanAttribute | RemoveAttribute;
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/search#results
    results?: number | RemoveAttribute;
    size?: number | string | RemoveAttribute;
    src?: string | RemoveAttribute;
    step?: number | string | RemoveAttribute;
    type?:
      | "button"
      | "checkbox"
      | "color"
      | "date"
      | "datetime-local"
      | "email"
      | "file"
      | "hidden"
      | "image"
      | "month"
      | "number"
      | "password"
      | "radio"
      | "range"
      | "reset"
      | "search"
      | "submit"
      | "tel"
      | "text"
      | "time"
      | "url"
      | "week"
      | (string & {})
      | RemoveAttribute;
    value?: string | string[] | number | RemoveAttribute;
    width?: number | string | RemoveAttribute;

    /** @non-standard */
    incremental?: BooleanAttribute | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    crossOrigin?: HTMLCrossorigin | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    formAction?: string | SerializableAttributeValue | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    formEnctype?: HTMLFormEncType | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    formMethod?: HTMLFormMethod | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    formNoValidate?: boolean | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    formTarget?: string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    maxLength?: number | string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    minLength?: number | string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    readOnly?: boolean | RemoveAttribute;

    /** @deprecated */
    align?: string | RemoveAttribute;
    /** @deprecated */
    usemap?: string | RemoveAttribute;
  }
  interface ModHTMLAttributes<T> extends HTMLAttributes<T> {
    cite?: string | RemoveAttribute;
    datetime?: string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    dateTime?: string | RemoveAttribute;
  }
  interface KeygenHTMLAttributes<T> extends HTMLAttributes<T> {
    /** @deprecated */
    autofocus?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    challenge?: string | RemoveAttribute;
    /** @deprecated */
    disabled?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    form?: string | RemoveAttribute;
    /** @deprecated */
    keyparams?: string | RemoveAttribute;
    /** @deprecated */
    keytype?: string | RemoveAttribute;
    /** @deprecated */
    name?: string | RemoveAttribute;
  }
  interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
    for?: string | RemoveAttribute;
    form?: string | RemoveAttribute;
  }
  interface LiHTMLAttributes<T> extends HTMLAttributes<T> {
    value?: number | string | RemoveAttribute;

    /** @deprecated */
    type?: "1" | "a" | "A" | "i" | "I" | RemoveAttribute;
  }
  interface LinkHTMLAttributes<T> extends HTMLAttributes<T> {
    as?: HTMLLinkAs | RemoveAttribute;
    blocking?: "render" | RemoveAttribute;
    crossorigin?: HTMLCrossorigin | RemoveAttribute;
    disabled?: BooleanAttribute | RemoveAttribute;
    fetchpriority?: "high" | "low" | "auto" | RemoveAttribute;
    href?: string | RemoveAttribute;
    hreflang?: string | RemoveAttribute;
    imagesizes?: string | RemoveAttribute;
    imagesrcset?: string | RemoveAttribute;
    integrity?: string | RemoveAttribute;
    media?: string | RemoveAttribute;
    referrerpolicy?: HTMLReferrerPolicy | RemoveAttribute;
    rel?: string | RemoveAttribute;
    sizes?: string | RemoveAttribute;
    type?: string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    crossOrigin?: HTMLCrossorigin | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    referrerPolicy?: HTMLReferrerPolicy | RemoveAttribute;

    /** @deprecated */
    charset?: string | RemoveAttribute;
    /** @deprecated */
    rev?: string | RemoveAttribute;
    /** @deprecated */
    target?: string | RemoveAttribute;
  }
  interface MapHTMLAttributes<T> extends HTMLAttributes<T> {
    name?: string | RemoveAttribute;
  }
  interface MediaHTMLAttributes<T> extends HTMLAttributes<T> {
    autoplay?: BooleanAttribute | RemoveAttribute;
    controls?: BooleanAttribute | RemoveAttribute;
    controlslist?:
      | "nodownload"
      | "nofullscreen"
      | "noplaybackrate"
      | "noremoteplayback"
      | (string & {})
      | RemoveAttribute;
    crossorigin?: HTMLCrossorigin | RemoveAttribute;
    disableremoteplayback?: BooleanAttribute | RemoveAttribute;
    loop?: BooleanAttribute | RemoveAttribute;
    muted?: BooleanAttribute | RemoveAttribute;
    preload?: "none" | "metadata" | "auto" | EnumeratedAcceptsEmpty | RemoveAttribute;
    src?: string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    crossOrigin?: HTMLCrossorigin | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    mediaGroup?: string | RemoveAttribute;
    /** @deprecated */
    mediagroup?: string | RemoveAttribute;
  }
  interface MenuHTMLAttributes<T> extends HTMLAttributes<T> {
    /** @deprecated */
    compact?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    label?: string | RemoveAttribute;
    /** @deprecated */
    type?: "context" | "toolbar" | RemoveAttribute;
  }
  interface MetaHTMLAttributes<T> extends HTMLAttributes<T> {
    charset?: string | RemoveAttribute;
    content?: string | RemoveAttribute;
    "http-equiv"?:
      | "content-security-policy"
      | "content-type"
      | "default-style"
      | "x-ua-compatible"
      | "refresh"
      | RemoveAttribute;
    name?: string | RemoveAttribute;
    media?: string | RemoveAttribute;

    /** @deprecated */
    scheme?: string | RemoveAttribute;
  }
  interface MeterHTMLAttributes<T> extends HTMLAttributes<T> {
    form?: string | RemoveAttribute;
    high?: number | string | RemoveAttribute;
    low?: number | string | RemoveAttribute;
    max?: number | string | RemoveAttribute;
    min?: number | string | RemoveAttribute;
    optimum?: number | string | RemoveAttribute;
    value?: string | string[] | number | RemoveAttribute;
  }
  interface QuoteHTMLAttributes<T> extends HTMLAttributes<T> {
    cite?: string | RemoveAttribute;
  }
  interface ObjectHTMLAttributes<T> extends HTMLAttributes<T> {
    data?: string | RemoveAttribute;
    form?: string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    name?: string | RemoveAttribute;
    type?: string | RemoveAttribute;
    width?: number | string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    useMap?: string | RemoveAttribute;

    /** @deprecated */
    align?: string | RemoveAttribute;
    /** @deprecated */
    archive?: string | RemoveAttribute;
    /** @deprecated */
    border?: string | RemoveAttribute;
    /** @deprecated */
    classid?: string | RemoveAttribute;
    /** @deprecated */
    code?: string | RemoveAttribute;
    /** @deprecated */
    codebase?: string | RemoveAttribute;
    /** @deprecated */
    codetype?: string | RemoveAttribute;
    /** @deprecated */
    declare?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    hspace?: number | string | RemoveAttribute;
    /** @deprecated */
    standby?: string | RemoveAttribute;
    /** @deprecated */
    usemap?: string | RemoveAttribute;
    /** @deprecated */
    vspace?: number | string | RemoveAttribute;
    /** @deprecated */
    typemustmatch?: BooleanAttribute | RemoveAttribute;
  }
  interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
    reversed?: BooleanAttribute | RemoveAttribute;
    start?: number | string | RemoveAttribute;
    type?: "1" | "a" | "A" | "i" | "I" | RemoveAttribute;

    /**
     * @deprecated
     * @non-standard
     */
    compact?: BooleanAttribute | RemoveAttribute;
  }
  interface OptgroupHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: BooleanAttribute | RemoveAttribute;
    label?: string | RemoveAttribute;
  }
  interface OptionHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: BooleanAttribute | RemoveAttribute;
    label?: string | RemoveAttribute;
    selected?: BooleanAttribute | RemoveAttribute;
    value?: string | string[] | number | RemoveAttribute;
  }
  interface OutputHTMLAttributes<T> extends HTMLAttributes<T> {
    form?: string | RemoveAttribute;
    for?: string | RemoveAttribute;
    name?: string | RemoveAttribute;
  }
  interface ParamHTMLAttributes<T> extends HTMLAttributes<T> {
    /** @deprecated */
    name?: string | RemoveAttribute;
    /** @deprecated */
    type?: string | RemoveAttribute;
    /** @deprecated */
    value?: string | number | RemoveAttribute;
    /** @deprecated */
    valuetype?: "data" | "ref" | "object" | RemoveAttribute;
  }
  interface ProgressHTMLAttributes<T> extends HTMLAttributes<T> {
    max?: number | string | RemoveAttribute;
    value?: string | string[] | number | RemoveAttribute;
  }
  interface ScriptHTMLAttributes<T> extends HTMLAttributes<T> {
    async?: BooleanAttribute | RemoveAttribute;
    blocking?: "render" | RemoveAttribute;
    crossorigin?: HTMLCrossorigin | RemoveAttribute;
    defer?: BooleanAttribute | RemoveAttribute;
    fetchpriority?: "high" | "low" | "auto" | RemoveAttribute;
    integrity?: string | RemoveAttribute;
    nomodule?: BooleanAttribute | RemoveAttribute;
    nonce?: string | RemoveAttribute;
    referrerpolicy?: HTMLReferrerPolicy | RemoveAttribute;
    src?: string | RemoveAttribute;
    type?: "importmap" | "module" | "speculationrules" | (string & {}) | RemoveAttribute;

    /** @experimental */
    attributionsrc?: string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    crossOrigin?: HTMLCrossorigin | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    noModule?: boolean | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    referrerPolicy?: HTMLReferrerPolicy | RemoveAttribute;

    /** @deprecated */
    charset?: string | RemoveAttribute;
    /** @deprecated */
    event?: string | RemoveAttribute;
    /** @deprecated */
    language?: string | RemoveAttribute;
  }
  interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
    autocomplete?: string | RemoveAttribute;
    autofocus?: BooleanAttribute | RemoveAttribute;
    disabled?: BooleanAttribute | RemoveAttribute;
    form?: string | RemoveAttribute;
    multiple?: BooleanAttribute | RemoveAttribute;
    name?: string | RemoveAttribute;
    required?: BooleanAttribute | RemoveAttribute;
    size?: number | string | RemoveAttribute;
    value?: string | string[] | number | RemoveAttribute;
  }
  interface HTMLSlotElementAttributes<T> extends HTMLAttributes<T> {
    name?: string | RemoveAttribute;
  }
  interface SourceHTMLAttributes<T> extends HTMLAttributes<T> {
    media?: string | RemoveAttribute;
    sizes?: string | RemoveAttribute;
    src?: string | RemoveAttribute;
    srcset?: string | RemoveAttribute;
    type?: string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
  }
  interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
    blocking?: "render" | RemoveAttribute;
    media?: string | RemoveAttribute;
    nonce?: string | RemoveAttribute;

    /** @deprecated */
    scoped?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    type?: string | RemoveAttribute;
  }
  interface TdHTMLAttributes<T> extends HTMLAttributes<T> {
    colspan?: number | string | RemoveAttribute;
    headers?: string | RemoveAttribute;
    rowspan?: number | string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    colSpan?: number | string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    rowSpan?: number | string | RemoveAttribute;

    /** @deprecated */
    abbr?: string | RemoveAttribute;
    /** @deprecated */
    align?: "left" | "center" | "right" | "justify" | "char" | RemoveAttribute;
    /** @deprecated */
    axis?: string | RemoveAttribute;
    /** @deprecated */
    bgcolor?: string | RemoveAttribute;
    /** @deprecated */
    char?: string | RemoveAttribute;
    /** @deprecated */
    charoff?: string | RemoveAttribute;
    /** @deprecated */
    height?: number | string | RemoveAttribute;
    /** @deprecated */
    nowrap?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    scope?: "col" | "row" | "rowgroup" | "colgroup" | RemoveAttribute;
    /** @deprecated */
    valign?: "baseline" | "bottom" | "middle" | "top" | RemoveAttribute;
    /** @deprecated */
    width?: number | string | RemoveAttribute;
  }
  interface TemplateHTMLAttributes<T> extends HTMLAttributes<T> {
    shadowrootmode?: "open" | "closed" | RemoveAttribute;
    shadowrootclonable?: BooleanAttribute | RemoveAttribute;
    shadowrootdelegatesfocus?: BooleanAttribute | RemoveAttribute;

    /** @experimental */
    shadowrootserializable?: BooleanAttribute | RemoveAttribute;

    /** @deprecated */
    content?: DocumentFragment | RemoveAttribute;
  }
  interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
    autocomplete?:
      | "additional-name"
      | "address-level1"
      | "address-level2"
      | "address-level3"
      | "address-level4"
      | "address-line1"
      | "address-line2"
      | "address-line3"
      | "bday"
      | "bday-day"
      | "bday-month"
      | "bday-year"
      | "billing"
      | "cc-additional-name"
      | "cc-csc"
      | "cc-exp"
      | "cc-exp-month"
      | "cc-exp-year"
      | "cc-family-name"
      | "cc-given-name"
      | "cc-name"
      | "cc-number"
      | "cc-type"
      | "country"
      | "country-name"
      | "current-password"
      | "email"
      | "family-name"
      | "fax"
      | "given-name"
      | "home"
      | "honorific-prefix"
      | "honorific-suffix"
      | "impp"
      | "language"
      | "mobile"
      | "name"
      | "new-password"
      | "nickname"
      | "off"
      | "on"
      | "organization"
      | "organization-title"
      | "pager"
      | "photo"
      | "postal-code"
      | "sex"
      | "shipping"
      | "street-address"
      | "tel"
      | "tel-area-code"
      | "tel-country-code"
      | "tel-extension"
      | "tel-local"
      | "tel-local-prefix"
      | "tel-local-suffix"
      | "tel-national"
      | "transaction-amount"
      | "transaction-currency"
      | "url"
      | "username"
      | "work"
      | (string & {})
      | RemoveAttribute;
    autocorrect?: "on" | "off" | RemoveAttribute;
    autofocus?: BooleanAttribute | RemoveAttribute;
    cols?: number | string | RemoveAttribute;
    dirname?: string | RemoveAttribute;
    disabled?: BooleanAttribute | RemoveAttribute;
    enterkeyhint?:
      | "enter"
      | "done"
      | "go"
      | "next"
      | "previous"
      | "search"
      | "send"
      | RemoveAttribute;
    form?: string | RemoveAttribute;
    maxlength?: number | string | RemoveAttribute;
    minlength?: number | string | RemoveAttribute;
    name?: string | RemoveAttribute;
    placeholder?: string | RemoveAttribute;
    readonly?: BooleanAttribute | RemoveAttribute;
    required?: BooleanAttribute | RemoveAttribute;
    rows?: number | string | RemoveAttribute;
    value?: string | string[] | number | RemoveAttribute;
    wrap?: "hard" | "soft" | "off" | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    maxLength?: number | string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    minLength?: number | string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    readOnly?: boolean | RemoveAttribute;
  }
  interface ThHTMLAttributes<T> extends HTMLAttributes<T> {
    abbr?: string | RemoveAttribute;
    colspan?: number | string | RemoveAttribute;
    headers?: string | RemoveAttribute;
    rowspan?: number | string | RemoveAttribute;
    scope?: "col" | "row" | "rowgroup" | "colgroup" | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    colSpan?: number | string | RemoveAttribute;
    /** @deprecated Use lowercase attributes */
    rowSpan?: number | string | RemoveAttribute;

    /** @deprecated */
    align?: "left" | "center" | "right" | "justify" | "char" | RemoveAttribute;
    /** @deprecated */
    axis?: string | RemoveAttribute;
    /** @deprecated */
    bgcolor?: string | RemoveAttribute;
    /** @deprecated */
    char?: string | RemoveAttribute;
    /** @deprecated */
    charoff?: string | RemoveAttribute;
    /** @deprecated */
    height?: string | RemoveAttribute;
    /** @deprecated */
    nowrap?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    valign?: "baseline" | "bottom" | "middle" | "top" | RemoveAttribute;
    /** @deprecated */
    width?: number | string | RemoveAttribute;
  }
  interface TimeHTMLAttributes<T> extends HTMLAttributes<T> {
    datetime?: string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    dateTime?: string | RemoveAttribute;
  }
  interface TrackHTMLAttributes<T> extends HTMLAttributes<T> {
    default?: BooleanAttribute | RemoveAttribute;
    kind?: // MDN
    | "alternative"
      | "descriptions"
      | "main"
      | "main-desc"
      | "translation"
      | "commentary"
      // ??
      | "subtitles"
      | "captions"
      | "chapters"
      | "metadata"
      | RemoveAttribute;
    label?: string | RemoveAttribute;
    src?: string | RemoveAttribute;
    srclang?: string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    mediaGroup?: string | RemoveAttribute;
    /** @deprecated */
    mediagroup?: string | RemoveAttribute;
  }
  interface VideoHTMLAttributes<T> extends MediaHTMLAttributes<T> {
    height?: number | string | RemoveAttribute;
    playsinline?: BooleanAttribute | RemoveAttribute;
    poster?: string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    disablepictureinpicture?: BooleanAttribute | RemoveAttribute;
  }

  interface WebViewHTMLAttributes<T> extends HTMLAttributes<T> {
    allowpopups?: BooleanAttribute | RemoveAttribute;
    disableblinkfeatures?: string | RemoveAttribute;
    disablewebsecurity?: BooleanAttribute | RemoveAttribute;
    enableblinkfeatures?: string | RemoveAttribute;
    httpreferrer?: string | RemoveAttribute;
    nodeintegration?: BooleanAttribute | RemoveAttribute;
    nodeintegrationinsubframes?: BooleanAttribute | RemoveAttribute;
    partition?: string | RemoveAttribute;
    plugins?: BooleanAttribute | RemoveAttribute;
    preload?: string | RemoveAttribute;
    src?: string | RemoveAttribute;
    useragent?: string | RemoveAttribute;
    webpreferences?: string | RemoveAttribute;

    // does this exists?
    allowfullscreen?: BooleanAttribute | RemoveAttribute;
    autofocus?: BooleanAttribute | RemoveAttribute;
    autosize?: BooleanAttribute | RemoveAttribute;

    /** @deprecated */
    blinkfeatures?: string | RemoveAttribute;
    /** @deprecated */
    disableguestresize?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    guestinstance?: string | RemoveAttribute;
  }

  /** SVG Enumerated Attributes */
  type SVGPreserveAspectRatio =
    | "none"
    | "xMinYMin"
    | "xMidYMin"
    | "xMaxYMin"
    | "xMinYMid"
    | "xMidYMid"
    | "xMaxYMid"
    | "xMinYMax"
    | "xMidYMax"
    | "xMaxYMax"
    | "xMinYMin meet"
    | "xMidYMin meet"
    | "xMaxYMin meet"
    | "xMinYMid meet"
    | "xMidYMid meet"
    | "xMaxYMid meet"
    | "xMinYMax meet"
    | "xMidYMax meet"
    | "xMaxYMax meet"
    | "xMinYMin slice"
    | "xMidYMin slice"
    | "xMaxYMin slice"
    | "xMinYMid slice"
    | "xMidYMid slice"
    | "xMaxYMid slice"
    | "xMinYMax slice"
    | "xMidYMax slice"
    | "xMaxYMax slice";
  type ImagePreserveAspectRatio =
    | SVGPreserveAspectRatio
    | "defer none"
    | "defer xMinYMin"
    | "defer xMidYMin"
    | "defer xMaxYMin"
    | "defer xMinYMid"
    | "defer xMidYMid"
    | "defer xMaxYMid"
    | "defer xMinYMax"
    | "defer xMidYMax"
    | "defer xMaxYMax"
    | "defer xMinYMin meet"
    | "defer xMidYMin meet"
    | "defer xMaxYMin meet"
    | "defer xMinYMid meet"
    | "defer xMidYMid meet"
    | "defer xMaxYMid meet"
    | "defer xMinYMax meet"
    | "defer xMidYMax meet"
    | "defer xMaxYMax meet"
    | "defer xMinYMin slice"
    | "defer xMidYMin slice"
    | "defer xMaxYMin slice"
    | "defer xMinYMid slice"
    | "defer xMidYMid slice"
    | "defer xMaxYMid slice"
    | "defer xMinYMax slice"
    | "defer xMidYMax slice"
    | "defer xMaxYMax slice";
  type SVGUnits = "userSpaceOnUse" | "objectBoundingBox";

  interface CoreSVGAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    id?: string | RemoveAttribute;
    lang?: string | RemoveAttribute;
    tabindex?: number | string | RemoveAttribute;

    /** @deprecated Use lowercase attributes */
    tabIndex?: number | string | RemoveAttribute;
  }
  interface StylableSVGAttributes {
    class?: string | ClassList | RemoveAttribute;
    style?: CSSProperties | string | RemoveAttribute;
  }
  interface TransformableSVGAttributes {
    transform?: string | RemoveAttribute;
  }
  interface ConditionalProcessingSVGAttributes {
    requiredExtensions?: string | RemoveAttribute;
    requiredFeatures?: string | RemoveAttribute;
    systemLanguage?: string | RemoveAttribute;
  }
  interface ExternalResourceSVGAttributes {
    externalResourcesRequired?: EnumeratedPseudoBoolean | RemoveAttribute;
  }
  interface AnimationTimingSVGAttributes {
    begin?: string | RemoveAttribute;
    dur?: string | RemoveAttribute;
    end?: string | RemoveAttribute;
    min?: string | RemoveAttribute;
    max?: string | RemoveAttribute;
    restart?: "always" | "whenNotActive" | "never" | RemoveAttribute;
    repeatCount?: number | "indefinite" | RemoveAttribute;
    repeatDur?: string | RemoveAttribute;
    fill?: "freeze" | "remove" | RemoveAttribute;
  }
  interface AnimationValueSVGAttributes {
    calcMode?: "discrete" | "linear" | "paced" | "spline" | RemoveAttribute;
    values?: string | RemoveAttribute;
    keyTimes?: string | RemoveAttribute;
    keySplines?: string | RemoveAttribute;
    from?: number | string | RemoveAttribute;
    to?: number | string | RemoveAttribute;
    by?: number | string | RemoveAttribute;
  }
  interface AnimationAdditionSVGAttributes {
    attributeName?: string | RemoveAttribute;
    additive?: "replace" | "sum" | RemoveAttribute;
    accumulate?: "none" | "sum" | RemoveAttribute;
  }
  interface AnimationAttributeTargetSVGAttributes {
    attributeName?: string | RemoveAttribute;
    attributeType?: "CSS" | "XML" | "auto" | RemoveAttribute;
  }
  interface PresentationSVGAttributes {
    "alignment-baseline"?:
      | "auto"
      | "baseline"
      | "before-edge"
      | "text-before-edge"
      | "middle"
      | "central"
      | "after-edge"
      | "text-after-edge"
      | "ideographic"
      | "alphabetic"
      | "hanging"
      | "mathematical"
      | "inherit"
      | RemoveAttribute;
    "baseline-shift"?: number | string | RemoveAttribute;
    clip?: string | RemoveAttribute;
    "clip-path"?: string | RemoveAttribute;
    "clip-rule"?: "nonzero" | "evenodd" | "inherit" | RemoveAttribute;
    color?: string | RemoveAttribute;
    "color-interpolation"?: "auto" | "sRGB" | "linearRGB" | "inherit" | RemoveAttribute;
    "color-interpolation-filters"?: "auto" | "sRGB" | "linearRGB" | "inherit" | RemoveAttribute;
    "color-profile"?: string | RemoveAttribute;
    "color-rendering"?: "auto" | "optimizeSpeed" | "optimizeQuality" | "inherit" | RemoveAttribute;
    cursor?: string | RemoveAttribute;
    direction?: "ltr" | "rtl" | "inherit" | RemoveAttribute;
    display?: string | RemoveAttribute;
    "dominant-baseline"?:
      | "auto"
      | "text-bottom"
      | "alphabetic"
      | "ideographic"
      | "middle"
      | "central"
      | "mathematical"
      | "hanging"
      | "text-top"
      | "inherit"
      | RemoveAttribute;
    "enable-background"?: string | RemoveAttribute;
    fill?: string | RemoveAttribute;
    "fill-opacity"?: number | string | "inherit" | RemoveAttribute;
    "fill-rule"?: "nonzero" | "evenodd" | "inherit" | RemoveAttribute;
    filter?: string | RemoveAttribute;
    "flood-color"?: string | RemoveAttribute;
    "flood-opacity"?: number | string | "inherit" | RemoveAttribute;
    "font-family"?: string | RemoveAttribute;
    "font-size"?: string | RemoveAttribute;
    "font-size-adjust"?: number | string | RemoveAttribute;
    "font-stretch"?: string | RemoveAttribute;
    "font-style"?: "normal" | "italic" | "oblique" | "inherit" | RemoveAttribute;
    "font-variant"?: string | RemoveAttribute;
    "font-weight"?: number | string | RemoveAttribute;
    "glyph-orientation-horizontal"?: string | RemoveAttribute;
    "glyph-orientation-vertical"?: string | RemoveAttribute;
    "image-rendering"?: "auto" | "optimizeQuality" | "optimizeSpeed" | "inherit" | RemoveAttribute;
    kerning?: string | RemoveAttribute;
    "letter-spacing"?: number | string | RemoveAttribute;
    "lighting-color"?: string | RemoveAttribute;
    "marker-end"?: string | RemoveAttribute;
    "marker-mid"?: string | RemoveAttribute;
    "marker-start"?: string | RemoveAttribute;
    mask?: string | RemoveAttribute;
    opacity?: number | string | "inherit" | RemoveAttribute;
    overflow?: "visible" | "hidden" | "scroll" | "auto" | "inherit" | RemoveAttribute;
    pathLength?: string | number | RemoveAttribute;
    "pointer-events"?:
      | "bounding-box"
      | "visiblePainted"
      | "visibleFill"
      | "visibleStroke"
      | "visible"
      | "painted"
      | "color"
      | "fill"
      | "stroke"
      | "all"
      | "none"
      | "inherit"
      | RemoveAttribute;
    "shape-rendering"?:
      | "auto"
      | "optimizeSpeed"
      | "crispEdges"
      | "geometricPrecision"
      | "inherit"
      | RemoveAttribute;
    "stop-color"?: string | RemoveAttribute;
    "stop-opacity"?: number | string | "inherit" | RemoveAttribute;
    stroke?: string | RemoveAttribute;
    "stroke-dasharray"?: string | RemoveAttribute;
    "stroke-dashoffset"?: number | string | RemoveAttribute;
    "stroke-linecap"?: "butt" | "round" | "square" | "inherit" | RemoveAttribute;
    "stroke-linejoin"?:
      | "arcs"
      | "bevel"
      | "miter"
      | "miter-clip"
      | "round"
      | "inherit"
      | RemoveAttribute;
    "stroke-miterlimit"?: number | string | "inherit" | RemoveAttribute;
    "stroke-opacity"?: number | string | "inherit" | RemoveAttribute;
    "stroke-width"?: number | string | RemoveAttribute;
    "text-anchor"?: "start" | "middle" | "end" | "inherit" | RemoveAttribute;
    "text-decoration"?:
      | "none"
      | "underline"
      | "overline"
      | "line-through"
      | "blink"
      | "inherit"
      | RemoveAttribute;
    "text-rendering"?:
      | "auto"
      | "optimizeSpeed"
      | "optimizeLegibility"
      | "geometricPrecision"
      | "inherit"
      | RemoveAttribute;
    "unicode-bidi"?: string | RemoveAttribute;
    visibility?: "visible" | "hidden" | "collapse" | "inherit" | RemoveAttribute;
    "word-spacing"?: number | string | RemoveAttribute;
    "writing-mode"?: "lr-tb" | "rl-tb" | "tb-rl" | "lr" | "rl" | "tb" | "inherit" | RemoveAttribute;
  }
  interface AnimationElementSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      ConditionalProcessingSVGAttributes {}
  interface ContainerElementSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      Pick<
        PresentationSVGAttributes,
        | "clip-path"
        | "mask"
        | "cursor"
        | "opacity"
        | "filter"
        | "enable-background"
        | "color-interpolation"
        | "color-rendering"
      > {}
  interface FilterPrimitiveElementSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      Pick<PresentationSVGAttributes, "color-interpolation-filters"> {
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    result?: string | RemoveAttribute;
  }
  interface SingleInputFilterSVGAttributes {
    in?: string | RemoveAttribute;
  }
  interface DoubleInputFilterSVGAttributes {
    in?: string | RemoveAttribute;
    in2?: string | RemoveAttribute;
  }
  interface FitToViewBoxSVGAttributes {
    viewBox?: string | RemoveAttribute;
    preserveAspectRatio?: SVGPreserveAspectRatio | RemoveAttribute;
  }
  interface GradientElementSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    gradientUnits?: SVGUnits | RemoveAttribute;
    gradientTransform?: string | RemoveAttribute;
    spreadMethod?: "pad" | "reflect" | "repeat" | RemoveAttribute;
    href?: string | RemoveAttribute;
  }
  interface GraphicsElementSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      Pick<
        PresentationSVGAttributes,
        | "clip-rule"
        | "mask"
        | "pointer-events"
        | "cursor"
        | "opacity"
        | "filter"
        | "display"
        | "visibility"
        | "color-interpolation"
        | "color-rendering"
      > {}
  interface LightSourceElementSVGAttributes<T> extends CoreSVGAttributes<T> {}
  interface NewViewportSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      Pick<PresentationSVGAttributes, "overflow" | "clip"> {
    viewBox?: string | RemoveAttribute;
  }
  interface ShapeElementSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      Pick<
        PresentationSVGAttributes,
        | "color"
        | "fill"
        | "fill-rule"
        | "fill-opacity"
        | "stroke"
        | "stroke-width"
        | "stroke-linecap"
        | "stroke-linejoin"
        | "stroke-miterlimit"
        | "stroke-dasharray"
        | "stroke-dashoffset"
        | "stroke-opacity"
        | "shape-rendering"
        | "pathLength"
      > {}
  interface TextContentElementSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      Pick<
        PresentationSVGAttributes,
        | "font-family"
        | "font-style"
        | "font-variant"
        | "font-weight"
        | "font-stretch"
        | "font-size"
        | "font-size-adjust"
        | "kerning"
        | "letter-spacing"
        | "word-spacing"
        | "text-decoration"
        | "glyph-orientation-horizontal"
        | "glyph-orientation-vertical"
        | "direction"
        | "unicode-bidi"
        | "text-anchor"
        | "dominant-baseline"
        | "color"
        | "fill"
        | "fill-rule"
        | "fill-opacity"
        | "stroke"
        | "stroke-width"
        | "stroke-linecap"
        | "stroke-linejoin"
        | "stroke-miterlimit"
        | "stroke-dasharray"
        | "stroke-dashoffset"
        | "stroke-opacity"
      > {}
  interface ZoomAndPanSVGAttributes {
    /**
     * @deprecated
     * @non-standard
     */
    zoomAndPan?: "disable" | "magnify" | RemoveAttribute;
  }
  interface AnimateSVGAttributes<T>
    extends AnimationElementSVGAttributes<T>,
      AnimationAttributeTargetSVGAttributes,
      AnimationTimingSVGAttributes,
      AnimationValueSVGAttributes,
      AnimationAdditionSVGAttributes,
      Pick<PresentationSVGAttributes, "color-interpolation" | "color-rendering"> {}
  interface AnimateMotionSVGAttributes<T>
    extends AnimationElementSVGAttributes<T>,
      AnimationTimingSVGAttributes,
      AnimationValueSVGAttributes,
      AnimationAdditionSVGAttributes {
    path?: string | RemoveAttribute;
    keyPoints?: string | RemoveAttribute;
    rotate?: number | string | "auto" | "auto-reverse" | RemoveAttribute;
    origin?: "default" | RemoveAttribute;
  }
  interface AnimateTransformSVGAttributes<T>
    extends AnimationElementSVGAttributes<T>,
      AnimationAttributeTargetSVGAttributes,
      AnimationTimingSVGAttributes,
      AnimationValueSVGAttributes,
      AnimationAdditionSVGAttributes {
    type?: "translate" | "scale" | "rotate" | "skewX" | "skewY" | RemoveAttribute;
  }
  interface CircleSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes {
    cx?: number | string | RemoveAttribute;
    cy?: number | string | RemoveAttribute;
    r?: number | string | RemoveAttribute;
  }
  interface ClipPathSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path"> {
    clipPathUnits?: SVGUnits | RemoveAttribute;
  }
  interface DefsSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes {}
  interface DescSVGAttributes<T> extends CoreSVGAttributes<T>, StylableSVGAttributes {}
  interface EllipseSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes {
    cx?: number | string | RemoveAttribute;
    cy?: number | string | RemoveAttribute;
    rx?: number | string | RemoveAttribute;
    ry?: number | string | RemoveAttribute;
  }
  interface FeBlendSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      DoubleInputFilterSVGAttributes,
      StylableSVGAttributes {
    mode?: "normal" | "multiply" | "screen" | "darken" | "lighten" | RemoveAttribute;
  }
  interface FeColorMatrixSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    type?: "matrix" | "saturate" | "hueRotate" | "luminanceToAlpha" | RemoveAttribute;
    values?: string | RemoveAttribute;
  }
  interface FeComponentTransferSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {}
  interface FeCompositeSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      DoubleInputFilterSVGAttributes,
      StylableSVGAttributes {
    operator?: "over" | "in" | "out" | "atop" | "xor" | "arithmetic" | RemoveAttribute;
    k1?: number | string | RemoveAttribute;
    k2?: number | string | RemoveAttribute;
    k3?: number | string | RemoveAttribute;
    k4?: number | string | RemoveAttribute;
  }
  interface FeConvolveMatrixSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    order?: number | string | RemoveAttribute;
    kernelMatrix?: string | RemoveAttribute;
    divisor?: number | string | RemoveAttribute;
    bias?: number | string | RemoveAttribute;
    targetX?: number | string | RemoveAttribute;
    targetY?: number | string | RemoveAttribute;
    edgeMode?: "duplicate" | "wrap" | "none" | RemoveAttribute;
    kernelUnitLength?: number | string | RemoveAttribute;
    preserveAlpha?: EnumeratedPseudoBoolean | RemoveAttribute;
  }
  interface FeDiffuseLightingSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "lighting-color"> {
    surfaceScale?: number | string | RemoveAttribute;
    diffuseConstant?: number | string | RemoveAttribute;
    kernelUnitLength?: number | string | RemoveAttribute;
  }
  interface FeDisplacementMapSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      DoubleInputFilterSVGAttributes,
      StylableSVGAttributes {
    scale?: number | string | RemoveAttribute;
    xChannelSelector?: "R" | "G" | "B" | "A" | RemoveAttribute;
    yChannelSelector?: "R" | "G" | "B" | "A" | RemoveAttribute;
  }
  interface FeDistantLightSVGAttributes<T> extends LightSourceElementSVGAttributes<T> {
    azimuth?: number | string | RemoveAttribute;
    elevation?: number | string | RemoveAttribute;
  }
  interface FeDropShadowSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      FilterPrimitiveElementSVGAttributes<T>,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "flood-color" | "flood-opacity"> {
    dx?: number | string | RemoveAttribute;
    dy?: number | string | RemoveAttribute;
    stdDeviation?: number | string | RemoveAttribute;
  }
  interface FeFloodSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "flood-color" | "flood-opacity"> {}
  interface FeFuncSVGAttributes<T> extends CoreSVGAttributes<T> {
    type?: "identity" | "table" | "discrete" | "linear" | "gamma" | RemoveAttribute;
    tableValues?: string | RemoveAttribute;
    slope?: number | string | RemoveAttribute;
    intercept?: number | string | RemoveAttribute;
    amplitude?: number | string | RemoveAttribute;
    exponent?: number | string | RemoveAttribute;
    offset?: number | string | RemoveAttribute;
  }
  interface FeGaussianBlurSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    stdDeviation?: number | string | RemoveAttribute;
  }
  interface FeImageSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    preserveAspectRatio?: SVGPreserveAspectRatio | RemoveAttribute;
    href?: string | RemoveAttribute;
  }
  interface FeMergeSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      StylableSVGAttributes {}
  interface FeMergeNodeSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      SingleInputFilterSVGAttributes {}
  interface FeMorphologySVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    operator?: "erode" | "dilate" | RemoveAttribute;
    radius?: number | string | RemoveAttribute;
  }
  interface FeOffsetSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    dx?: number | string | RemoveAttribute;
    dy?: number | string | RemoveAttribute;
  }
  interface FePointLightSVGAttributes<T> extends LightSourceElementSVGAttributes<T> {
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    z?: number | string | RemoveAttribute;
  }
  interface FeSpecularLightingSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "lighting-color"> {
    surfaceScale?: string | RemoveAttribute;
    specularConstant?: string | RemoveAttribute;
    specularExponent?: string | RemoveAttribute;
    kernelUnitLength?: number | string | RemoveAttribute;
  }
  interface FeSpotLightSVGAttributes<T> extends LightSourceElementSVGAttributes<T> {
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    z?: number | string | RemoveAttribute;
    pointsAtX?: number | string | RemoveAttribute;
    pointsAtY?: number | string | RemoveAttribute;
    pointsAtZ?: number | string | RemoveAttribute;
    specularExponent?: number | string | RemoveAttribute;
    limitingConeAngle?: number | string | RemoveAttribute;
  }
  interface FeTileSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {}
  interface FeTurbulanceSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      StylableSVGAttributes {
    baseFrequency?: number | string | RemoveAttribute;
    numOctaves?: number | string | RemoveAttribute;
    seed?: number | string | RemoveAttribute;
    stitchTiles?: "stitch" | "noStitch" | RemoveAttribute;
    type?: "fractalNoise" | "turbulence" | RemoveAttribute;
  }
  interface FilterSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    filterUnits?: SVGUnits | RemoveAttribute;
    primitiveUnits?: SVGUnits | RemoveAttribute;
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    filterRes?: number | string | RemoveAttribute;
  }
  interface ForeignObjectSVGAttributes<T>
    extends NewViewportSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "display" | "visibility"> {
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
  }
  interface GSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "display" | "visibility"> {}
  interface ImageSVGAttributes<T>
    extends NewViewportSVGAttributes<T>,
      GraphicsElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "color-profile" | "image-rendering"> {
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    preserveAspectRatio?: ImagePreserveAspectRatio | RemoveAttribute;
    href?: string | RemoveAttribute;
  }
  interface LineSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "marker-start" | "marker-mid" | "marker-end"> {
    x1?: number | string | RemoveAttribute;
    y1?: number | string | RemoveAttribute;
    x2?: number | string | RemoveAttribute;
    y2?: number | string | RemoveAttribute;
  }
  interface LinearGradientSVGAttributes<T> extends GradientElementSVGAttributes<T> {
    x1?: number | string | RemoveAttribute;
    x2?: number | string | RemoveAttribute;
    y1?: number | string | RemoveAttribute;
    y2?: number | string | RemoveAttribute;
  }
  interface MarkerSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      FitToViewBoxSVGAttributes,
      Pick<PresentationSVGAttributes, "overflow" | "clip"> {
    markerUnits?: "strokeWidth" | "userSpaceOnUse" | RemoveAttribute;
    refX?: number | string | RemoveAttribute;
    refY?: number | string | RemoveAttribute;
    markerWidth?: number | string | RemoveAttribute;
    markerHeight?: number | string | RemoveAttribute;
    orient?: string | RemoveAttribute;
  }
  interface MaskSVGAttributes<T>
    extends Omit<ContainerElementSVGAttributes<T>, "opacity" | "filter">,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    maskUnits?: SVGUnits | RemoveAttribute;
    maskContentUnits?: SVGUnits | RemoveAttribute;
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
  }
  interface MetadataSVGAttributes<T> extends CoreSVGAttributes<T> {}
  interface MPathSVGAttributes<T> extends CoreSVGAttributes<T> {}
  interface PathSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "marker-start" | "marker-mid" | "marker-end"> {
    d?: string | RemoveAttribute;
    pathLength?: number | string | RemoveAttribute;
  }
  interface PatternSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      FitToViewBoxSVGAttributes,
      Pick<PresentationSVGAttributes, "overflow" | "clip"> {
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    patternUnits?: SVGUnits | RemoveAttribute;
    patternContentUnits?: SVGUnits | RemoveAttribute;
    patternTransform?: string | RemoveAttribute;
    href?: string | RemoveAttribute;
  }
  interface PolygonSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "marker-start" | "marker-mid" | "marker-end"> {
    points?: string | RemoveAttribute;
  }
  interface PolylineSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "marker-start" | "marker-mid" | "marker-end"> {
    points?: string | RemoveAttribute;
  }
  interface RadialGradientSVGAttributes<T> extends GradientElementSVGAttributes<T> {
    cx?: number | string | RemoveAttribute;
    cy?: number | string | RemoveAttribute;
    r?: number | string | RemoveAttribute;
    fx?: number | string | RemoveAttribute;
    fy?: number | string | RemoveAttribute;
  }
  interface RectSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes {
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    rx?: number | string | RemoveAttribute;
    ry?: number | string | RemoveAttribute;
  }
  interface SetSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      StylableSVGAttributes,
      AnimationTimingSVGAttributes {}
  interface StopSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "stop-color" | "stop-opacity"> {
    offset?: number | string | RemoveAttribute;
  }
  interface SvgSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      NewViewportSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      FitToViewBoxSVGAttributes,
      ZoomAndPanSVGAttributes,
      PresentationSVGAttributes {
    "xmlns:xlink"?: string | RemoveAttribute;
    contentScriptType?: string | RemoveAttribute;
    contentStyleType?: string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    x?: number | string | RemoveAttribute;
    xmlns?: string | RemoveAttribute;
    y?: number | string | RemoveAttribute;

    /** @deprecated */
    baseProfile?: string | RemoveAttribute;
    /** @deprecated */
    version?: string | RemoveAttribute;
  }
  interface SwitchSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "display" | "visibility"> {}
  interface SymbolSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      NewViewportSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      FitToViewBoxSVGAttributes {
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    preserveAspectRatio?: SVGPreserveAspectRatio | RemoveAttribute;
    refX?: number | string | RemoveAttribute;
    refY?: number | string | RemoveAttribute;
    viewBox?: string | RemoveAttribute;
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
  }
  interface TextSVGAttributes<T>
    extends TextContentElementSVGAttributes<T>,
      GraphicsElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "writing-mode" | "text-rendering"> {
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    dx?: number | string | RemoveAttribute;
    dy?: number | string | RemoveAttribute;
    rotate?: number | string | RemoveAttribute;
    textLength?: number | string | RemoveAttribute;
    lengthAdjust?: "spacing" | "spacingAndGlyphs" | RemoveAttribute;
  }
  interface TextPathSVGAttributes<T>
    extends TextContentElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      Pick<
        PresentationSVGAttributes,
        "alignment-baseline" | "baseline-shift" | "display" | "visibility"
      > {
    startOffset?: number | string | RemoveAttribute;
    method?: "align" | "stretch" | RemoveAttribute;
    spacing?: "auto" | "exact" | RemoveAttribute;
    href?: string | RemoveAttribute;
  }
  interface TSpanSVGAttributes<T>
    extends TextContentElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      Pick<
        PresentationSVGAttributes,
        "alignment-baseline" | "baseline-shift" | "display" | "visibility"
      > {
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    dx?: number | string | RemoveAttribute;
    dy?: number | string | RemoveAttribute;
    rotate?: number | string | RemoveAttribute;
    textLength?: number | string | RemoveAttribute;
    lengthAdjust?: "spacing" | "spacingAndGlyphs" | RemoveAttribute;
  }
  /** @see https://developer.mozilla.org/en-US/docs/Web/SVG/Element/use */
  interface UseSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      StylableSVGAttributes,
      ConditionalProcessingSVGAttributes,
      GraphicsElementSVGAttributes<T>,
      PresentationSVGAttributes,
      ExternalResourceSVGAttributes,
      TransformableSVGAttributes {
    x?: number | string | RemoveAttribute;
    y?: number | string | RemoveAttribute;
    width?: number | string | RemoveAttribute;
    height?: number | string | RemoveAttribute;
    href?: string | RemoveAttribute;
  }
  interface ViewSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      FitToViewBoxSVGAttributes,
      ZoomAndPanSVGAttributes {
    viewTarget?: string | RemoveAttribute;
  }

  interface MathMLAttributes<T> extends HTMLAttributes<T> {
    displaystyle?: BooleanAttribute | RemoveAttribute;
    /** @deprecated */
    href?: string | RemoveAttribute;
    /** @deprecated */
    mathbackground?: string | RemoveAttribute;
    /** @deprecated */
    mathcolor?: string | RemoveAttribute;
    /** @deprecated */
    mathsize?: string | RemoveAttribute;
    nonce?: string | RemoveAttribute;
    scriptlevel?: string | RemoveAttribute;
  }

  interface MathMLAnnotationElementAttributes<T> extends MathMLAttributes<T> {
    encoding?: string | RemoveAttribute;

    /** @deprecated */
    src?: string | RemoveAttribute;
  }
  interface MathMLAnnotationXmlElementAttributes<T> extends MathMLAttributes<T> {
    encoding?: string | RemoveAttribute;

    /** @deprecated */
    src?: string | RemoveAttribute;
  }
  interface MathMLMactionElementAttributes<T> extends MathMLAttributes<T> {
    /**
     * @deprecated
     * @non-standard
     */
    actiontype?: "statusline" | "toggle" | RemoveAttribute;
    /**
     * @deprecated
     * @non-standard
     */
    selection?: string | RemoveAttribute;
  }
  interface MathMLMathElementAttributes<T> extends MathMLAttributes<T> {
    display?: "block" | "inline" | RemoveAttribute;
  }
  interface MathMLMerrorElementAttributes<T> extends MathMLAttributes<T> {}
  interface MathMLMfracElementAttributes<T> extends MathMLAttributes<T> {
    linethickness?: string | RemoveAttribute;

    /**
     * @deprecated
     * @non-standard
     */
    denomalign?: "center" | "left" | "right" | RemoveAttribute;
    /**
     * @deprecated
     * @non-standard
     */
    numalign?: "center" | "left" | "right" | RemoveAttribute;
  }
  interface MathMLMiElementAttributes<T> extends MathMLAttributes<T> {
    mathvariant?: "normal" | RemoveAttribute;
  }

  interface MathMLMmultiscriptsElementAttributes<T> extends MathMLAttributes<T> {
    /**
     * @deprecated
     * @non-standard
     */
    subscriptshift?: string | RemoveAttribute;
    /**
     * @deprecated
     * @non-standard
     */
    superscriptshift?: string | RemoveAttribute;
  }
  interface MathMLMnElementAttributes<T> extends MathMLAttributes<T> {}
  interface MathMLMoElementAttributes<T> extends MathMLAttributes<T> {
    fence?: BooleanAttribute | RemoveAttribute;
    form?: "prefix" | "infix" | "postfix" | RemoveAttribute;
    largeop?: BooleanAttribute | RemoveAttribute;
    lspace?: string | RemoveAttribute;
    maxsize?: string | RemoveAttribute;
    minsize?: string | RemoveAttribute;
    movablelimits?: BooleanAttribute | RemoveAttribute;
    rspace?: string | RemoveAttribute;
    separator?: BooleanAttribute | RemoveAttribute;
    stretchy?: BooleanAttribute | RemoveAttribute;
    symmetric?: BooleanAttribute | RemoveAttribute;

    /** @non-standard */
    accent?: BooleanAttribute | RemoveAttribute;
  }
  interface MathMLMoverElementAttributes<T> extends MathMLAttributes<T> {
    accent?: BooleanAttribute | RemoveAttribute;
  }
  interface MathMLMpaddedElementAttributes<T> extends MathMLAttributes<T> {
    depth?: string | RemoveAttribute;
    height?: string | RemoveAttribute;
    lspace?: string | RemoveAttribute;
    voffset?: string | RemoveAttribute;
    width?: string | RemoveAttribute;
  }
  interface MathMLMphantomElementAttributes<T> extends MathMLAttributes<T> {}
  interface MathMLMprescriptsElementAttributes<T> extends MathMLAttributes<T> {}
  interface MathMLMrootElementAttributes<T> extends MathMLAttributes<T> {}
  interface MathMLMrowElementAttributes<T> extends MathMLAttributes<T> {}
  interface MathMLMsElementAttributes<T> extends MathMLAttributes<T> {
    /** @deprecated */
    lquote?: string | RemoveAttribute;
    /** @deprecated */
    rquote?: string | RemoveAttribute;
  }
  interface MathMLMspaceElementAttributes<T> extends MathMLAttributes<T> {
    depth?: string | RemoveAttribute;
    height?: string | RemoveAttribute;
    width?: string | RemoveAttribute;
  }
  interface MathMLMsqrtElementAttributes<T> extends MathMLAttributes<T> {}
  interface MathMLMstyleElementAttributes<T> extends MathMLAttributes<T> {
    /**
     * @deprecated
     * @non-standard
     */
    background?: string | RemoveAttribute;
    /**
     * @deprecated
     * @non-standard
     */
    color?: string | RemoveAttribute;
    /**
     * @deprecated
     * @non-standard
     */
    fontsize?: string | RemoveAttribute;
    /**
     * @deprecated
     * @non-standard
     */
    fontstyle?: string | RemoveAttribute;
    /**
     * @deprecated
     * @non-standard
     */
    fontweight?: string | RemoveAttribute;

    /** @deprecated */
    scriptminsize?: string | RemoveAttribute;
    /** @deprecated */
    scriptsizemultiplier?: string | RemoveAttribute;
  }
  interface MathMLMsubElementAttributes<T> extends MathMLAttributes<T> {
    /**
     * @deprecated
     * @non-standard
     */
    subscriptshift?: string | RemoveAttribute;
  }
  interface MathMLMsubsupElementAttributes<T> extends MathMLAttributes<T> {
    /**
     * @deprecated
     * @non-standard
     */
    subscriptshift?: string | RemoveAttribute;
    /**
     * @deprecated
     * @non-standard
     */
    superscriptshift?: string | RemoveAttribute;
  }
  interface MathMLMsupElementAttributes<T> extends MathMLAttributes<T> {
    /**
     * @deprecated
     * @non-standard
     */
    superscriptshift?: string | RemoveAttribute;
  }
  interface MathMLMtableElementAttributes<T> extends MathMLAttributes<T> {
    /** @non-standard */
    align?: "axis" | "baseline" | "bottom" | "center" | "top" | RemoveAttribute;
    /** @non-standard */
    columnalign?: "center" | "left" | "right" | RemoveAttribute;
    /** @non-standard */
    columnlines?: "dashed" | "none" | "solid" | RemoveAttribute;
    /** @non-standard */
    columnspacing?: string | RemoveAttribute;
    /** @non-standard */
    frame?: "dashed" | "none" | "solid" | RemoveAttribute;
    /** @non-standard */
    framespacing?: string | RemoveAttribute;
    /** @non-standard */
    rowalign?: "axis" | "baseline" | "bottom" | "center" | "top" | RemoveAttribute;
    /** @non-standard */
    rowlines?: "dashed" | "none" | "solid" | RemoveAttribute;
    /** @non-standard */
    rowspacing?: string | RemoveAttribute;
    /** @non-standard */
    width?: string | RemoveAttribute;
  }
  interface MathMLMtdElementAttributes<T> extends MathMLAttributes<T> {
    columnspan?: number | string | RemoveAttribute;
    rowspan?: number | string | RemoveAttribute;
    /** @non-standard */
    columnalign?: "center" | "left" | "right" | RemoveAttribute;
    /** @non-standard */
    rowalign?: "axis" | "baseline" | "bottom" | "center" | "top" | RemoveAttribute;
  }
  interface MathMLMtextElementAttributes<T> extends MathMLAttributes<T> {}
  interface MathMLMtrElementAttributes<T> extends MathMLAttributes<T> {
    /** @non-standard */
    columnalign?: "center" | "left" | "right" | RemoveAttribute;
    /** @non-standard */
    rowalign?: "axis" | "baseline" | "bottom" | "center" | "top" | RemoveAttribute;
  }
  interface MathMLMunderElementAttributes<T> extends MathMLAttributes<T> {
    accentunder?: BooleanAttribute | RemoveAttribute;
  }
  interface MathMLMunderoverElementAttributes<T> extends MathMLAttributes<T> {
    accent?: BooleanAttribute | RemoveAttribute;
    accentunder?: BooleanAttribute | RemoveAttribute;
  }
  interface MathMLSemanticsElementAttributes<T> extends MathMLAttributes<T> {}

  /* MathMLDeprecatedElements */

  interface MathMLMencloseElementAttributes<T> extends MathMLAttributes<T> {
    /** @non-standard */
    notation?: string | RemoveAttribute;
  }
  interface MathMLMfencedElementAttributes<T> extends MathMLAttributes<T> {
    close?: string | RemoveAttribute;
    open?: string | RemoveAttribute;
    separators?: string | RemoveAttribute;
  }

  /** @type {HTMLElementTagNameMap} */
  interface HTMLElementTags {
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement
     */
    a: AnchorHTMLAttributes<HTMLAnchorElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/abbr
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    abbr: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/address
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    address: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/area
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLAreaElement
     */
    area: AreaHTMLAttributes<HTMLAreaElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    article: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/aside
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    aside: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement
     */
    audio: AudioHTMLAttributes<HTMLAudioElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/b
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    b: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLBaseElement
     */
    base: BaseHTMLAttributes<HTMLBaseElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdi
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    bdi: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdo
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    bdo: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLQuoteElement
     */
    blockquote: BlockquoteHTMLAttributes<HTMLQuoteElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLBodyElement
     */
    body: HTMLAttributes<HTMLBodyElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/br
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLBRElement
     */
    br: HTMLAttributes<HTMLBRElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLButtonElement
     */
    button: ButtonHTMLAttributes<HTMLButtonElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement
     */
    canvas: CanvasHTMLAttributes<HTMLCanvasElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableCaptionElement
     */
    caption: HTMLAttributes<HTMLTableCaptionElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/cite
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    cite: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/code
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    code: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/col
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableColElement
     */
    col: ColHTMLAttributes<HTMLTableColElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/colgroup
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableColElement
     */
    colgroup: ColgroupHTMLAttributes<HTMLTableColElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/data
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataElement
     */
    data: DataHTMLAttributes<HTMLDataElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLDataListElement
     */
    datalist: HTMLAttributes<HTMLDataListElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dd
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    dd: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLModElement
     */
    del: ModHTMLAttributes<HTMLModElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement
     */
    details: DetailsHtmlAttributes<HTMLDetailsElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dfn
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    dfn: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement
     */
    dialog: DialogHtmlAttributes<HTMLDialogElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLDivElement
     */
    div: HTMLAttributes<HTMLDivElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLDListElement
     */
    dl: HTMLAttributes<HTMLDListElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    dt: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/em
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    em: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLEmbedElement
     */
    embed: EmbedHTMLAttributes<HTMLEmbedElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLFieldSetElement
     */
    fieldset: FieldsetHTMLAttributes<HTMLFieldSetElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    figcaption: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    figure: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/footer
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    footer: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement
     */
    form: FormHTMLAttributes<HTMLFormElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h1
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLHeadingElement
     */
    h1: HTMLAttributes<HTMLHeadingElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h2
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLHeadingElement
     */
    h2: HTMLAttributes<HTMLHeadingElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h3
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLHeadingElement
     */
    h3: HTMLAttributes<HTMLHeadingElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h4
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLHeadingElement
     */
    h4: HTMLAttributes<HTMLHeadingElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h5
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLHeadingElement
     */
    h5: HTMLAttributes<HTMLHeadingElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/h6
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLHeadingElement
     */
    h6: HTMLAttributes<HTMLHeadingElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/head
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLHeadElement
     */
    head: HTMLAttributes<HTMLHeadElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/header
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    header: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hgroup
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    hgroup: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLHRElement
     */
    hr: HTMLAttributes<HTMLHRElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLHtmlElement
     */
    html: HTMLAttributes<HTMLHtmlElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/i
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    i: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement
     */
    iframe: IframeHTMLAttributes<HTMLIFrameElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement
     */
    img: ImgHTMLAttributes<HTMLImageElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement
     */
    input: InputHTMLAttributes<HTMLInputElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLModElement
     */
    ins: ModHTMLAttributes<HTMLModElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    kbd: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLLabelElement
     */
    label: LabelHTMLAttributes<HTMLLabelElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/legend
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLLegendElement
     */
    legend: HTMLAttributes<HTMLLegendElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLLIElement
     */
    li: LiHTMLAttributes<HTMLLIElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLLinkElement
     */
    link: LinkHTMLAttributes<HTMLLinkElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/main
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    main: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/map
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLMapElement
     */
    map: MapHTMLAttributes<HTMLMapElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    mark: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/menu
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLMenuElement
     */
    menu: MenuHTMLAttributes<HTMLMenuElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLMetaElement
     */
    meta: MetaHTMLAttributes<HTMLMetaElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meter
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLMeterElement
     */
    meter: MeterHTMLAttributes<HTMLMeterElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/nav
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    nav: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    noscript: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLObjectElement
     */
    object: ObjectHTMLAttributes<HTMLObjectElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLOListElement
     */
    ol: OlHTMLAttributes<HTMLOListElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/optgroup
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptGroupElement
     */
    optgroup: OptgroupHTMLAttributes<HTMLOptGroupElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/option
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLOptionElement
     */
    option: OptionHTMLAttributes<HTMLOptionElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLOutputElement
     */
    output: OutputHTMLAttributes<HTMLOutputElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLParagraphElement
     */
    p: HTMLAttributes<HTMLParagraphElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLPictureElement
     */
    picture: HTMLAttributes<HTMLPictureElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLPreElement
     */
    pre: HTMLAttributes<HTMLPreElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLProgressElement
     */
    progress: ProgressHTMLAttributes<HTMLProgressElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/q
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLQuoteElement
     */
    q: QuoteHTMLAttributes<HTMLQuoteElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rp
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    rp: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rt
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    rt: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ruby
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    ruby: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/s
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    s: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/samp
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    samp: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLScriptElement
     */
    script: ScriptHTMLAttributes<HTMLScriptElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/search
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    search: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/section
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    section: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement
     */
    select: SelectHTMLAttributes<HTMLSelectElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLSlotElement
     */
    slot: HTMLSlotElementAttributes<HTMLSlotElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/small
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    small: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLSourceElement
     */
    source: SourceHTMLAttributes<HTMLSourceElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLSpanElement
     */
    span: HTMLAttributes<HTMLSpanElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strong
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    strong: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLStyleElement
     */
    style: StyleHTMLAttributes<HTMLStyleElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sub
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    sub: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    summary: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sup
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    sup: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableElement
     */
    table: HTMLAttributes<HTMLTableElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tbody
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableSectionElement
     */
    tbody: HTMLAttributes<HTMLTableSectionElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableCellElement
     */
    td: TdHTMLAttributes<HTMLTableCellElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement
     */
    template: TemplateHTMLAttributes<HTMLTemplateElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement
     */
    textarea: TextareaHTMLAttributes<HTMLTextAreaElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableSectionElement
     */
    tfoot: HTMLAttributes<HTMLTableSectionElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableCellElement
     */
    th: ThHTMLAttributes<HTMLTableCellElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableSectionElement
     */
    thead: HTMLAttributes<HTMLTableSectionElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTimeElement
     */
    time: TimeHTMLAttributes<HTMLTimeElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTitleElement
     */
    title: HTMLAttributes<HTMLTitleElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tr
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableRowElement
     */
    tr: HTMLAttributes<HTMLTableRowElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLTrackElement
     */
    track: TrackHTMLAttributes<HTMLTrackElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/u
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    u: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLUListElement
     */
    ul: HTMLAttributes<HTMLUListElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/var
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    var: HTMLAttributes<HTMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement
     */
    video: VideoHTMLAttributes<HTMLVideoElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/wbr
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    wbr: HTMLAttributes<HTMLElement>;
    /** @url https://www.electronjs.org/docs/latest/api/webview-tag */
    webview: WebViewHTMLAttributes<HTMLElement>;
  }
  /** @type {HTMLElementDeprecatedTagNameMap} */
  interface HTMLElementDeprecatedTags {
    /**
     * @deprecated
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/big
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
     */
    big: HTMLAttributes<HTMLElement>;
    /**
     * @deprecated
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/keygen
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLUnknownElement
     */
    keygen: KeygenHTMLAttributes<HTMLUnknownElement>;
    /**
     * @deprecated
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/menuitem
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLUnknownElement
     */
    menuitem: HTMLAttributes<HTMLUnknownElement>;
    /**
     * @deprecated
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/xxxxx
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLUnknownElement
     */
    noindex: HTMLAttributes<HTMLUnknownElement>;
    /**
     * @deprecated
     * @url https://developer.mozilla.org/en-US/docs/Web/HTML/Element/param
     * @url https://developer.mozilla.org/en-US/docs/Web/API/HTMLParamElement
     */
    param: ParamHTMLAttributes<HTMLParamElement>;
  }
  /** @type {SVGElementTagNameMap} */
  interface SVGElementTags {
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/animate
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGAnimateElement
     */
    animate: AnimateSVGAttributes<SVGAnimateElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/animateMotion
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGAnimateMotionElement
     */
    animateMotion: AnimateMotionSVGAttributes<SVGAnimateMotionElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/animateTransform
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGAnimateTransformElement
     */
    animateTransform: AnimateTransformSVGAttributes<SVGAnimateTransformElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/circle
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGCircleElement
     */
    circle: CircleSVGAttributes<SVGCircleElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/clipPath
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGClipPathElement
     */
    clipPath: ClipPathSVGAttributes<SVGClipPathElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/defs
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGDefsElement
     */
    defs: DefsSVGAttributes<SVGDefsElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/desc
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGDescElement
     */
    desc: DescSVGAttributes<SVGDescElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/ellipse
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGEllipseElement
     */
    ellipse: EllipseSVGAttributes<SVGEllipseElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feBlend
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEBlendElement
     */
    feBlend: FeBlendSVGAttributes<SVGFEBlendElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feColorMatrix
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEColorMatrixElement
     */
    feColorMatrix: FeColorMatrixSVGAttributes<SVGFEColorMatrixElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feComponentTransfer
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEComponentTransferElemen
     */
    feComponentTransfer: FeComponentTransferSVGAttributes<SVGFEComponentTransferElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feComposite
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFECompositeElement
     */
    feComposite: FeCompositeSVGAttributes<SVGFECompositeElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feConvolveMatrix
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEConvolveMatrixElement
     */
    feConvolveMatrix: FeConvolveMatrixSVGAttributes<SVGFEConvolveMatrixElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feDiffuseLighting
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEDiffuseLightingElement
     */
    feDiffuseLighting: FeDiffuseLightingSVGAttributes<SVGFEDiffuseLightingElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feDisplacementMap
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEDisplacementMapElement
     */
    feDisplacementMap: FeDisplacementMapSVGAttributes<SVGFEDisplacementMapElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feDistantLight
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEDistantLightElement
     */
    feDistantLight: FeDistantLightSVGAttributes<SVGFEDistantLightElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feDropShadow
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEDropShadowElement
     */
    feDropShadow: FeDropShadowSVGAttributes<SVGFEDropShadowElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feFlood
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEFloodElement
     */
    feFlood: FeFloodSVGAttributes<SVGFEFloodElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feFuncA
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEFuncAElement
     */
    feFuncA: FeFuncSVGAttributes<SVGFEFuncAElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feFuncB
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEFuncBElement
     */
    feFuncB: FeFuncSVGAttributes<SVGFEFuncBElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feFuncG
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEFuncGElement
     */
    feFuncG: FeFuncSVGAttributes<SVGFEFuncGElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feFuncR
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEFuncRElement
     */
    feFuncR: FeFuncSVGAttributes<SVGFEFuncRElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feGaussianBlur
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEGaussianBlurElement
     */
    feGaussianBlur: FeGaussianBlurSVGAttributes<SVGFEGaussianBlurElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feImage
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEImageElement
     */
    feImage: FeImageSVGAttributes<SVGFEImageElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feMerge
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEMergeElement
     */
    feMerge: FeMergeSVGAttributes<SVGFEMergeElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feMergeNode
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEMergeNodeElement
     */
    feMergeNode: FeMergeNodeSVGAttributes<SVGFEMergeNodeElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feMorphology
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEMorphologyElement
     */
    feMorphology: FeMorphologySVGAttributes<SVGFEMorphologyElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feOffset
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEOffsetElement
     */
    feOffset: FeOffsetSVGAttributes<SVGFEOffsetElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/fePointLight
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFEPointLightElement
     */
    fePointLight: FePointLightSVGAttributes<SVGFEPointLightElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feSpecularLighting
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFESpecularLightingElement
     */
    feSpecularLighting: FeSpecularLightingSVGAttributes<SVGFESpecularLightingElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feSpotLight
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFESpotLightElement
     */
    feSpotLight: FeSpotLightSVGAttributes<SVGFESpotLightElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTile
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFETileElement
     */
    feTile: FeTileSVGAttributes<SVGFETileElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feTurbulence
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFETurbulenceElement
     */
    feTurbulence: FeTurbulanceSVGAttributes<SVGFETurbulenceElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/filter
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGFilterElement
     */
    filter: FilterSVGAttributes<SVGFilterElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGForeignObjectElement
     */
    foreignObject: ForeignObjectSVGAttributes<SVGForeignObjectElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/g
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGGElement
     */
    g: GSVGAttributes<SVGGElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/image
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGImageElement
     */
    image: ImageSVGAttributes<SVGImageElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGLineElement
     */
    line: LineSVGAttributes<SVGLineElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/linearGradient
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGLinearGradientElement
     */
    linearGradient: LinearGradientSVGAttributes<SVGLinearGradientElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGMarkerElement
     */
    marker: MarkerSVGAttributes<SVGMarkerElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/mask
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGMaskElement
     */
    mask: MaskSVGAttributes<SVGMaskElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/metadata
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGMetadataElement
     */
    metadata: MetadataSVGAttributes<SVGMetadataElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/mpath
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGMPathElement
     */
    mpath: MPathSVGAttributes<SVGMPathElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGPathElement
     */
    path: PathSVGAttributes<SVGPathElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/pattern
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGPatternElement
     */
    pattern: PatternSVGAttributes<SVGPatternElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/polygon
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGPolygonElement
     */
    polygon: PolygonSVGAttributes<SVGPolygonElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/polyline
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGPolylineElement
     */
    polyline: PolylineSVGAttributes<SVGPolylineElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/radialGradient
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGRadialGradientElement
     */
    radialGradient: RadialGradientSVGAttributes<SVGRadialGradientElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/rect
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGRectElement
     */
    rect: RectSVGAttributes<SVGRectElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/set
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGSetElement
     */
    set: SetSVGAttributes<SVGSetElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/stop
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGStopElement
     */
    stop: StopSVGAttributes<SVGStopElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/svg
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGSVGElement
     */
    svg: SvgSVGAttributes<SVGSVGElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/switch
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGSwitchElement
     */
    switch: SwitchSVGAttributes<SVGSwitchElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/symbol
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGSymbolElement
     */
    symbol: SymbolSVGAttributes<SVGSymbolElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGTextElement
     */
    text: TextSVGAttributes<SVGTextElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/textPath
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGTextPathElement
     */
    textPath: TextPathSVGAttributes<SVGTextPathElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/tspan
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGTSpanElement
     */
    tspan: TSpanSVGAttributes<SVGTSpanElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/use
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGUseElement
     */
    use: UseSVGAttributes<SVGUseElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/SVG/Element/view
     * @url https://developer.mozilla.org/en-US/docs/Web/API/SVGViewElement
     */
    view: ViewSVGAttributes<SVGViewElement>;
  }

  interface MathMLElementTags {
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/annotation
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    annotation: MathMLAnnotationElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/annotation-xml
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    "annotation-xml": MathMLAnnotationXmlElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/math
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    math: MathMLMathElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/merror
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    merror: MathMLMerrorElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mfrac
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mfrac: MathMLMfracElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mi
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mi: MathMLMiElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mmultiscripts
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mmultiscripts: MathMLMmultiscriptsElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mn
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mn: MathMLMnElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mo
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mo: MathMLMoElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mover
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mover: MathMLMoverElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mpadded
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mpadded: MathMLMpaddedElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mphantom
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mphantom: MathMLMphantomElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mprescripts
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mprescripts: MathMLMprescriptsElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mroot
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mroot: MathMLMrootElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mrow
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mrow: MathMLMrowElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/ms
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    ms: MathMLMsElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mspace
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mspace: MathMLMspaceElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/msqrt
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    msqrt: MathMLMsqrtElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mstyle
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mstyle: MathMLMstyleElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/msub
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    msub: MathMLMsubElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/msubsup
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    msubsup: MathMLMsubsupElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/msup
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    msup: MathMLMsupElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mtable
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mtable: MathMLMtableElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mtd
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mtd: MathMLMtdElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mtext
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mtext: MathMLMtextElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mtr
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mtr: MathMLMtrElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/munder
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    munder: MathMLMunderElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/munderover
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    munderover: MathMLMunderoverElementAttributes<MathMLElement>;
    /**
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/semantics
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    semantics: MathMLSemanticsElementAttributes<MathMLElement>;
    /**
     * @non-standard
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/menclose
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    menclose: MathMLMencloseElementAttributes<MathMLElement>;
    /**
     * @deprecated
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/maction
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    maction: MathMLMactionElementAttributes<MathMLElement>;
    /**
     * @deprecated
     * @non-standard
     * @url https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mfenced
     * @url https://developer.mozilla.org/en-US/docs/Web/API/MathMLElement
     */
    mfenced: MathMLMfencedElementAttributes<MathMLElement>;
  }

  interface IntrinsicElements
    extends HTMLElementTags,
      HTMLElementDeprecatedTags,
      SVGElementTags,
      MathMLElementTags {}
}
