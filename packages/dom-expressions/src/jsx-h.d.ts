import * as csstype from "csstype";

/**
 * Based on JSX types for Surplus and Inferno and adapted for `dom-expressions`.
 *
 * https://github.com/adamhaile/surplus/blob/master/index.d.ts
 * https://github.com/infernojs/inferno/blob/master/packages/inferno/src/core/types.ts
 */
type DOMElement = Element;

export namespace JSX {
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
  interface EventHandler<T, E extends Event> {
    (
      e: E & {
        currentTarget: T;
        target: DOMElement;
      }
    ): void;
  }

  interface BoundEventHandler<T, E extends Event> {
    0: (
      data: any,
      e: E & {
        currentTarget: T;
        target: DOMElement;
      }
    ) => void;
    1: any;
  }
  type EventHandlerUnion<T, E extends Event> = EventHandler<T, E> | BoundEventHandler<T, E>;

  interface EventHandlerWithOptions<T, E extends Event> extends AddEventListenerOptions {
    handleEvent: (
      e: E & {
        currentTarget: T;
        target: Element;
      }
    ) => void;
  }

  type EventHandlerWithOptionsUnion<T, E extends Event> =
    | EventHandler<T, E>
    | EventHandlerWithOptions<T, E>;

  const SERIALIZABLE: unique symbol;
  interface SerializableAttributeValue {
    toString(): string;
    [SERIALIZABLE]: never;
  }

  interface IntrinsicAttributes {
    ref?: unknown | ((e: unknown) => void);
  }
  interface CustomAttributes<T> {
    ref?: T | ((el: T) => void);
    classList?: {
      [k: string]: boolean | undefined;
    };
    $ServerOnly?: boolean;
  }
  type Accessor<T> = () => T;
  interface Directives {}
  interface DirectiveFunctions {
    [x: string]: (el: Element, accessor: Accessor<any>) => void;
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

  // events
  interface ElementEventMap<T> {
    onFullscreenChange?: EventHandlerUnion<T, Event> | undefined;
    onfullscreenchange?: EventHandlerUnion<T, Event> | undefined;
    "on:fullscreenchange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;

