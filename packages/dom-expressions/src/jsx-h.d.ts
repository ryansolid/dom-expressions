import * as csstype from "csstype";

/**
 * Based on JSX types for Surplus and Inferno and adapted for `dom-expressions`.
 *
 * https://github.com/adamhaile/surplus/blob/master/index.d.ts
 * https://github.com/infernojs/inferno/blob/master/packages/inferno/src/core/types.ts
 */
type DOMElement = Element;

export namespace JSX {
  // START - difference between `jsx.d.ts` and `jsx-h.d.ts`
  type FunctionMaybe<T = unknown> = { (): T } | T;
  type Element =
    | Node
    | ArrayElement
    | FunctionElement
    | (string & {})
    | number
    | boolean
    | null
    | undefined;
  // END - difference between `jsx.d.ts` and `jsx-h.d.ts`

  interface ArrayElement extends Array<Element> {}
  interface FunctionElement {
    (): Element;
  }
  interface ElementClass {
    // empty, libs can define requirements downstream
  }
  interface ElementAttributesProperty {
    // empty, libs can define requirements downstream
  }
  interface ElementChildrenAttribute {
    children: {};
  }

  // Event handlers

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
  // end event handlers

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
    classList?:
      | {
          [k: string]: boolean | undefined;
        }
      | undefined;
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
  /** @deprecated Replaced by CustomEvents */
  interface CustomCaptureEvents {}
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
  type OnCaptureAttributes<T> = {
    [Key in keyof CustomCaptureEvents as `oncapture:${Key}`]?: EventHandler<
      T,
      CustomCaptureEvents[Key]
    >;
  };

  // events
  interface ElementEventMap<T> {
    onFullscreenChange?: EventHandlerUnion<T, Event> | undefined;
    onFullscreenError?: EventHandlerUnion<T, Event> | undefined;

    "on:fullscreenchange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:fullscreenerror"?: EventHandlerWithOptionsUnion<T, Event> | undefined;

    onfullscreenchange?: EventHandlerUnion<T, Event> | undefined;
    onfullscreenerror?: EventHandlerUnion<T, Event> | undefined;
  }
  interface WindowEventMap<T> {
    onAfterPrint?: EventHandlerUnion<T, Event> | undefined;
    onBeforePrint?: EventHandlerUnion<T, Event> | undefined;
    onBeforeUnload?: EventHandlerUnion<T, BeforeUnloadEvent> | undefined;
    onGamepadConnected?: EventHandlerUnion<T, GamepadEvent> | undefined;
    onGamepadDisconnected?: EventHandlerUnion<T, GamepadEvent> | undefined;
    onHashchange?: EventHandlerUnion<T, HashChangeEvent> | undefined;
    onLanguageChange?: EventHandlerUnion<T, Event> | undefined;
    onMessage?: EventHandlerUnion<T, MessageEvent> | undefined;
    onMessageError?: EventHandlerUnion<T, MessageEvent> | undefined;
    onOffline?: EventHandlerUnion<T, Event> | undefined;
    onOnline?: EventHandlerUnion<T, Event> | undefined;
    onPageHide?: EventHandlerUnion<T, PageTransitionEvent> | undefined;
    // TODO `PageRevealEvent` is currently undefined on TS
    onPageReveal?: EventHandlerUnion<T, Event> | undefined;
    onPageShow?: EventHandlerUnion<T, PageTransitionEvent> | undefined;
    // TODO `PageSwapEvent` is currently undefined on TS
    onPageSwap?: EventHandlerUnion<T, Event> | undefined;
    onPopstate?: EventHandlerUnion<T, PopStateEvent> | undefined;
    onRejectionHandled?: EventHandlerUnion<T, PromiseRejectionEvent> | undefined;
    onStorage?: EventHandlerUnion<T, StorageEvent> | undefined;
    onUnhandledRejection?: EventHandlerUnion<T, PromiseRejectionEvent> | undefined;
    onUnload?: EventHandlerUnion<T, Event> | undefined;

    onafterprint?: EventHandlerUnion<T, Event> | undefined;
    onbeforeprint?: EventHandlerUnion<T, Event> | undefined;
    onbeforeunload?: EventHandlerUnion<T, BeforeUnloadEvent> | undefined;
    ongamepadconnected?: EventHandlerUnion<T, GamepadEvent> | undefined;
    ongamepaddisconnected?: EventHandlerUnion<T, GamepadEvent> | undefined;
    onhashchange?: EventHandlerUnion<T, HashChangeEvent> | undefined;
    onlanguagechange?: EventHandlerUnion<T, Event> | undefined;
    onmessage?: EventHandlerUnion<T, MessageEvent> | undefined;
    onmessageerror?: EventHandlerUnion<T, MessageEvent> | undefined;
    onoffline?: EventHandlerUnion<T, Event> | undefined;
    ononline?: EventHandlerUnion<T, Event> | undefined;
    onpagehide?: EventHandlerUnion<T, PageTransitionEvent> | undefined;
    // TODO `PageRevealEvent` is currently undefined in TS
    onpagereveal?: EventHandlerUnion<T, Event> | undefined;
    onpageshow?: EventHandlerUnion<T, PageTransitionEvent> | undefined;
    // TODO `PageSwapEvent` is currently undefined in TS
    onpageswap?: EventHandlerUnion<T, Event> | undefined;
    onpopstate?: EventHandlerUnion<T, PopStateEvent> | undefined;
    onrejectionhandled?: EventHandlerUnion<T, PromiseRejectionEvent> | undefined;
    onstorage?: EventHandlerUnion<T, StorageEvent> | undefined;
    onunhandledrejection?: EventHandlerUnion<T, PromiseRejectionEvent> | undefined;
    onunload?: EventHandlerUnion<T, Event> | undefined;

    "on:afterprint"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:beforeprint"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:beforeunload"?: EventHandlerWithOptionsUnion<T, BeforeUnloadEvent> | undefined;
    "on:gamepadconnected"?: EventHandlerWithOptionsUnion<T, GamepadEvent> | undefined;
    "on:gamepaddisconnected"?: EventHandlerWithOptionsUnion<T, GamepadEvent> | undefined;
    "on:hashchange"?: EventHandlerWithOptionsUnion<T, HashChangeEvent> | undefined;
    "on:languagechange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:message"?: EventHandlerWithOptionsUnion<T, MessageEvent> | undefined;
    "on:messageerror"?: EventHandlerWithOptionsUnion<T, MessageEvent> | undefined;
    "on:offline"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:online"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:pagehide"?: EventHandlerWithOptionsUnion<T, PageTransitionEvent> | undefined;
    // TODO `PageRevealEvent` is currently undefined in TS
    "on:pagereveal"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:pageshow"?: EventHandlerWithOptionsUnion<T, PageTransitionEvent> | undefined;
    // TODO `PageSwapEvent` is currently undefined in TS
    "on:pageswap"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:popstate"?: EventHandlerWithOptionsUnion<T, PopStateEvent> | undefined;
    "on:rejectionhandled"?: EventHandlerWithOptionsUnion<T, PromiseRejectionEvent> | undefined;
    "on:storage"?: EventHandlerWithOptionsUnion<T, StorageEvent> | undefined;
    "on:unhandledrejection"?: EventHandlerWithOptionsUnion<T, PromiseRejectionEvent> | undefined;
    "on:unload"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
  }

