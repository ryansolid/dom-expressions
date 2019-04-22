import { reconcileArrays } from './reconcileArrays';
import Attributes from './Attributes';
import { normalizeIncomingArray, RuntimeConfig } from './utils';

type ExpandableElement = HTMLElement & { [key: string]: any }
type DynamicProps = { [key: string]: () => any };
type DelegatedEventHandler = (e: Event, model?: any) => any;

function clearAll(parent: Node, current: any, marker?: Node, startNode?: Node | null) {
  if (!marker) return parent.textContent = '';
  if (Array.isArray(current)) {
    for (let i = 0; i < current.length; i++) {
      parent.removeChild(current[i]);
    }
  } else if (current != null && current != '') {
    if (startNode !== undefined) {
      let node = marker.previousSibling, tmp;
      while(node !== startNode) {
        tmp = (node as Node).previousSibling;
        parent.removeChild(node as Node);
        node = tmp;
      }
    }
    else parent.removeChild(marker.previousSibling as Node);
  }
  return '';
}

function dynamicProp(props: DynamicProps, key: string) {
  const src = props[key];
  Object.defineProperty(props, key, {
    get() { return src(); },
    enumerable: true
  });
}

const eventRegistry = new Set();
function lookup(el: ExpandableElement, name: string) : [DelegatedEventHandler, any?] {
  let h = el[name], m = el.model, r, p;
  if ((h === undefined || (h.length > 1 && m === undefined))
    && (p = el.host || el.parentNode)) r = lookup(p, name);
  return [h !== undefined ? h : r && r[0], m || r && r[1]];
}

function eventHandler(e: Event) {
  const node = (e.composedPath && e.composedPath()[0]) || e.target;
  const [handler, model] = lookup(node as ExpandableElement, `__${e.type}`);

  // reverse Shadow DOM retargetting
  if (e.target !== node) {
    Object.defineProperty(e, 'target', {
      configurable: true,
      value: node
    })
  }
  return handler && handler(e, model);
}

