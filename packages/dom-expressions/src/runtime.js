import { Attributes, SVGAttributes, NonComposedEvents } from "./constants";
import { dynamicProp, cleanChildren, appendNodes, normalizeIncomingArray } from "./utils";
import reconcileArrays from "./reconcile";
import core from "rxcore";

const eventRegistry = new Set();
let { config = {}, effect, memo, ignore, currentContext, createComponent } = core;

createComponent ||
  (createComponent = (Comp, props, dynamicKeys) => {
    if (dynamicKeys) {
      for (let i = 0; i < dynamicKeys.length; i++) dynamicProp(props, dynamicKeys[i]);
    }
    return ignore(() => Comp(props));
  });

export { effect, memo, createComponent, currentContext };

export function template(html, check, isSVG) {
  const t = document.createElement("template");
  t.innerHTML = html;
  if (check && t.innerHTML.split("<").length - 1 !== check)
    console.warn(`Template html does not match input:\n${t.innerHTML}\n\n${html}`);
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

// Hydrate
export function renderDOMToString(code, options = {}) {
  options = { timeoutMs: 30000, ...options };
  config.hydrate = { id: "", count: 0 };
  const container = document.createElement("div");
  document.body.appendChild(container);
  return new Promise((resolve, reject) => {
    setTimeout(() => reject("renderToDOMString timed out"), options.timeoutMs);
    function render(rendered) {
      insert(container, rendered);
      resolve(container.innerHTML);
      document.body.removeChild(container);
    }
    !code.length ? render(code()) : code(render);
  });
}

export function hydrate(code, root) {
  config.hydrate = { id: "", count: 0, registry: new Map() };
  const templates = root.querySelectorAll(`*[_hk]`);
  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    config.hydrate.registry.set(node.getAttribute("_hk"), node);
  }
  code();
  delete config.hydrate;
}

export function getHydrationKey() {
  const hydrate = config.hydrate;
  return `${hydrate.id}:${hydrate.count++}`;
}

export function getNextElement(template, isSSR) {
  const hydrate = config.hydrate;
  let node, key;
  if (!hydrate || !hydrate.registry || !(node = hydrate.registry.get((key = getHydrationKey())))) {
    const el = template.cloneNode(true);
    if (isSSR && hydrate) el.setAttribute("_hk", getHydrationKey());
    return el;
  }
  if (window && window._$HYDRATION) window._$HYDRATION.completed.add(key);
  return node;
}

export function getNextMarker(start) {
  let end = start,
    count = 0,
    current = [];
  if (config.hydrate && config.hydrate.registry) {
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

export function runHydrationEvents(id) {
  if (window && window._$HYDRATION) {
    const { completed, events } = window._$HYDRATION;
    while (events.length) {
      const [id, e] = events[0];
      if (!completed.has(id)) return;
      eventHandler(e);
      events.shift();
    }
  }
}

export function generateHydrationEventsScript(eventNames) {
  return `!function(){function t(t){const e=function t(e){return e&&(e.getAttribute("_hk")||t(e.host&&e.host instanceof Node?e.host:e.parentNode))}(t.composedPath&&t.composedPath()[0]||t.target);e&&!window._$HYDRATION.completed.has(e)&&window._$HYDRATION.events.push([e,t])}window._$HYDRATION={events:[],completed:new Set},["${eventNames.join(
    '","'
  )}"].forEach(e=>document.addEventListener(e,t))}();`;
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
  let info;
  if (!skipChildren && "children" in props) {
    effect(() => (prevProps.children = insertExpression(node, props.children, prevProps.children)));
  }
  effect(() => {
    for (const prop in props) {
      if (prop === "children") continue;
      const value = props[prop];
      if (value === prevProps[prop]) continue;
      if (prop === "style") {
        Object.assign(node.style, value);
      } else if (prop === "classList") {
        classList(node, value, prevProps[prop]);
        // really only for forwarding from Components, can't forward normal ref
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
      } else if ((info = Attributes[prop])) {
        if (info.type === "attribute") {
          node.setAttribute(prop, value);
        } else node[info.alias] = value;
      } else if (isSVG) {
        if ((info = SVGAttributes[prop])) {
          if (info.alias) node.setAttribute(info.alias, value);
          else node.setAttribute(prop, value);
        } else
          node.setAttribute(
            prop.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`),
            value
          );
      } else node[prop] = value;
      prevProps[prop] = value;
    }
  });
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
    if (config.hydrate && config.hydrate.registry) return current;
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
    if (config.hydrate && config.hydrate.registry) return current;
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
    } else if (current == null || current === "") {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  }

  return current;
}