  interface CustomEventHandlersCamelCase<T> {
    onAbort?: EventHandlerUnion<T, UIEvent> | undefined;
    onAnimationCancel?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onAnimationEnd?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onAnimationIteration?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onAnimationStart?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onAuxClick?: EventHandlerUnion<T, PointerEvent> | undefined;
    onBeforeInput?: InputEventHandlerUnion<T, InputEvent> | undefined;
    onBeforeToggle?: EventHandlerUnion<T, ToggleEvent> | undefined;
    onBlur?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    onCancel?: EventHandlerUnion<T, Event> | undefined;
    onCanPlay?: EventHandlerUnion<T, Event> | undefined;
    onCanPlayThrough?: EventHandlerUnion<T, Event> | undefined;
    onChange?: ChangeEventHandlerUnion<T, Event> | undefined;
    onClick?: EventHandlerUnion<T, MouseEvent> | undefined;
    // TODO `CommandEvent` is currently undefined in TS
    onCommand?: EventHandlerUnion<T, Event> | undefined;
    onCompositionEnd?: EventHandlerUnion<T, CompositionEvent> | undefined;
    onCompositionStart?: EventHandlerUnion<T, CompositionEvent> | undefined;
    onCompositionUpdate?: EventHandlerUnion<T, CompositionEvent> | undefined;
    onContextMenu?: EventHandlerUnion<T, PointerEvent> | undefined;
    onCopy?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    onCueChange?: EventHandlerUnion<T, Event> | undefined;
    onCut?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    onDblClick?: EventHandlerUnion<T, MouseEvent> | undefined;
    onDrag?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragEnd?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragEnter?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragExit?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragLeave?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragOver?: EventHandlerUnion<T, DragEvent> | undefined;
    onDragStart?: EventHandlerUnion<T, DragEvent> | undefined;
    onDrop?: EventHandlerUnion<T, DragEvent> | undefined;
    onDurationChange?: EventHandlerUnion<T, Event> | undefined;
    onEmptied?: EventHandlerUnion<T, Event> | undefined;
    onEnded?: EventHandlerUnion<T, Event> | undefined;
    onError?: EventHandlerUnion<T, ErrorEvent> | undefined;
    onFocus?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    onFocusIn?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    onFocusOut?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
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
    onPaste?: EventHandlerUnion<T, ClipboardEvent> | undefined;
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
    onResize?: EventHandlerUnion<T, UIEvent> | undefined;
    onScroll?: EventHandlerUnion<T, Event> | undefined;
    onScrollEnd?: EventHandlerUnion<T, Event> | undefined;
    onSecurityPolicyViolation?: EventHandlerUnion<T, SecurityPolicyViolationEvent> | undefined;
    onSeeked?: EventHandlerUnion<T, Event> | undefined;
    onSeeking?: EventHandlerUnion<T, Event> | undefined;
    onSelect?: EventHandlerUnion<T, Event> | undefined;
    onSelectionChange?: EventHandlerUnion<T, Event> | undefined;
    onSlotChange?: EventHandlerUnion<T, Event> | undefined;
    onStalled?: EventHandlerUnion<T, Event> | undefined;
    onSubmit?: EventHandlerUnion<T, SubmitEvent> | undefined;
    onSuspend?: EventHandlerUnion<T, Event> | undefined;
    onTimeUpdate?: EventHandlerUnion<T, Event> | undefined;
    onToggle?: EventHandlerUnion<T, ToggleEvent> | undefined;
    onTouchCancel?: EventHandlerUnion<T, TouchEvent> | undefined;
    onTouchEnd?: EventHandlerUnion<T, TouchEvent> | undefined;
    onTouchMove?: EventHandlerUnion<T, TouchEvent> | undefined;
    onTouchStart?: EventHandlerUnion<T, TouchEvent> | undefined;
    onTransitionCancel?: EventHandlerUnion<T, TransitionEvent> | undefined;
    onTransitionEnd?: EventHandlerUnion<T, TransitionEvent> | undefined;
    onTransitionRun?: EventHandlerUnion<T, TransitionEvent> | undefined;
    onTransitionStart?: EventHandlerUnion<T, TransitionEvent> | undefined;
    onVolumeChange?: EventHandlerUnion<T, Event> | undefined;
    onWaiting?: EventHandlerUnion<T, Event> | undefined;
    onWheel?: EventHandlerUnion<T, WheelEvent> | undefined;
  }
  /** @type {GlobalEventHandlers} */
  interface CustomEventHandlersLowerCase<T> {
    onabort?: EventHandlerUnion<T, UIEvent> | undefined;
    onanimationcancel?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onanimationend?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onanimationiteration?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onanimationstart?: EventHandlerUnion<T, AnimationEvent> | undefined;
    onauxclick?: EventHandlerUnion<T, PointerEvent> | undefined;
    onbeforeinput?: InputEventHandlerUnion<T, InputEvent> | undefined;
    onbeforetoggle?: EventHandlerUnion<T, ToggleEvent> | undefined;
    onblur?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    oncancel?: EventHandlerUnion<T, Event> | undefined;
    oncanplay?: EventHandlerUnion<T, Event> | undefined;
    oncanplaythrough?: EventHandlerUnion<T, Event> | undefined;
    onchange?: ChangeEventHandlerUnion<T, Event> | undefined;
    onclick?: EventHandlerUnion<T, MouseEvent> | undefined;
    // TODO `CommandEvent` is currently undefined in TS
    oncommand?: EventHandlerUnion<T, Event> | undefined;
    oncompositionend?: EventHandlerUnion<T, CompositionEvent> | undefined;
    oncompositionstart?: EventHandlerUnion<T, CompositionEvent> | undefined;
    oncompositionupdate?: EventHandlerUnion<T, CompositionEvent> | undefined;
    oncontextmenu?: EventHandlerUnion<T, PointerEvent> | undefined;
    oncopy?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    oncuechange?: EventHandlerUnion<T, Event> | undefined;
    oncut?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    ondblclick?: EventHandlerUnion<T, MouseEvent> | undefined;
    ondrag?: EventHandlerUnion<T, DragEvent> | undefined;
    ondragend?: EventHandlerUnion<T, DragEvent> | undefined;
    ondragenter?: EventHandlerUnion<T, DragEvent> | undefined;
    ondragexit?: EventHandlerUnion<T, DragEvent> | undefined;
    ondragleave?: EventHandlerUnion<T, DragEvent> | undefined;
    ondragover?: EventHandlerUnion<T, DragEvent> | undefined;
    ondragstart?: EventHandlerUnion<T, DragEvent> | undefined;
    ondrop?: EventHandlerUnion<T, DragEvent> | undefined;
    ondurationchange?: EventHandlerUnion<T, Event> | undefined;
    onemptied?: EventHandlerUnion<T, Event> | undefined;
    onended?: EventHandlerUnion<T, Event> | undefined;
    onerror?: EventHandlerUnion<T, ErrorEvent> | undefined;
    onfocus?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    onfocusin?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    onfocusout?: FocusEventHandlerUnion<T, FocusEvent> | undefined;
    ongotpointercapture?: EventHandlerUnion<T, PointerEvent> | undefined;
    oninput?: InputEventHandlerUnion<T, InputEvent> | undefined;
    oninvalid?: EventHandlerUnion<T, Event> | undefined;
    onkeydown?: EventHandlerUnion<T, KeyboardEvent> | undefined;
    onkeypress?: EventHandlerUnion<T, KeyboardEvent> | undefined;
    onkeyup?: EventHandlerUnion<T, KeyboardEvent> | undefined;
    onload?: EventHandlerUnion<T, Event> | undefined;
    onloadeddata?: EventHandlerUnion<T, Event> | undefined;
    onloadedmetadata?: EventHandlerUnion<T, Event> | undefined;
    onloadstart?: EventHandlerUnion<T, Event> | undefined;
    onlostpointercapture?: EventHandlerUnion<T, PointerEvent> | undefined;
    onmousedown?: EventHandlerUnion<T, MouseEvent> | undefined;
    onmouseenter?: EventHandlerUnion<T, MouseEvent> | undefined;
    onmouseleave?: EventHandlerUnion<T, MouseEvent> | undefined;
    onmousemove?: EventHandlerUnion<T, MouseEvent> | undefined;
    onmouseout?: EventHandlerUnion<T, MouseEvent> | undefined;
    onmouseover?: EventHandlerUnion<T, MouseEvent> | undefined;
    onmouseup?: EventHandlerUnion<T, MouseEvent> | undefined;
    onpaste?: EventHandlerUnion<T, ClipboardEvent> | undefined;
    onpause?: EventHandlerUnion<T, Event> | undefined;
    onplay?: EventHandlerUnion<T, Event> | undefined;
    onplaying?: EventHandlerUnion<T, Event> | undefined;
    onpointercancel?: EventHandlerUnion<T, PointerEvent> | undefined;
    onpointerdown?: EventHandlerUnion<T, PointerEvent> | undefined;
    onpointerenter?: EventHandlerUnion<T, PointerEvent> | undefined;
    onpointerleave?: EventHandlerUnion<T, PointerEvent> | undefined;
    onpointermove?: EventHandlerUnion<T, PointerEvent> | undefined;
    onpointerout?: EventHandlerUnion<T, PointerEvent> | undefined;
    onpointerover?: EventHandlerUnion<T, PointerEvent> | undefined;
    onpointerup?: EventHandlerUnion<T, PointerEvent> | undefined;
    onprogress?: EventHandlerUnion<T, ProgressEvent> | undefined;
    onratechange?: EventHandlerUnion<T, Event> | undefined;
    onreset?: EventHandlerUnion<T, Event> | undefined;
    onresize?: EventHandlerUnion<T, UIEvent> | undefined;
    onscroll?: EventHandlerUnion<T, Event> | undefined;
    onscrollend?: EventHandlerUnion<T, Event> | undefined;
    onsecuritypolicyviolation?: EventHandlerUnion<T, SecurityPolicyViolationEvent> | undefined;
    onseeked?: EventHandlerUnion<T, Event> | undefined;
    onseeking?: EventHandlerUnion<T, Event> | undefined;
    onselect?: EventHandlerUnion<T, Event> | undefined;
    onselectionchange?: EventHandlerUnion<T, Event> | undefined;
    onslotchange?: EventHandlerUnion<T, Event> | undefined;
    onstalled?: EventHandlerUnion<T, Event> | undefined;
    onsubmit?: EventHandlerUnion<T, SubmitEvent> | undefined;
    onsuspend?: EventHandlerUnion<T, Event> | undefined;
    ontimeupdate?: EventHandlerUnion<T, Event> | undefined;
    ontoggle?: EventHandlerUnion<T, ToggleEvent> | undefined;
    ontouchcancel?: EventHandlerUnion<T, TouchEvent> | undefined;
    ontouchend?: EventHandlerUnion<T, TouchEvent> | undefined;
    ontouchmove?: EventHandlerUnion<T, TouchEvent> | undefined;
    ontouchstart?: EventHandlerUnion<T, TouchEvent> | undefined;
    ontransitioncancel?: EventHandlerUnion<T, TransitionEvent> | undefined;
    ontransitionend?: EventHandlerUnion<T, TransitionEvent> | undefined;
    ontransitionrun?: EventHandlerUnion<T, TransitionEvent> | undefined;
    ontransitionstart?: EventHandlerUnion<T, TransitionEvent> | undefined;
    onvolumechange?: EventHandlerUnion<T, Event> | undefined;
    onwaiting?: EventHandlerUnion<T, Event> | undefined;
    onwheel?: EventHandlerUnion<T, WheelEvent> | undefined;
  }

  interface CustomEventHandlersNamespaced<T> {
    "on:abort"?: EventHandlerWithOptionsUnion<T, UIEvent> | undefined;
    "on:animationcancel"?: EventHandlerWithOptionsUnion<T, AnimationEvent> | undefined;
    "on:animationend"?: EventHandlerWithOptionsUnion<T, AnimationEvent> | undefined;
    "on:animationiteration"?: EventHandlerWithOptionsUnion<T, AnimationEvent> | undefined;
    "on:animationstart"?: EventHandlerWithOptionsUnion<T, AnimationEvent> | undefined;
    "on:auxclick"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:beforeinput"?:
      | EventHandlerWithOptionsUnion<T, InputEvent, InputEventHandler<T, InputEvent>>
      | undefined;
    "on:beforetoggle"?: EventHandlerWithOptionsUnion<T, ToggleEvent> | undefined;
    "on:blur"?:
      | EventHandlerWithOptionsUnion<T, FocusEvent, FocusEventHandler<T, FocusEvent>>
      | undefined;
    "on:cancel"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:canplay"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:canplaythrough"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:change"?: EventHandlerWithOptionsUnion<T, Event, ChangeEventHandler<T, Event>> | undefined;
    "on:click"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    // TODO `CommandEvent` is currently undefined in TS
    "on:command"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:compositionend"?: EventHandlerWithOptionsUnion<T, CompositionEvent> | undefined;
    "on:compositionstart"?: EventHandlerWithOptionsUnion<T, CompositionEvent> | undefined;
    "on:compositionupdate"?: EventHandlerWithOptionsUnion<T, CompositionEvent> | undefined;
    "on:contextmenu"?: EventHandlerWithOptionsUnion<T, PointerEvent> | undefined;
    "on:copy"?: EventHandlerWithOptionsUnion<T, ClipboardEvent> | undefined;
    "on:cuechange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:cut"?: EventHandlerWithOptionsUnion<T, ClipboardEvent> | undefined;
    "on:dblclick"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:drag"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
    "on:dragend"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
    "on:dragenter"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
    "on:dragexit"?: EventHandlerWithOptionsUnion<T, DragEvent> | undefined;
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
    "on:focusin"?:
      | EventHandlerWithOptionsUnion<T, FocusEvent, FocusEventHandler<T, FocusEvent>>
      | undefined;
    "on:focusout"?:
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
    "on:paste"?: EventHandlerWithOptionsUnion<T, ClipboardEvent> | undefined;
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
    "on:resize"?: EventHandlerWithOptionsUnion<T, UIEvent> | undefined;
    "on:scroll"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:scrollend"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:securitypolicyviolation"?:
      | EventHandlerWithOptionsUnion<T, SecurityPolicyViolationEvent>
      | undefined;
    "on:seeked"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:seeking"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:select"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:selectionchange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:slotchange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:stalled"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:submit"?: EventHandlerWithOptionsUnion<T, SubmitEvent> | undefined;
    "on:suspend"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:timeupdate"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:toggle"?: EventHandlerWithOptionsUnion<T, ToggleEvent> | undefined;
    "on:touchcancel"?: EventHandlerWithOptionsUnion<T, TouchEvent> | undefined;
    "on:touchend"?: EventHandlerWithOptionsUnion<T, TouchEvent> | undefined;
    "on:touchmove"?: EventHandlerWithOptionsUnion<T, TouchEvent> | undefined;
    "on:touchstart"?: EventHandlerWithOptionsUnion<T, TouchEvent> | undefined;
    "on:transitioncancel"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:transitionend"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:transitionrun"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:transitionstart"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:volumechange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:waiting"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:wheel"?: EventHandlerWithOptionsUnion<T, WheelEvent> | undefined;
  }

  interface DOMAttributes<T>
    extends CustomAttributes<T>,
      DirectiveAttributes,
      DirectiveFunctionAttributes<T>,
      PropAttributes,
      AttrAttributes,
      BoolAttributes,
      OnAttributes<T>,
      OnCaptureAttributes<T>,
      CustomEventHandlersCamelCase<T>,
      CustomEventHandlersLowerCase<T>,
      CustomEventHandlersNamespaced<T> {
    children?: Element;
    innerHTML?: string;
    innerText?: string | number;
    textContent?: string | number;
  }

  interface CSSProperties extends csstype.PropertiesHyphen {
    // Override
    [key: `-${string}`]: string | number | undefined;
  }

