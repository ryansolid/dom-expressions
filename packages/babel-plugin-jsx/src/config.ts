export type RendererName = "dom" | "ssr" | "universal" | string;

export interface RendererConfig {
  name: RendererName;
  moduleName?: string;
  elements: string[];
}

export interface JSXDOMExpressionsConfig {
  moduleName: string;
  generate: "dom" | "ssr" | "universal" | "dynamic";
  hydratable: boolean;
  dev: boolean;
  delegateEvents: boolean;
  delegatedEvents: string[];
  builtIns: string[];
  requireImportSource: false | string;
  wrapConditionals: boolean;
  omitNestedClosingTags: boolean;
  omitLastClosingTag: boolean;
  omitQuotes: boolean;
  omitAttributeSpacing: boolean;
  contextToCustomElements: boolean;
  staticMarker: string;
  effectWrapper: string | false;
  memoWrapper: string | false;
  validate: boolean;
  inlineStyles: boolean;
  serverComponents: boolean;
  renderers?: RendererConfig[];
}

const config: JSXDOMExpressionsConfig = {
  moduleName: "dom",
  generate: "dom",
  hydratable: false,
  dev: false,
  delegateEvents: true,
  delegatedEvents: [],
  builtIns: [],
  requireImportSource: false,
  wrapConditionals: true,
  omitNestedClosingTags: false,
  omitLastClosingTag: true,
  omitQuotes: true,
  omitAttributeSpacing: true,
  contextToCustomElements: false,
  staticMarker: "@static",
  effectWrapper: "effect",
  memoWrapper: "memo",
  validate: true,
  inlineStyles: true,
  serverComponents: false
};

export default config;
