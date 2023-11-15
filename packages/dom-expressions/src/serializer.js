import { Feature, GLOBAL_CONTEXT_API_SCRIPT, Serializer, createPlugin, getCrossReferenceHeader } from "seroval"
import { SSRNode } from "./ssr-node";

const ES2017FLAG =
  Feature.AggregateError // ES2021
  | Feature.BigInt // ES2020
  | Feature.BigIntTypedArray // ES2020;

const GLOBAL_IDENTIFIER = '_$HY.r'; // TODO this is a pending name

const JSXPlugin = createPlugin({
  tag: 'SolidJSX',
  test(value) {
    return value.constructor === SSRNode;
  },
  parse: {
    sync(value, ctx) {
      return ctx.parse(value.t);
    },
    async(value, ctx) {
      return ctx.parse(value.t);
    },
    stream(value, ctx) {
      return ctx.parse(value.t);
    },
  },
  serialize(node, ctx) {
    return '_$HY.tmpl(' + ctx.serialize(node) + ')';
  },
});

export function createSerializer({ onData, onDone, scopeId, onError }) {
  return new Serializer({
    scopeId,
    globalIdentifier: GLOBAL_IDENTIFIER,
    disabledFeatures: ES2017FLAG,
    onData,
    onDone,
    onError,
    plugins: [
      JSXPlugin,
    ],
  });
}

export function getGlobalHeaderScript() {
  return GLOBAL_CONTEXT_API_SCRIPT;
}

export function getLocalHeaderScript(id) {
  return getCrossReferenceHeader(id);
}
