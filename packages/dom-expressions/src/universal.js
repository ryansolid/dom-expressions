import { root, effect, memo, createComponent, untrack, mergeProps } from "rxcore";

export function createRenderer({
  createElement,
  createTextNode,
  isTextNode,
  replaceText,
  insertNode,
  removeNode,
  setProperty,
  getParentNode,
  getFirstChild,
  getNextSibling
}) {
  function insert(parent, accessor, marker, initial) {
    const multi = marker !== undefined;
    if (multi && !initial) initial = [];
    if (typeof accessor !== "function")
      return insertExpression(parent, normalize(accessor, multi), initial, marker);
    effect(
      () => normalize(accessor, multi),
      (value, current) => insertExpression(parent, value, current, marker),
      initial
    );
  }

  function insertExpression(parent, value, current, marker) {
    while (typeof current === "function") current = current();
    if (value === current) return;
    const t = typeof value,
      multi = marker !== undefined;

    if (t === "string") {
      if (typeof current === "string") {
        replaceText(getFirstChild(parent), value);
      } else {
        cleanChildren(parent, current, marker, createTextNode(value));
      }
    } else if (value == null) {
      cleanChildren(parent, current, marker);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        cleanChildren(parent, current, marker);
      } else {
        if (Array.isArray(current)) {
          if (current.length === 0) {
            appendNodes(parent, value, marker);
          } else reconcileArrays(parent, current, value);
        } else if (current == null) {
          appendNodes(parent, value);
        } else {
          reconcileArrays(parent, (multi && current) || [getFirstChild(parent)], value);
        }
      }
    } else {
      if (Array.isArray(current)) {
        cleanChildren(parent, current, multi ? marker : null, value);
      } else if (current == null || !getFirstChild(parent)) {
        insertNode(parent, value);
      } else replaceNode(parent, value, getFirstChild(parent));
    }
  }

  function normalize(value, multi) {
    let t;
    while ((t = typeof value) === "function") value = value();
    if (multi && !Array.isArray(value)) value = [value];
    if (t === "number") value = value.toString();
    else if (t === "boolean" || value == null || value === "") value = undefined;
    else if (Array.isArray(value)) {
      const normalized = [];
      normalizeIncomingArray(normalized, value);
      return normalized;
    }
    return value;
  }

  function normalizeIncomingArray(normalized, array) {
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i],
        t;
      if (item == null || item === true || item === false || item === "") {
        // matches null, undefined, true or false
        // skip
      } else if (Array.isArray(item)) {
        normalizeIncomingArray(normalized, item);
      } else if ((t = typeof item) === "string" || t === "number") {
        normalized.push(createTextNode(item));
      } else if (t === "function") {
        while (typeof item === "function") item = item();
        normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item]);
      } else normalized.push(item);
    }
  }

  function reconcileArrays(parentNode, a, b) {
    let bLength = b.length,
      aEnd = a.length,
      bEnd = bLength,
      aStart = 0,
      bStart = 0,
      after = getNextSibling(a[aEnd - 1]),
      map = null;

    while (aStart < aEnd || bStart < bEnd) {
      // common prefix
      if (a[aStart] === b[bStart]) {
        aStart++;
        bStart++;
        continue;
      }
      // common suffix
      while (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--;
        bEnd--;
      }
      // append
      if (aEnd === aStart) {
        const node =
          bEnd < bLength ? (bStart ? getNextSibling(b[bStart - 1]) : b[bEnd - bStart]) : after;

        while (bStart < bEnd) insertNode(parentNode, b[bStart++], node);
        // remove
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart])) removeNode(parentNode, a[aStart]);
          aStart++;
        }
        // swap backward
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = getNextSibling(a[--aEnd]);
        insertNode(parentNode, b[bStart++], getNextSibling(a[aStart++]));
        insertNode(parentNode, b[--bEnd], node);

        a[aEnd] = b[bEnd];
        // fallback to map
      } else {
        if (!map) {
          map = new Map();
          let i = bStart;

          while (i < bEnd) map.set(b[i], i++);
        }

        const index = map.get(a[aStart]);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart,
              sequence = 1,
              t;

            while (++i < aEnd && i < bEnd) {
              if ((t = map.get(a[i])) == null || t !== index + sequence) break;
              sequence++;
            }

            if (sequence > index - bStart) {
              const node = a[aStart];
              while (bStart < index) insertNode(parentNode, b[bStart++], node);
            } else replaceNode(parentNode, b[bStart++], a[aStart++]);
          } else aStart++;
        } else removeNode(parentNode, a[aStart++]);
      }
    }
  }

  function cleanChildren(parent, current, marker, replacement) {
    if (marker === undefined) {
      let removed;
      while ((removed = getFirstChild(parent))) removeNode(parent, removed);
      replacement && insertNode(parent, replacement);
      return "";
    }
    if (current.length) {
      let inserted = false;
      for (let i = current.length - 1; i >= 0; i--) {
        const el = current[i];
        if (replacement !== el) {
          const isParent = getParentNode(el) === parent;
          if (replacement && !inserted && !i)
            isParent
              ? replaceNode(parent, replacement, el)
              : insertNode(parent, replacement, marker);
          else isParent && removeNode(parent, el);
        } else inserted = true;
      }
    } else if (replacement) insertNode(parent, replacement, marker);
  }

  function appendNodes(parent, array, marker) {
    for (let i = 0, len = array.length; i < len; i++) insertNode(parent, array[i], marker);
  }

  function replaceNode(parent, newNode, oldNode) {
    insertNode(parent, newNode, oldNode);
    removeNode(parent, oldNode);
  }

  // TODO: make this better
  function spread(node, props, skipChildren) {
    const prevProps = {};
    props || (props = {});
    if (!skipChildren) {
      effect(
        () => normalize(props.children),
        value => {
          insertExpression(node, value, prevProps.children);
          prevProps.children = value;
        }
      );
    }
    effect(
      () => props.ref && props.ref(node),
      () => ({})
    );
    effect(
      () => {
        const newProps = {};
        for (const prop in props) {
          if (prop === "children" || prop === "ref") continue;
          const value = props[prop];
          if (value === prevProps[prop]) continue;
          newProps[prop] = value;
        }
        return newProps;
      },
      (props) => {
        for (const prop in props) {
          const value = props[prop];
          setProperty(node, prop, value, prevProps[prop]);
          prevProps[prop] = value;
        }
      }
    );
    return prevProps;
  }

  return {
    render(code, element) {
      let disposer;
      root(dispose => {
        disposer = dispose;
        insert(element, code());
      });
      return disposer;
    },
    insert,
    spread,
    createElement,
    createTextNode,
    insertNode,
    setProp(node, name, value, prev) {
      setProperty(node, name, value, prev);
      return value;
    },
    mergeProps,
    effect,
    memo,
    createComponent,
    use(fn, element, arg) {
      return untrack(() => fn(element, arg));
    }
  };
}
