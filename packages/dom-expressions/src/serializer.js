import { Feature, GLOBAL_CONTEXT_API_SCRIPT, Serializer, getCrossReferenceHeader } from "seroval"

const ES2017FLAG =
  Feature.AggregateError // ES2021
  | Feature.BigInt // ES2020
  | Feature.BigIntTypedArray // ES2020;

const GLOBAL_IDENTIFIER = '_$HY.r'; // TODO this is a pending name

export function createSerializer({ onData, onDone, scopeId }) {
  return new Serializer({
    scopeId,
    globalIdentifier: GLOBAL_IDENTIFIER,
    disabledFeatures: ES2017FLAG,
    onData,
    onDone,
  });
}

export function getGlobalHeaderScript() {
  return GLOBAL_CONTEXT_API_SCRIPT;
}

export function getLocalHeaderScript(id) {
  return getCrossReferenceHeader(id);
}
