import { Attributes, SVGAttributes, SVGNamespace, NonComposedEvents } from "./constants";
import { root, effect, memo, currentContext, createComponent } from "rxcore";
import reconcileArrays from "./reconcile";

const eventRegistry = new Set(),
  hydration = globalThis._$HYDRATION || (globalThis._$HYDRATION = {});

export { effect, memo, currentContext, createComponent };

export function render(code, element) {
  let disposer;
  root(dispose => {
    disposer = dispose;
    insert(element, code(), element.firstChild ? null : undefined);
  });
  return disposer;
}

export function hydrate(code, element) {
  hydration.context = { id: "0", count: 0, registry: {} };
  const templates = element.querySelectorAll(`*[_hk]`);
  Array.prototype.reduce.call(
    templates,
    (memo, node) => {
      const id = node.getAttribute("_hk"),
        list = memo[id] || (memo[id] = []);
      list.push(node);
      return memo;
    },
    hydration.context.registry
  );
  const dispose = render(code, element);
  delete hydration.context;
  return dispose;
}

export function template(html, check, isSVG) {
  const t = document.createElement("template");
  t.innerHTML = html;
  if (check && t.innerHTML.split("<").length - 1 !== check)
    throw(`Template html does not match input:\n${t.innerHTML}\n\n${html}`);
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
  let info;
  for (const prop in props) {
    if (prop === "children") {
      if (!skipChildren) insertExpression(node, props.children);
      continue;
    }
    const value = props[prop];
    if (value === prevProps[prop]) continue;
    if (prop === "style") {
      style(node, value, prevProps[prop]);
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
      if (!NonComposedEvents.has(lc.slice(2))) {
        const name = lc.slice(2);
        if (Array.isArray(value)) {
          node[`__${name}`] = value[0];
          node[`__${name}Data`] = value[1];
        } else node[`__${name}`] = value;
        delegateEvents([name]);
      } else node[lc] = value;
    } else if (!isSVG && (info = Attributes[prop])) {
      if (info.type === "attribute") {
        setAttribute(node, prop, value);
      } else node[info.alias] = value;
    } else if (isSVG || prop.indexOf("-") > -1 || prop.indexOf(":") > -1) {
      const ns = prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
      if (ns) setAttributeNS(node, ns, prop, value);
      else if ((info = SVGAttributes[prop])) {
        if (info.alias) setAttribute(node, info.alias, value);
        else setAttribute(node, prop, value);
      } else
        setAttribute(
          node,
          prop.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`),
          value
        );
    } else node[prop] = value;
    prevProps[prop] = value;
  }
}

export function dynamicProperty(props, key) {
  const src = props[key];
  Object.defineProperty(props, key, {
    get() {
      return src();
    },
    enumerable: true
  });
  return props;
}

export function assignProps(target, ...sources) {
  for (let i = 0; i < sources.length; i++) {
    const descriptors = Object.getOwnPropertyDescriptors(sources[i]);
    Object.defineProperties(target, descriptors);
  }
  return target;
}

// SSR
export function ssrClassList(value) {
  let classKeys = Object.keys(value),
    result = "";
  for (let i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key];
    if (!key || !classValue) continue;
    i && (result += " ");
    result += key;
  }
  return result;
}

export function ssrStyle(value) {
  if (typeof value === "string") return value;
  let result = "";
  const k = Object.keys(value);
  for (let i = 0; i < k.length; i++) {
    const s = k[i];
    if (i) result += ";";
    result += `${s}:${escape(value[s], true)}`;
  }
  return result;
}

export function ssrSpread(props, isSVG) {
  return () => {
    if (typeof props === "function") props = props();
    // TODO: figure out how to handle props.children
    const keys = Object.keys(props);
    let result = "";
    for (let i = 0; i < keys.length; i++) {
      const prop = keys[i];
      if (prop === "children") {
        console.warn(`SSR currently does not support spread children.`);
        continue;
      }
      const value = props[prop];
      if (prop === "style") {
        result += `style="${ssrStyle(value)}"`;
      } else if (prop === "classList") {
        result += `class="${ssrClassList(value)}"`;
      } else {
        const key = toSSRAttribute(prop, isSVG);
        result += `${key}="${escape(value, true)}"`;
      }
      if (i !== keys.length - 1) result += " ";
    }
    return result;
  };
}

const ATTR_REGEX = /[&<"]/,
  CONTENT_REGEX = /[&<]/;

// Modified from https://github.com/component/escape-html by Doug Wilson MIT
export function escape(html, attr) {
  if (typeof html !== "string") return html;
  const match = (attr ? ATTR_REGEX : CONTENT_REGEX).exec(html);
  if (!match) return html;
  let index = 0;
  let lastIndex = 0;
  let out = "";
  let escape = "";
  for (index = match.index; index < html.length; index++) {
    switch (html.charCodeAt(index)) {
      case 34: // "
        if (!attr) continue;
        escape = "&quot;";
        break;
      case 38: // &
        escape = "&amp;";
        break;
      case 60: // <
        escape = "&lt;";
        break;
      default:
        continue;
    }
    if (lastIndex !== index) out += html.substring(lastIndex, index);
    lastIndex = index + 1;
    out += escape;
  }
  return lastIndex !== index ? out + html.substring(lastIndex, index) : out;
}

// Hydrate
export function getNextElement(template, isSSR) {
  const hydrate = hydration.context;
  let node, key;
  if (
    !hydrate ||
    !hydrate.registry ||
    !((key = getHydrationKey()) && hydrate.registry[key] && (node = hydrate.registry[key].shift()))
  ) {
    const el = template.cloneNode(true);
    if (isSSR && hydrate) el.setAttribute("_hk", getHydrationKey());
    return el;
  }
  if (hydration && hydration.completed) hydration.completed.add(node);
  return node;
}

export function getNextMarker(start) {
  let end = start,
    count = 0,
    current = [];
  if (hydration.context && hydration.context.registry) {
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
  if (hydration && hydration.events) {
    const { completed, events } = hydration;
    while (events.length) {
      const [el, e] = events[0];
      if (!completed.has(el)) return;
      eventHandler(e);
      events.shift();
    }
  }
}

export function getHydrationKey() {
  return hydration.context.id;
}

export function generateHydrationScript({ eventNames = ["click", "input", "blur"], streaming, resolved } = {}) {
  let s = `(()=>{_$HYDRATION={events:[],completed:new WeakSet};const t=e=>e&&e.hasAttribute&&(e.hasAttribute("_hk")&&e||t(e.host&&e.host instanceof Node?e.host:e.parentNode)),e=e=>{let o=e.composedPath&&e.composedPath()[0]||e.target,s=t(o);s&&!_$HYDRATION.completed.has(s)&&_$HYDRATION.events.push([s,e])};["${eventNames.join(
    '","'
  )}"].forEach(t=>document.addEventListener(t,e))})();`;
  if (streaming) {
    s += `(()=>{const e=_$HYDRATION,r={};let o=0;e.resolveResource=((e,o)=>{const t=r[e];if(!t)return r[e]=o;delete r[e],t(o)}),e.loadResource=(()=>{const e=++o,t=r[e];if(!t){let o,t=new Promise(e=>o=e);return r[e]=o,t}return delete r[e],Promise.resolve(t)})})();`
  }
  if (resolved) s += `_$HYDRATION.resources = JSON.parse('${JSON.stringify(_$HYDRATION.resources || {})}');`;
  return s;
}

// Internal Functions
function eventHandler(e) {
  const key = `__${e.type}`;
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
      data ? handler(data, e) : handler(e);
      if (e.cancelBubble) return;
    }
    node = node.host && node.host instanceof Node ? node.host : node.parentNode;
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
    if (hydration.context && hydration.context.registry) return current;
    current = cleanChildren(parent, current, marker);
  } else if (t === "function") {
    effect(() => (current = insertExpression(parent, value(), current, marker)));
    return () => current;
  } else if (Array.isArray(value)) {
    const array = [];
    if (normalizeIncomingArray(array, value, unwrapArray)) {
      effect(() => (current = insertExpression(parent, array, current, marker, true)));
      return () => current;
    }
    if (hydration.context && hydration.context.registry) return array;
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
        const idx = item();
        dynamic = normalizeIncomingArray(normalized, Array.isArray(idx) ? idx : [idx]) || dynamic;
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

function toSSRAttribute(key, isSVG) {
  if (isSVG) {
    const attr = SVGAttributes[key];
    if (attr) {
      if (attr.alias) key = attr.alias;
    } else key = key.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`);
  } else {
    const attr = SVGAttributes[key];
    if (attr && attr.alias) key = attr.alias;
    key = key.toLowerCase();
  }
  return key;
}
