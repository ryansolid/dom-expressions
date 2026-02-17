import { Feature, Serializer, getCrossReferenceHeader } from "seroval";
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

export function createSerializer({ onData, onDone, scopeId, onError, plugins: customPlugins }) {
  const defaultPlugins = [
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
  ];

  const allPlugins = customPlugins ? [...customPlugins, ...defaultPlugins] : defaultPlugins

  return new Serializer({
    scopeId,
    plugins: allPlugins,
    globalIdentifier: GLOBAL_IDENTIFIER,
    disabledFeatures: ES2017FLAG,
    onData,
    onDone,
    onError,
  });
}

export function getLocalHeaderScript(id) {
  return getCrossReferenceHeader(id) + ';';
}
