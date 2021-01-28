import { Properties, ChildProperties, Aliases, SVGNamespace, DelegatedEvents } from "./constants";
import { root, effect, memo, currentContext, createComponent, sharedConfig } from "rxcore";
import { getHydrationKey } from "./shared";
import reconcileArrays from "./reconcile";
export {
  Properties,
  ChildProperties,
  Aliases,
  SVGElements,
  SVGNamespace,
  DelegatedEvents
} from "./constants";
export { assignProps, dynamicProperty } from "./shared";

const eventRegistry = new Set();

export { effect, memo, currentContext, createComponent };

export function render(code, element, init) {
  let disposer;
  root(dispose => {
    disposer = dispose;
    insert(element, code(), element.firstChild ? null : undefined, init);
  });
  return () => {
    disposer();
    element.textContent = "";
  };
}

export function template(html, check, isSVG) {
  const t = document.createElement("template");
  t.innerHTML = html;
  if (check && t.innerHTML.split("<").length - 1 !== check)
    throw `Template html does not match input:\n${t.innerHTML}\n\n${html}`;
  let node = t.content.firstChild;
  if (isSVG) node = node.firstChild;
  return node;
}

export function delegateEvents(eventNames) {
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!eventRegistry.has(name)) {
      eventRegistry.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}

export function clearDelegatedEvents() {
  for (let name of eventRegistry.keys()) document.removeEventListener(name, eventHandler);
  eventRegistry.clear();
}

export function setAttribute(node, name, value) {
  if (value === false || value == null) node.removeAttribute(name);
  else node.setAttribute(name, value);
}

export function setAttributeNS(node, namespace, name, value) {
  if (value === false || value == null) node.removeAttributeNS(namespace, name);
  else node.setAttributeNS(namespace, name, value);
}

export function classList(node, value, prev) {
  const classKeys = Object.keys(value);
  for (let i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key],
      classNames = key.split(/\s+/);
    if (!key || (prev && prev[key] === classValue)) continue;
    for (let j = 0, nameLen = classNames.length; j < nameLen; j++)
      node.classList.toggle(classNames[j], classValue);
  }
  return value;
}

export function style(node, value, prev) {
  const nodeStyle = node.style;
  if (typeof value === "string") return (nodeStyle.cssText = value);

  let v, s;
  if (prev != null && typeof prev !== "string") {
    for (s in value) {
      v = value[s];
      v !== prev[s] && nodeStyle.setProperty(s, v);
    }
    for (s in prev) {
      value[s] == null && nodeStyle.removeProperty(s);
    }
  } else {
    for (s in value) nodeStyle.setProperty(s, value[s]);
  }
  return value;
}

export function spread(node, accessor, isSVG, skipChildren) {
  if (typeof accessor === "function") {
    effect(current => spreadExpression(node, accessor(), current, isSVG, skipChildren));
  } else spreadExpression(node, accessor, undefined, isSVG, skipChildren);
}

export function insert(parent, accessor, marker, initial) {
  if (marker !== undefined && !initial) initial = [];
  if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  effect(current => insertExpression(parent, accessor(), current, marker), initial);
}

export function assign(node, props, isSVG, skipChildren, prevProps = {}) {
  let isCE, isProp, isChildProp;
  for (const prop in props) {
    if (prop === "children") {
      if (!skipChildren) insertExpression(node, props.children);
      continue;
    }
    const value = props[prop];
    if (value === prevProps[prop]) continue;
    if (prop === "style") {
      style(node, value, prevProps[prop]);
    } else if (prop === "class" && !isSVG) {
      node.className = value;
    } else if (prop === "classList") {
      classList(node, value, prevProps[prop]);
    } else if (prop === "ref") {
      value(node);
    } else if (prop === "on") {
      for (const eventName in value) node.addEventListener(eventName, value[eventName]);
    } else if (prop === "onCapture") {
      for (const eventName in value) node.addEventListener(eventName, value[eventName], true);
    } else if (prop.slice(0, 2) === "on") {
      const lc = prop.toLowerCase();
      if (DelegatedEvents.has(lc.slice(2))) {
        const name = lc.slice(2);
        if (Array.isArray(value)) {
          node[`$$${name}`] = value[0];
          node[`$$${name}Data`] = value[1];
        } else node[`$$${name}`] = value;
        delegateEvents([name]);
      } else if (Array.isArray(value)) {
        node.addEventListener(lc, e => value[0](value[1], e));
      } else node.addEventListener(lc, value);
    } else if (
      (isChildProp = ChildProperties.has(prop)) ||
      (!isSVG && (isProp = Properties.has(prop))) ||
      (isCE = node.nodeName.includes("-"))
    ) {
      if (isCE && !isProp && !isChildProp) node[toPropertyName(prop)] = value;
      else node[prop] = value;
    } else {
      const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
      if (ns) setAttributeNS(node, ns, prop, value);
      else setAttribute(node, Aliases[prop] || prop, value);
    }
    prevProps[prop] = value;
  }
}

// Hydrate
export function hydrate(code, element) {
  Object.assign(sharedConfig, globalThis._$HYDRATION);
  sharedConfig.context = { id: "", count: 0 };
  sharedConfig.registry = new Map();
  gatherHydratable(element);
  const dispose = render(code, element, [...element.childNodes]);
  delete sharedConfig.context;
  return dispose;
}

