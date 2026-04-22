import { ChildProperties, Namespaces, DelegatedEvents } from "./constants";
import {
  root,
  effect,
  memo,
  getOwner,
  createComponent,
  sharedConfig,
  untrack,
  runWithOwner,
  mergeProps,
  flatten
} from "rxcore";
import reconcileArrays from "./reconcile";
import { DOMWithState } from "./constants";
export {
  DOMWithState,
  ChildProperties,
  DOMElements,
  SVGElements,
  MathMLElements,
  Namespaces,
  DelegatedEvents
} from "./constants";

const $$EVENTS = "_$DX_DELEGATE";

export {
  effect,
  memo,
  untrack,
  getOwner,
  createComponent,
  mergeProps,
  voidFn as useAssets,
  voidFn as getAssets,
  voidFn as Assets,
  voidFn as generateHydrationScript,
  voidFn as HydrationScript,
  voidFn as getRequestEvent
};

export function render(code, element, init, options = {}) {
  if ("_DX_DEV_" && !element) {
    throw new Error(
      "The `element` passed to `render(..., element)` doesn't exist. Make sure `element` exists in the document."
    );
  }
  const renderRoot = getChildRoot(element);
  let disposer;
  root(
    dispose => {
      disposer = dispose;
      element === document
        ? flatten(code)
        : insert(element, code(), renderRoot.firstChild ? null : undefined, init);
    },
    { id: options.renderId }
  );
  return () => {
    disposer();
    renderRoot.textContent = "";
  };
}

function create(html, bypassGuard, flag) {
  if ("_DX_DEV_" && isHydrating() && !bypassGuard)
    throw new Error(
      "Failed attempt to create new DOM elements during hydration. Check that the libraries you are using support hydration."
    );
  const t = document.createElement("template");
  t.innerHTML = html;
  return flag === 2 ? t.content.firstChild.firstChild : t.content.firstChild;
}

export function template(html, flag) {
  let node;
  const fn =
    flag === 1
      ? bypassGuard => document.importNode(node || (node = create(html, bypassGuard, flag)), true)
      : bypassGuard => (node || (node = create(html, bypassGuard, flag))).cloneNode(true);

  if ("_DX_DEV_") fn._html = flag === 2 ? html.replace(/^<[^>]+>/, "") : html;
  return fn;
}
export function delegateEvents(eventNames, document = window.document) {
  const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!e.has(name)) {
      e.add(name);
      document.addEventListener(name, eventHandler);
    }
  }
}

export function clearDelegatedEvents(document = window.document) {
  if (document[$$EVENTS]) {
    for (let name of document[$$EVENTS].keys()) document.removeEventListener(name, eventHandler);
    delete document[$$EVENTS];
  }
}

export function setProperty(node, name, value) {
  if (isHydrating(node)) return;
  node[name] = value;
}

export function setAttribute(node, name, value) {
  if (isHydrating(node)) return;
  if (value == null || value === false) node.removeAttribute(name);
  else node.setAttribute(name, value === true ? "" : value);
}

export function setAttributeNS(node, namespace, name, value) {
  if (isHydrating(node)) return;
  if (value == null || value === false) node.removeAttributeNS(namespace, name);
  else node.setAttributeNS(namespace, name, value === true ? "" : value);
}

export function className(node, value, prev) {
  if (isHydrating(node)) return;
  if (value == null || value === false) {
    prev && node.removeAttribute("class");
    return;
  }
  if (typeof value === "string") {
    value !== prev && node.setAttribute("class", value);
    return;
  }
  if (typeof prev === "string") {
    prev = {};
    node.removeAttribute("class");
  } else prev = classListToObject(prev || {});
  value = classListToObject(value);
  const classKeys = Object.keys(value || {});
  const prevKeys = Object.keys(prev);
  let i, len;
  for (i = 0, len = prevKeys.length; i < len; i++) {
    const key = prevKeys[i];
    if (!key || key === "undefined" || value[key]) continue;
    toggleClassKey(node, key, false);
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key];
    if (!key || key === "undefined" || prev[key] === classValue || !classValue) continue;
    toggleClassKey(node, key, true);
  }
}

export function addEventListener(node, name, handler, delegate) {
  if (delegate) {
    if (Array.isArray(handler)) {
      node[`$$${name}`] = handler[0];
      node[`$$${name}Data`] = handler[1];
    } else node[`$$${name}`] = handler;
  } else if (Array.isArray(handler)) {
    const handlerFn = handler[0];
    node.addEventListener(name, (handler[0] = e => handlerFn.call(node, handler[1], e)));
  } else node.addEventListener(name, handler, typeof handler !== "function" && handler);
}