export function createRuntime(config: RuntimeConfig) {
  const { wrap, cleanup, root, sample } = config;

  function insertExpression(parent: Node, value: any, current?: any, marker?: Node) {
    if (value === current) return current;
    parent = (marker && marker.parentNode) || parent;
    const t = typeof value;
    if (t === 'string' || t === 'number') {
      if (t === 'number') value = value.toString();
      if (marker) {
        if (value === '') clearAll(parent, current, marker)
        else if (current !== '' && typeof current === 'string') {
          (marker.previousSibling as Text).data = value;
        } else {
          const node = document.createTextNode(value);
          if (current !== '' && current != null) {
            parent.replaceChild(node, marker.previousSibling as Node);
          } else parent.insertBefore(node, marker);
        }
        current = value;
      } else {
        if (current !== '' && typeof current === 'string') {
          current = (parent.firstChild as Text).data = value;
        } else current = parent.textContent = value;
      }
    } else if (value == null || t === 'boolean') {
      current = clearAll(parent, current, marker);
    } else if (t === 'function') {
      wrap(function() { current = insertExpression(parent, value(), current, marker); });
    } else if (value instanceof Node) {
      if (Array.isArray(current)) {
        if (current.length === 0) {
          parent.insertBefore(value, marker as any);
        } else if (current.length === 1) {
          parent.replaceChild(value, current[0]);
        } else {
          clearAll(parent, current, marker);
          parent.appendChild(value);
        }
      } else if (current == null || current === '') {
        parent.insertBefore(value, marker as any);
      } else {
        parent.replaceChild(value, (marker && marker.previousSibling) || parent.firstChild as Node);
      }
      current = value;
    } else if (Array.isArray(value)) {
      let array = normalizeIncomingArray([], value);
      clearAll(parent, current, marker);
      if (array.length !== 0) {
        for (let i = 0, len = array.length; i < len; i++) {
          parent.insertBefore(array[i], marker as any);
        }
      }
      current = array;
    } else {
      throw new Error("content must be Node, stringable, or array of same");
    }

    return current;
  }

  function spreadExpression(node: ExpandableElement, props: any) {
    let info;
    for (const prop in props) {
      const value = props[prop];
      if (prop === 'style') {
        Object.assign(node.style, value);
      } else if (prop === 'classList') {
        for (const className in value) node.classList.toggle(className, value[className]);
      } else if (prop === 'events') {
        for (const eventName in value) node.addEventListener(eventName, value[eventName]);
      } else if (info = Attributes[prop]) {
        if (info.type === 'attribute') {
          node.setAttribute(prop, value)
        } else node[info.alias as string] = value;
      } else node[prop] = value;
    }
  }

  return Object.assign({
    insert(parent: Node, accessor: any, init: any, marker: Node) {
      if (typeof accessor !== 'function') return insertExpression(parent, accessor, init, marker);
      wrap((current: any = init) => insertExpression(parent, accessor(), current, marker));
    },
    createComponent(Comp: (props: any) => any, props: any, dynamicKeys: string[]) {
      if (dynamicKeys) {
        for (let i = 0; i < dynamicKeys.length; i++) dynamicProp(props, dynamicKeys[i]);
      }
      return Comp(props);
    },
    delegateEvents(eventNames: string[]) {
      for (let i = 0, l = eventNames.length; i < l; i++) {
        const name = eventNames[i];
        if (!eventRegistry.has(name)) {
          eventRegistry.add(name);
          document.addEventListener(name, eventHandler);
        }
      }
    },
    clearDelegatedEvents() {
      for (let name of eventRegistry.keys()) document.removeEventListener(name, eventHandler);
      eventRegistry.clear();
    },
    spread(node: HTMLElement, accessor: any) {
      if (typeof accessor === 'function') {
        wrap(() => spreadExpression(node, accessor()));
      } else spreadExpression(node, accessor);
    },
    flow(parent: Node, type: string, accessor: (() => any), expr: (...args: any[]) => any, options: any, marker?: Node) {
      let startNode: Node | null | undefined;
      if (marker) startNode = marker.previousSibling;
      if (type === 'each') {
        reconcileArrays(parent, accessor, expr, options, config, startNode, marker);
      } else if (type === 'when') {
        let current: any, disposable: (() => void);
        const { afterRender, fallback } = options;
        cleanup(function dispose() { disposable && disposable(); });
        wrap((cached: any) : any => {
          const value = accessor();
          if (value === cached) return cached;
          return sample(() => {
            parent = (marker && marker.parentNode) || parent;
            disposable && disposable();
            if (value == null || value === false) {
              clearAll(parent, current, marker, startNode);
              current = null;
              afterRender && afterRender(current, marker);
              if (fallback) {
                root((disposer: () => void) => {
                  disposable = disposer;
                  current = insertExpression(parent, fallback(), current, marker)
                });
              }
              return value;
            }
            root((disposer: () => void) => {
              disposable = disposer;
              current = insertExpression(parent, expr(value), current, marker)
            });
            afterRender && afterRender(current, marker);
            return value;
          });
        });
      } else if (type === 'suspend') {
        const { fallback } = options,
          doc = document.implementation.createHTMLDocument(),
          rendered = sample(expr);
        let disposable: () => void, current: any, first = true;
        for (let name of eventRegistry.keys()) doc.addEventListener(name, eventHandler);
        Object.defineProperty(doc.body, 'host', { get() { return (marker && marker.parentNode) || parent; } });
        cleanup(function dispose() { disposable && disposable(); });
        wrap((cached: any) => {
          const value = !!accessor();
          let node;
          if (value === cached) return cached;
          parent = (marker && marker.parentNode) || parent;
          if (value) {
            if (first) {
              insertExpression(doc.body, rendered);
              first = false;
            } else {
              node = startNode ? startNode.nextSibling : parent.firstChild;
              while (node && node !== marker) {
                const next: Node | null = node.nextSibling;
                doc.body.appendChild(node);
                node = next;
              }
            }
            if (fallback) {
              sample(() => root((disposer: () => void) => {
                disposable = disposer;
                current = insertExpression(parent, fallback(), null, marker)
              }));
            }
            return value;
          }
          if (first) {
            insertExpression(parent, rendered, null, marker);
            first = false;
          } else {
            if (disposable) {
              clearAll(parent, current, marker, startNode);
              disposable();
            }
            while (node = doc.body.firstChild) parent.insertBefore(node, marker as any);
          }
          return value;
        })
      } else if (type === 'portal') {
        const { useShadow } = options,
          container =  document.createElement('div'),
          anchor = (accessor && sample(accessor)) || document.body,
          renderRoot = (useShadow && container.attachShadow) ? container.attachShadow({ mode: 'open' }) : container;
        Object.defineProperty(container, 'host', { get() { return (marker && marker.parentNode) || parent; } });
        const nodes = sample(() => expr(container));
        insertExpression(container, nodes);
        // ShadyDOM polyfill doesn't handle mutationObserver on shadowRoot properly
        if (container !== renderRoot) Promise.resolve().then(() => { while(container.firstChild) renderRoot.appendChild(container.firstChild); });
        anchor.appendChild(container);
        cleanup(() => anchor.removeChild(container));
      }
    }
  }, config);
}
