import {
  BOOLEAN_PROP,
  COMPONENT_NODE,
  ChildNode,
  ComponentNode,
  ELEMENT_NODE,
  EXPRESSION_NODE,
  EXPRESSION_PROP,
  ElementNode,
  MIXED_PROP,
  ROOT_NODE,
  RootNode,
  SPREAD_PROP,
  STATIC_PROP,
  TEXT_NODE,
  parse
} from "./parse";
import { tokenize } from "./tokenize";
import { ComponentRegistry, SLDInstance, Runtime } from "./types";
import { flat, getValue } from "./util";
import { type JSX } from "../../dom-expressions/src/jsx";

export function createSLDRuntime(r: Runtime) {
  const cache = new WeakMap<TemplateStringsArray, RootNode>();

  //Walk over text, comment, and element nodes
  const walker = document.createTreeWalker(document, 129);

  const createElement = (name: string) => {
    return r.SVGElements.has(name)
      ? document.createElementNS("http://www.w3.org/2000/svg", name)
      : r.mathmlElements.has(name)
      ? document.createElementNS("http://www.w3.org/1998/Math/MathML", name)
      : document.createElement(name);
  };

  //Factory function to create new SLD instances.
  const createSLD = <T extends ComponentRegistry>(components: T): SLDInstance<T> => {
    const sld = (strings: TemplateStringsArray, ...values: any[]) => {
      const root = getCachedRoot(strings);

      return renderChildren(root, values, components);
    };
    sld.components = components;
    sld.sld = sld;
    sld.define = <TNew extends ComponentRegistry>(newComponents: TNew) => {
      return createSLD({ ...components, ...newComponents });
    };

    return sld as SLDInstance<T>;
  };

  const getCachedRoot = (strings: TemplateStringsArray): RootNode => {
    let root = cache.get(strings);
    if (!root) {
      root = parse(tokenize(strings, r.rawTextElements), r.voidElements);
      buildTemplate(root);
      cache.set(strings, root);
    }
    return root;
  };

  //build template element with same exact shape as tree so they can be walked through in sync
  const buildTemplate = (node: RootNode | ChildNode): void => {
    if (node.type === ROOT_NODE || node.type === COMPONENT_NODE) {
      //Criteria for using template is component or root has at least 1 element. May be be a more optimal condition.
      if (node.children.some(v => v.type === ELEMENT_NODE)) {
        const template = document.createElement("template");
        template.content.append(...node.children.map(buildNodes));
        // buildNodes(node.children, template.content);
        // template.innerHTML = node.children.map(buildHTML).join("");
        node.template = template;
      }
      node.children.forEach(buildTemplate);
    } else if (node.type === ELEMENT_NODE) {
      node.children.forEach(buildTemplate);
    }
  };

  const textTemplate = document.createElement("template");

  const buildNodes = (node: ChildNode): Node => {
    switch (node.type) {
      case TEXT_NODE:
        textTemplate.innerHTML = node.value;
        return document.createTextNode(textTemplate.content.textContent ?? "");
      case EXPRESSION_NODE:
        return document.createComment("+");
      case COMPONENT_NODE:
        return document.createComment(node.name);
      case ELEMENT_NODE:
        let hasSpread = false;

        const elem = createElement(node.name);
        //props located after spread need to be applied after spread for possible overrides
        node.props = node.props.filter(prop => {
          if (prop.type === STATIC_PROP) {
            if (prop.name.startsWith("prop:")) return true;
            const name = prop.name.startsWith("attr:") ? prop.name.slice(5) : prop.name;
            elem.setAttribute(name, prop.value);
            return hasSpread;
          } else if (prop.type === BOOLEAN_PROP) {
            // attributeHTML += ` ${prop.name}`;
            elem.setAttribute(prop.name, "");
            return hasSpread;
          } else if (prop.type === SPREAD_PROP) {
            hasSpread = true;
            return hasSpread;
          }
          return true;
        });
        elem.append(...node.children.map(buildNodes));

        return elem;
    }
  };

  const renderNode = (node: ChildNode, values: any[], components: ComponentRegistry): any => {
    switch (node.type) {
      case TEXT_NODE:
        return node.value;
      case EXPRESSION_NODE:
        return values[node.value];
      case COMPONENT_NODE:
        const component = components[node.name];
        if (component) {
          return r.createComponent(component, gatherProps(node, values, components));
        } else {
          throw new Error(`Component "${node.name}" not found in registry`);
        }
      case ELEMENT_NODE:
        let name = node.name;

        const isSvg = r.SVGElements.has(name);
        // 3. Standard HTML Element (node.name is guaranteed string here)
        const element = createElement(name);
        const props = gatherProps(node, values, components);

        r.spread(element, props, isSvg, true);

        return element;
    }
  };

  const renderChildren = (
    node: RootNode | ComponentNode,
    values: any[],
    components: ComponentRegistry
  ): JSX.Element => {
    if (!node.template) {
      return flat(node.children.map(n => renderNode(n, values, components)));
    }

    const clone = node.template.content.cloneNode(true);
    walker.currentNode = clone;

    const walkNodes = (nodes: ChildNode[]) => {
      for (const node of nodes) {
        if (
          node.type === ELEMENT_NODE ||
          node.type === EXPRESSION_NODE ||
          node.type === COMPONENT_NODE
        ) {
          const domNode = walker.nextNode()!;
          if (node.type === EXPRESSION_NODE || node.type === COMPONENT_NODE) {
            r.insert(domNode.parentNode!, renderNode(node, values, components), domNode);
            walker.currentNode = domNode;
          } else {
            // Standard Element path...
            if (node.props.length) {
              const props = gatherProps(node, values, components);
              r.spread(domNode as Element, props, r.SVGElements.has(node.name as string), true);
            }
            walkNodes(node.children);
          }
        }
      }
    };
    walkNodes(node.children);
    return Array.from(clone.childNodes);
  };

  const gatherProps = (
    node: ElementNode | ComponentNode,
    values: any[],
    components: ComponentRegistry,
    props: Record<string, any> = {}
  ) => {
    for (const prop of node.props) {
      switch (prop.type) {
        case BOOLEAN_PROP:
          props[prop.name] = true;
          break;
        case STATIC_PROP:
          props[prop.name] = prop.value;
          break;
        case EXPRESSION_PROP:
          applyGetter(props, prop.name, values[prop.value]);
          break;
        case MIXED_PROP:
          const value = () =>
            prop.value.map(v => (typeof v === "number" ? getValue(values[v]) : v)).join("");
          applyGetter(props, prop.name, value);
          break;
        case SPREAD_PROP:
          const spread = values[prop.value];
          if (!spread || typeof spread !== "object") throw new Error("Can only spread objects");
          props = r.mergeProps(props, spread);
          break;
      }
    }

    // children - childNodes overwrites any props.children
    if (node.type === COMPONENT_NODE && node.children.length) {
      Object.defineProperty(props, "children", {
        get() {
          return renderChildren(node, values, components);
        }
      });
    }
    return props;
  };

  const applyGetter = (props: Record<string, any>, name: string, value: any) => {
    if (
      typeof value === "function" &&
      value.length === 0 &&
      name !== "ref" &&
      !name.startsWith("on")
    ) {
      Object.defineProperty(props, name, {
        get() {
          return value();
        },
        enumerable: true
      });
    } else {
      props[name] = value;
    }
  };

  return createSLD;
}
