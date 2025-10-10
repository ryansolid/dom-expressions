import {
  ANONYMOUS_PROPERTY,
  BOOLEAN_PROPERTY,
  COMMENT_NODE,
  COMPONENT_NODE,
  ChildNode,
  ComponentNode,
  DYNAMIC_PROPERTY,
  ELEMENT_NODE,
  ElementNode,
  INSERT_NODE,
  MIXED_PROPERTY,
  ROOT_NODE,
  RootNode,
  SPREAD_PROPERTY,
  STRING_PROPERTY,
  TEXT_NODE,
  parse
} from "./parse";
import { buildTemplate } from "./template";
import { ComponentRegistry, Runtime, SLDInstance } from "./types";
import {
  flat,
  getValue,
  isFunction,
  isNumber,
  isObject,
  toArray
} from "./util";

export function createSLDRuntime(r: Runtime) {
  const cache = new WeakMap<TemplateStringsArray, RootNode>();

  //Walk over text, comment, and element nodes
  const walker = document.createTreeWalker(document, 133);


  const createComment = (data: string) => document.createComment(data);

  function createElement(tag: string) {
    return r.SVGElements.has(tag)
      ? document.createElementNS("http://www.w3.org/2000/svg", tag)
      : document.createElement(tag);
  }

  return createSLD;

  function createSLD<T extends ComponentRegistry>(components: T): SLDInstance<T> {
    function sld(strings: TemplateStringsArray, ...values: any[]) {
      const root = getCachedRoot(strings);

      return renderChildren(root, values, components);
    }
    sld.components = components;
    sld.sld = sld;
    sld.define = function define<TNew extends ComponentRegistry>(newComponents: TNew) {
      return createSLD({ ...components, ...newComponents });
    };

    return sld as SLDInstance<T>;
  }

  function getCachedRoot(strings: TemplateStringsArray): RootNode {
    let root = cache.get(strings);
    if (!root) {
      root = parse(strings);
      buildTemplate(root);
      cache.set(strings, root);
      // console.log(root)
    }
    return root;
  }

  function renderNode(node: ChildNode, values: any[], components: ComponentRegistry): any {
    switch (node.type) {
      case TEXT_NODE:
        return node.value;
      case INSERT_NODE:
        return values[node.value];
      case COMMENT_NODE:
        return createComment(node.value);
      case ELEMENT_NODE:
        const element = createElement(node.name);
        r.spread(
          element,
          gatherProps(node, values, components),
          r.SVGElements.has(node.name),
          true
        );
        return element;
      case COMPONENT_NODE:
        const component = components[node.name];
        if (!component) throw new Error(`${node.name} is not defined`);
        return r.createComponent(component, gatherProps(node, values, components));
    }
  }

  function renderChildren(
    node: ComponentNode | RootNode | ElementNode,
    values: any[],
    components: ComponentRegistry
  ): Node[] | Node | string | number | boolean | null | undefined {
    const template = (node.type === ROOT_NODE || node.type === COMPONENT_NODE) && node.template;
    if (!template) {
      return flat(node.children.map(n => renderNode(n, values, components)));
    }

    const clone = template.content.cloneNode(true);
    walker.currentNode = clone;
    walkNodes(node.children);

    function walkNodes(nodes: ChildNode[]) {
      for (const node of nodes) {
        const domNode = walker.nextNode()!;
        if (node.type === ELEMENT_NODE) {
          if (node.props.length) {
            //Assigning props to element via assign prop w/effect may be better for performance.
            const props = gatherProps(node, values, components);
            r.spread(domNode as Element, props, r.SVGElements.has(node.name), true);
          }

          walkNodes(node.children);
        } else if (node.type === INSERT_NODE || node.type === COMPONENT_NODE) {
          r.insert(domNode.parentNode!, renderNode(node, values, components), domNode);
          walker.currentNode = domNode;
        }
      }
    }
    return toArray(clone.childNodes);
  }

  function gatherProps(
    node: ElementNode | ComponentNode,
    values: any[],
    components: ComponentRegistry,
    props: Record<string, any> = {}
  ) {
    for (const prop of node.props) {
      switch (prop.type) {
        case BOOLEAN_PROPERTY:
          props[prop.name] = true;
          break;
        case STRING_PROPERTY:
          props[prop.name] = prop.value;
          break;
        case DYNAMIC_PROPERTY:
          applyGetter(props, prop.name, values[prop.value]);
          break;
        case MIXED_PROPERTY:
          const value = () => prop.value.map(v => (isNumber(v) ? getValue(values[v]) : v)).join("");
          applyGetter(props, prop.name, value);
          break;
        case SPREAD_PROPERTY:
          const spread = values[prop.value];
          if (!isObject(spread)) throw new Error("Can only spread objects");
          props = r.mergeProps(props, spread);
          break;
        case ANONYMOUS_PROPERTY:
          props.ref = values[prop.value];
          break;
      }
    }

    // children - childNodes overwrites any props.children
    if (node.children.length) {
      Object.defineProperty(props, "children", {
        get() {
          return renderChildren(node, values, components);
        }
      });
    }
    return props;
  }

  function applyGetter(props: Record<string, any>, name: string, value: any) {
    if (isFunction(value) && value.length === 0 && name !== "ref" && !name.startsWith("on")) {
      Object.defineProperty(props, name, {
        get() {
          return value();
        },
        enumerable: true
      });
    } else {
      props[name] = value;
    }
  }
}
