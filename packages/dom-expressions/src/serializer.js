import { serialize, Feature } from "seroval"

const ES2017FLAG = 
  Feature.AggregateError // ES2021
  | Feature.BigInt // ES2020
  | Feature.BigIntTypedArray // ES2020;

export default function stringify(data) {
  return serialize(data, { disabledFeatures: ES2017FLAG });
}