export interface RuntimeConfig {
  wrap: <T>(prev?: T) => T,
  sample: <T>(fn: () => T) => T,
  root: <T>(fn: (dispose: () => void) => T) => T,
  cleanup: (fn: () => void) => void
}

export function normalizeIncomingArray(normalized: Node[], array: any[] | NodeList) {
  for (var i = 0, len = array.length; i < len; i++) {
    var item = array[i];
    if (item instanceof Node) {
      if (item.nodeType === 11) {
        normalizeIncomingArray(normalized, item.childNodes)
      } else normalized.push(item);
    } else if (item == null || item === true || item === false) { // matches null, undefined, true or false
      // skip
    } else if (Array.isArray(item)) {
      normalizeIncomingArray(normalized, item);
    } else if (typeof item === 'string') {
      normalized.push(document.createTextNode(item));
    } else {
      normalized.push(document.createTextNode(item.toString()));
    }
  }
  return normalized;
}