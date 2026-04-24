type MountableElement = Element | Document | ShadowRoot | DocumentFragment | Node;
interface Runtime {
  insert(parent: MountableElement, accessor: any, marker?: Node | null, init?: any): any;
  spread(node: Element, accessor: any, skipChildren?: Boolean): void;
  assign(node: Element, props: any, skipChildren?: Boolean): void;
  createComponent(Comp: (props: any) => any, props: any): any;
  dynamicProperty(props: any, key: string): any;
  untrack<T>(fn: () => T): T;
  SVGElements: Set<string>;
  MathMLElements: Set<string>;
  Namespaces: Record<string, string>;
}

type ExpandableNode = Node & { [key: string]: any };
type Props = { [key: string]: any };

// Tags h() thunks so consumers can distinguish them from user-written
// accessors and invoke them once under the correct owner rather than
// wrapping them in an effect.
const $ELEMENT: unique symbol = Symbol("hyper-element");

export type HyperElement = {
  (): ExpandableNode | ExpandableNode[];
  [$ELEMENT]: true;
};

export type HyperScript = {
  (...args: any[]): HyperElement | ExpandableNode[];
  Fragment: (props: { children: any }) => any;
};

// Inspired by https://github.com/hyperhype/hyperscript
export function createHyperScript(r: Runtime): HyperScript {
  function h(...rawArgs: any[]): any {
    if (rawArgs.length === 1 && Array.isArray(rawArgs[0])) return rawArgs[0];
    const thunk = (() => r.untrack(() => materialize(rawArgs))) as unknown as HyperElement;
    thunk[$ELEMENT] = true;
    return thunk;
  }

  function materialize(args: any[]): ExpandableNode | ExpandableNode[] {
    let e: ExpandableNode | undefined;
    let classes: string[] = [];
    let multiExpression = false;
    args = args.slice();

    function item(l: any) {
      if (l == null) return;
      const type = typeof l;
      if ("string" === type) {
        if (!e) parseClass(l);
        else e.appendChild(document.createTextNode(l));
      } else if (
        "number" === type ||
        "boolean" === type ||
        "bigint" === type ||
        "symbol" === type ||
        l instanceof Date ||
        l instanceof RegExp
      ) {
        (e as Node).appendChild(document.createTextNode(l.toString()));
      } else if (Array.isArray(l)) {
        for (let i = 0; i < l.length; i++) item(l[i]);
      } else if (l instanceof Element) {
        r.insert(e as Element, l, multiExpression ? null : undefined);
      } else if ("object" === type) {
        let dynamic = false;
        const d = Object.getOwnPropertyDescriptors(l);
        for (const k in d) {
          if (k === "class" && classes.length !== 0) {
            const value =
              typeof d["class"].value === "function"
                ? () => [...classes, d["class"].value()]
                : [...classes, l["class"]];
            Object.defineProperty(l, "class", { ...d[k], value });
            classes = [];
          }
          if (k !== "ref" && k.slice(0, 2) !== "on" && typeof d[k].value === "function") {
            r.dynamicProperty(l, k);
            dynamic = true;
          } else if (d[k].get) dynamic = true;
        }
        dynamic
          ? r.spread(e as Element, l, !!args.length)
          : r.assign(e as Element, l, !!args.length);
      } else if ("function" === type) {
        if (!e) {
          const first = args[0];
          const props: Props =
            first == null ||
            (typeof first === "object" && !Array.isArray(first) && !(first instanceof Element))
              ? args.shift() || {}
              : {};
          if (args.length) props.children = args.length > 1 ? args : args[0];
          for (const k in props) {
            const v = props[k];
            if (typeof v === "function" && !v.length) r.dynamicProperty(props, k);
          }
          e = r.createComponent(l, props);
          // Drain nested h() thunks so downstream sees the real render result.
          while (typeof e === "function" && (e as any)[$ELEMENT]) e = (e as any)();
          args = [];
        } else if ((l as any)[$ELEMENT]) item(l());
        else r.insert(e as Element, l, multiExpression ? null : undefined);
      }
    }

    if (typeof args[0] === "string") detectMultiExpression(args);
    while (args.length) item(args.shift());
    if (e instanceof Element && classes.length) e.classList.add(...classes);
    return e as ExpandableNode;

    function parseClass(string: string) {
      // Does not understand escaped CSS specials; see
      // https://mathiasbynens.be/notes/css-escapes.
      const m = string.split(/([\.#]?[^\s#.]+)/);
      if (/^\.|#/.test(m[1])) e = document.createElement("div");
      for (let i = 0; i < m.length; i++) {
        const v = m[i],
          s = v.substring(1, v.length);
        if (!v) continue;
        if (!e)
          e = r.SVGElements.has(v)
            ? document.createElementNS(r.Namespaces.svg, v)
            : r.MathMLElements.has(v)
              ? document.createElementNS(r.Namespaces.mathml, v)
              : document.createElement(v);
        else if (v[0] === ".") classes.push(s);
        else if (v[0] === "#") e.setAttribute("id", s);
      }
    }
    function detectMultiExpression(list: any[]) {
      for (let i = 1; i < list.length; i++) {
        if (typeof list[i] === "function") {
          multiExpression = true;
          return;
        } else if (Array.isArray(list[i])) {
          detectMultiExpression(list[i]);
        }
      }
    }
  }

  h.Fragment = (props: any) => props.children;
  return h as HyperScript;
}
