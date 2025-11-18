
export function isString(value: any): value is string {
  return typeof value === "string";
}

export function isNumber(value: any): value is number {
  return typeof value === "number";
}

export function isFunction(value: any): value is Function {
  return typeof value === "function";
}

export function isBoolean(value: any): value is boolean {
  return typeof value === "boolean";
}

export function isObject(value: any): value is object {
  return typeof value === "object";
}

export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

export const toArray = Array.from;


export function flat(arr: any[]) {
  return (arr.length === 1 ? arr[0] : arr);
}

export function getValue(value: any) {
  while (isFunction(value)) value = value();
  return value;
}