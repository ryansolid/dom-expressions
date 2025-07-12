import { Feature, Serializer, getCrossReferenceHeader, createPlugin } from "seroval";
import { SSRNode } from "./ssr-node";
import {
  AbortSignalPlugin,
  CustomEventPlugin,
  DOMExceptionPlugin,
  EventPlugin,
  FormDataPlugin,
  HeadersPlugin,
  ReadableStreamPlugin,
  RequestPlugin,
  ResponsePlugin,
  URLPlugin,
  URLSearchParamsPlugin,
} from 'seroval-plugins/web';

const ES2017FLAG =
  Feature.AggregateError // ES2021
  | Feature.BigIntTypedArray // ES2020;

const GLOBAL_IDENTIFIER = '_$HY.r'; // TODO this is a pending name

const JSXPlugin = createPlugin({
  tag: 'SolidJSX',
  test(value) {
    return value.constructor === SSRNode;
  },
  parse: {
    sync(value, ctx) {
      // return ctx.parse(value.t);
      return undefined;
    },
    async(value, ctx) {
      // return ctx.parse(value.t);
      return undefined;
    },
    stream(value, ctx) {
      // return ctx.parse(value.t);
      return undefined;
    },
  },
  serialize(node, ctx) {
    // return '_$HY.tmpl(' + ctx.serialize(node) + ')';
    return 'void 0';
  },
});

export function createSerializer({ onData, onDone, scopeId, onError }) {
  return new Serializer({
    scopeId,
    plugins: [
      AbortSignalPlugin,
      // BlobPlugin,
      CustomEventPlugin,
      DOMExceptionPlugin,
      EventPlugin,
      // FilePlugin,
      FormDataPlugin,
      HeadersPlugin,
      ReadableStreamPlugin,
      RequestPlugin,
      ResponsePlugin,
      URLSearchParamsPlugin,
      URLPlugin,
      JSXPlugin
    ],
    globalIdentifier: GLOBAL_IDENTIFIER,
    disabledFeatures: ES2017FLAG,
    onData,
    onDone,
    onError
  });
}

export function getLocalHeaderScript(id) {
  return getCrossReferenceHeader(id) + ';';
}
