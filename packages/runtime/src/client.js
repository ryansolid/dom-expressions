import { ChildProperties, Namespaces, DelegatedEvents, $$SLOT, $$HOST } from "./constants";
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
  VoidElements,
  RawTextElements,
  Namespaces,
  DelegatedEvents
} from "./constants";

const $$EVENT_OWNER = "_$DX_EVENT_OWNER";
const INNER_OWNED = {};
const delegatedEvents = new Set();
const delegatedContainers = new Map();

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
  let disposer;
  registerDelegatedRoot(element);
  try {
    root(
      dispose => {
        disposer = dispose;
        if (element === document) {
          const tree = code();
          effect(
            () => flatten(tree),
            () => {}
          );
        } else {
          const tree = code();
          insert(
            element,
            () => tree,
            element.firstChild ? null : undefined,
            init,
            options.insertOptions
          );
        }
      },
      { id: options.renderId }
    );
  } catch (err) {
    if (disposer) disposer();
    unregisterDelegatedRoot(element);
    throw err;
  }
  return () => {
    disposer();
    unregisterDelegatedRoot(element);
    element.textContent = "";
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
export function delegateEvents(eventNames) {
  for (let i = 0, l = eventNames.length; i < l; i++) {
    const name = eventNames[i];
    if (!delegatedEvents.has(name)) {
      delegatedEvents.add(name);
      delegatedContainers.forEach((state, container) =>
        attachDelegatedEvent(name, container, state)
      );
    }
  }
}

export function registerDelegatedRoot(root) {
  const state = registerDelegatedContainer(root, root);
  if (state) state.roots = (state.roots || 0) + 1;
}

export function unregisterDelegatedRoot(root) {
  const state = delegatedContainers.get(root);
  if (state) state.roots > 1 ? state.roots-- : delete state.roots;
  unregisterDelegatedContainer(root, root);
}

export function registerDelegatedContainer(container, owner = container) {
  if (!container || !owner) return;
  let state = delegatedContainers.get(container);
  if (!state)
    delegatedContainers.set(
      container,
      (state = {
        owners: new Map(),
        handlers: new Map()
      })
    );
  state.owners.set(owner, (state.owners.get(owner) || 0) + 1);
  delegatedEvents.forEach(name => attachDelegatedEvent(name, container, state));
  return state;
}

export function unregisterDelegatedContainer(container, owner = container) {
  const state = delegatedContainers.get(container);
  if (!state) return;
  const count = state.owners.get(owner);
  if (count > 1) state.owners.set(owner, count - 1);
  else state.owners.delete(owner);
  if (state.owners.size) return;
  state.handlers.forEach((handler, name) => container.removeEventListener(name, handler));
  delegatedContainers.delete(container);
}

function attachDelegatedEvent(name, container, state) {
  if (state.handlers.has(name)) return;
  const handler = e => eventHandler(e, container, state);
  state.handlers.set(name, handler);
  container.addEventListener(name, handler);
}

export function getDelegatedRoot(node) {
  while (node) {
    if (delegatedContainers.get(node)?.roots) return node;
    node = node._$host || node.parentNode || node.host;
  }
}

function findOwner(target, state) {
  let node = target;
  let distance = 0;
  while (node) {
    if (state.owners.has(node)) return { owner: node, distance };
    distance++;
    node = node._$host || node.parentNode || node.host;
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
  // removeAttributeNS takes the local name; setAttributeNS accepts the qualified form.
  if (value == null || value === false)
    node.removeAttributeNS(namespace, name.indexOf(":") > -1 ? name.split(":").pop() : name);
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
    node.classList.remove(key);
  }
  for (i = 0, len = classKeys.length; i < len; i++) {
    const key = classKeys[i],
      classValue = !!value[key];
    if (!key || key === "undefined" || prev[key] === classValue || !classValue) continue;
    node.classList.add(key);
  }
}

export function addEvent(node, name, handler, delegate) {
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
    if (prev || node._$styles) {
      setAttribute(node, "style");
      node._$styles = undefined;
    }
    return;
  }
  const nodeStyle = node.style;
  if (typeof value === "string") {
    node._$styles = undefined;
    return (nodeStyle.cssText = value);
  }
  if (typeof prev === "string") {
    nodeStyle.cssText = "";
    prev = undefined;
  }
  // Track declarations applied by style() itself. value/prev are user-owned
  // and may be the same object on shared-effect reruns.
  let applied = node._$styles;
  if (!applied) {
    // seed from prev so direct callers that track their own previous value
    // still get removals on their first call here
    applied = node._$styles = prev ? { ...prev } : {};
  }
  let v, s;
  for (s in applied) {
    if (value[s] == null) {
      nodeStyle.removeProperty(s);
      delete applied[s];
    }
  }
  // Diff against applied state so in-place mutations are detected without
  // rewriting unchanged DOM styles.
  for (s in value) {
    v = value[s];
    if (v != null && v !== applied[s]) {
      nodeStyle.setProperty(s, v);
      applied[s] = v;
    }
  }
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
  const multi = marker !== undefined;
  const host = options && options.host;
  if (multi && !initial) initial = [];
  if (isHydrating(parent)) {
    if (!multi && initial === undefined && parent) initial = [...parent.childNodes];
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
    if (typeof accessor !== "function") {
      insertExpression(parent, accessor, initial, marker);
      host && tagHost(accessor, host);
      return;
    }
  }
  if (multi && initial.length === 0) {
    const placeholder = document.createTextNode("");
    parent.insertBefore(placeholder, marker);
    initial = [placeholder];
  }
  let current = initial;
  effect(
    prev => {
      const value = normalize(accessor(), current, multi, true);
      if (typeof value !== "function") return value;
      effect(
        () => normalize(value, current, multi),
        inner => {
          insertExpression(parent, inner, current, marker);
          current = inner;
          host && tagHost(current, host);
        },
        prev !== undefined && !(options && options.schedule)
          ? { ...options, schedule: true }
          : options
      );
      return INNER_OWNED;
    },
    value => {
      if (value === INNER_OWNED) return;
      insertExpression(parent, value, current, marker);
      current = value;
      host && tagHost(current, host);
    },
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
  if (globalThis._$HY.done) return render(code, element, [...element.childNodes], options);
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
            disposer = render(code, element, [...element.childNodes], options);
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
    return render(code, element, [...element.childNodes], options);
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
  const child = node.firstChild;
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
  let child = parent.firstChild;
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
        let match;
        for (const [container, state] of delegatedContainers) {
          if (!state.handlers.has(e.type)) continue;
          const entry = findOwner(e.target, state);
          if (entry && (!match || entry.distance < match.distance))
            match = { container, state, distance: entry.distance };
        }
        if (match) eventHandler(e, match.container, match.state);
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

function classListToObject(classList) {
  if (Array.isArray(classList)) {
    const result = {};
    flattenClassList(classList, result);
    classList = result;
  }
  if (classList && typeof classList === "object") {
    const result = {},
      keys = Object.keys(classList);
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      if (!classList[key]) continue;
      const classNames = key.trim().split(/\s+/);
      for (let j = 0, nameLen = classNames.length; j < nameLen; j++)
        classNames[j] && (result[classNames[j]] = true);
    }
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

  if (!hasNamespace && prop.slice(0, 2) === "on") {
    const name = prop.slice(2).toLowerCase();
    const delegate = DelegatedEvents.has(name);
    if (!delegate && prev) {
      const h = Array.isArray(prev) ? prev[0] : prev;
      node.removeEventListener(name, h);
    }
    if (delegate || value) {
      addEvent(node, name, value, delegate);
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

function eventHandler(e, container, state) {
  if (sharedConfig.registry && sharedConfig.events) {
    if (sharedConfig.events.find(([el, ev]) => ev === e)) return;
  }
  if (e[$$EVENT_OWNER]) return;
  const owner =
    state &&
    (state.owners.size === 1 && state.owners.has(container)
      ? container
      : findOwner(e.target, state)?.owner);
  if (state && !owner) return;
  e[$$EVENT_OWNER] = owner || true;

  let node = e.target;
  const key = `$$${e.type}`;
  const oriTarget = e.target;
  const boundary = owner || container || e.currentTarget;
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
    while (handleNode()) {
      if (node === boundary || node.parentNode === boundary) break;
      node = node._$host || node.parentNode || node.host;
    }
  };

  // simulate currentTarget
  Object.defineProperty(e, "currentTarget", {
    configurable: true,
    get() {
      return node || boundary || document;
    }
  });
  if (e.composedPath) {
    const path = e.composedPath();
    if (path.length) {
      retarget(path[0]);
      for (let i = 0; i < path.length; i++) {
        node = path[i];
        if (!handleNode()) break;
        if (node._$host) {
          node = node._$host;
          // bubble up from portal mount instead of composedPath
          walkUpTree();
          break;
        }
        if (node === boundary || node.parentNode === boundary) {
          break; // don't bubble above root of event delegation
        }
      }
    } else walkUpTree();
  }
  // fallback for browsers that don't support composedPath
  else walkUpTree();
  // Mixing portals and shadow dom can lead to a nonstandard target, so reset here.
  retarget(oriTarget);
}

function insertExpression(parent, value, current, marker) {
  if (isHydrating(parent)) return;
  if (value === current) return;
  const t = typeof value,
    multi = marker !== undefined;

  if (t === "string" || t === "number") {
    const tc = typeof current;
    if (tc === "string" || tc === "number") {
      parent.firstChild.data = value;
    } else parent.textContent = value;
  } else if (value === undefined) {
    cleanChildren(parent, current, marker);
  } else if (value.nodeType) {
    if (Array.isArray(current)) {
      cleanChildren(parent, current, multi ? marker : null, value);
    } else if (current && current.nodeType) {
      // `current` is a node we previously inserted but it may have been
      // moved out by user code (e.g. ref-driven migration, JSX wrapping)
      // since the last render. If it's still here, replace it in place;
      // otherwise append — never `replaceChild` a node that isn't ours.
      current.parentNode === parent
        ? parent.replaceChild(value, current)
        : parent.appendChild(value);
    } else if (current && parent.firstChild) {
      parent.replaceChild(value, parent.firstChild);
    } else {
      parent.appendChild(value);
    }
    if (marker) value[$$SLOT] = marker;
  } else if (Array.isArray(value)) {
    const currentArray = current && Array.isArray(current);
    if (value.length === 0) {
      cleanChildren(parent, current, marker);
    } else if (currentArray) {
      if (current.length === 0) {
        appendNodes(parent, value, marker);
      } else reconcileArrays(parent, current, value, marker);
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

// Applied after each `insert` update when the `host` option is present (e.g.
// portals): the slot's top-level nodes get a live `_$host` getter so event
// retargeting can route back to the slot's logical position in the source
// tree. Tagging here — rather than intercepting individual DOM calls — covers
// every insertion path (append, replaceChild, reconcile, hydration claim)
// without touching the hot reconcile loops. `$$HOST` short-circuits nodes
// already tagged for this host on subsequent updates.
function tagHost(value, host) {
  if (Array.isArray(value)) {
    for (let i = 0, len = value.length; i < len; i++) tagHost(value[i], host);
  } else if (value && value.nodeType && value[$$HOST] !== host) {
    value[$$HOST] = host;
    Object.defineProperty(value, "_$host", { get: host, configurable: true });
  }
}

function appendNodes(parent, array, marker = null) {
  for (let i = 0, len = array.length; i < len; i++) {
    const n = array[i];
    parent.insertBefore(n, marker);
    if (marker) n[$$SLOT] = marker;
  }
}

function cleanChildren(parent, current, marker, replacement) {
  if (marker === undefined) return (parent.textContent = "");
  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (replacement !== el) {
        const tag = el[$$SLOT];
        const owns = el.parentNode === parent && (!tag || tag === marker);
        if (replacement && !inserted && !i)
          owns ? parent.replaceChild(replacement, el) : parent.insertBefore(replacement, marker);
        else if (owns) el.remove();
      } else inserted = true;
    }
  } else if (replacement) parent.insertBefore(replacement, marker);
  if (replacement && marker) replacement[$$SLOT] = marker;
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
