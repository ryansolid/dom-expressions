export function renderToNodeStream<T>(
  fn: () => T
): ReadableStream<string>;