    onFullscreenError?: EventHandlerUnion<T, Event> | undefined;
    onfullscreenerror?: EventHandlerUnion<T, Event> | undefined;
    "on:FullscreenError"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
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
    onPageReveal?: EventHandlerUnion<T, PageRevealEvent> | undefined;
    onPageShow?: EventHandlerUnion<T, PageTransitionEvent> | undefined;
    onPageSwap?: EventHandlerUnion<T, PageSwapEvent> | undefined;
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
    onpagereveal?: EventHandlerUnion<T, PageRevealEvent> | undefined;
    onpageshow?: EventHandlerUnion<T, PageTransitionEvent> | undefined;
    onpageswap?: EventHandlerUnion<T, PageSwapEvent> | undefined;
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
    "on:pagereveal"?: EventHandlerWithOptionsUnion<T, PageRevealEvent> | undefined;
    "on:pageshow"?: EventHandlerWithOptionsUnion<T, PageTransitionEvent> | undefined;
    "on:pageswap"?: EventHandlerWithOptionsUnion<T, PageSwapEvent> | undefined;
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
    onCanPlay?: EventHandlerUnion<T, Event> | undefined;
    onCanPlayThrough?: EventHandlerUnion<T, Event> | undefined;
    onChange?: ChangeEventHandlerUnion<T, Event> | undefined;
    onClick?: EventHandlerUnion<T, MouseEvent> | undefined;
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
    onSelectStart?: EventHandlerUnion<T, Event> | undefined;
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
    oncanplay?: EventHandlerUnion<T, Event> | undefined;
    oncanplaythrough?: EventHandlerUnion<T, Event> | undefined;
    onchange?: ChangeEventHandlerUnion<T, Event> | undefined;
    onclick?: EventHandlerUnion<T, MouseEvent> | undefined;
    oncompositionend?: EventHandlerUnion<T, CompositionEvent> | undefined;
    oncompositionstart?: EventHandlerUnion<T, CompositionEvent> | undefined;
    oncompositionupdate?: EventHandlerUnion<T, CompositionEvent> | undefined;
    oncontextmenu?: EventHandlerUnion<T, MouseEvent> | undefined;
    oncopy?: EventHandlerUnion<T, ClipboardEvent> | undefined;
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
    onscroll?: EventHandlerUnion<T, Event> | undefined;
    onscrollend?: EventHandlerUnion<T, Event> | undefined;
    onseeked?: EventHandlerUnion<T, Event> | undefined;
    onseeking?: EventHandlerUnion<T, Event> | undefined;
    onselect?: EventHandlerUnion<T, Event> | undefined;
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
    "on:canplay"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:canplaythrough"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:change"?: EventHandlerWithOptionsUnion<T, Event, ChangeEventHandler<T, Event>> | undefined;
    "on:click"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:compositionend"?: EventHandlerWithOptionsUnion<T, CompositionEvent> | undefined;
    "on:compositionstart"?: EventHandlerWithOptionsUnion<T, CompositionEvent> | undefined;
    "on:compositionupdate"?: EventHandlerWithOptionsUnion<T, CompositionEvent> | undefined;
    "on:contextmenu"?: EventHandlerWithOptionsUnion<T, MouseEvent> | undefined;
    "on:copy"?: EventHandlerWithOptionsUnion<T, ClipboardEvent> | undefined;
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
    "on:encrypted"?: EventHandlerWithOptionsUnion<T, MediaEncryptedEvent> | undefined;
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
    "on:transitioncancel"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:transitionend"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:transitionrun"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:transitionstart"?: EventHandlerWithOptionsUnion<T, TransitionEvent> | undefined;
    "on:volumechange"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:waiting"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
    "on:wheel"?: EventHandlerWithOptionsUnion<T, WheelEvent> | undefined;
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
    | "allow-top-navigation-by-user-activation";
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
    "aria-activedescendant"?: string;
    /**
     * Indicates whether assistive technologies will present all, or only parts of, the changed
     * region based on the change notifications defined by the aria-relevant attribute.
     */
    "aria-atomic"?: boolean | "false" | "true";
    /**
     * Indicates whether inputting text could trigger display of one or more predictions of the
     * user's intended value for an input and specifies how predictions would be presented if they
     * are made.
     */
    "aria-autocomplete"?: "none" | "inline" | "list" | "both";
    /**
     * Indicates an element is being modified and that assistive technologies MAY want to wait until
     * the modifications are complete before exposing them to the user.
     */
    "aria-busy"?: boolean | "false" | "true";
    /**
     * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
     *
     * @see aria-pressed @see aria-selected.
     */
    "aria-checked"?: boolean | "false" | "mixed" | "true";
    /**
     * Defines the total number of columns in a table, grid, or treegrid.
     *
     * @see aria-colindex.
     */
    "aria-colcount"?: number | string;
    /**
     * Defines an element's column index or position with respect to the total number of columns
     * within a table, grid, or treegrid.
     *
     * @see aria-colcount @see aria-colspan.
     */
    "aria-colindex"?: number | string;
    /**
     * Defines the number of columns spanned by a cell or gridcell within a table, grid, or
     * treegrid.
     *
     * @see aria-colindex @see aria-rowspan.
     */
    "aria-colspan"?: number | string;
    /**
     * Identifies the element (or elements) whose contents or presence are controlled by the current
     * element.
     *
     * @see aria-owns.
     */
    "aria-controls"?: string;
    /**
     * Indicates the element that represents the current item within a container or set of related
     * elements.
     */
    "aria-current"?: boolean | "false" | "true" | "page" | "step" | "location" | "date" | "time";
    /**
     * Identifies the element (or elements) that describes the object.
     *
     * @see aria-labelledby
     */
    "aria-describedby"?: string;
    /**
     * Identifies the element that provides a detailed, extended description for the object.
     *
     * @see aria-describedby.
     */
    "aria-details"?: string;
    /**
     * Indicates that the element is perceivable but disabled, so it is not editable or otherwise
     * operable.
     *
     * @see aria-hidden @see aria-readonly.
     */
    "aria-disabled"?: boolean | "false" | "true";
    /**
     * Indicates what functions can be performed when a dragged object is released on the drop
     * target.
     *
     * @deprecated In ARIA 1.1
     */
    "aria-dropeffect"?: "none" | "copy" | "execute" | "link" | "move" | "popup";
    /**
     * Identifies the element that provides an error message for the object.
     *
     * @see aria-invalid @see aria-describedby.
     */
    "aria-errormessage"?: string;
    /**
     * Indicates whether the element, or another grouping element it controls, is currently expanded
     * or collapsed.
     */
    "aria-expanded"?: boolean | "false" | "true";
    /**
     * Identifies the next element (or elements) in an alternate reading order of content which, at
     * the user's discretion, allows assistive technology to override the general default of reading
     * in document source order.
     */
    "aria-flowto"?: string;
    /**
     * Indicates an element's "grabbed" state in a drag-and-drop operation.
     *
     * @deprecated In ARIA 1.1
     */
    "aria-grabbed"?: boolean | "false" | "true";
    /**
     * Indicates the availability and type of interactive popup element, such as menu or dialog,
     * that can be triggered by an element.
     */
    "aria-haspopup"?: boolean | "false" | "true" | "menu" | "listbox" | "tree" | "grid" | "dialog";
    /**
     * Indicates whether the element is exposed to an accessibility API.
     *
     * @see aria-disabled.
     */
    "aria-hidden"?: boolean | "false" | "true";
    /**
     * Indicates the entered value does not conform to the format expected by the application.
     *
     * @see aria-errormessage.
     */
    "aria-invalid"?: boolean | "false" | "true" | "grammar" | "spelling";
    /**
     * Indicates keyboard shortcuts that an author has implemented to activate or give focus to an
     * element.
     */
    "aria-keyshortcuts"?: string;
    /**
     * Defines a string value that labels the current element.
     *
     * @see aria-labelledby.
     */
    "aria-label"?: string;
    /**
     * Identifies the element (or elements) that labels the current element.
     *
     * @see aria-describedby.
     */
    "aria-labelledby"?: string;
    /** Defines the hierarchical level of an element within a structure. */
    "aria-level"?: number | string;
    /**
     * Indicates that an element will be updated, and describes the types of updates the user
     * agents, assistive technologies, and user can expect from the live region.
     */
    "aria-live"?: "off" | "assertive" | "polite";
    /** Indicates whether an element is modal when displayed. */
    "aria-modal"?: boolean | "false" | "true";
    /** Indicates whether a text box accepts multiple lines of input or only a single line. */
    "aria-multiline"?: boolean | "false" | "true";
    /**
     * Indicates that the user may select more than one item from the current selectable
     * descendants.
     */
    "aria-multiselectable"?: boolean | "false" | "true";
    /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
    "aria-orientation"?: "horizontal" | "vertical";
    /**
     * Identifies an element (or elements) in order to define a visual, functional, or contextual
     * parent/child relationship between DOM elements where the DOM hierarchy cannot be used to
     * represent the relationship.
     *
     * @see aria-controls.
     */
    "aria-owns"?: string;
    /**
     * Defines a short hint (a word or short phrase) intended to aid the user with data entry when
     * the control has no value. A hint could be a sample value or a brief description of the
     * expected format.
     */
    "aria-placeholder"?: string;
    /**
     * Defines an element's number or position in the current set of listitems or treeitems. Not
     * required if all elements in the set are present in the DOM.
     *
     * @see aria-setsize.
     */
    "aria-posinset"?: number | string;
    /**
     * Indicates the current "pressed" state of toggle buttons.
     *
     * @see aria-checked @see aria-selected.
     */
    "aria-pressed"?: boolean | "false" | "mixed" | "true";
    /**
     * Indicates that the element is not editable, but is otherwise operable.
     *
     * @see aria-disabled.
     */
    "aria-readonly"?: boolean | "false" | "true";
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
      | "text removals";
    /** Indicates that user input is required on the element before a form may be submitted. */
    "aria-required"?: boolean | "false" | "true";
    /** Defines a human-readable, author-localized description for the role of an element. */
    "aria-roledescription"?: string;
    /**
     * Defines the total number of rows in a table, grid, or treegrid.
     *
     * @see aria-rowindex.
     */
    "aria-rowcount"?: number | string;
    /**
     * Defines an element's row index or position with respect to the total number of rows within a
     * table, grid, or treegrid.
     *
     * @see aria-rowcount @see aria-rowspan.
     */
    "aria-rowindex"?: number | string;
    /**
     * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
     *
     * @see aria-rowindex @see aria-colspan.
     */
    "aria-rowspan"?: number | string;
    /**
     * Indicates the current "selected" state of various widgets.
     *
     * @see aria-checked @see aria-pressed.
     */
    "aria-selected"?: boolean | "false" | "true";
    /**
     * Defines the number of items in the current set of listitems or treeitems. Not required if all
     * elements in the set are present in the DOM.
     *
     * @see aria-posinset.
     */
    "aria-setsize"?: number | string;
    /** Indicates if items in a table or grid are sorted in ascending or descending order. */
    "aria-sort"?: "none" | "ascending" | "descending" | "other";
    /** Defines the maximum allowed value for a range widget. */
    "aria-valuemax"?: number | string;
    /** Defines the minimum allowed value for a range widget. */
    "aria-valuemin"?: number | string;
    /**
     * Defines the current value for a range widget.
     *
     * @see aria-valuetext.
     */
    "aria-valuenow"?: number | string;
    /** Defines the human readable text alternative of aria-valuenow for a range widget. */
    "aria-valuetext"?: string;
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
    >;
  }

  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    accessKey?: FunctionMaybe<string>;
    class?: FunctionMaybe<string> | undefined;
    contenteditable?: FunctionMaybe<boolean | "plaintext-only" | "inherit">;
    contextmenu?: FunctionMaybe<string>;
    dir?: FunctionMaybe<HTMLDir>;
    draggable?: FunctionMaybe<boolean>;
    hidden?: FunctionMaybe<boolean>;
    id?: FunctionMaybe<string>;
    lang?: FunctionMaybe<string>;
    spellcheck?: FunctionMaybe<boolean>;
    style?: FunctionMaybe<CSSProperties | string>;
    tabindex?: FunctionMaybe<number | string>;
    title?: FunctionMaybe<string>;
    translate?: FunctionMaybe<"yes" | "no">;
    about?: FunctionMaybe<string>;
    datatype?: FunctionMaybe<string>;
    inlist?: FunctionMaybe<any>;
    popover?: FunctionMaybe<boolean | "manual" | "auto">;
    prefix?: FunctionMaybe<string>;
    property?: FunctionMaybe<string>;
    resource?: FunctionMaybe<string>;
    typeof?: FunctionMaybe<string>;
    vocab?: FunctionMaybe<string>;
    autocapitalize?: FunctionMaybe<HTMLAutocapitalize>;
    slot?: FunctionMaybe<string>;
    color?: FunctionMaybe<string>;
    itemprop?: FunctionMaybe<string>;
    itemscope?: FunctionMaybe<boolean>;
    itemtype?: FunctionMaybe<string>;
    itemid?: FunctionMaybe<string>;
    itemref?: FunctionMaybe<string>;
    part?: FunctionMaybe<string>;
    exportparts?: FunctionMaybe<string>;
    inputmode?: FunctionMaybe<
      "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search"
    >;
    contentEditable?: FunctionMaybe<boolean | "plaintext-only" | "inherit">;
    contextMenu?: FunctionMaybe<string>;
    tabIndex?: FunctionMaybe<number | string>;
    autoCapitalize?: FunctionMaybe<HTMLAutocapitalize>;
    itemProp?: FunctionMaybe<string>;
    itemScope?: FunctionMaybe<boolean>;
    itemType?: FunctionMaybe<string>;
    itemId?: FunctionMaybe<string>;
    itemRef?: FunctionMaybe<string>;
    exportParts?: FunctionMaybe<string>;
    inputMode?: FunctionMaybe<
      "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search"
    >;
  }
  interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
    download?: FunctionMaybe<any>;
    href?: FunctionMaybe<string>;
    hreflang?: FunctionMaybe<string>;
    media?: FunctionMaybe<string>;
    ping?: FunctionMaybe<string>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy>;
    rel?: FunctionMaybe<string>;
    target?: FunctionMaybe<"_self" | "_blank" | "_parent" | "_top" | (string & {})>;
    type?: FunctionMaybe<string>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy>;
  }
  interface AudioHTMLAttributes<T> extends MediaHTMLAttributes<T> {}
  interface AreaHTMLAttributes<T> extends HTMLAttributes<T> {
    alt?: FunctionMaybe<string>;
    coords?: FunctionMaybe<string>;
    download?: FunctionMaybe<any>;
    href?: FunctionMaybe<string>;
    hreflang?: FunctionMaybe<string>;
    ping?: FunctionMaybe<string>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy>;
    rel?: FunctionMaybe<string>;
    shape?: FunctionMaybe<"rect" | "circle" | "poly" | "default">;
    target?: FunctionMaybe<string>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy>;
  }
  interface BaseHTMLAttributes<T> extends HTMLAttributes<T> {
    href?: FunctionMaybe<string>;
    target?: FunctionMaybe<string>;
  }
  interface BlockquoteHTMLAttributes<T> extends HTMLAttributes<T> {
    cite?: FunctionMaybe<string>;
  }
  interface BodyHTMLAttributes<T>
    extends HTMLAttributes<T>,
      WindowEventMap<T>,
      ElementEventMap<T> {}
  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    autofocus?: FunctionMaybe<boolean>;
    disabled?: FunctionMaybe<boolean>;
    form?: FunctionMaybe<string>;
    formaction?: FunctionMaybe<string | SerializableAttributeValue>;
    formenctype?: FunctionMaybe<HTMLFormEncType>;
    formmethod?: FunctionMaybe<HTMLFormMethod>;
    formnovalidate?: FunctionMaybe<boolean>;
    formtarget?: FunctionMaybe<string>;
    popovertarget?: FunctionMaybe<string>;
    popovertargetaction?: FunctionMaybe<"hide" | "show" | "toggle">;
    name?: FunctionMaybe<string>;
    type?: FunctionMaybe<"submit" | "reset" | "button">;
    value?: FunctionMaybe<string>;
    formAction?: FunctionMaybe<string | SerializableAttributeValue>;
    formEnctype?: FunctionMaybe<HTMLFormEncType>;
    formMethod?: FunctionMaybe<HTMLFormMethod>;
    formNoValidate?: FunctionMaybe<boolean>;
    formTarget?: FunctionMaybe<string>;
    popoverTarget?: FunctionMaybe<string>;
    popoverTargetAction?: FunctionMaybe<"hide" | "show" | "toggle">;
  }
  interface CanvasHTMLAttributes<T> extends HTMLAttributes<T> {
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;

    onContextLost?: EventHandlerUnion<T, Event> | undefined;
    oncontextlost?: EventHandlerUnion<T, Event> | undefined;
    "on:contextlost"?: EventHandlerWithOptionsUnion<T, Event> | undefined;

    onContextRestored?: EventHandlerUnion<T, Event> | undefined;
    oncontextrestored?: EventHandlerUnion<T, Event> | undefined;
    "on:contextrestored"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
  }
  interface ColHTMLAttributes<T> extends HTMLAttributes<T> {
    span?: FunctionMaybe<number | string>;
    width?: FunctionMaybe<number | string>;
  }
  interface ColgroupHTMLAttributes<T> extends HTMLAttributes<T> {
    span?: FunctionMaybe<number | string>;
  }
  interface DataHTMLAttributes<T> extends HTMLAttributes<T> {
    value?: FunctionMaybe<string | string[] | number>;
  }
  interface DetailsHtmlAttributes<T> extends HTMLAttributes<T> {
    open?: FunctionMaybe<boolean>;
  }
  interface DialogHtmlAttributes<T> extends HTMLAttributes<T> {
    open?: FunctionMaybe<boolean>;

    onClose?: EventHandlerUnion<T, Event> | undefined;
    onclose?: EventHandlerUnion<T, Event> | undefined;
    "on:close"?: EventHandlerWithOptionsUnion<T, Event> | undefined;

    onCancel?: EventHandlerUnion<T, Event> | undefined;
    oncancel?: EventHandlerUnion<T, Event> | undefined;
    "on:cancel"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
  }
  interface EmbedHTMLAttributes<T> extends HTMLAttributes<T> {
    height?: FunctionMaybe<number | string>;
    src?: FunctionMaybe<string>;
    type?: FunctionMaybe<string>;
    width?: FunctionMaybe<number | string>;
  }
  interface FieldsetHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: FunctionMaybe<boolean>;
    form?: FunctionMaybe<string>;
    name?: FunctionMaybe<string>;
  }
  interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
    "accept-charset"?: FunctionMaybe<string>;
    action?: FunctionMaybe<string | SerializableAttributeValue>;
    autocomplete?: FunctionMaybe<string>;
    encoding?: FunctionMaybe<HTMLFormEncType>;
    enctype?: FunctionMaybe<HTMLFormEncType>;
    method?: FunctionMaybe<HTMLFormMethod>;
    name?: FunctionMaybe<string>;
    novalidate?: FunctionMaybe<boolean>;
    target?: FunctionMaybe<string>;
    noValidate?: FunctionMaybe<boolean>;
  }
  interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
    allow?: FunctionMaybe<string>;
    allowfullscreen?: FunctionMaybe<boolean>;
    height?: FunctionMaybe<number | string>;
    name?: FunctionMaybe<string>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy>;
    sandbox?: HTMLIframeSandbox | string;
    src?: FunctionMaybe<string>;
    srcdoc?: FunctionMaybe<string>;
    width?: FunctionMaybe<number | string>;
    loading?: FunctionMaybe<"eager" | "lazy">;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy>;
  }
  interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
    alt?: FunctionMaybe<string>;
    crossorigin?: FunctionMaybe<HTMLCrossorigin>;
    decoding?: FunctionMaybe<"sync" | "async" | "auto">;
    height?: FunctionMaybe<number | string>;
    ismap?: FunctionMaybe<boolean>;
    isMap?: FunctionMaybe<boolean>;
    loading?: FunctionMaybe<"eager" | "lazy">;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy>;
    sizes?: FunctionMaybe<string>;
    src?: FunctionMaybe<string>;
    srcset?: FunctionMaybe<string>;
    srcSet?: FunctionMaybe<string>;
    usemap?: FunctionMaybe<string>;
    useMap?: FunctionMaybe<string>;
    width?: FunctionMaybe<number | string>;
    crossOrigin?: FunctionMaybe<HTMLCrossorigin>;
  }
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    accept?: FunctionMaybe<string>;
    alt?: FunctionMaybe<string>;
    autocomplete?: FunctionMaybe<string>;
    autofocus?: FunctionMaybe<boolean>;
    capture?: FunctionMaybe<boolean | string>;
    checked?: FunctionMaybe<boolean>;
    crossorigin?: FunctionMaybe<HTMLCrossorigin>;
    disabled?: FunctionMaybe<boolean>;
    form?: FunctionMaybe<string>;
    formaction?: FunctionMaybe<string | SerializableAttributeValue>;
    formenctype?: FunctionMaybe<HTMLFormEncType>;
    formmethod?: FunctionMaybe<HTMLFormMethod>;
    formnovalidate?: FunctionMaybe<boolean>;
    formtarget?: FunctionMaybe<string>;
    height?: FunctionMaybe<number | string>;
    list?: FunctionMaybe<string>;
    max?: FunctionMaybe<number | string>;
    maxlength?: FunctionMaybe<number | string>;
    min?: FunctionMaybe<number | string>;
    minlength?: FunctionMaybe<number | string>;
    multiple?: FunctionMaybe<boolean>;
    name?: FunctionMaybe<string>;
    pattern?: FunctionMaybe<string>;
    placeholder?: FunctionMaybe<string>;
    readonly?: FunctionMaybe<boolean>;
    required?: FunctionMaybe<boolean>;
    size?: FunctionMaybe<number | string>;
    src?: FunctionMaybe<string>;
    step?: FunctionMaybe<number | string>;
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
    >;
    value?: FunctionMaybe<string | string[] | number>;
    width?: FunctionMaybe<number | string>;
    crossOrigin?: FunctionMaybe<HTMLCrossorigin>;
    formAction?: FunctionMaybe<string | SerializableAttributeValue>;
    formEnctype?: FunctionMaybe<HTMLFormEncType>;
    formMethod?: FunctionMaybe<HTMLFormMethod>;
    formNoValidate?: FunctionMaybe<boolean>;
    formTarget?: FunctionMaybe<string>;
    maxLength?: FunctionMaybe<number | string>;
    minLength?: FunctionMaybe<number | string>;
    readOnly?: FunctionMaybe<boolean>;
  }
  interface InsHTMLAttributes<T> extends HTMLAttributes<T> {
    cite?: FunctionMaybe<string>;
    dateTime?: FunctionMaybe<string>;
  }
  interface KeygenHTMLAttributes<T> extends HTMLAttributes<T> {
    autofocus?: FunctionMaybe<boolean>;
    challenge?: FunctionMaybe<string>;
    disabled?: FunctionMaybe<boolean>;
    form?: FunctionMaybe<string>;
    keytype?: FunctionMaybe<string>;
    keyparams?: FunctionMaybe<string>;
    name?: FunctionMaybe<string>;
  }
  interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
    for?: FunctionMaybe<string>;
    form?: FunctionMaybe<string>;
  }
  interface LiHTMLAttributes<T> extends HTMLAttributes<T> {
    value?: FunctionMaybe<number | string>;
  }
  interface LinkHTMLAttributes<T> extends HTMLAttributes<T> {
    as?: FunctionMaybe<HTMLLinkAs>;
    crossorigin?: FunctionMaybe<HTMLCrossorigin>;
    disabled?: FunctionMaybe<boolean>;
    fetchpriority?: FunctionMaybe<"high" | "low" | "auto">;
    href?: FunctionMaybe<string>;
    hreflang?: FunctionMaybe<string>;
    imagesizes?: FunctionMaybe<string>;
    imagesrcset?: FunctionMaybe<string>;
    integrity?: FunctionMaybe<string>;
    media?: FunctionMaybe<string>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy>;
    rel?: FunctionMaybe<string>;
    sizes?: FunctionMaybe<string>;
    type?: FunctionMaybe<string>;
    crossOrigin?: FunctionMaybe<HTMLCrossorigin>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy>;
  }
  interface MapHTMLAttributes<T> extends HTMLAttributes<T> {
    name?: FunctionMaybe<string>;
  }
  interface MediaHTMLAttributes<T> extends HTMLAttributes<T>, ElementEventMap<T> {
    autoplay?: FunctionMaybe<boolean>;
    controls?: FunctionMaybe<boolean>;
    controlslist?: FunctionMaybe<
      "nodownload" | "nofullscreen" | "noplaybackrate" | "noremoteplayback" | (string & {})
    >;
    crossorigin?: FunctionMaybe<HTMLCrossorigin>;
    loop?: FunctionMaybe<boolean>;
    mediagroup?: FunctionMaybe<string>;
    muted?: FunctionMaybe<boolean>;
    preload?: FunctionMaybe<"none" | "metadata" | "auto" | "">;
    src?: FunctionMaybe<string>;
    crossOrigin?: FunctionMaybe<HTMLCrossorigin>;
    mediaGroup?: FunctionMaybe<string>;

    onEncrypted?: EventHandlerUnion<T, MediaEncryptedEvent> | undefined;
    onencrypted?: EventHandlerUnion<T, MediaEncryptedEvent> | undefined;
    "on:encrypted"?: EventHandlerWithOptionsUnion<T, MediaEncryptedEvent> | undefined;

    onWaitingForKey?: EventHandlerUnion<T, Event> | undefined;
    onwaitingforkey?: EventHandlerUnion<T, Event> | undefined;
    "on:waitingforkey"?: EventHandlerWithOptionsUnion<T, Event> | undefined;
  }
  interface MenuHTMLAttributes<T> extends HTMLAttributes<T> {
    label?: FunctionMaybe<string>;
    type?: FunctionMaybe<"context" | "toolbar">;
  }
  interface MetaHTMLAttributes<T> extends HTMLAttributes<T> {
    charset?: FunctionMaybe<string>;
    content?: FunctionMaybe<string>;
    "http-equiv"?: FunctionMaybe<string>;
    name?: FunctionMaybe<string>;
    media?: FunctionMaybe<string>;
  }
  interface MeterHTMLAttributes<T> extends HTMLAttributes<T> {
    form?: FunctionMaybe<string>;
    high?: FunctionMaybe<number | string>;
    low?: FunctionMaybe<number | string>;
    max?: FunctionMaybe<number | string>;
    min?: FunctionMaybe<number | string>;
    optimum?: FunctionMaybe<number | string>;
    value?: FunctionMaybe<string | string[] | number>;
  }
  interface QuoteHTMLAttributes<T> extends HTMLAttributes<T> {
    cite?: FunctionMaybe<string>;
  }
  interface ObjectHTMLAttributes<T> extends HTMLAttributes<T> {
    data?: FunctionMaybe<string>;
    form?: FunctionMaybe<string>;
    height?: FunctionMaybe<number | string>;
    name?: FunctionMaybe<string>;
    type?: FunctionMaybe<string>;
    usemap?: FunctionMaybe<string>;
    width?: FunctionMaybe<number | string>;
    useMap?: FunctionMaybe<string>;
  }
  interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
    reversed?: FunctionMaybe<boolean>;
    start?: FunctionMaybe<number | string>;
    type?: FunctionMaybe<"1" | "a" | "A" | "i" | "I">;
  }
  interface OptgroupHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: FunctionMaybe<boolean>;
    label?: FunctionMaybe<string>;
  }
  interface OptionHTMLAttributes<T> extends HTMLAttributes<T> {
    disabled?: FunctionMaybe<boolean>;
    label?: FunctionMaybe<string>;
    selected?: FunctionMaybe<boolean>;
    value?: FunctionMaybe<string | string[] | number>;
  }
  interface OutputHTMLAttributes<T> extends HTMLAttributes<T> {
    form?: FunctionMaybe<string>;
    for?: FunctionMaybe<string>;
    name?: FunctionMaybe<string>;
  }
  interface ParamHTMLAttributes<T> extends HTMLAttributes<T> {
    name?: FunctionMaybe<string>;
    value?: FunctionMaybe<string | string[] | number>;
  }
  interface ProgressHTMLAttributes<T> extends HTMLAttributes<T> {
    max?: FunctionMaybe<number | string>;
    value?: FunctionMaybe<string | string[] | number>;
  }
  interface ScriptHTMLAttributes<T> extends HTMLAttributes<T> {
    async?: FunctionMaybe<boolean>;
    charset?: FunctionMaybe<string>;
    crossorigin?: FunctionMaybe<HTMLCrossorigin>;
    defer?: FunctionMaybe<boolean>;
    integrity?: FunctionMaybe<string>;
    nomodule?: FunctionMaybe<boolean>;
    nonce?: FunctionMaybe<string>;
    referrerpolicy?: FunctionMaybe<HTMLReferrerPolicy>;
    src?: FunctionMaybe<string>;
    type?: FunctionMaybe<string>;
    crossOrigin?: FunctionMaybe<HTMLCrossorigin>;
    noModule?: FunctionMaybe<boolean>;
    referrerPolicy?: FunctionMaybe<HTMLReferrerPolicy>;
  }
  interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
    autocomplete?: FunctionMaybe<string>;
    autofocus?: FunctionMaybe<boolean>;
    disabled?: FunctionMaybe<boolean>;
    form?: FunctionMaybe<string>;
    multiple?: FunctionMaybe<boolean>;
    name?: FunctionMaybe<string>;
    required?: FunctionMaybe<boolean>;
    size?: FunctionMaybe<number | string>;
    value?: FunctionMaybe<string | string[] | number>;
  }
  interface HTMLSlotElementAttributes<T = HTMLSlotElement> extends HTMLAttributes<T> {
    name?: FunctionMaybe<string>;
  }
  interface SourceHTMLAttributes<T> extends HTMLAttributes<T> {
    media?: FunctionMaybe<string>;
    sizes?: FunctionMaybe<string>;
    src?: FunctionMaybe<string>;
    srcset?: FunctionMaybe<string>;
    type?: FunctionMaybe<string>;
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
  }
  interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
    media?: FunctionMaybe<string>;
    nonce?: FunctionMaybe<string>;
    scoped?: FunctionMaybe<boolean>;
    type?: FunctionMaybe<string>;
  }
  interface TdHTMLAttributes<T> extends HTMLAttributes<T> {
    colspan?: FunctionMaybe<number | string>;
    headers?: FunctionMaybe<string>;
    rowspan?: FunctionMaybe<number | string>;
    colSpan?: FunctionMaybe<number | string>;
    rowSpan?: FunctionMaybe<number | string>;
  }
  interface TemplateHTMLAttributes<T extends HTMLTemplateElement> extends HTMLAttributes<T> {
    content?: FunctionMaybe<DocumentFragment>;
  }
  interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
    autocomplete?: FunctionMaybe<string>;
    autofocus?: FunctionMaybe<boolean>;
    cols?: FunctionMaybe<number | string>;
    dirname?: FunctionMaybe<string>;
    disabled?: FunctionMaybe<boolean>;
    form?: FunctionMaybe<string>;
    maxlength?: FunctionMaybe<number | string>;
    minlength?: FunctionMaybe<number | string>;
    name?: FunctionMaybe<string>;
    placeholder?: FunctionMaybe<string>;
    readonly?: FunctionMaybe<boolean>;
    required?: FunctionMaybe<boolean>;
    rows?: FunctionMaybe<number | string>;
    value?: FunctionMaybe<string | string[] | number>;
    wrap?: FunctionMaybe<"hard" | "soft" | "off">;
    maxLength?: FunctionMaybe<number | string>;
    minLength?: FunctionMaybe<number | string>;
    readOnly?: FunctionMaybe<boolean>;
  }
  interface ThHTMLAttributes<T> extends HTMLAttributes<T> {
    colspan?: FunctionMaybe<number | string>;
    headers?: FunctionMaybe<string>;
    rowspan?: FunctionMaybe<number | string>;
    colSpan?: FunctionMaybe<number | string>;
    rowSpan?: FunctionMaybe<number | string>;
    scope?: FunctionMaybe<"col" | "row" | "rowgroup" | "colgroup">;
  }
  interface TimeHTMLAttributes<T> extends HTMLAttributes<T> {
    datetime?: FunctionMaybe<string>;
    dateTime?: FunctionMaybe<string>;
  }
  interface TrackHTMLAttributes<T> extends HTMLAttributes<T> {
    default?: FunctionMaybe<boolean>;
    kind?: FunctionMaybe<"subtitles" | "captions" | "descriptions" | "chapters" | "metadata">;
    label?: FunctionMaybe<string>;
    src?: FunctionMaybe<string>;
    srclang?: FunctionMaybe<string>;
  }
  interface VideoHTMLAttributes<T> extends MediaHTMLAttributes<T> {
    height?: FunctionMaybe<number | string>;
    playsinline?: FunctionMaybe<boolean>;
    poster?: FunctionMaybe<string>;
    width?: FunctionMaybe<number | string>;
    disablepictureinpicture?: FunctionMaybe<boolean>;
    disableremoteplayback?: FunctionMaybe<boolean>;

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
    id?: FunctionMaybe<string>;
    lang?: FunctionMaybe<string>;
    tabIndex?: FunctionMaybe<number | string>;
    tabindex?: FunctionMaybe<number | string>;
  }
  interface StylableSVGAttributes {
    class?: FunctionMaybe<string> | undefined;
    style?: FunctionMaybe<CSSProperties | string>;
  }
  interface TransformableSVGAttributes {
    transform?: FunctionMaybe<string>;
  }
  interface ConditionalProcessingSVGAttributes {
    requiredExtensions?: FunctionMaybe<string>;
    requiredFeatures?: FunctionMaybe<string>;
    systemLanguage?: FunctionMaybe<string>;
  }
  interface ExternalResourceSVGAttributes {
    externalResourcesRequired?: FunctionMaybe<"true" | "false">;
  }
  interface AnimationTimingSVGAttributes {
    begin?: FunctionMaybe<string>;
    dur?: FunctionMaybe<string>;
    end?: FunctionMaybe<string>;
    min?: FunctionMaybe<string>;
    max?: FunctionMaybe<string>;
    restart?: FunctionMaybe<"always" | "whenNotActive" | "never">;
    repeatCount?: FunctionMaybe<number | "indefinite">;
    repeatDur?: FunctionMaybe<string>;
    fill?: FunctionMaybe<"freeze" | "remove">;
  }
  interface AnimationValueSVGAttributes {
    calcMode?: FunctionMaybe<"discrete" | "linear" | "paced" | "spline">;
    values?: FunctionMaybe<string>;
    keyTimes?: FunctionMaybe<string>;
    keySplines?: FunctionMaybe<string>;
    from?: FunctionMaybe<number | string>;
    to?: FunctionMaybe<number | string>;
    by?: FunctionMaybe<number | string>;
  }
  interface AnimationAdditionSVGAttributes {
    attributeName?: FunctionMaybe<string>;
    additive?: FunctionMaybe<"replace" | "sum">;
    accumulate?: FunctionMaybe<"none" | "sum">;
  }
  interface AnimationAttributeTargetSVGAttributes {
    attributeName?: FunctionMaybe<string>;
    attributeType?: FunctionMaybe<"CSS" | "XML" | "auto">;
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
      | "inherit";
    "baseline-shift"?: FunctionMaybe<number | string>;
    clip?: FunctionMaybe<string>;
    "clip-path"?: FunctionMaybe<string>;
    "clip-rule"?: "nonzero" | "evenodd" | "inherit";
    color?: FunctionMaybe<string>;
    "color-interpolation"?: "auto" | "sRGB" | "linearRGB" | "inherit";
    "color-interpolation-filters"?: "auto" | "sRGB" | "linearRGB" | "inherit";
    "color-profile"?: FunctionMaybe<string>;
    "color-rendering"?: "auto" | "optimizeSpeed" | "optimizeQuality" | "inherit";
    cursor?: FunctionMaybe<string>;
    direction?: "ltr" | "rtl" | "inherit";
    display?: FunctionMaybe<string>;
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
      | "inherit";
    "enable-background"?: FunctionMaybe<string>;
    fill?: FunctionMaybe<string>;
    "fill-opacity"?: FunctionMaybe<number | string | "inherit">;
    "fill-rule"?: FunctionMaybe<"nonzero" | "evenodd" | "inherit">;
    filter?: FunctionMaybe<string>;
    "flood-color"?: FunctionMaybe<string>;
    "flood-opacity"?: FunctionMaybe<number | string | "inherit">;
    "font-family"?: FunctionMaybe<string>;
    "font-size"?: FunctionMaybe<string>;
    "font-size-adjust"?: FunctionMaybe<number | string>;
    "font-stretch"?: FunctionMaybe<string>;
    "font-style"?: FunctionMaybe<"normal" | "italic" | "oblique" | "inherit">;
    "font-variant"?: FunctionMaybe<string>;
    "font-weight"?: FunctionMaybe<number | string>;
    "glyph-orientation-horizontal"?: FunctionMaybe<string>;
    "glyph-orientation-vertical"?: FunctionMaybe<string>;
    "image-rendering"?: FunctionMaybe<"auto" | "optimizeQuality" | "optimizeSpeed" | "inherit">;
    kerning?: FunctionMaybe<string>;
    "letter-spacing"?: FunctionMaybe<number | string>;
    "lighting-color"?: FunctionMaybe<string>;
    "marker-end"?: FunctionMaybe<string>;
    "marker-mid"?: FunctionMaybe<string>;
    "marker-start"?: FunctionMaybe<string>;
    mask?: FunctionMaybe<string>;
    opacity?: FunctionMaybe<number | string | "inherit">;
    overflow?: FunctionMaybe<"visible" | "hidden" | "scroll" | "auto" | "inherit">;
    pathLength?: FunctionMaybe<string | number>;
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
    >;
    "shape-rendering"?: FunctionMaybe<
      "auto" | "optimizeSpeed" | "crispEdges" | "geometricPrecision" | "inherit"
    >;
    "stop-color"?: FunctionMaybe<string>;
    "stop-opacity"?: FunctionMaybe<number | string | "inherit">;
    stroke?: FunctionMaybe<string>;
    "stroke-dasharray"?: FunctionMaybe<string>;
    "stroke-dashoffset"?: FunctionMaybe<number | string>;
    "stroke-linecap"?: FunctionMaybe<"butt" | "round" | "square" | "inherit">;
    "stroke-linejoin"?: FunctionMaybe<
      "arcs" | "bevel" | "miter" | "miter-clip" | "round" | "inherit"
    >;
    "stroke-miterlimit"?: FunctionMaybe<number | string | "inherit">;
    "stroke-opacity"?: FunctionMaybe<number | string | "inherit">;
    "stroke-width"?: FunctionMaybe<number | string>;
    "text-anchor"?: FunctionMaybe<"start" | "middle" | "end" | "inherit">;
    "text-decoration"?: FunctionMaybe<
      "none" | "underline" | "overline" | "line-through" | "blink" | "inherit"
    >;
    "text-rendering"?: FunctionMaybe<
      "auto" | "optimizeSpeed" | "optimizeLegibility" | "geometricPrecision" | "inherit"
    >;
    "unicode-bidi"?: FunctionMaybe<string>;
    visibility?: FunctionMaybe<"visible" | "hidden" | "collapse" | "inherit">;
    "word-spacing"?: FunctionMaybe<number | string>;
    "writing-mode"?: FunctionMaybe<"lr-tb" | "rl-tb" | "tb-rl" | "lr" | "rl" | "tb" | "inherit">;
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
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
    result?: FunctionMaybe<string>;
  }
  interface SingleInputFilterSVGAttributes {
    in?: FunctionMaybe<string>;
  }
  interface DoubleInputFilterSVGAttributes {
    in?: FunctionMaybe<string>;
    in2?: FunctionMaybe<string>;
  }
  interface FitToViewBoxSVGAttributes {
    viewBox?: FunctionMaybe<string>;
    preserveAspectRatio?: FunctionMaybe<SVGPreserveAspectRatio>;
  }
  interface GradientElementSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    gradientUnits?: FunctionMaybe<SVGUnits>;
    gradientTransform?: FunctionMaybe<string>;
    spreadMethod?: FunctionMaybe<"pad" | "reflect" | "repeat">;
    href?: FunctionMaybe<string>;
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
    viewBox?: FunctionMaybe<string>;
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
    zoomAndPan?: FunctionMaybe<"disable" | "magnify">;
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
    path?: FunctionMaybe<string>;
    keyPoints?: FunctionMaybe<string>;
    rotate?: FunctionMaybe<number | string | "auto" | "auto-reverse">;
    origin?: FunctionMaybe<"default">;
  }
  interface AnimateTransformSVGAttributes<T>
    extends AnimationElementSVGAttributes<T>,
      AnimationAttributeTargetSVGAttributes,
      AnimationTimingSVGAttributes,
      AnimationValueSVGAttributes,
      AnimationAdditionSVGAttributes {
    type?: FunctionMaybe<"translate" | "scale" | "rotate" | "skewX" | "skewY">;
  }
  interface CircleSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes {
    cx?: FunctionMaybe<number | string>;
    cy?: FunctionMaybe<number | string>;
    r?: FunctionMaybe<number | string>;
  }
  interface ClipPathSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "clip-path"> {
    clipPathUnits?: FunctionMaybe<SVGUnits>;
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
    cx?: FunctionMaybe<number | string>;
    cy?: FunctionMaybe<number | string>;
    rx?: FunctionMaybe<number | string>;
    ry?: FunctionMaybe<number | string>;
  }
  interface FeBlendSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      DoubleInputFilterSVGAttributes,
      StylableSVGAttributes {
    mode?: FunctionMaybe<"normal" | "multiply" | "screen" | "darken" | "lighten">;
  }
  interface FeColorMatrixSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    type?: FunctionMaybe<"matrix" | "saturate" | "hueRotate" | "luminanceToAlpha">;
    values?: FunctionMaybe<string>;
  }
  interface FeComponentTransferSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {}
  interface FeCompositeSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      DoubleInputFilterSVGAttributes,
      StylableSVGAttributes {
    operator?: FunctionMaybe<"over" | "in" | "out" | "atop" | "xor" | "arithmetic">;
    k1?: FunctionMaybe<number | string>;
    k2?: FunctionMaybe<number | string>;
    k3?: FunctionMaybe<number | string>;
    k4?: FunctionMaybe<number | string>;
  }
  interface FeConvolveMatrixSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    order?: FunctionMaybe<number | string>;
    kernelMatrix?: FunctionMaybe<string>;
    divisor?: FunctionMaybe<number | string>;
    bias?: FunctionMaybe<number | string>;
    targetX?: FunctionMaybe<number | string>;
    targetY?: FunctionMaybe<number | string>;
    edgeMode?: FunctionMaybe<"duplicate" | "wrap" | "none">;
    kernelUnitLength?: FunctionMaybe<number | string>;
    preserveAlpha?: FunctionMaybe<"true" | "false">;
  }
  interface FeDiffuseLightingSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "lighting-color"> {
    surfaceScale?: FunctionMaybe<number | string>;
    diffuseConstant?: FunctionMaybe<number | string>;
    kernelUnitLength?: FunctionMaybe<number | string>;
  }
  interface FeDisplacementMapSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      DoubleInputFilterSVGAttributes,
      StylableSVGAttributes {
    scale?: FunctionMaybe<number | string>;
    xChannelSelector?: FunctionMaybe<"R" | "G" | "B" | "A">;
    yChannelSelector?: FunctionMaybe<"R" | "G" | "B" | "A">;
  }
  interface FeDistantLightSVGAttributes<T> extends LightSourceElementSVGAttributes<T> {
    azimuth?: FunctionMaybe<number | string>;
    elevation?: FunctionMaybe<number | string>;
  }
  interface FeDropShadowSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      FilterPrimitiveElementSVGAttributes<T>,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "flood-color" | "flood-opacity"> {
    dx?: FunctionMaybe<number | string>;
    dy?: FunctionMaybe<number | string>;
    stdDeviation?: FunctionMaybe<number | string>;
  }
  interface FeFloodSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "flood-color" | "flood-opacity"> {}
  interface FeFuncSVGAttributes<T> extends CoreSVGAttributes<T> {
    type?: "identity" | "table" | "discrete" | "linear" | "gamma";
    tableValues?: FunctionMaybe<string>;
    slope?: FunctionMaybe<number | string>;
    intercept?: FunctionMaybe<number | string>;
    amplitude?: FunctionMaybe<number | string>;
    exponent?: FunctionMaybe<number | string>;
    offset?: FunctionMaybe<number | string>;
  }
  interface FeGaussianBlurSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    stdDeviation?: FunctionMaybe<number | string>;
  }
  interface FeImageSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    preserveAspectRatio?: FunctionMaybe<SVGPreserveAspectRatio>;
    href?: FunctionMaybe<string>;
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
    operator?: FunctionMaybe<"erode" | "dilate">;
    radius?: FunctionMaybe<number | string>;
  }
  interface FeOffsetSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {
    dx?: FunctionMaybe<number | string>;
    dy?: FunctionMaybe<number | string>;
  }
  interface FePointLightSVGAttributes<T> extends LightSourceElementSVGAttributes<T> {
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    z?: FunctionMaybe<number | string>;
  }
  interface FeSpecularLightingSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "lighting-color"> {
    surfaceScale?: FunctionMaybe<string>;
    specularConstant?: FunctionMaybe<string>;
    specularExponent?: FunctionMaybe<string>;
    kernelUnitLength?: FunctionMaybe<number | string>;
  }
  interface FeSpotLightSVGAttributes<T> extends LightSourceElementSVGAttributes<T> {
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    z?: FunctionMaybe<number | string>;
    pointsAtX?: FunctionMaybe<number | string>;
    pointsAtY?: FunctionMaybe<number | string>;
    pointsAtZ?: FunctionMaybe<number | string>;
    specularExponent?: FunctionMaybe<number | string>;
    limitingConeAngle?: FunctionMaybe<number | string>;
  }
  interface FeTileSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      SingleInputFilterSVGAttributes,
      StylableSVGAttributes {}
  interface FeTurbulanceSVGAttributes<T>
    extends FilterPrimitiveElementSVGAttributes<T>,
      StylableSVGAttributes {
    baseFrequency?: FunctionMaybe<number | string>;
    numOctaves?: FunctionMaybe<number | string>;
    seed?: FunctionMaybe<number | string>;
    stitchTiles?: FunctionMaybe<"stitch" | "noStitch">;
    type?: FunctionMaybe<"fractalNoise" | "turbulence">;
  }
  interface FilterSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    filterUnits?: FunctionMaybe<SVGUnits>;
    primitiveUnits?: FunctionMaybe<SVGUnits>;
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
    filterRes?: FunctionMaybe<number | string>;
  }
  interface ForeignObjectSVGAttributes<T>
    extends NewViewportSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "display" | "visibility"> {
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
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
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
    preserveAspectRatio?: FunctionMaybe<ImagePreserveAspectRatio>;
    href?: FunctionMaybe<string>;
  }
  interface LineSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "marker-start" | "marker-mid" | "marker-end"> {
    x1?: FunctionMaybe<number | string>;
    y1?: FunctionMaybe<number | string>;
    x2?: FunctionMaybe<number | string>;
    y2?: FunctionMaybe<number | string>;
  }
  interface LinearGradientSVGAttributes<T> extends GradientElementSVGAttributes<T> {
    x1?: FunctionMaybe<number | string>;
    x2?: FunctionMaybe<number | string>;
    y1?: FunctionMaybe<number | string>;
    y2?: FunctionMaybe<number | string>;
  }
  interface MarkerSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      FitToViewBoxSVGAttributes,
      Pick<PresentationSVGAttributes, "overflow" | "clip"> {
    markerUnits?: FunctionMaybe<"strokeWidth" | "userSpaceOnUse">;
    refX?: FunctionMaybe<number | string>;
    refY?: FunctionMaybe<number | string>;
    markerWidth?: FunctionMaybe<number | string>;
    markerHeight?: FunctionMaybe<number | string>;
    orient?: FunctionMaybe<string>;
  }
  interface MaskSVGAttributes<T>
    extends Omit<ContainerElementSVGAttributes<T>, "opacity" | "filter">,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes {
    maskUnits?: FunctionMaybe<SVGUnits>;
    maskContentUnits?: FunctionMaybe<SVGUnits>;
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
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
    d?: FunctionMaybe<string>;
    pathLength?: FunctionMaybe<number | string>;
  }
  interface PatternSVGAttributes<T>
    extends ContainerElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      FitToViewBoxSVGAttributes,
      Pick<PresentationSVGAttributes, "overflow" | "clip"> {
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
    patternUnits?: FunctionMaybe<SVGUnits>;
    patternContentUnits?: FunctionMaybe<SVGUnits>;
    patternTransform?: FunctionMaybe<string>;
    href?: string;
  }
  interface PolygonSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "marker-start" | "marker-mid" | "marker-end"> {
    points?: FunctionMaybe<string>;
  }
  interface PolylineSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "marker-start" | "marker-mid" | "marker-end"> {
    points?: FunctionMaybe<string>;
  }
  interface RadialGradientSVGAttributes<T> extends GradientElementSVGAttributes<T> {
    cx?: FunctionMaybe<number | string>;
    cy?: FunctionMaybe<number | string>;
    r?: FunctionMaybe<number | string>;
    fx?: FunctionMaybe<number | string>;
    fy?: FunctionMaybe<number | string>;
  }
  interface RectSVGAttributes<T>
    extends GraphicsElementSVGAttributes<T>,
      ShapeElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes {
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
    rx?: FunctionMaybe<number | string>;
    ry?: FunctionMaybe<number | string>;
  }
  interface SetSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      StylableSVGAttributes,
      AnimationTimingSVGAttributes {}
  interface StopSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      StylableSVGAttributes,
      Pick<PresentationSVGAttributes, "color" | "stop-color" | "stop-opacity"> {
    offset?: FunctionMaybe<number | string>;
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
    version?: FunctionMaybe<string>;
    baseProfile?: FunctionMaybe<string>;
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
    contentScriptType?: FunctionMaybe<string>;
    contentStyleType?: FunctionMaybe<string>;
    xmlns?: FunctionMaybe<string>;
    "xmlns:xlink"?: FunctionMaybe<string>;
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
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
    preserveAspectRatio?: FunctionMaybe<SVGPreserveAspectRatio>;
    refX?: FunctionMaybe<number | string>;
    refY?: FunctionMaybe<number | string>;
    viewBox?: FunctionMaybe<string>;
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
  }
  interface TextSVGAttributes<T>
    extends TextContentElementSVGAttributes<T>,
      GraphicsElementSVGAttributes<T>,
      ConditionalProcessingSVGAttributes,
      ExternalResourceSVGAttributes,
      StylableSVGAttributes,
      TransformableSVGAttributes,
      Pick<PresentationSVGAttributes, "writing-mode" | "text-rendering"> {
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    dx?: FunctionMaybe<number | string>;
    dy?: FunctionMaybe<number | string>;
    rotate?: FunctionMaybe<number | string>;
    textLength?: FunctionMaybe<number | string>;
    lengthAdjust?: FunctionMaybe<"spacing" | "spacingAndGlyphs">;
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
    startOffset?: FunctionMaybe<number | string>;
    method?: FunctionMaybe<"align" | "stretch">;
    spacing?: FunctionMaybe<"auto" | "exact">;
    href?: FunctionMaybe<string>;
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
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    dx?: FunctionMaybe<number | string>;
    dy?: FunctionMaybe<number | string>;
    rotate?: FunctionMaybe<number | string>;
    textLength?: FunctionMaybe<number | string>;
    lengthAdjust?: FunctionMaybe<"spacing" | "spacingAndGlyphs">;
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
    x?: FunctionMaybe<number | string>;
    y?: FunctionMaybe<number | string>;
    width?: FunctionMaybe<number | string>;
    height?: FunctionMaybe<number | string>;
    href?: FunctionMaybe<string>;
  }
  interface ViewSVGAttributes<T>
    extends CoreSVGAttributes<T>,
      ExternalResourceSVGAttributes,
      FitToViewBoxSVGAttributes,
      ZoomAndPanSVGAttributes {
    viewTarget?: FunctionMaybe<string>;
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
    menu: MenuHTMLAttributes<HTMLElement>;
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
