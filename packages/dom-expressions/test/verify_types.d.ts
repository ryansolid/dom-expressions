import { JSX } from "../src/jsx";

/**
 * Statically verify type definitions of `jsx-runtime`.
 */
type Expect<T extends never> = T;

declare function verifyHTMLElementTags(
  t: keyof HTMLElementTagNameMap
): t is keyof JSX.HTMLElementTags;
type HTMLElementTagsComplement = Exclude<keyof HTMLElementTagNameMap, keyof JSX.HTMLElementTags>;
type ExpectHTMLElementTags = Expect<HTMLElementTagsComplement>;


type SvgTagsNoDuplicates = keyof JSX.SVGElementTags | "a" | "script" | "style" | "title";
declare function verifySVGElementTags(t: keyof SVGElementTagNameMap): t is SvgTagsNoDuplicates;
type SVGElementTagsComplement = Exclude<keyof SVGElementTagNameMap, SvgTagsNoDuplicates>;
type ExpectSVGElementTags = Expect<SVGElementTagsComplement>;


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
  oncopy: any;
  oncut: any;
  onpaste: any;
}
declare function verifyCustomGlobalEventHandlers(
  t: keyof GlobalEventHandlers
): t is keyof EventHandlersWithUnimplemented;
type CustomGlobalEventHandlersComplement = Exclude<
  keyof GlobalEventHandlers,
  keyof EventHandlersWithUnimplemented
>;
type ExpectCustomGlobalEventHandlers = Expect<CustomGlobalEventHandlersComplement>;


type LoweredEventHandlerNames = Lowercase<keyof JSX.CustomEventHandlersCamelCase<{}>>;
declare function verifyEventHandlerCaseMatches(
  t: keyof JSX.CustomEventHandlersLowerCase<{}>
): t is LoweredEventHandlerNames;
type EventHandlerCaseMatchesComplement = Exclude<
  keyof JSX.CustomEventHandlersLowerCase<{}>,
  LoweredEventHandlerNames
>;
type ExpectEventHandlerCaseMatches = Expect<EventHandlerCaseMatchesComplement>;