export function style(node, value, prev) {
  if (!value) {
    if (prev) setAttribute(node, "style");
    return;
  }
  const nodeStyle = node.style;
  if (typeof value === "string") return (nodeStyle.cssText = value);
  typeof prev === "string" && (nodeStyle.cssText = prev = undefined);
  prev || (prev = {});
  value || (value = {});
  let v, s;
  for (s in value) {
    v = value[s];
    if (v !== prev[s]) nodeStyle.setProperty(s, v);
    delete prev[s];
  }
  for (s in prev) value[s] == null && nodeStyle.removeProperty(s);
}

export function setStyleProperty(node, name, value) {
  value != null ? node.style.setProperty(name, value) : node.style.removeProperty(name);
}

// TODO: make this better
export function spread(node, props = {}, skipChildren) {
  const prevProps = {};
  if (!skipChildren) insert(node, () => props.children);
  effect(
    () => {
      const r = props.ref;
      (typeof r === "function" || Array.isArray(r)) && ref(() => r, node);
    },
    () => {}
  );
  effect(
    () => {
      const newProps = {};
      for (const prop in props) {
        if (prop === "children" || prop === "ref") continue;
        newProps[prop] = props[prop];
      }
      return newProps;
    },
    props => assign(node, props, true, prevProps, true)
  );
  return prevProps;
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

export function applyRef(r, element) {
  Array.isArray(r) ? r.flat(Infinity).forEach(f => f && f(element)) : r(element);
}

export function ref(fn, element) {
  const resolved = untrack(fn);
  runWithOwner(null, () => applyRef(resolved, element));
}

export function insert(parent, accessor, marker, initial, options) {
  const childRoot = getChildRoot(parent);
  const multi = marker !== undefined;
  if (multi && !initial) initial = [];
  if (isHydrating(parent)) {
    if (!multi && initial === undefined && parent) initial = [...childRoot.childNodes];
    if (Array.isArray(initial)) {
      let j = 0;
      for (let i = 0; i < initial.length; i++) {
        if (initial[i].nodeType === 8 && initial[i].nodeValue === "!$") initial[i].remove();
        else initial[j++] = initial[i];
      }
      initial.length = j;
    }
  }
  if (typeof accessor !== "function") {
    accessor = normalize(accessor, initial, multi, true);
    if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
  }
  accessor = memo(accessor, true);
  if (multi && initial.length === 0) {
    const placeholder = document.createTextNode("");
    childRoot.insertBefore(placeholder, marker);
    initial = [placeholder];
  }
  effect(
    (prev = initial) => normalize(accessor, prev, multi),
    (value, current = initial) => insertExpression(parent, value, current, marker),
    options
  );
}

export function assign(node, props, skipChildren, prevProps = {}, skipRef = false) {
  const nodeName = node.nodeName;
  props || (props = {});
  for (const prop in prevProps) {
    if (!(prop in props)) {
      if (prop === "children") continue;
      prevProps[prop] = assignProp(node, prop, null, prevProps[prop], skipRef, nodeName);
    }
  }
  for (const prop in props) {
    if (prop === "children") {
      if (!skipChildren) insertExpression(node, normalize(props.children, undefined, false));
      continue;
    }
    prevProps[prop] = assignProp(node, prop, props[prop], prevProps[prop], skipRef, nodeName);
  }
}

// Module asset loading for hydration
function loadModuleAssets(mapping) {
  const hy = globalThis._$HY;
  if (!hy) return;
  const pending = [];
  for (const moduleUrl in mapping) {
    if (hy.modules[moduleUrl]) continue;
    const entryUrl = mapping[moduleUrl];
    if (!hy.loading[moduleUrl]) {
      hy.loading[moduleUrl] = import(/* @vite-ignore */ entryUrl).then(mod => {
        hy.modules[moduleUrl] = mod;
      });
    }
    pending.push(hy.loading[moduleUrl]);
  }
  return pending.length ? Promise.all(pending).then(() => {}) : undefined;
}

// Hydrate
export function hydrate(code, element, options = {}) {
  if (globalThis._$HY.done) return render(code, element, [...getChildRoot(element).childNodes], options);
  options.renderId ||= "";
  if (!globalThis._$HY.modules) globalThis._$HY.modules = {};
  if (!globalThis._$HY.loading) globalThis._$HY.loading = {};
  sharedConfig.completed = globalThis._$HY.completed;
  sharedConfig.events = globalThis._$HY.events;
  sharedConfig.load = id => globalThis._$HY.r[id];
  sharedConfig.has = id => id in globalThis._$HY.r;
  sharedConfig.gather = root => gatherHydratable(element, root);
  sharedConfig.loadModuleAssets = loadModuleAssets;
  sharedConfig.cleanupFragment = id => {
    const tpl = document.getElementById("pl-" + id);
    if (tpl) {
      let node = tpl.nextSibling;
      while (node) {
        const next = node.nextSibling;
        if (node.nodeType === 8 && node.nodeValue === "pl-" + id) {
          node.remove();
          break;
        }
        node.remove();
        node = next;
      }
      tpl.remove();
    }
  };
  sharedConfig.registry = new Map();
  sharedConfig.hydrating = true;
  if ("_DX_DEV_") {
    sharedConfig.verifyHydration = () => {
      if (sharedConfig.registry && sharedConfig.registry.size) {
        const orphaned = [...sharedConfig.registry.values()].filter(node => node.isConnected);
        sharedConfig.registry.clear();
        if (!orphaned.length) return;
        console.warn(
          `Hydration completed with ${orphaned.length} unclaimed server-rendered node(s):\n` +
            orphaned.map(node => `  ${node.outerHTML.slice(0, 100)}`).join("\n")
        );
      }
    };
  }
  const rootMapping = globalThis._$HY.r && globalThis._$HY.r["_assets"];
  if (rootMapping && typeof rootMapping === "object") {
    const p = loadModuleAssets(rootMapping);
    if (p) {
      gatherHydratable(element, options.renderId);
      let disposer;
      p.then(
        () => {
          try {
            disposer = render(code, element, [...getChildRoot(element).childNodes], options);
          } finally {
            sharedConfig.hydrating = false;
          }
        },
        () => {
          sharedConfig.hydrating = false;
        }
      );
      return () => disposer && disposer();
    }
  }
  try {
    gatherHydratable(element, options.renderId);
    return render(code, element, [...getChildRoot(element).childNodes], options);
  } finally {
    sharedConfig.hydrating = false;
  }
}

export function getNextElement(template) {
  let node,
    key,
    hydrating = isHydrating();
  if (!hydrating || !(node = sharedConfig.registry.get((key = getHydrationKey())))) {
    if (!template) {
      throw new Error(`Hydration Mismatch. Unable to find DOM nodes for hydration key: ${key}`);
    }
    return template(true);
  }
  if ("_DX_DEV_" && template && template._html) {
    const expected = template._html.match(/^<(\w+)/)?.[1];
    if (expected && node.localName !== expected) {
      console.warn(
        `Hydration tag mismatch for key "${key}": expected <${expected}> but found`,
        node
      );
    }
  }
  if (sharedConfig.completed) sharedConfig.completed.add(node);
  sharedConfig.registry.delete(key);
  return node;
}

export function getNextMatch(el, nodeName) {
  while (el && el.localName !== nodeName) el = el.nextSibling;
  return el;
}

export function getNextMarker(start) {
  let end = start,
    count = 0,
    current = [];
  if (isHydrating(start)) {
    while (end) {
      if (end.nodeType === 8) {
        const v = end.nodeValue;
        if (v === "$") count++;
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

export function getFirstChild(node, expectedTag) {
  const child = getChildRoot(node).firstChild;
  if ("_DX_DEV_" && isHydrating() && expectedTag && child?.localName !== expectedTag) {
    const isMissing = !child || child.nodeType !== 1;
    console.warn(
      "Hydration structure mismatch: expected <" + expectedTag + "> as first child of",
      node,
      "\n  " + describeSiblings(node, child, expectedTag, isMissing)
    );
  }
  return child;
}

export function getNextSibling(node, expectedTag) {
  const sibling = node.nextSibling;
  if ("_DX_DEV_" && isHydrating() && expectedTag && sibling?.localName !== expectedTag) {
    const parent = node.parentNode;
    const isMissing = !sibling || sibling.nodeType !== 1;
    console.warn(
      "Hydration structure mismatch: expected <" + expectedTag + "> after",
      node,
      "in",
      parent,
      "\n  " + describeSiblings(parent, sibling, expectedTag, isMissing)
    );
  }
  return sibling;
}

function describeSiblings(parent, mismatchChild, expectedTag, isMissing) {
  if (!parent) return `<${expectedTag} \u2190 parent unavailable>`;
  const children = [];
  let child = getChildRoot(parent).firstChild;
  while (child) {
    if (child.nodeType === 1) children.push(child);
    child = child.nextSibling;
  }
  const pTag = parent.localName || "#fragment";
  if (isMissing) {
    const tags = children.map(c => `<${c.localName}>`).join("");
    return `<${pTag}>${tags}<${expectedTag} \u2190 missing></${pTag}>`;
  }
  const idx = children.indexOf(mismatchChild);
  let start = 0,
    end = children.length;
  let prefix = "",
    suffix = "";
  if (children.length > 6) {
    start = Math.max(0, idx - 2);
    end = Math.min(children.length, idx + 3);
    if (start > 0) prefix = "...";
    if (end < children.length) suffix = "...";
  }
  const tags = children
    .slice(start, end)
    .map(c =>
      c === mismatchChild ? `<${c.localName} \u2190 expected ${expectedTag}>` : `<${c.localName}>`
    )
    .join("");
  return `<${pTag}>${prefix}${tags}${suffix}</${pTag}>`;
}

export function runHydrationEvents() {
  if (sharedConfig.events && !sharedConfig.events.queued) {
    queueMicrotask(() => {
      const { completed, events } = sharedConfig;
      if (!events) return;
      events.queued = false;
      while (events.length) {
        const [el, e] = events[0];
        if (!completed.has(el)) return;
        events.shift();
        eventHandler(e);
      }
      if (sharedConfig.done) {
        sharedConfig.events = _$HY.events = null;
        sharedConfig.completed = _$HY.completed = null;
      }
    });
    sharedConfig.events.queued = true;
  }
}

// Internal Functions
function isHydrating(node) {
  return sharedConfig.hydrating && (!node || node.isConnected);
}

function getChildRoot(node) {
  return node && node.localName === "template" ? node.content : node;
}

function toggleClassKey(node, key, value) {
  const classNames = key.trim().split(/\s+/);
  for (let i = 0, nameLen = classNames.length; i < nameLen; i++)
    node.classList.toggle(classNames[i], value);
}

function classListToObject(classList) {
  if (Array.isArray(classList)) {
    const result = {};
    flattenClassList(classList, result);
    return result;
  }
  return classList;
}

function flattenClassList(list, result) {
  for (let i = 0, len = list.length; i < len; i++) {
    const item = list[i];
    if (Array.isArray(item)) flattenClassList(item, result);
    else if (typeof item === "object" && item != null) Object.assign(result, item);
    else if (item || item === 0) result[item] = true;
  }
}

function assignProp(node, prop, value, prev, skipRef, nodeName) {
  if (prop === "style") return (style(node, value, prev), value);
  if (prop === "class") return (className(node, value, prev), value);
  // dom with state may differs from reactive state
  // dom value derives from reactive state
  if (value === prev && DOMWithState[nodeName]?.[prop] !== 1) return prev;
  if (prop === "ref") {
    if (!skipRef && value) ref(() => value, node);
    return value;
  }

  const hasNamespace = prop.indexOf(":") > -1;

  if (hasNamespace && prop.slice(0, 3) === "on:") {
    const e = prop.slice(3);
    prev && node.removeEventListener(e, prev, typeof prev !== "function" && prev);
    value && node.addEventListener(e, value, typeof value !== "function" && value);
  } else if (!hasNamespace && prop.slice(0, 2) === "on") {
    const name = prop.slice(2).toLowerCase();
    const delegate = DelegatedEvents.has(name);
    if (!delegate && prev) {
      const h = Array.isArray(prev) ? prev[0] : prev;
      node.removeEventListener(name, h);
    }
    if (delegate || value) {
      addEventListener(node, name, value, delegate);
      delegate && delegateEvents([name]);
    }
  } else if (
    (hasNamespace && prop.slice(0, 5) === "prop:") ||
    ChildProperties.has(prop) ||
    DOMWithState[nodeName]?.[prop]
  ) {
    if (hasNamespace) prop = prop.slice(5);
    else if (isHydrating(node)) return value; // TODO IS this correct?
    if (prop === "value" && nodeName === "SELECT")
      queueMicrotask(() => (node.value = value)) || (node.value = value);
    else node[prop] = value;
  } else {
    const ns = hasNamespace && Namespaces[prop.split(":")[0]];
    if (ns) setAttributeNS(node, ns, prop, value);
    else setAttribute(node, prop, value);
  }
  return value;
}

function eventHandler(e) {
  if (sharedConfig.registry && sharedConfig.events) {
    if (sharedConfig.events.find(([el, ev]) => ev === e)) return;
  }

  let node = e.target;
  const key = `$$${e.type}`;
  const oriTarget = e.target;
  const oriCurrentTarget = e.currentTarget;
  const retarget = value =>
    Object.defineProperty(e, "target", {
      configurable: true,
      value
    });
  const handleNode = () => {
    const handler = node[key];
    if (handler && !node.disabled) {
      const data = node[`${key}Data`];
      data !== undefined ? handler.call(node, data, e) : handler.call(node, e);
      if (e.cancelBubble) return;
    }
    node.host &&
      typeof node.host !== "string" &&
      !node.host._$host &&
      node.contains(e.target) &&
      retarget(node.host);
    return true;
  };
  const walkUpTree = () => {
    while (handleNode() && (node = node._$host || node.parentNode || node.host));
  };

  // simulate currentTarget
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || document;
    }
  });
  if (e.composedPath) {
    const path = e.composedPath();
    retarget(path[0]);
    for (let i = 0; i < path.length - 2; i++) {
      node = path[i];
      if (!handleNode()) break;
      if (node._$host) {
        node = node._$host;
        // bubble up from portal mount instead of composedPath
        walkUpTree();
        break;
      }
      if (node.parentNode === oriCurrentTarget) {
        break; // don't bubble above root of event delegation
      }
    }
  }
  // fallback for browsers that don't support composedPath
  else walkUpTree();
  // Mixing portals and shadow dom can lead to a nonstandard target, so reset here.
  retarget(oriTarget);
}

function insertExpression(parent, value, current, marker) {
  if (isHydrating(parent)) return;
  if (value === current) return;
  const childRoot = getChildRoot(parent);
  const t = typeof value,
    multi = marker !== undefined;
  // is this necessary anymore?
  // parent = (multi && current[0] && current[0].parentNode) || parent;

  if (t === "string" || t === "number") {
    const tc = typeof current;
    if (tc === "string" || tc === "number") {
      childRoot.firstChild.data = value;
    } else childRoot.textContent = value;
  } else if (value === undefined) {
    cleanChildren(parent, current, marker);
  } else if (value.nodeType) {
    if (Array.isArray(current)) {
      cleanChildren(parent, current, multi ? marker : null, value);
    } else if (current === undefined || !childRoot.firstChild) {
      childRoot.appendChild(value);
    } else childRoot.replaceChild(value, childRoot.firstChild);
  } else if (Array.isArray(value)) {
    const currentArray = current && Array.isArray(current);
    if (value.length === 0) {
      cleanChildren(parent, current, marker);
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, value, marker);
      } else reconcileArrays(childRoot, current, value);
    } else {
      current && cleanChildren(parent);
      appendNodes(parent, value);
    }
  } else if ("_DX_DEV_") console.warn(`Unrecognized value. Skipped inserting`, value);
}