export function gatherHydratable(element) {
  const templates = element.querySelectorAll(`*[data-hk]`);
  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    sharedConfig.registry.set(node.getAttribute("data-hk"), node);
  }
}

export function getNextElement(template) {
  let node, key;
  if (
    !sharedConfig.context ||
    !(node = sharedConfig.registry.get(key = getHydrationKey()))
  ) {
    return template.cloneNode(true);
  }
  if (sharedConfig.completed) sharedConfig.completed.add(node);
  sharedConfig.registry.delete(key);
  return node;
}

export function getNextMarker(start) {
  let end = start,
    count = 0,
    current = [];
  if (sharedConfig.context) {
    while (end) {
      if (end.nodeType === 8) {
        const v = end.nodeValue;
        if (v === "#") count++;
        else if (v === "/") {
          if (count === 0) return [end, current];
          count--;
        }
      }
      current.push(end);
      end = end.nextSibling;
    }
  }
  return [end, current];
}

export function runHydrationEvents() {
  if (sharedConfig.events) {
    const { completed, events } = sharedConfig;
    while (events.length) {
      const [el, e] = events[0];
      if (!completed.has(el)) return;
      eventHandler(e);
      events.shift();
    }
  }
}

// Internal Functions
function toPropertyName(name) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}

function eventHandler(e) {
  const key = `$$${e.type}`;
  let node = (e.composedPath && e.composedPath()[0]) || e.target;
  // reverse Shadow DOM retargetting
  if (e.target !== node) {
    Object.defineProperty(e, "target", {
      configurable: true,
      value: node
    });
  }

  // simulate currentTarget
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node;
    }
  });

  while (node !== null) {
    const handler = node[key];
    if (handler) {
      const data = node[`${key}Data`];
      data !== undefined ? handler(data, e) : handler(e);
      if (e.cancelBubble) return;
    }
    node =
      node.host && node.host !== node && node.host instanceof Node ? node.host : node.parentNode;
  }
}

function spreadExpression(node, props, prevProps = {}, isSVG, skipChildren) {
  if (!skipChildren && "children" in props) {
    effect(() => (prevProps.children = insertExpression(node, props.children, prevProps.children)));
  }
  effect(() => assign(node, props, isSVG, true, prevProps));
  return prevProps;
}

function insertExpression(parent, value, current, marker, unwrapArray) {
  while (typeof current === "function") current = current();
  if (value === current) return current;
  const t = typeof value,
    multi = marker !== undefined;
  parent = (multi && current[0] && current[0].parentNode) || parent;

  if (t === "string" || t === "number") {
    if (t === "number") value = value.toString();
    if (multi) {
      let node = current[0];
      if (node && node.nodeType === 3) {
        node.data = value;
      } else node = document.createTextNode(value);
      current = cleanChildren(parent, current, marker, node);
    } else {
      if (current !== "" && typeof current === "string") {
        current = parent.firstChild.data = value;
      } else current = parent.textContent = value;
    }
  } else if (value == null || t === "boolean") {
    if (sharedConfig.context) return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    effect(() => {
      let v = value();
      while (typeof v === "function") v = v();
      current = insertExpression(parent, v, current, marker);
    });
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    if (normalizeIncomingArray(array, value, unwrapArray)) {
      effect(() => (current = insertExpression(parent, array, current, marker, true)));
      return () => current;
    }
    if (sharedConfig.context && current.length) return current;
    if (array.length === 0) {
      current = cleanChildren(parent, current, marker);
      if (multi) return current;
    } else {
      if (Array.isArray(current)) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else reconcileArrays(parent, current, array);
      } else if (current == null || current === "") {
        appendNodes(parent, array);
      } else {
        reconcileArrays(parent, (multi && current) || [parent.firstChild], array);
      }
    }
    current = array;
  } else if (value instanceof Node) {
    if (Array.isArray(current)) {
      if (multi) return (current = cleanChildren(parent, current, marker, value));
      cleanChildren(parent, current, null, value);
    } else if (current == null || current === "" || !parent.firstChild) {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  } else console.warn(`Skipped inserting`, value);

  return current;
}

function normalizeIncomingArray(normalized, array, unwrap) {
  let dynamic = false;
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i],
      t;
    if (item instanceof Node) {
      normalized.push(item);
    } else if (item == null || item === true || item === false) {
      // matches null, undefined, true or false
      // skip
    } else if (Array.isArray(item)) {
      dynamic = normalizeIncomingArray(normalized, item) || dynamic;
    } else if ((t = typeof item) === "string") {
      normalized.push(document.createTextNode(item));
    } else if (t === "function") {
      if (unwrap) {
        while (typeof item === "function") item = item();
        dynamic =
          normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item]) || dynamic;
      } else {
        normalized.push(item);
        dynamic = true;
      }
    } else normalized.push(document.createTextNode(item.toString()));
  }
  return dynamic;
}

function appendNodes(parent, array, marker) {
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}

function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) return (parent.textContent = "");
  const node = replacement || document.createTextNode("");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (node !== el) {
        const isParent = el.parentNode === parent;
        if (!inserted && !i)
          isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
        else isParent && parent.removeChild(el);
      } else inserted = true;
    }
  } else parent.insertBefore(node, marker);
  return [node];
}