  type HTMLAutocapitalize = "off" | "none" | "on" | "sentences" | "words" | "characters";
  type HTMLDir = "ltr" | "rtl" | "auto";
  type HTMLFormEncType = "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain";
  type HTMLFormMethod = "post" | "get" | "dialog";
  type HTMLCrossorigin = "anonymous" | "use-credentials" | "";
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
    "aria-activedescendant"?: FunctionMaybe<string | undefined>;
    /**
     * Indicates whether assistive technologies will present all, or only parts of, the changed
     * region based on the change notifications defined by the aria-relevant attribute.
     */
    "aria-atomic"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /**
     * Indicates whether inputting text could trigger display of one or more predictions of the
     * user's intended value for an input and specifies how predictions would be presented if they
     * are made.
     */
    "aria-autocomplete"?: FunctionMaybe<"none" | "inline" | "list" | "both" | undefined>;
    /**
     * Indicates an element is being modified and that assistive technologies MAY want to wait until
     * the modifications are complete before exposing them to the user.
     */
    "aria-busy"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /**
     * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
     *
     * @see aria-pressed @see aria-selected.
     */
    "aria-checked"?: FunctionMaybe<boolean | "false" | "mixed" | "true" | undefined>;
    /**
     * Defines the total number of columns in a table, grid, or treegrid.
     *
     * @see aria-colindex.
     */
    "aria-colcount"?: FunctionMaybe<number | string | undefined>;
    /**
     * Defines an element's column index or position with respect to the total number of columns
     * within a table, grid, or treegrid.
     *
     * @see aria-colcount @see aria-colspan.
     */
    "aria-colindex"?: FunctionMaybe<number | string | undefined>;
    /**
     * Defines the number of columns spanned by a cell or gridcell within a table, grid, or
     * treegrid.
     *
     * @see aria-colindex @see aria-rowspan.
     */
    "aria-colspan"?: FunctionMaybe<number | string | undefined>;
    /**
     * Identifies the element (or elements) whose contents or presence are controlled by the current
     * element.
     *
     * @see aria-owns.
     */
    "aria-controls"?: FunctionMaybe<string | undefined>;
    /**
     * Indicates the element that represents the current item within a container or set of related
     * elements.
     */
    "aria-current"?: FunctionMaybe<
      boolean | "false" | "true" | "page" | "step" | "location" | "date" | "time" | undefined
    >;
    /**
     * Identifies the element (or elements) that describes the object.
     *
     * @see aria-labelledby
     */
    "aria-describedby"?: FunctionMaybe<string | undefined>;
    /**
     * Identifies the element that provides a detailed, extended description for the object.
     *
     * @see aria-describedby.
     */
    "aria-details"?: FunctionMaybe<string | undefined>;
    /**
     * Indicates that the element is perceivable but disabled, so it is not editable or otherwise
     * operable.
     *
     * @see aria-hidden @see aria-readonly.
     */
    "aria-disabled"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /**
     * Indicates what functions can be performed when a dragged object is released on the drop
     * target.
     *
     * @deprecated In ARIA 1.1
     */
    "aria-dropeffect"?: FunctionMaybe<
      "none" | "copy" | "execute" | "link" | "move" | "popup" | undefined
    >;
    /**
     * Identifies the element that provides an error message for the object.
     *
     * @see aria-invalid @see aria-describedby.
     */
    "aria-errormessage"?: FunctionMaybe<string | undefined>;
    /**
     * Indicates whether the element, or another grouping element it controls, is currently expanded
     * or collapsed.
     */
    "aria-expanded"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /**
     * Identifies the next element (or elements) in an alternate reading order of content which, at
     * the user's discretion, allows assistive technology to override the general default of reading
     * in document source order.
     */
    "aria-flowto"?: FunctionMaybe<string | undefined>;
    /**
     * Indicates an element's "grabbed" state in a drag-and-drop operation.
     *
     * @deprecated In ARIA 1.1
     */
    "aria-grabbed"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /**
     * Indicates the availability and type of interactive popup element, such as menu or dialog,
     * that can be triggered by an element.
     */
    "aria-haspopup"?: FunctionMaybe<
      boolean | "false" | "true" | "menu" | "listbox" | "tree" | "grid" | "dialog" | undefined
    >;
    /**
     * Indicates whether the element is exposed to an accessibility API.
     *
     * @see aria-disabled.
     */
    "aria-hidden"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /**
     * Indicates the entered value does not conform to the format expected by the application.
     *
     * @see aria-errormessage.
     */
    "aria-invalid"?: FunctionMaybe<boolean | "false" | "true" | "grammar" | "spelling" | undefined>;
    /**
     * Indicates keyboard shortcuts that an author has implemented to activate or give focus to an
     * element.
     */
    "aria-keyshortcuts"?: FunctionMaybe<string | undefined>;
    /**
     * Defines a string value that labels the current element.
     *
     * @see aria-labelledby.
     */
    "aria-label"?: FunctionMaybe<string | undefined>;
    /**
     * Identifies the element (or elements) that labels the current element.
     *
     * @see aria-describedby.
     */
    "aria-labelledby"?: FunctionMaybe<string | undefined>;
    /** Defines the hierarchical level of an element within a structure. */
    "aria-level"?: FunctionMaybe<number | string | undefined>;
    /**
     * Indicates that an element will be updated, and describes the types of updates the user
     * agents, assistive technologies, and user can expect from the live region.
     */
    "aria-live"?: FunctionMaybe<"off" | "assertive" | "polite" | undefined>;
    /** Indicates whether an element is modal when displayed. */
    "aria-modal"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /** Indicates whether a text box accepts multiple lines of input or only a single line. */
    "aria-multiline"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /**
     * Indicates that the user may select more than one item from the current selectable
     * descendants.
     */
    "aria-multiselectable"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
    "aria-orientation"?: FunctionMaybe<"horizontal" | "vertical" | undefined>;
    /**
     * Identifies an element (or elements) in order to define a visual, functional, or contextual
     * parent/child relationship between DOM elements where the DOM hierarchy cannot be used to
     * represent the relationship.
     *
     * @see aria-controls.
     */
    "aria-owns"?: FunctionMaybe<string | undefined>;
    /**
     * Defines a short hint (a word or short phrase) intended to aid the user with data entry when
     * the control has no value. A hint could be a sample value or a brief description of the
     * expected format.
     */
    "aria-placeholder"?: FunctionMaybe<string | undefined>;
    /**
     * Defines an element's number or position in the current set of listitems or treeitems. Not
     * required if all elements in the set are present in the DOM.
     *
     * @see aria-setsize.
     */
    "aria-posinset"?: FunctionMaybe<number | string | undefined>;
    /**
     * Indicates the current "pressed" state of toggle buttons.
     *
     * @see aria-checked @see aria-selected.
     */
    "aria-pressed"?: FunctionMaybe<boolean | "false" | "mixed" | "true" | undefined>;
    /**
     * Indicates that the element is not editable, but is otherwise operable.
     *
     * @see aria-disabled.
     */
    "aria-readonly"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /**
     * Indicates what notifications the user agent will trigger when the accessibility tree within a
     * live region is modified.
     *
     * @see aria-atomic.
     */
    "aria-relevant"?: FunctionMaybe<
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
      | undefined
    >;
    /** Indicates that user input is required on the element before a form may be submitted. */
    "aria-required"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /** Defines a human-readable, author-localized description for the role of an element. */
    "aria-roledescription"?: FunctionMaybe<string | undefined>;
    /**
     * Defines the total number of rows in a table, grid, or treegrid.
     *
     * @see aria-rowindex.
     */
    "aria-rowcount"?: FunctionMaybe<number | string | undefined>;
    /**
     * Defines an element's row index or position with respect to the total number of rows within a
     * table, grid, or treegrid.
     *
     * @see aria-rowcount @see aria-rowspan.
     */
    "aria-rowindex"?: FunctionMaybe<number | string | undefined>;
    /**
     * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
     *
     * @see aria-rowindex @see aria-colspan.
     */
    "aria-rowspan"?: FunctionMaybe<number | string | undefined>;
    /**
     * Indicates the current "selected" state of various widgets.
     *
     * @see aria-checked @see aria-pressed.
     */
    "aria-selected"?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    /**
     * Defines the number of items in the current set of listitems or treeitems. Not required if all
     * elements in the set are present in the DOM.
     *
     * @see aria-posinset.
     */
    "aria-setsize"?: FunctionMaybe<number | string | undefined>;
    /** Indicates if items in a table or grid are sorted in ascending or descending order. */
    "aria-sort"?: FunctionMaybe<"none" | "ascending" | "descending" | "other" | undefined>;
    /** Defines the maximum allowed value for a range widget. */
    "aria-valuemax"?: FunctionMaybe<number | string | undefined>;
    /** Defines the minimum allowed value for a range widget. */
    "aria-valuemin"?: FunctionMaybe<number | string | undefined>;
    /**
     * Defines the current value for a range widget.
     *
     * @see aria-valuetext.
     */
    "aria-valuenow"?: FunctionMaybe<number | string | undefined>;
    /** Defines the human readable text alternative of aria-valuenow for a range widget. */
    "aria-valuetext"?: FunctionMaybe<string | undefined>;
    role?: FunctionMaybe<
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
      | undefined
    >;
  }

  // TODO: Should we allow this?
  // type ClassKeys = `class:${string}`;
  // type CSSKeys = Exclude<keyof csstype.PropertiesHyphen, `-${string}`>;

  // type CSSAttributes = {
  //   [key in CSSKeys as `style:${key}`]: csstype.PropertiesHyphen[key];
  // };

  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // [key: ClassKeys]: boolean;
    accessKey?: FunctionMaybe<string | undefined>;
    class?: FunctionMaybe<string | undefined>;
    contenteditable?: FunctionMaybe<boolean | "plaintext-only" | "inherit" | undefined>;
    contextmenu?: FunctionMaybe<string | undefined>;
    dir?: FunctionMaybe<HTMLDir | undefined>;
    draggable?: FunctionMaybe<boolean | "false" | "true" | undefined>;
    hidden?: FunctionMaybe<boolean | "hidden" | "until-found" | undefined>;
    id?: FunctionMaybe<string | undefined>;
    is?: FunctionMaybe<string | undefined>;
    inert?: FunctionMaybe<boolean | undefined>;
    lang?: FunctionMaybe<string | undefined>;
    spellcheck?: FunctionMaybe<boolean | undefined>;
    style?: FunctionMaybe<CSSProperties | string | undefined>;
    tabindex?: FunctionMaybe<number | string | undefined>;
    title?: FunctionMaybe<string | undefined>;
    translate?: FunctionMaybe<"yes" | "no" | undefined>;
    about?: FunctionMaybe<string | undefined>;
    datatype?: FunctionMaybe<string | undefined>;
    inlist?: FunctionMaybe<any | undefined>;
    popover?: FunctionMaybe<boolean | "manual" | "auto" | undefined>;
    prefix?: FunctionMaybe<string | undefined>;
    property?: FunctionMaybe<string | undefined>;
    resource?: FunctionMaybe<string | undefined>;
    typeof?: FunctionMaybe<string | undefined>;
    vocab?: FunctionMaybe<string | undefined>;
    autocapitalize?: FunctionMaybe<HTMLAutocapitalize | undefined>;
    slot?: FunctionMaybe<string | undefined>;
    color?: FunctionMaybe<string | undefined>;
    itemprop?: FunctionMaybe<string | undefined>;
    itemscope?: FunctionMaybe<boolean | undefined>;
    itemtype?: FunctionMaybe<string | undefined>;
    itemid?: FunctionMaybe<string | undefined>;
    itemref?: FunctionMaybe<string | undefined>;
    part?: FunctionMaybe<string | undefined>;
    exportparts?: FunctionMaybe<string | undefined>;
    inputmode?: FunctionMaybe<
      "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search" | undefined
    >;
    contentEditable?: FunctionMaybe<boolean | "plaintext-only" | "inherit" | undefined>;
    contextMenu?: FunctionMaybe<string | undefined>;
    tabIndex?: FunctionMaybe<number | string | undefined>;
    autoCapitalize?: FunctionMaybe<HTMLAutocapitalize | undefined>;
    itemProp?: FunctionMaybe<string | undefined>;
    itemScope?: FunctionMaybe<boolean | undefined>;
    itemType?: FunctionMaybe<string | undefined>;
    itemId?: FunctionMaybe<string | undefined>;
    itemRef?: FunctionMaybe<string | undefined>;
    exportParts?: FunctionMaybe<string | undefined>;
    inputMode?: FunctionMaybe<
      "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search" | undefined
    >;
  }
  interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
    download?: FunctionMaybe<any | undefined>;
    href?: FunctionMaybe<string | undefined>;
    hreflang?: FunctionMaybe<string | undefined>;
    media?: FunctionMaybe<string | undefined>;
    ping?: FunctionMaybe<string | undefined>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
    rel?: FunctionMaybe<string | undefined>;
    target?: FunctionMaybe<"_self" | "_blank" | "_parent" | "_top" | (string & {}) | undefined>;
    type?: FunctionMaybe<string | undefined>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
  }
  interface AudioHTMLAttributes<T> extends MediaHTMLAttributes<T> {}
  interface AreaHTMLAttributes<T> extends HTMLAttributes<T> {
    alt?: FunctionMaybe<string | undefined>;
    coords?: FunctionMaybe<string | undefined>;
    download?: FunctionMaybe<any | undefined>;
    href?: FunctionMaybe<string | undefined>;
    hreflang?: FunctionMaybe<string | undefined>;
    ping?: FunctionMaybe<string | undefined>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
    rel?: FunctionMaybe<string | undefined>;
    shape?: FunctionMaybe<"rect" | "circle" | "poly" | "default" | undefined>;
    target?: FunctionMaybe<string | undefined>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
  }
  interface BaseHTMLAttributes<T> extends HTMLAttributes<T> {
    href?: FunctionMaybe<string | undefined>;
    target?: FunctionMaybe<string | undefined>;
  }
  interface BlockquoteHTMLAttributes<T> extends HTMLAttributes<T> {
    cite?: FunctionMaybe<string | undefined>;
  }
  interface BodyHTMLAttributes<T>
    extends HTMLAttributes<T>,
      WindowEventMap<T>,
      ElementEventMap<T> {}
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    autofocus?: FunctionMaybe<boolean | undefined>;
    disabled?: FunctionMaybe<boolean | undefined>;
    form?: FunctionMaybe<string | undefined>;
    formaction?: FunctionMaybe<string | SerializableAttributeValue | undefined>;
    formenctype?: FunctionMaybe<HTMLFormEncType | undefined>;
    formmethod?: FunctionMaybe<HTMLFormMethod | undefined>;
    formnovalidate?: FunctionMaybe<boolean | undefined>;
    formtarget?: FunctionMaybe<string | undefined>;
    popovertarget?: FunctionMaybe<string | undefined>;
    popovertargetaction?: FunctionMaybe<"hide" | "show" | "toggle" | undefined>;
    name?: FunctionMaybe<string | undefined>;
    type?: FunctionMaybe<"submit" | "reset" | "button" | undefined>;
    value?: FunctionMaybe<string | undefined>;
    formAction?: FunctionMaybe<string | SerializableAttributeValue | undefined>;
    formEnctype?: FunctionMaybe<HTMLFormEncType | undefined>;
    formMethod?: FunctionMaybe<HTMLFormMethod | undefined>;
    formNoValidate?: FunctionMaybe<boolean | undefined>;
    formTarget?: FunctionMaybe<string | undefined>;
    popoverTarget?: FunctionMaybe<string | undefined>;
    popoverTargetAction?: FunctionMaybe<"hide" | "show" | "toggle" | undefined>;
  }
  interface CanvasHTMLAttributes<T> extends HTMLAttributes<T> {
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;

    onContextLost?: EventHandlerUnion<T, Event> | undefined;
    oncontextlost?: EventHandlerUnion<T, Event> | undefined;
    "on:contextlost"?: EventHandlerWithOptionsUnion<T, Event> | undefined;

    onContextRestored?: EventHandlerUnion<T, Event> | undefined;
    oncontextrestored?: EventHandlerUnion<T, Event> | undefined;
    "on:contextrestored"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
  }
  interface ColHTMLAttributes<T> extends HTMLAttributes<T> {
    span?: FunctionMaybe<number | string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
  }
  interface ColgroupHTMLAttributes<T> extends HTMLAttributes<T> {
    span?: FunctionMaybe<number | string | undefined>;
  }
  interface DataHTMLAttributes<T> extends HTMLAttributes<T> {
    value?: FunctionMaybe<string | string[] | number | undefined>;
  }
  interface DetailsHtmlAttributes<T> extends HTMLAttributes<T> {
    open?: FunctionMaybe<boolean | undefined>;
  }
  interface DialogHtmlAttributes<T> extends HTMLAttributes<T> {
    open?: FunctionMaybe<boolean | undefined>;

    onClose?: EventHandlerUnion<T, Event> | undefined;
    onclose?: EventHandlerUnion<T, Event> | undefined;
    "on:close"?: EventHandlerWithOptionsUnion<T, Event> | undefined;

    onCancel?: EventHandlerUnion<T, Event> | undefined;
    oncancel?: EventHandlerUnion<T, Event> | undefined;
    "on:cancel"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
  }
  interface EmbedHTMLAttributes<T> extends HTMLAttributes<T> {
    height?: FunctionMaybe<number | string | undefined>;
    src?: FunctionMaybe<string | undefined>;
    type?: FunctionMaybe<string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
  }
  interface FieldsetHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: FunctionMaybe<boolean | undefined>;
    form?: FunctionMaybe<string | undefined>;
    name?: FunctionMaybe<string | undefined>;
  }
  interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
    "accept-charset"?: FunctionMaybe<string | undefined>;
    action?: FunctionMaybe<string | SerializableAttributeValue | undefined>;
    autocomplete?: FunctionMaybe<string | undefined>;
    encoding?: FunctionMaybe<HTMLFormEncType | undefined>;
    enctype?: FunctionMaybe<HTMLFormEncType | undefined>;
    method?: FunctionMaybe<HTMLFormMethod | undefined>;
    name?: FunctionMaybe<string | undefined>;
    novalidate?: FunctionMaybe<boolean | undefined>;
    target?: FunctionMaybe<string | undefined>;
    noValidate?: FunctionMaybe<boolean | undefined>;
  }
  interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
    allow?: FunctionMaybe<string | undefined>;
    allowfullscreen?: FunctionMaybe<boolean | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    loading?: FunctionMaybe<"eager" | "lazy" | undefined>;
    name?: FunctionMaybe<string | undefined>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
    sandbox?: FunctionMaybe<HTMLIframeSandbox | string | undefined>;
    src?: FunctionMaybe<string | undefined>;
    srcdoc?: FunctionMaybe<string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
  }
  interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
    alt?: FunctionMaybe<string | undefined>;
    crossorigin?: FunctionMaybe<HTMLCrossorigin | undefined>;
    decoding?: FunctionMaybe<"sync" | "async" | "auto" | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    ismap?: FunctionMaybe<boolean | undefined>;
    isMap?: FunctionMaybe<boolean | undefined>;
    loading?: FunctionMaybe<"eager" | "lazy" | undefined>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
    sizes?: FunctionMaybe<string | undefined>;
    src?: FunctionMaybe<string | undefined>;
    srcset?: FunctionMaybe<string | undefined>;
    srcSet?: FunctionMaybe<string | undefined>;
    usemap?: FunctionMaybe<string | undefined>;
    useMap?: FunctionMaybe<string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    crossOrigin?: FunctionMaybe<HTMLCrossorigin | undefined>;
    elementtiming?: FunctionMaybe<string | undefined>;
    fetchpriority?: FunctionMaybe<"high" | "low" | "auto" | undefined>;
  }
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    accept?: FunctionMaybe<string | undefined>;
    alt?: FunctionMaybe<string | undefined>;
    autocomplete?: FunctionMaybe<string | undefined>;
    autocorrect?: FunctionMaybe<"on" | "off" | undefined>;
    autofocus?: FunctionMaybe<boolean | undefined>;
    capture?: FunctionMaybe<boolean | string | undefined>;
    checked?: FunctionMaybe<boolean | undefined>;
    crossorigin?: FunctionMaybe<HTMLCrossorigin | undefined>;
    disabled?: FunctionMaybe<boolean | undefined>;
    enterkeyhint?: FunctionMaybe<
      "enter" | "done" | "go" | "next" | "previous" | "search" | "send" | undefined
    >;
    form?: FunctionMaybe<string | undefined>;
    formaction?: FunctionMaybe<string | SerializableAttributeValue | undefined>;
    formenctype?: FunctionMaybe<HTMLFormEncType | undefined>;
    formmethod?: FunctionMaybe<HTMLFormMethod | undefined>;
    formnovalidate?: FunctionMaybe<boolean | undefined>;
    formtarget?: FunctionMaybe<string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    incremental?: FunctionMaybe<boolean | undefined>;
    list?: FunctionMaybe<string | undefined>;
    max?: FunctionMaybe<number | string | undefined>;
    maxlength?: FunctionMaybe<number | string | undefined>;
    min?: FunctionMaybe<number | string | undefined>;
    minlength?: FunctionMaybe<number | string | undefined>;
    multiple?: FunctionMaybe<boolean | undefined>;
    name?: FunctionMaybe<string | undefined>;
    pattern?: FunctionMaybe<string | undefined>;
    placeholder?: FunctionMaybe<string | undefined>;
    readonly?: FunctionMaybe<boolean | undefined>;
    results?: FunctionMaybe<number | undefined>;
    required?: FunctionMaybe<boolean | undefined>;
    size?: FunctionMaybe<number | string | undefined>;
    src?: FunctionMaybe<string | undefined>;
    step?: FunctionMaybe<number | string | undefined>;
    type?: FunctionMaybe<
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
      | undefined
    >;
    value?: FunctionMaybe<string | string[] | number | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    crossOrigin?: FunctionMaybe<HTMLCrossorigin | undefined>;
    formAction?: FunctionMaybe<string | SerializableAttributeValue | undefined>;
    formEnctype?: FunctionMaybe<HTMLFormEncType | undefined>;
    formMethod?: FunctionMaybe<HTMLFormMethod | undefined>;
    formNoValidate?: FunctionMaybe<boolean | undefined>;
    formTarget?: FunctionMaybe<string | undefined>;
    maxLength?: FunctionMaybe<number | string | undefined>;
    minLength?: FunctionMaybe<number | string | undefined>;
    readOnly?: FunctionMaybe<boolean | undefined>;
  }
  interface InsHTMLAttributes<T> extends HTMLAttributes<T> {
    cite?: FunctionMaybe<string | undefined>;
    dateTime?: FunctionMaybe<string | undefined>;
  }
  interface KeygenHTMLAttributes<T> extends HTMLAttributes<T> {
    autofocus?: FunctionMaybe<boolean | undefined>;
    challenge?: FunctionMaybe<string | undefined>;
    disabled?: FunctionMaybe<boolean | undefined>;
    form?: FunctionMaybe<string | undefined>;
    keytype?: FunctionMaybe<string | undefined>;
    keyparams?: FunctionMaybe<string | undefined>;
    name?: FunctionMaybe<string | undefined>;
  }
  interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
    for?: FunctionMaybe<string | undefined>;
    form?: FunctionMaybe<string | undefined>;
  }
  interface LiHTMLAttributes<T> extends HTMLAttributes<T> {
    value?: FunctionMaybe<number | string | undefined>;
  }
  interface LinkHTMLAttributes<T> extends HTMLAttributes<T> {
    as?: FunctionMaybe<HTMLLinkAs | undefined>;
    crossorigin?: FunctionMaybe<HTMLCrossorigin | undefined>;
    disabled?: FunctionMaybe<boolean | undefined>;
    fetchpriority?: FunctionMaybe<"high" | "low" | "auto" | undefined>;
    href?: FunctionMaybe<string | undefined>;
    hreflang?: FunctionMaybe<string | undefined>;
    imagesizes?: FunctionMaybe<string | undefined>;
    imagesrcset?: FunctionMaybe<string | undefined>;
    integrity?: FunctionMaybe<string | undefined>;
    media?: FunctionMaybe<string | undefined>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
    rel?: FunctionMaybe<string | undefined>;
    sizes?: FunctionMaybe<string | undefined>;
    type?: FunctionMaybe<string | undefined>;
    crossOrigin?: FunctionMaybe<HTMLCrossorigin | undefined>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
  }
  interface MapHTMLAttributes<T> extends HTMLAttributes<T> {
    name?: FunctionMaybe<string | undefined>;
  }
  interface MediaHTMLAttributes<T> extends HTMLAttributes<T>, ElementEventMap<T> {
    autoplay?: FunctionMaybe<boolean | undefined>;
    controls?: FunctionMaybe<boolean | undefined>;
    controlslist?: FunctionMaybe<
      | "nodownload"
      | "nofullscreen"
      | "noplaybackrate"
      | "noremoteplayback"
      | (string & {})
      | undefined
    >;
    crossorigin?: FunctionMaybe<HTMLCrossorigin | undefined>;
    loop?: FunctionMaybe<boolean | undefined>;
    mediagroup?: FunctionMaybe<string | undefined>;
    muted?: FunctionMaybe<boolean | undefined>;
    preload?: FunctionMaybe<"none" | "metadata" | "auto" | "" | undefined>;
    src?: FunctionMaybe<string | undefined>;
    crossOrigin?: FunctionMaybe<HTMLCrossorigin | undefined>;
    mediaGroup?: FunctionMaybe<string | undefined>;

    onEncrypted?: EventHandlerUnion<T, MediaEncryptedEvent> | undefined;
    onencrypted?: EventHandlerUnion<T, MediaEncryptedEvent> | undefined;
    "on:encrypted"?: EventHandlerWithOptionsUnion<T, MediaEncryptedEvent> | undefined;

    onWaitingForKey?: EventHandlerUnion<T, Event> | undefined;
    onwaitingforkey?: EventHandlerUnion<T, Event> | undefined;
    "on:waitingforkey"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
  }
  interface MenuHTMLAttributes<T> extends HTMLAttributes<T> {
    label?: FunctionMaybe<string | undefined>;
    type?: FunctionMaybe<"context" | "toolbar" | undefined>;
  }
  interface MetaHTMLAttributes<T> extends HTMLAttributes<T> {
    charset?: FunctionMaybe<string | undefined>;
    content?: FunctionMaybe<string | undefined>;
    "http-equiv"?: FunctionMaybe<string | undefined>;
    name?: FunctionMaybe<string | undefined>;
    media?: FunctionMaybe<string | undefined>;
  }
  interface MeterHTMLAttributes<T> extends HTMLAttributes<T> {
    form?: FunctionMaybe<string | undefined>;
    high?: FunctionMaybe<number | string | undefined>;
    low?: FunctionMaybe<number | string | undefined>;
    max?: FunctionMaybe<number | string | undefined>;
    min?: FunctionMaybe<number | string | undefined>;
    optimum?: FunctionMaybe<number | string | undefined>;
    value?: FunctionMaybe<string | string[] | number | undefined>;
  }
  interface QuoteHTMLAttributes<T> extends HTMLAttributes<T> {
    cite?: FunctionMaybe<string | undefined>;
  }
  interface ObjectHTMLAttributes<T> extends HTMLAttributes<T> {
    data?: FunctionMaybe<string | undefined>;
    form?: FunctionMaybe<string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    name?: FunctionMaybe<string | undefined>;
    type?: FunctionMaybe<string | undefined>;
    usemap?: FunctionMaybe<string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    useMap?: FunctionMaybe<string | undefined>;
  }
  interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
    reversed?: FunctionMaybe<boolean | undefined>;
    start?: FunctionMaybe<number | string | undefined>;
    type?: FunctionMaybe<"1" | "a" | "A" | "i" | "I" | undefined>;
  }
  interface OptgroupHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: FunctionMaybe<boolean | undefined>;
    label?: FunctionMaybe<string | undefined>;
  }
  interface OptionHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: FunctionMaybe<boolean | undefined>;
    label?: FunctionMaybe<string | undefined>;
    selected?: FunctionMaybe<boolean | undefined>;
    value?: FunctionMaybe<string | string[] | number | undefined>;
  }
  interface OutputHTMLAttributes<T> extends HTMLAttributes<T> {
    form?: FunctionMaybe<string | undefined>;
    for?: FunctionMaybe<string | undefined>;
    name?: FunctionMaybe<string | undefined>;
  }
  interface ParamHTMLAttributes<T> extends HTMLAttributes<T> {
    name?: FunctionMaybe<string | undefined>;
    value?: FunctionMaybe<string | string[] | number | undefined>;
  }
  interface ProgressHTMLAttributes<T> extends HTMLAttributes<T> {
    max?: FunctionMaybe<number | string | undefined>;
    value?: FunctionMaybe<string | string[] | number | undefined>;
  }
  interface ScriptHTMLAttributes<T> extends HTMLAttributes<T> {
    async?: FunctionMaybe<boolean | undefined>;
    charset?: FunctionMaybe<string | undefined>;
    crossorigin?: FunctionMaybe<HTMLCrossorigin | undefined>;
    defer?: FunctionMaybe<boolean | undefined>;
    integrity?: FunctionMaybe<string | undefined>;
    nomodule?: FunctionMaybe<boolean | undefined>;
    nonce?: FunctionMaybe<string | undefined>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
    src?: FunctionMaybe<string | undefined>;
    type?: FunctionMaybe<string | undefined>;
    crossOrigin?: FunctionMaybe<HTMLCrossorigin | undefined>;
    noModule?: FunctionMaybe<boolean | undefined>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy | undefined>;
  }
  interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
    autocomplete?: FunctionMaybe<string | undefined>;
    autofocus?: FunctionMaybe<boolean | undefined>;
    disabled?: FunctionMaybe<boolean | undefined>;
    form?: FunctionMaybe<string | undefined>;
    multiple?: FunctionMaybe<boolean | undefined>;
    name?: FunctionMaybe<string | undefined>;
    required?: FunctionMaybe<boolean | undefined>;
    size?: FunctionMaybe<number | string | undefined>;
    value?: FunctionMaybe<string | string[] | number | undefined>;
  }
  interface HTMLSlotElementAttributes<T = HTMLSlotElement> extends HTMLAttributes<T> {
    name?: FunctionMaybe<string | undefined>;
  }
  interface SourceHTMLAttributes<T> extends HTMLAttributes<T> {
    media?: FunctionMaybe<string | undefined>;
    sizes?: FunctionMaybe<string | undefined>;
    src?: FunctionMaybe<string | undefined>;
    srcset?: FunctionMaybe<string | undefined>;
    type?: FunctionMaybe<string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
  }
  interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
    media?: FunctionMaybe<string | undefined>;
    nonce?: FunctionMaybe<string | undefined>;
    scoped?: FunctionMaybe<boolean | undefined>;
    type?: FunctionMaybe<string | undefined>;
  }
  interface TdHTMLAttributes<T> extends HTMLAttributes<T> {
    colspan?: FunctionMaybe<number | string | undefined>;
    headers?: FunctionMaybe<string | undefined>;
    rowspan?: FunctionMaybe<number | string | undefined>;
    colSpan?: FunctionMaybe<number | string | undefined>;
    rowSpan?: FunctionMaybe<number | string | undefined>;
  }
  interface TemplateHTMLAttributes<T extends HTMLTemplateElement> extends HTMLAttributes<T> {
    content?: FunctionMaybe<DocumentFragment | undefined>;
  }
  interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
    autocomplete?: FunctionMaybe<string | undefined>;
    autofocus?: FunctionMaybe<boolean | undefined>;
    cols?: FunctionMaybe<number | string | undefined>;
    dirname?: FunctionMaybe<string | undefined>;
    disabled?: FunctionMaybe<boolean | undefined>;
    enterkeyhint?: FunctionMaybe<
      "enter" | "done" | "go" | "next" | "previous" | "search" | "send" | undefined
    >;
    form?: FunctionMaybe<string | undefined>;
    maxlength?: FunctionMaybe<number | string | undefined>;
    minlength?: FunctionMaybe<number | string | undefined>;
    name?: FunctionMaybe<string | undefined>;
    placeholder?: FunctionMaybe<string | undefined>;
    readonly?: FunctionMaybe<boolean | undefined>;
    required?: FunctionMaybe<boolean | undefined>;
    rows?: FunctionMaybe<number | string | undefined>;
    value?: FunctionMaybe<string | string[] | number | undefined>;
    wrap?: FunctionMaybe<"hard" | "soft" | "off" | undefined>;
    maxLength?: FunctionMaybe<number | string | undefined>;
    minLength?: FunctionMaybe<number | string | undefined>;
    readOnly?: FunctionMaybe<boolean | undefined>;
  }
  interface ThHTMLAttributes<T> extends HTMLAttributes<T> {
    colspan?: FunctionMaybe<number | string | undefined>;
    headers?: FunctionMaybe<string | undefined>;
    rowspan?: FunctionMaybe<number | string | undefined>;
    colSpan?: FunctionMaybe<number | string | undefined>;
    rowSpan?: FunctionMaybe<number | string | undefined>;
    scope?: FunctionMaybe<"col" | "row" | "rowgroup" | "colgroup" | undefined>;
  }
  interface TimeHTMLAttributes<T> extends HTMLAttributes<T> {
    datetime?: FunctionMaybe<string | undefined>;
    dateTime?: FunctionMaybe<string | undefined>;
  }
  interface TrackHTMLAttributes<T> extends HTMLAttributes<T> {
    default?: FunctionMaybe<boolean | undefined>;
    kind?: FunctionMaybe<
      "subtitles" | "captions" | "descriptions" | "chapters" | "metadata" | undefined
    >;
    label?: FunctionMaybe<string | undefined>;
    src?: FunctionMaybe<string | undefined>;
    srclang?: FunctionMaybe<string | undefined>;
  }
  interface VideoHTMLAttributes<T> extends MediaHTMLAttributes<T> {
    height?: FunctionMaybe<number | string | undefined>;
    playsinline?: FunctionMaybe<boolean | undefined>;
    poster?: FunctionMaybe<string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    disablepictureinpicture?: FunctionMaybe<boolean | undefined>;
    disableremoteplayback?: FunctionMaybe<boolean | undefined>;

    onEnterPictureInPicture?: EventHandlerUnion<T, PictureInPictureEvent> | undefined;
    onenterpictureinpicture?: EventHandlerUnion<T, PictureInPictureEvent> | undefined;
    "on:enterpictureinpicture"?: EventHandlerWithOptionsUnion<T, PictureInPictureEvent> | undefined;

    onLeavePictureInPicture?: EventHandlerUnion<T, PictureInPictureEvent> | undefined;
    onleavepictureinpicture?: EventHandlerUnion<T, PictureInPictureEvent> | undefined;
    "on:leavepictureinpicture"?: EventHandlerWithOptionsUnion<T, PictureInPictureEvent> | undefined;
  }
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
    id?: FunctionMaybe<string | undefined>;
    lang?: FunctionMaybe<string | undefined>;
    tabIndex?: FunctionMaybe<number | string | undefined>;
    tabindex?: FunctionMaybe<number | string | undefined>;
  }
  interface StylableSVGAttributes {
    class?: FunctionMaybe<string | undefined>;
    style?: FunctionMaybe<CSSProperties | string | undefined>;
  }
  interface TransformableSVGAttributes {
    transform?: FunctionMaybe<string | undefined>;
  }
  interface ConditionalProcessingSVGAttributes {
    requiredExtensions?: FunctionMaybe<string | undefined>;
    requiredFeatures?: FunctionMaybe<string | undefined>;
    systemLanguage?: FunctionMaybe<string | undefined>;
  }
  interface ExternalResourceSVGAttributes {
    externalResourcesRequired?: FunctionMaybe<"true" | "false" | undefined>;
  }
  interface AnimationTimingSVGAttributes {
    begin?: FunctionMaybe<string | undefined>;
    dur?: FunctionMaybe<string | undefined>;
    end?: FunctionMaybe<string | undefined>;
    min?: FunctionMaybe<string | undefined>;
    max?: FunctionMaybe<string | undefined>;
    restart?: FunctionMaybe<"always" | "whenNotActive" | "never" | undefined>;
    repeatCount?: FunctionMaybe<number | "indefinite" | undefined>;
    repeatDur?: FunctionMaybe<string | undefined>;
    fill?: FunctionMaybe<"freeze" | "remove" | undefined>;
  }
  interface AnimationValueSVGAttributes {
    calcMode?: FunctionMaybe<"discrete" | "linear" | "paced" | "spline" | undefined>;
    values?: FunctionMaybe<string | undefined>;
    keyTimes?: FunctionMaybe<string | undefined>;
    keySplines?: FunctionMaybe<string | undefined>;
    from?: FunctionMaybe<number | string | undefined>;
    to?: FunctionMaybe<number | string | undefined>;
    by?: FunctionMaybe<number | string | undefined>;
  }
  interface AnimationAdditionSVGAttributes {
    attributeName?: FunctionMaybe<string | undefined>;
    additive?: FunctionMaybe<"replace" | "sum" | undefined>;
    accumulate?: FunctionMaybe<"none" | "sum" | undefined>;
  }
  interface AnimationAttributeTargetSVGAttributes {
    attributeName?: FunctionMaybe<string | undefined>;
    attributeType?: FunctionMaybe<"CSS" | "XML" | "auto" | undefined>;
  }
  interface PresentationSVGAttributes {
    "alignment-baseline"?: FunctionMaybe<
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
      | undefined
    >;
    "baseline-shift"?: FunctionMaybe<number | string | undefined>;
    clip?: FunctionMaybe<string | undefined>;
    "clip-path"?: FunctionMaybe<string | undefined>;
    "clip-rule"?: FunctionMaybe<"nonzero" | "evenodd" | "inherit" | undefined>;
    color?: FunctionMaybe<string | undefined>;
    "color-interpolation"?: FunctionMaybe<"auto" | "sRGB" | "linearRGB" | "inherit" | undefined>;
    "color-interpolation-filters"?: FunctionMaybe<
      "auto" | "sRGB" | "linearRGB" | "inherit" | undefined
    >;
    "color-profile"?: FunctionMaybe<string | undefined>;
    "color-rendering"?: FunctionMaybe<
      "auto" | "optimizeSpeed" | "optimizeQuality" | "inherit" | undefined
    >;
    cursor?: FunctionMaybe<string | undefined>;
    direction?: FunctionMaybe<"ltr" | "rtl" | "inherit" | undefined>;
    display?: FunctionMaybe<string | undefined>;
    "dominant-baseline"?: FunctionMaybe<
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
      | undefined
    >;
    "enable-background"?: FunctionMaybe<string | undefined>;
    fill?: FunctionMaybe<string | undefined>;
    "fill-opacity"?: FunctionMaybe<number | string | "inherit" | undefined>;
    "fill-rule"?: FunctionMaybe<"nonzero" | "evenodd" | "inherit" | undefined>;
    filter?: FunctionMaybe<string | undefined>;
    "flood-color"?: FunctionMaybe<string | undefined>;
    "flood-opacity"?: FunctionMaybe<number | string | "inherit" | undefined>;
    "font-family"?: FunctionMaybe<string | undefined>;
    "font-size"?: FunctionMaybe<string | undefined>;
    "font-size-adjust"?: FunctionMaybe<number | string | undefined>;
    "font-stretch"?: FunctionMaybe<string | undefined>;
    "font-style"?: FunctionMaybe<"normal" | "italic" | "oblique" | "inherit" | undefined>;
    "font-variant"?: FunctionMaybe<string | undefined>;
    "font-weight"?: FunctionMaybe<number | string | undefined>;
    "glyph-orientation-horizontal"?: FunctionMaybe<string | undefined>;
    "glyph-orientation-vertical"?: FunctionMaybe<string | undefined>;
    "image-rendering"?: FunctionMaybe<
      "auto" | "optimizeQuality" | "optimizeSpeed" | "inherit" | undefined
    >;
    kerning?: FunctionMaybe<string | undefined>;
    "letter-spacing"?: FunctionMaybe<number | string | undefined>;
    "lighting-color"?: FunctionMaybe<string | undefined>;
    "marker-end"?: FunctionMaybe<string | undefined>;
    "marker-mid"?: FunctionMaybe<string | undefined>;
    "marker-start"?: FunctionMaybe<string | undefined>;
    mask?: FunctionMaybe<string | undefined>;
    opacity?: FunctionMaybe<number | string | "inherit" | undefined>;
    overflow?: FunctionMaybe<"visible" | "hidden" | "scroll" | "auto" | "inherit" | undefined>;
    pathLength?: FunctionMaybe<string | number | undefined>;
    "pointer-events"?: FunctionMaybe<
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
      | undefined
    >;
    "shape-rendering"?: FunctionMaybe<
      "auto" | "optimizeSpeed" | "crispEdges" | "geometricPrecision" | "inherit" | undefined
    >;
    "stop-color"?: FunctionMaybe<string | undefined>;
    "stop-opacity"?: FunctionMaybe<number | string | "inherit" | undefined>;
    stroke?: FunctionMaybe<string | undefined>;
    "stroke-dasharray"?: FunctionMaybe<string | undefined>;
    "stroke-dashoffset"?: FunctionMaybe<number | string | undefined>;
    "stroke-linecap"?: FunctionMaybe<"butt" | "round" | "square" | "inherit" | undefined>;
    "stroke-linejoin"?: FunctionMaybe<
      "arcs" | "bevel" | "miter" | "miter-clip" | "round" | "inherit" | undefined
    >;
    "stroke-miterlimit"?: FunctionMaybe<number | string | "inherit" | undefined>;
    "stroke-opacity"?: FunctionMaybe<number | string | "inherit" | undefined>;
    "stroke-width"?: FunctionMaybe<number | string | undefined>;
    "text-anchor"?: FunctionMaybe<"start" | "middle" | "end" | "inherit" | undefined>;
    "text-decoration"?: FunctionMaybe<
      "none" | "underline" | "overline" | "line-through" | "blink" | "inherit" | undefined
    >;
    "text-rendering"?: FunctionMaybe<
      "auto" | "optimizeSpeed" | "optimizeLegibility" | "geometricPrecision" | "inherit" | undefined
    >;
    "unicode-bidi"?: FunctionMaybe<string | undefined>;
    visibility?: FunctionMaybe<"visible" | "hidden" | "collapse" | "inherit" | undefined>;
    "word-spacing"?: FunctionMaybe<number | string | undefined>;
    "writing-mode"?: FunctionMaybe<
      "lr-tb" | "rl-tb" | "tb-rl" | "lr" | "rl" | "tb" | "inherit" | undefined
    >;
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
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    result?: FunctionMaybe<string | undefined>;
  }
  interface SingleInputFilterSVGAttributes {
    in?: FunctionMaybe<string | undefined>;
  }
  interface DoubleInputFilterSVGAttributes {
    in?: FunctionMaybe<string | undefined>;
    in2?: FunctionMaybe<string | undefined>;
  }
  interface FitToViewBoxSVGAttributes {
    viewBox?: FunctionMaybe<string | undefined>;
    preserveAspectRatio?: FunctionMaybe<SVGPreserveAspectRatio | undefined>;
  }
  interface GradientElementSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    gradientUnits?: FunctionMaybe<SVGUnits | undefined>;
    gradientTransform?: FunctionMaybe<string | undefined>;
    spreadMethod?: FunctionMaybe<"pad" | "reflect" | "repeat" | undefined>;
    href?: FunctionMaybe<string | undefined>;
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
    viewBox?: FunctionMaybe<string | undefined>;
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
    zoomAndPan?: FunctionMaybe<"disable" | "magnify" | undefined>;
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
    path?: FunctionMaybe<string | undefined>;
    keyPoints?: FunctionMaybe<string | undefined>;
    rotate?: FunctionMaybe<number | string | "auto" | "auto-reverse" | undefined>;
    origin?: FunctionMaybe<"default" | undefined>;
  }
  interface AnimateTransformSVGAttributes<T>
    extends AnimationElementSVGAttributes<T>,
      AnimationAttributeTargetSVGAttributes,
      AnimationTimingSVGAttributes,
      AnimationValueSVGAttributes,
      AnimationAdditionSVGAttributes {
    type?: FunctionMaybe<"translate" | "scale" | "rotate" | "skewX" | "skewY" | undefined>;
  }
  interface CircleSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes {
    cx?: FunctionMaybe<number | string | undefined>;
    cy?: FunctionMaybe<number | string | undefined>;
    r?: FunctionMaybe<number | string | undefined>;
  }
  interface ClipPathSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path"> {
    clipPathUnits?: FunctionMaybe<SVGUnits | undefined>;
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
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path"> {
    cx?: FunctionMaybe<number | string | undefined>;
    cy?: FunctionMaybe<number | string | undefined>;
    rx?: FunctionMaybe<number | string | undefined>;
    ry?: FunctionMaybe<number | string | undefined>;
  }
  interface FeBlendSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      DoubleInputFilterSVGAttributes,
      StylableSVGAttributes {
    mode?: FunctionMaybe<"normal" | "multiply" | "screen" | "darken" | "lighten" | undefined>;
  }
  interface FeColorMatrixSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    type?: FunctionMaybe<"matrix" | "saturate" | "hueRotate" | "luminanceToAlpha" | undefined>;
    values?: FunctionMaybe<string | undefined>;
  }
  interface FeComponentTransferSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {}
  interface FeCompositeSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      DoubleInputFilterSVGAttributes,
      StylableSVGAttributes {
    operator?: FunctionMaybe<"over" | "in" | "out" | "atop" | "xor" | "arithmetic" | undefined>;
    k1?: FunctionMaybe<number | string | undefined>;
    k2?: FunctionMaybe<number | string | undefined>;
    k3?: FunctionMaybe<number | string | undefined>;
    k4?: FunctionMaybe<number | string | undefined>;
  }
  interface FeConvolveMatrixSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    order?: FunctionMaybe<number | string | undefined>;
    kernelMatrix?: FunctionMaybe<string | undefined>;
    divisor?: FunctionMaybe<number | string | undefined>;
    bias?: FunctionMaybe<number | string | undefined>;
    targetX?: FunctionMaybe<number | string | undefined>;
    targetY?: FunctionMaybe<number | string | undefined>;
    edgeMode?: FunctionMaybe<"duplicate" | "wrap" | "none" | undefined>;
    kernelUnitLength?: FunctionMaybe<number | string | undefined>;
    preserveAlpha?: FunctionMaybe<"true" | "false" | undefined>;
  }
  interface FeDiffuseLightingSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "lighting-color"> {
    surfaceScale?: FunctionMaybe<number | string | undefined>;
    diffuseConstant?: FunctionMaybe<number | string | undefined>;
    kernelUnitLength?: FunctionMaybe<number | string | undefined>;
  }
  interface FeDisplacementMapSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      DoubleInputFilterSVGAttributes,
      StylableSVGAttributes {
    scale?: FunctionMaybe<number | string | undefined>;
    xChannelSelector?: FunctionMaybe<"R" | "G" | "B" | "A" | undefined>;
    yChannelSelector?: FunctionMaybe<"R" | "G" | "B" | "A" | undefined>;
  }
  interface FeDistantLightSVGAttributes<T> extends LightSourceElementSVGAttributes<T> {
    azimuth?: FunctionMaybe<number | string | undefined>;
    elevation?: FunctionMaybe<number | string | undefined>;
  }
  interface FeDropShadowSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      FilterPrimitiveElementSVGAttributes<T>,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "flood-color" | "flood-opacity"> {
    dx?: FunctionMaybe<number | string | undefined>;
    dy?: FunctionMaybe<number | string | undefined>;
    stdDeviation?: FunctionMaybe<number | string | undefined>;
  }
  interface FeFloodSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "flood-color" | "flood-opacity"> {}
  interface FeFuncSVGAttributes<T> extends CoreSVGAttributes<T> {
    type?: FunctionMaybe<"identity" | "table" | "discrete" | "linear" | "gamma" | undefined>;
    tableValues?: FunctionMaybe<string | undefined>;
    slope?: FunctionMaybe<number | string | undefined>;
    intercept?: FunctionMaybe<number | string | undefined>;
    amplitude?: FunctionMaybe<number | string | undefined>;
    exponent?: FunctionMaybe<number | string | undefined>;
    offset?: FunctionMaybe<number | string | undefined>;
  }
  interface FeGaussianBlurSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    stdDeviation?: FunctionMaybe<number | string | undefined>;
  }
  interface FeImageSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    preserveAspectRatio?: FunctionMaybe<SVGPreserveAspectRatio | undefined>;
    href?: FunctionMaybe<string | undefined>;
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
    operator?: FunctionMaybe<"erode" | "dilate" | undefined>;
    radius?: FunctionMaybe<number | string | undefined>;
  }
  interface FeOffsetSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    dx?: FunctionMaybe<number | string | undefined>;
    dy?: FunctionMaybe<number | string | undefined>;
  }
  interface FePointLightSVGAttributes<T> extends LightSourceElementSVGAttributes<T> {
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    z?: FunctionMaybe<number | string | undefined>;
  }
  interface FeSpecularLightingSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "lighting-color"> {
    surfaceScale?: FunctionMaybe<string | undefined>;
    specularConstant?: FunctionMaybe<string | undefined>;
    specularExponent?: FunctionMaybe<string | undefined>;
    kernelUnitLength?: FunctionMaybe<number | string | undefined>;
  }
  interface FeSpotLightSVGAttributes<T> extends LightSourceElementSVGAttributes<T> {
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    z?: FunctionMaybe<number | string | undefined>;
    pointsAtX?: FunctionMaybe<number | string | undefined>;
    pointsAtY?: FunctionMaybe<number | string | undefined>;
    pointsAtZ?: FunctionMaybe<number | string | undefined>;
    specularExponent?: FunctionMaybe<number | string | undefined>;
    limitingConeAngle?: FunctionMaybe<number | string | undefined>;
  }
  interface FeTileSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {}
  interface FeTurbulanceSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      StylableSVGAttributes {
    baseFrequency?: FunctionMaybe<number | string | undefined>;
    numOctaves?: FunctionMaybe<number | string | undefined>;
    seed?: FunctionMaybe<number | string | undefined>;
    stitchTiles?: FunctionMaybe<"stitch" | "noStitch" | undefined>;
    type?: FunctionMaybe<"fractalNoise" | "turbulence" | undefined>;
  }
  interface FilterSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    filterUnits?: FunctionMaybe<SVGUnits | undefined>;
    primitiveUnits?: FunctionMaybe<SVGUnits | undefined>;
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    filterRes?: FunctionMaybe<number | string | undefined>;
  }
  interface ForeignObjectSVGAttributes<T>
    extends NewViewportSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "display" | "visibility"> {
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
  }
  interface GSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path" | "display" | "visibility"> {}
  interface ImageSVGAttributes<T>
    extends NewViewportSVGAttributes<T>,
      GraphicsElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path" | "color-profile" | "image-rendering"> {
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    preserveAspectRatio?: FunctionMaybe<ImagePreserveAspectRatio | undefined>;
    href?: FunctionMaybe<string | undefined>;
  }
  interface LineSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path" | "marker-start" | "marker-mid" | "marker-end"> {
    x1?: FunctionMaybe<number | string | undefined>;
    y1?: FunctionMaybe<number | string | undefined>;
    x2?: FunctionMaybe<number | string | undefined>;
    y2?: FunctionMaybe<number | string | undefined>;
  }
  interface LinearGradientSVGAttributes<T> extends GradientElementSVGAttributes<T> {
    x1?: FunctionMaybe<number | string | undefined>;
    x2?: FunctionMaybe<number | string | undefined>;
    y1?: FunctionMaybe<number | string | undefined>;
    y2?: FunctionMaybe<number | string | undefined>;
  }
  interface MarkerSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      FitToViewBoxSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path" | "overflow" | "clip"> {
    markerUnits?: FunctionMaybe<"strokeWidth" | "userSpaceOnUse" | undefined>;
    refX?: FunctionMaybe<number | string | undefined>;
    refY?: FunctionMaybe<number | string | undefined>;
    markerWidth?: FunctionMaybe<number | string | undefined>;
    markerHeight?: FunctionMaybe<number | string | undefined>;
    orient?: FunctionMaybe<string | undefined>;
  }
  interface MaskSVGAttributes<T>
    extends Omit<ContainerElementSVGAttributes<T>, "opacity" | "filter">,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path"> {
    maskUnits?: FunctionMaybe<SVGUnits | undefined>;
    maskContentUnits?: FunctionMaybe<SVGUnits | undefined>;
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
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
      Pick<PresentationSVGAttributes, "clip-path" | "marker-start" | "marker-mid" | "marker-end"> {
    d?: FunctionMaybe<string | undefined>;
    pathLength?: FunctionMaybe<number | string | undefined>;
  }
  interface PatternSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      FitToViewBoxSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path" | "overflow" | "clip"> {
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    patternUnits?: FunctionMaybe<SVGUnits | undefined>;
    patternContentUnits?: FunctionMaybe<SVGUnits | undefined>;
    patternTransform?: FunctionMaybe<string | undefined>;
    href?: FunctionMaybe<string | undefined>;
  }
  interface PolygonSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path" | "marker-start" | "marker-mid" | "marker-end"> {
    points?: FunctionMaybe<string | undefined>;
  }
  interface PolylineSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path" | "marker-start" | "marker-mid" | "marker-end"> {
    points?: FunctionMaybe<string | undefined>;
  }
  interface RadialGradientSVGAttributes<T> extends GradientElementSVGAttributes<T> {
    cx?: FunctionMaybe<number | string | undefined>;
    cy?: FunctionMaybe<number | string | undefined>;
    r?: FunctionMaybe<number | string | undefined>;
    fx?: FunctionMaybe<number | string | undefined>;
    fy?: FunctionMaybe<number | string | undefined>;
  }
  interface RectSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path"> {
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    rx?: FunctionMaybe<number | string | undefined>;
    ry?: FunctionMaybe<number | string | undefined>;
  }
  interface SetSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      StylableSVGAttributes,
      AnimationTimingSVGAttributes {}
  interface StopSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "stop-color" | "stop-opacity"> {
    offset?: FunctionMaybe<number | string | undefined>;
  }
  interface SvgSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      NewViewportSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      FitToViewBoxSVGAttributes,
      ZoomAndPanSVGAttributes,
      PresentationSVGAttributes,
      WindowEventMap<T>,
      ElementEventMap<T> {
    version?: FunctionMaybe<string | undefined>;
    baseProfile?: FunctionMaybe<string | undefined>;
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    contentScriptType?: FunctionMaybe<string | undefined>;
    contentStyleType?: FunctionMaybe<string | undefined>;
    xmlns?: FunctionMaybe<string | undefined>;
    "xmlns:xlink"?: FunctionMaybe<string | undefined>;
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
      FitToViewBoxSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path"> {
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    preserveAspectRatio?: FunctionMaybe<SVGPreserveAspectRatio | undefined>;
    refX?: FunctionMaybe<number | string | undefined>;
    refY?: FunctionMaybe<number | string | undefined>;
    viewBox?: FunctionMaybe<string | undefined>;
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
  }
  interface TextSVGAttributes<T>
    extends TextContentElementSVGAttributes<T>,
      GraphicsElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path" | "writing-mode" | "text-rendering"> {
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    dx?: FunctionMaybe<number | string | undefined>;
    dy?: FunctionMaybe<number | string | undefined>;
    rotate?: FunctionMaybe<number | string | undefined>;
    textLength?: FunctionMaybe<number | string | undefined>;
    lengthAdjust?: FunctionMaybe<"spacing" | "spacingAndGlyphs" | undefined>;
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
    startOffset?: FunctionMaybe<number | string | undefined>;
    method?: FunctionMaybe<"align" | "stretch" | undefined>;
    spacing?: FunctionMaybe<"auto" | "exact" | undefined>;
    href?: FunctionMaybe<string | undefined>;
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
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    dx?: FunctionMaybe<number | string | undefined>;
    dy?: FunctionMaybe<number | string | undefined>;
    rotate?: FunctionMaybe<number | string | undefined>;
    textLength?: FunctionMaybe<number | string | undefined>;
    lengthAdjust?: FunctionMaybe<"spacing" | "spacingAndGlyphs" | undefined>;
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
    x?: FunctionMaybe<number | string | undefined>;
    y?: FunctionMaybe<number | string | undefined>;
    width?: FunctionMaybe<number | string | undefined>;
    height?: FunctionMaybe<number | string | undefined>;
    href?: FunctionMaybe<string | undefined>;
  }
  interface ViewSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      FitToViewBoxSVGAttributes,
      ZoomAndPanSVGAttributes {
    viewTarget?: FunctionMaybe<string | undefined>;
  }
  /** @type {HTMLElementTagNameMap} */
  interface HTMLElementTags {
    a: AnchorHTMLAttributes<HTMLAnchorElement>;
    abbr: HTMLAttributes<HTMLElement>;
    address: HTMLAttributes<HTMLElement>;
    area: AreaHTMLAttributes<HTMLAreaElement>;
    article: HTMLAttributes<HTMLElement>;
    aside: HTMLAttributes<HTMLElement>;
    audio: AudioHTMLAttributes<HTMLAudioElement>;
    b: HTMLAttributes<HTMLElement>;
    base: BaseHTMLAttributes<HTMLBaseElement>;
    bdi: HTMLAttributes<HTMLElement>;
    bdo: HTMLAttributes<HTMLElement>;
    blockquote: BlockquoteHTMLAttributes<HTMLElement>;
    body: BodyHTMLAttributes<HTMLBodyElement>;
    br: HTMLAttributes<HTMLBRElement>;
    button: ButtonHTMLAttributes<HTMLButtonElement>;
    canvas: CanvasHTMLAttributes<HTMLCanvasElement>;
    caption: HTMLAttributes<HTMLElement>;
    cite: HTMLAttributes<HTMLElement>;
    code: HTMLAttributes<HTMLElement>;
    col: ColHTMLAttributes<HTMLTableColElement>;
    colgroup: ColgroupHTMLAttributes<HTMLTableColElement>;
    data: DataHTMLAttributes<HTMLElement>;
    datalist: HTMLAttributes<HTMLDataListElement>;
    dd: HTMLAttributes<HTMLElement>;
    del: HTMLAttributes<HTMLElement>;
    details: DetailsHtmlAttributes<HTMLDetailsElement>;
    dfn: HTMLAttributes<HTMLElement>;
    dialog: DialogHtmlAttributes<HTMLDialogElement>;
    div: HTMLAttributes<HTMLDivElement>;
    dl: HTMLAttributes<HTMLDListElement>;
    dt: HTMLAttributes<HTMLElement>;
    em: HTMLAttributes<HTMLElement>;
    embed: EmbedHTMLAttributes<HTMLEmbedElement>;
    fieldset: FieldsetHTMLAttributes<HTMLFieldSetElement>;
    figcaption: HTMLAttributes<HTMLElement>;
    figure: HTMLAttributes<HTMLElement>;
    footer: HTMLAttributes<HTMLElement>;
    form: FormHTMLAttributes<HTMLFormElement>;
    h1: HTMLAttributes<HTMLHeadingElement>;
    h2: HTMLAttributes<HTMLHeadingElement>;
    h3: HTMLAttributes<HTMLHeadingElement>;
    h4: HTMLAttributes<HTMLHeadingElement>;
    h5: HTMLAttributes<HTMLHeadingElement>;
    h6: HTMLAttributes<HTMLHeadingElement>;
    head: HTMLAttributes<HTMLHeadElement>;
    header: HTMLAttributes<HTMLElement>;
    hgroup: HTMLAttributes<HTMLElement>;
    hr: HTMLAttributes<HTMLHRElement>;
    html: HTMLAttributes<HTMLHtmlElement>;
    i: HTMLAttributes<HTMLElement>;
    iframe: IframeHTMLAttributes<HTMLIFrameElement>;
    img: ImgHTMLAttributes<HTMLImageElement>;
    input: InputHTMLAttributes<HTMLInputElement>;
    ins: InsHTMLAttributes<HTMLModElement>;
    kbd: HTMLAttributes<HTMLElement>;
    label: LabelHTMLAttributes<HTMLLabelElement>;
    legend: HTMLAttributes<HTMLLegendElement>;
    li: LiHTMLAttributes<HTMLLIElement>;
    link: LinkHTMLAttributes<HTMLLinkElement>;
    main: HTMLAttributes<HTMLElement>;
    map: MapHTMLAttributes<HTMLMapElement>;
    mark: HTMLAttributes<HTMLElement>;
    menu: MenuHTMLAttributes<HTMLMenuElement>;
    meta: MetaHTMLAttributes<HTMLMetaElement>;
    meter: MeterHTMLAttributes<HTMLElement>;
    nav: HTMLAttributes<HTMLElement>;
    noscript: HTMLAttributes<HTMLElement>;
    object: ObjectHTMLAttributes<HTMLObjectElement>;
    ol: OlHTMLAttributes<HTMLOListElement>;
    optgroup: OptgroupHTMLAttributes<HTMLOptGroupElement>;
    option: OptionHTMLAttributes<HTMLOptionElement>;
    output: OutputHTMLAttributes<HTMLElement>;
    p: HTMLAttributes<HTMLParagraphElement>;
    picture: HTMLAttributes<HTMLElement>;
    pre: HTMLAttributes<HTMLPreElement>;
    progress: ProgressHTMLAttributes<HTMLProgressElement>;
    q: QuoteHTMLAttributes<HTMLQuoteElement>;
    rp: HTMLAttributes<HTMLElement>;
    rt: HTMLAttributes<HTMLElement>;
    ruby: HTMLAttributes<HTMLElement>;
    s: HTMLAttributes<HTMLElement>;
    samp: HTMLAttributes<HTMLElement>;
    script: ScriptHTMLAttributes<HTMLScriptElement>;
    search: HTMLAttributes<HTMLElement>;
    section: HTMLAttributes<HTMLElement>;
    select: SelectHTMLAttributes<HTMLSelectElement>;
    slot: HTMLSlotElementAttributes;
    small: HTMLAttributes<HTMLElement>;
    source: SourceHTMLAttributes<HTMLSourceElement>;
    span: HTMLAttributes<HTMLSpanElement>;
    strong: HTMLAttributes<HTMLElement>;
    style: StyleHTMLAttributes<HTMLStyleElement>;
    sub: HTMLAttributes<HTMLElement>;
    summary: HTMLAttributes<HTMLElement>;
    sup: HTMLAttributes<HTMLElement>;
    table: HTMLAttributes<HTMLTableElement>;
    tbody: HTMLAttributes<HTMLTableSectionElement>;
    td: TdHTMLAttributes<HTMLTableCellElement>;
    template: TemplateHTMLAttributes<HTMLTemplateElement>;
    textarea: TextareaHTMLAttributes<HTMLTextAreaElement>;
    tfoot: HTMLAttributes<HTMLTableSectionElement>;
    th: ThHTMLAttributes<HTMLTableCellElement>;
    thead: HTMLAttributes<HTMLTableSectionElement>;
    time: TimeHTMLAttributes<HTMLElement>;
    title: HTMLAttributes<HTMLTitleElement>;
    tr: HTMLAttributes<HTMLTableRowElement>;
    track: TrackHTMLAttributes<HTMLTrackElement>;
    u: HTMLAttributes<HTMLElement>;
    ul: HTMLAttributes<HTMLUListElement>;
    var: HTMLAttributes<HTMLElement>;
    video: VideoHTMLAttributes<HTMLVideoElement>;
    wbr: HTMLAttributes<HTMLElement>;
  }
  /** @type {HTMLElementDeprecatedTagNameMap} */
  interface HTMLElementDeprecatedTags {
    big: HTMLAttributes<HTMLElement>;
    keygen: KeygenHTMLAttributes<HTMLElement>;
    menuitem: HTMLAttributes<HTMLElement>;
    noindex: HTMLAttributes<HTMLElement>;
    param: ParamHTMLAttributes<HTMLParamElement>;
  }
  /** @type {SVGElementTagNameMap} */
  interface SVGElementTags {
    animate: AnimateSVGAttributes<SVGAnimateElement>;
    animateMotion: AnimateMotionSVGAttributes<SVGAnimateMotionElement>;
    animateTransform: AnimateTransformSVGAttributes<SVGAnimateTransformElement>;
    circle: CircleSVGAttributes<SVGCircleElement>;
    clipPath: ClipPathSVGAttributes<SVGClipPathElement>;
    defs: DefsSVGAttributes<SVGDefsElement>;
    desc: DescSVGAttributes<SVGDescElement>;
    ellipse: EllipseSVGAttributes<SVGEllipseElement>;
    feBlend: FeBlendSVGAttributes<SVGFEBlendElement>;
    feColorMatrix: FeColorMatrixSVGAttributes<SVGFEColorMatrixElement>;
    feComponentTransfer: FeComponentTransferSVGAttributes<SVGFEComponentTransferElement>;
    feComposite: FeCompositeSVGAttributes<SVGFECompositeElement>;
    feConvolveMatrix: FeConvolveMatrixSVGAttributes<SVGFEConvolveMatrixElement>;
    feDiffuseLighting: FeDiffuseLightingSVGAttributes<SVGFEDiffuseLightingElement>;
    feDisplacementMap: FeDisplacementMapSVGAttributes<SVGFEDisplacementMapElement>;
    feDistantLight: FeDistantLightSVGAttributes<SVGFEDistantLightElement>;
    feDropShadow: FeDropShadowSVGAttributes<SVGFEDropShadowElement>;
    feFlood: FeFloodSVGAttributes<SVGFEFloodElement>;
    feFuncA: FeFuncSVGAttributes<SVGFEFuncAElement>;
    feFuncB: FeFuncSVGAttributes<SVGFEFuncBElement>;
    feFuncG: FeFuncSVGAttributes<SVGFEFuncGElement>;
    feFuncR: FeFuncSVGAttributes<SVGFEFuncRElement>;
    feGaussianBlur: FeGaussianBlurSVGAttributes<SVGFEGaussianBlurElement>;
    feImage: FeImageSVGAttributes<SVGFEImageElement>;
    feMerge: FeMergeSVGAttributes<SVGFEMergeElement>;
    feMergeNode: FeMergeNodeSVGAttributes<SVGFEMergeNodeElement>;
    feMorphology: FeMorphologySVGAttributes<SVGFEMorphologyElement>;
    feOffset: FeOffsetSVGAttributes<SVGFEOffsetElement>;
    fePointLight: FePointLightSVGAttributes<SVGFEPointLightElement>;
    feSpecularLighting: FeSpecularLightingSVGAttributes<SVGFESpecularLightingElement>;
    feSpotLight: FeSpotLightSVGAttributes<SVGFESpotLightElement>;
    feTile: FeTileSVGAttributes<SVGFETileElement>;
    feTurbulence: FeTurbulanceSVGAttributes<SVGFETurbulenceElement>;
    filter: FilterSVGAttributes<SVGFilterElement>;
    foreignObject: ForeignObjectSVGAttributes<SVGForeignObjectElement>;
    g: GSVGAttributes<SVGGElement>;
    image: ImageSVGAttributes<SVGImageElement>;
    line: LineSVGAttributes<SVGLineElement>;
    linearGradient: LinearGradientSVGAttributes<SVGLinearGradientElement>;
    marker: MarkerSVGAttributes<SVGMarkerElement>;
    mask: MaskSVGAttributes<SVGMaskElement>;
    metadata: MetadataSVGAttributes<SVGMetadataElement>;
    mpath: MPathSVGAttributes<SVGMPathElement>;
    path: PathSVGAttributes<SVGPathElement>;
    pattern: PatternSVGAttributes<SVGPatternElement>;
    polygon: PolygonSVGAttributes<SVGPolygonElement>;
    polyline: PolylineSVGAttributes<SVGPolylineElement>;
    radialGradient: RadialGradientSVGAttributes<SVGRadialGradientElement>;
    rect: RectSVGAttributes<SVGRectElement>;
    set: SetSVGAttributes<SVGSetElement>;
    stop: StopSVGAttributes<SVGStopElement>;
    svg: SvgSVGAttributes<SVGSVGElement>;
    switch: SwitchSVGAttributes<SVGSwitchElement>;
    symbol: SymbolSVGAttributes<SVGSymbolElement>;
    text: TextSVGAttributes<SVGTextElement>;
    textPath: TextPathSVGAttributes<SVGTextPathElement>;
    tspan: TSpanSVGAttributes<SVGTSpanElement>;
    use: UseSVGAttributes<SVGUseElement>;
    view: ViewSVGAttributes<SVGViewElement>;
  }
  interface IntrinsicElements extends HTMLElementTags, HTMLElementDeprecatedTags, SVGElementTags {}
}
