type MountableElement = Element | Document | ShadowRoot | DocumentFragment | Node;
interface Runtime {
  insert(parent: MountableElement, accessor: any, marker?: Node | null, init?: any): any;
  spread(node: Element, accessor: any, isSVG?: Boolean, skipChildren?: Boolean): void;
  assign(node: Element, props: any, isSVG?: Boolean, skipChildren?: Boolean): void;
  createComponent(Comp: (props: any) => any, props: any): any;
  dynamicProperty(props: any, key: string): any;
}

type Props = { [key: string]: any };
type Static = string | number | boolean | Date | RegExp;
type Dynamic = VirtualNode | Element;
type Child =  Static | Dynamic | (() => (Static | Element)) | (Static | Dynamic)[];
type VirtualNode = {
  type: string | (() => Child);
  attributes: Props;
  children: Child[];
  $h: boolean;
};
function isStatic(l: Child): l is Static {
  const type = typeof l;
  return "string" === type || "number" === type || "boolean" === type || l instanceof Date || l instanceof RegExp;
}
function staticAttr(l: any) {
  return typeof l !== "function" && typeof l !== "object"
}
function isStaticVirtualNode(l: any): l is VirtualNode {
  return typeof l.type === "string";
}
function isVirtualNode(l:any): l is VirtualNode {
  return l.$h;
}
function isPojo (obj: any): obj is Props {
  if (obj === null || typeof obj !== "object") {
    return false;
  }
  return Object.getPrototypeOf(obj) === Object.prototype;
}

export function h(type: string | (() => Child), props?: Props | Child, ...children: Child[]) {
  if (props === undefined) props = {};
  if (!isPojo(props) || isVirtualNode(props)) {
    children.unshift(props as Child);
    props = {};
  };
  return { type, children: children.flat(), attributes: props, $h: true };
}
function addChildren(y:VirtualNode){
  y.attributes.children = y.attributes.children || y.children;
  if (Array.isArray(y.attributes.children) && y.attributes.children.length == 1)
  y.attributes.children = y.attributes.children[0];
}
type StaticReturn = Element | Text | undefined;
export function createVDomEvaluator(r: Runtime) {
  let gid = 0;
  let cache: (StaticReturn | (StaticReturn)[])[] = [];

  function renderVDomTreeStatic(x: Exclude<Child, (Static | Dynamic)[]>, level?: Element): StaticReturn;
  function renderVDomTreeStatic(x: (Static | Dynamic)[], level?: Element): StaticReturn[];
  function renderVDomTreeStatic(x: Child, level?: Element): StaticReturn | StaticReturn[] {
    if (isStatic(x)) {
      let node = document.createTextNode(x.toString());
      if (level) level.appendChild(node);
      return node;
    } else if (isStaticVirtualNode(x)) {
      let e = document.createElement(x.type as string);
      let attrclone: Props = {};
      for (const attr in x.attributes) {
        let val = x.attributes[attr];
        if (staticAttr(val)) attrclone[attr] = val;
      }
      r.assign(e, attrclone, e instanceof SVGElement, true);
      for (const y of x.children) {
        renderVDomTreeStatic(y as VirtualNode, e);
      }
      if (level) level.appendChild(e);
      return e;
    } else if (Array.isArray(x)) {
      return x.map(y => renderVDomTreeStatic(y)) as (HTMLElement | undefined)[];
    }
  }
  
  function reactifyChildren(x: Static | Dynamic | (() => Static | Element), e?: Node) {
    if (isStatic(x)) return e;
    if (x instanceof Element) return x;
    if (typeof x === "function") return r.createComponent(x, undefined);
    if (typeof x.type === "function") {
      addChildren(x);
      return r.createComponent(x.type, x.attributes);
    }
    let attrclone: Props = {};
    let exists = false,
      dynamic = false;
    for (const attr in x.attributes) {
      let val = x.attributes[attr];
      if (!staticAttr(val)) {
        attrclone[attr] = val;
        exists = true;
      }
      if (typeof val === "function" && attr !== "ref" && attr.slice(0, 2) !== "on" && attr !== "children") {
        r.dynamicProperty(attrclone, attr);
        dynamic = true;
      }
    }
    if (exists)
      dynamic
        ? r.spread(e as Element, attrclone, e instanceof SVGElement, !!x.children.length)
        : r.assign(e as Element, attrclone, e instanceof SVGElement, !!x.children.length);
    let walk = e?.firstChild;
    let multiExpression = x.children.length <= 1 ? undefined : null;
    for (const y of x.children) {
      if (!isStatic(y)) {
        if (isVirtualNode(y)) {
          if (typeof y.type === "string") {
            reactifyChildren(y, walk!);
            walk = (walk && walk.nextSibling);
          } else {
            addChildren(y);
            for (const k in y.attributes) {
              if (typeof y.attributes[k] === "function" && !y.attributes[k].length && k !== "children")
                r.dynamicProperty(y.attributes, k);
            }
            r.insert(e!, r.createComponent(y.type, y.attributes), walk || multiExpression);
          }
        } else {
          r.insert(e!, y, walk || multiExpression);
        }
      }
    }
    return e;
  }
  function $(component: (props: Props) => Child): (props: Props) => Element | Element[] {
    let id = gid++,
      called = false;
    return (props: Props) => {
      let vdomTree = component(props);
      if (!called) {
        cache[id] = renderVDomTreeStatic(vdomTree as any);
        called = true;
      }
      let cached = cache[id];
      if (Array.isArray(vdomTree)) {
        let vt = vdomTree;
        return (cached as StaticReturn[]).map((x, i) => {
          let cloned = x?.cloneNode(true);
          return reactifyChildren(vt[i], cloned);
        });
      }
      let cloned = (cached as Element | undefined)?.cloneNode(true);
      return reactifyChildren(vdomTree, cloned);
    };
  }

  function once(component: Exclude<Child, (Static | Dynamic)[]>): Element;
  function once(component: (Static | Dynamic)[]): Element[];
  function once(component: Child): Element | Element[] {
    if (Array.isArray(component)) {
      return renderVDomTreeStatic(component)
        .map((y, i) => reactifyChildren(component[i], y));
    }
    let x = renderVDomTreeStatic(component);
    return reactifyChildren(component, x);
  }

  return [$, once] as [typeof $, typeof once];
}
