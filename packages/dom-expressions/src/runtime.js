import { Attributes, SVGAttributes, NonComposedEvents } from "./constants";
import  { root, effect, memo, currentContext, createComponent } from "rxcore";
import reconcileArrays from "./reconcile";

const eventRegistry = new Set(),
  hydration = globalThis._$HYDRATION || (globalThis._$HYDRATION = {});

export { effect, memo, currentContext, createComponent };

export function render(code, element) {
  let disposer;
  root(dispose => {
    disposer = dispose;
    insert(element, code());
  });
  return disposer;
}

export function renderToString(code, options = {}) {
  options = { timeoutMs: 30000, ...options };
  hydration.context = { id: "0", count: 0 };
  return root(() => {
    const rendered = code();
    if (typeof rendered === "object" && 'then' in rendered) {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject("renderToString timed out"), options.timeoutMs)
      );
      return Promise.race([rendered, timeout]).then(resolveSSRNode);
    }
    return resolveSSRNode(rendered);
  });
}

export function renderDOMToString(code, options = {}) {
  options = { timeoutMs: 30000, ...options };
  hydration.context = { id: "0", count: 0 };
  const container = document.createElement("div");
  document.body.appendChild(container);
  return root(d1 => {
    const rendered = code();

    function resolve(rendered) {
      root(d2 => (insert(container, rendered), d1(), d2()));
      const html = container.innerHTML;
      document.body.removeChild(container);
      return html;
    }

    if (typeof rendered === "object" && 'then' in rendered) {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject("renderToString timed out"), options.timeoutMs)
      );
      return Promise.race([rendered, timeout]).then(resolve);
    }
    return resolve(rendered);
  });
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
    } else if ((info = Attributes[prop])) {
      if (info.type === "attribute") {
        node.setAttribute(prop, value);
      } else node[info.alias] = value;
    } else if (isSVG || prop.indexOf("-") > -1) {
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
}

// SSR
export function ssr(template, ...nodes) {
  const rNodes = [];
  for (let i = 0; i < nodes.length; i++) {
    if (typeof nodes[i] === "function" && !nodes[i].isTemplate) {
      rNodes.push(memo(() => resolveSSRNode(nodes[i]())));
    } else rNodes.push(nodes[i]);
  }
  const t = () => {
    let result = "";
    for(let i = 0; i < template.length; i++) {
      result += template[i];
      const node = rNodes[i];
      if (node !== undefined) result += resolveSSRNode(node);
    }
    return result;
  }
  t.isTemplate = true;
  return t;
}

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
  for (const s in value) result += `${s}: ${value[s]};`;
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
        result += `${key}="${value}"`;
      }
      if (i !== keys.length - 1) result += " ";
    }
    return result;
  };
}

const escaped = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};

export function escape(html) {
  if (typeof html !== "string") return html;
  return String(html).replace(/["'&<>]/g, match => escaped[match]);
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
  if (hydration && hydration.completed) hydration.completed.add(key);
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

export function runHydrationEvents(id) {
  if (hydration && hydration.events) {
    const { completed, events } = hydration;
    while (events.length) {
      const [id, e] = events[0];
      if (!completed.has(id)) return;
      eventHandler(e);
      events.shift();
    }
  }
}

export function getHydrationKey() {
  return hydration.context.id;
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
    } else if (current == null || current === "") {
      parent.appendChild(value);
    } else parent.replaceChild(value, parent.firstChild);
    current = value;
  } else console.warn(`Skipped inserting ${value}`);

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
    node !== current[0] && parent.replaceChild(node, current[0]);
    for (let i = current.length - 1; i > 0; i--) parent.removeChild(current[i]);
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

function resolveSSRNode(node) {
  if (Array.isArray(node)) return node.map(resolveSSRNode).join("");
  if (typeof node === "function") node = resolveSSRNode(node());
  return typeof node === "string" ? node : JSON.stringify(node);
}
