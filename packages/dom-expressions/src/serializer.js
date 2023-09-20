import { Feature, Serializer, CROSS_REFERENCE_HEADER } from "seroval"

const ES2017FLAG = 
  Feature.AggregateError // ES2021
  | Feature.BigInt // ES2020
  | Feature.BigIntTypedArray // ES2020;

const GLOBAL_IDENTIFIER = '_$HY.r'; // TODO this is a pending name

export function createSerializer(onData) {
  return new Serializer({
    globalIdentifier: GLOBAL_IDENTIFIER,
    disabledFeatures: ES2017FLAG,
    onData,
  });
}

// TODO
export function getHeaderScript() {
  return CROSS_REFERENCE_HEADER;
}