function normalize(value, current, multi, doNotUnwrap) {
  value = flatten(value, { skipNonRendered: true, doNotUnwrap });
  if (doNotUnwrap && typeof value === "function") return value;
  if (multi && !Array.isArray(value)) value = [value != null ? value : ""];
  if (Array.isArray(value)) {
    for (let i = 0, len = value.length; i < len; i++) {
      const item = value[i],
        prev = current && current[i],
        t = typeof item;
      if (t === "string" || t === "number")
        value[i] =
          prev && prev.nodeType === 3 && (sharedConfig.hydrating || prev.data === "" + item)
            ? prev
            : document.createTextNode(item);
    }
  }
  return value;
}

function appendNodes(parent, array, marker = null) {
  parent = getChildRoot(parent);
  for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
}

function cleanChildren(parent, current, marker, replacement) {
  parent = getChildRoot(parent);
  if (marker === undefined) return (parent.textContent = "");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (replacement !== el) {
        const isParent = el.parentNode === parent;
        if (replacement && !inserted && !i)
          isParent
            ? parent.replaceChild(replacement, el)
            : parent.insertBefore(replacement, marker);
        else isParent && el.remove();
      } else inserted = true;
    }
  } else if (replacement) parent.insertBefore(replacement, marker);
}

function gatherHydratable(element, root) {
  const templates = element.querySelectorAll(`*[_hk]`);
  for (let i = 0; i < templates.length; i++) {
    const node = templates[i];
    const key = node.getAttribute("_hk");
    if ((!root || key.startsWith(root)) && !sharedConfig.registry.has(key))
      sharedConfig.registry.set(key, node);
  }
}

export function getHydrationKey() {
  return sharedConfig.getNextContextId();
}

const voidFn = () => undefined;

// experimental
export const RequestContext = Symbol();
