import { JSX } from "../src/jsx";

/**
 * Statically verify type definitions of `jsx-runtime`.
 *
 * This file checks that JSX interfaces extend built-in type definitions from dom.
 * It's not meant to be run with unit tests; it will only report errors in your IDE or `tsc`.
 */

function verifyHTMLElementTags(t: keyof HTMLElementTagNameMap): keyof JSX.HTMLElementTags {
  return t;
}

type SvgTagsNoDuplicates = keyof JSX.SVGElementTags | "a" | "script" | "style" | "title";
function verifySVGElementTags(t: keyof SVGElementTagNameMap): SvgTagsNoDuplicates {
  return t;
}

interface EventHandlersWithUnimplemented extends JSX.CustomEventHandlersLowerCase<{}> {
  onanimationcancel: any;
  oncancel: any;
  onclose: any;
  oncuechange: any;
  onformdata: any;
  onresize: any;
  onsecuritypolicyviolation: any;
  onselectionchange: any;
  onselectstart: any;
  onslotchange: any;
  ontoggle: any;
  onwebkitanimationend: any;
  onwebkitanimationiteration: any;
  onwebkitanimationstart: any;
  onwebkittransitionend: any;
  addEventListener: any;
  removeEventListener: any;
}

function verifyCustomGlobalEventHandlers(
  t: keyof GlobalEventHandlers
): keyof EventHandlersWithUnimplemented {
  return t;
}

type LoweredEventHandlerNames = Lowercase<keyof JSX.CustomEventHandlersCamelCase<{}>>;
function verifyEventHandlerCaseMatches(
  t: keyof JSX.CustomEventHandlersLowerCase<{}>
): LoweredEventHandlerNames {
  return t;
}
