// @ts-nocheck
/* eslint-disable */

import h from "solid-js/h";
import { For, Match, Show, Switch } from "solid-js";
import { Dynamic, Portal } from "solid-js/web";

// https://playground.solidjs.com/anonymous/f9d79277-f659-4108-8e53-c4bf56f695eb

/**
 * WIP tagged template solid-js proposal
 *
 * @url https://pota.quack.uy/
 * @url https://github.com/ryansolid/dom-expressions
 * @url https://www.solidjs.com/
 */

// default components registry

/** @type {Record<string, Component>} */
const defaultRegistry = {
  Dynamic,
  For,
  Match,
  Portal,
  Show,
  Switch
};

// utils

function getValue(value) {
  while (typeof value === "function") value = value();
  return value;
}

function makeCallback(children) {
  return () => (q, u, a, c, k) =>
    [children].flat(Infinity).map(x => (typeof x === "function" ? x(q, u, a, c, k) : x));
}

// parseXML

const xmlns = ["class", "on", "style", "use", "prop", "attr", "bool", "ref"]
  .map(x => `xmlns:${x}="/"`)
  .join(" ");
const id = "quack-20170301-dom-expressions-solidjs";
const splitId = /(quack-20170301-dom-expressions-solidjs)/;

/**
 * Makes Nodes from TemplateStringsArray
 *
 * @param {TemplateStringsArray} content
 * @returns {Element[]}
 */
const parseXML = (function () {
  const cache = new WeakMap();

  return content => {
    if (cache.has(content)) {
      return cache.get(content);
    }

    const html = new DOMParser().parseFromString(
      `<xml ${xmlns}>${content.join(id)}</xml>`,
      "text/xml"
    ).firstChild.childNodes;

    // error message display

    if (html[0].tagName === "parsererror") {
      const err = html[0];
      err.style.padding = "1em";

      const errorMessage = err.firstChild.nextSibling;
      errorMessage.textContent = errorMessage.textContent.replace(/: /g, ":\n");

      const title = err.firstChild;
      title.textContent = "XML Syntax Error:";

      const code = document.createTextNode(
        "\n" +
          content
            .join("")
            .split("\n")
            .map((x, i) => i + 1 + ". " + x)
            .join("\n")
      );
      err.firstChild.nextSibling.style.cssText = "";
      err.lastChild.replaceWith(code);
    }

    cache.set(content, html);

    return html;
  };
})();

/**
 * Recursively walks a template and transforms it to `h` calls
 *
 * @param {typeof xml} xml
 * @param {Element[]} cached
 * @param {...unknown} values
 * @returns {Children}
 */
function toH(xml, cached, values) {
  let index = 0;

  /**
   * Recursively transforms DOM nodes into Component calls
   *
   * @param {ChildNode} node - The DOM node to transform
   * @returns {Children} Transformed node(s) as Components
   */
  function nodes(node) {
    const { nodeType } = node;
    if (nodeType === 1) {
      // element
      const { tagName, attributes, childNodes } = /** @type {Element} */ node;

      // gather props
      /** @type {Record<string, Accessor<unknown>>} */
      const props = Object.create(null);
      for (let { name, value } of attributes) {
        if (value === id) {
          value = values[index++];
        } else if (value.includes(id)) {
          const val = value.split(splitId).map(x => (x === id ? values[index++] : x));

          value = () => val.map(getValue).join("");
        }
        props[name] = value;
      }

      // component
      const component = xml.components[tagName];
      /^[A-Z]/.test(tagName) &&
        !component &&
        console.warn(`xml: Forgot to ´xml.define({ ${tagName} })´?`);

      // children - childNodes overwrites any props.children
      if (childNodes.length) {
        props.children = Array.from(childNodes).map(nodes);
      }

      // fix callbacks
      if (component) {
        props.children = makeCallback(props.children);
      }

      // calll
      return h(xml.components[tagName] || tagName, props, props.children);
    } else if (nodeType === 3) {
      // text
      const value = node.nodeValue;
      return value.includes(id)
        ? value.split(splitId).map(x => (x === id ? values[index++] : x))
        : value;
    } else if (nodeType === 8) {
      // comment
      const value = node.nodeValue;
      if (value.includes(id)) {
        const val = value.split(splitId).map(x => (x === id ? values[index++] : x));
        return () => document.createComment(val.map(getValue).join(""));
      } else {
        return document.createComment(value);
      }
    } else {
      throw new Error(`xml: ´nodeType´ not supported ´${nodeType}´`);
    }
  }

  return Array.from(cached).map(nodes);
}

/**
 * Function to create cached tagged template components
 *
 * @url https://pota.quack.uy/XML
 */
export function XML() {
  /**
   * Creates tagged template components
   *
   * @param {TemplateStringsArray} template
   * @param {...unknown} values
   * @url https://pota.quack.uy/XML
   */
  function xml(template, ...values) {
    return toH(xml, parseXML(template), values);
  }

  xml.components = { ...defaultRegistry };
  /** @param {Record<string, Component>} userComponents */
  xml.define = userComponents => {
    for (const name in userComponents) {
      xml.components[name] = userComponents[name];
    }
  };

  return xml;
}

export const xml = XML();
