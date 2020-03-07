/// <reference path="../../dom-expressions/runtime.d.ts" />
import { parse, stringify, IDom } from "html-parse-string";
import { NonComposedEvents } from "dom-expressions";
import { wrap, insert, createComponent, delegateEvents, classList } from "dom-expressions-runtime";

interface Runtime {
  wrap: typeof wrap;
  insert: typeof insert;
  createComponent: typeof createComponent;
  delegateEvents: typeof delegateEvents;
  classList: typeof classList;
}
type TemplateCreate = (node: Node, data: any[], r: Runtime, bindings: any) => Node;
type CreateableTemplate = HTMLTemplateElement & { create: TemplateCreate };

export type HTMLTag = {
  (statics: string[], ...args: unknown[]): Node | Node[];
};

const cache = new Map();
// Based on https://github.com/WebReflection/domtagger/blob/master/esm/sanitizer.js
const VOID_ELEMENTS = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;
const spaces = " \\f\\n\\r\\t";
const almostEverything = "[^ " + spaces + "\\/>\"'=]+";
const attrName = "[ " + spaces + "]+" + almostEverything;
const tagName = "<([A-Za-z$#]+[A-Za-z0-9:_-]*)((?:";
const attrPartials =
  "(?:\\s*=\\s*(?:'[^']*?'|\"[^\"]*?\"|\\([^)]*?\\)|<[^>]*?>|" + almostEverything + "))?)";

const attrSeeker = new RegExp(tagName + attrName + attrPartials + "+)([ " + spaces + "]*/?>)", "g");
const findAttributes = new RegExp(
  "(" + attrName + "\\s*=\\s*)(['\"(]?)" + "<!--#-->" + "(['\")]?)",
  "gi"
);
const selfClosing = new RegExp(tagName + attrName + attrPartials + "*)([ " + spaces + "]*/>)", "g");

function attrReplacer($0: string, $1: string, $2: string, $3: string) {
  return "<" + $1 + $2.replace(findAttributes, replaceAttributes) + $3;
}

function replaceAttributes($0: string, $1: string, $2: string, $3: string) {
  return $1 + ($2 || '"') + "###" + ($3 || '"');
}

function fullClosing($0: string, $1: string, $2: string) {
  return VOID_ELEMENTS.test($1) ? $0 : "<" + $1 + $2 + "></" + $1 + ">";
}

export function createHTML(r: Runtime, { delegateEvents = true } = {}): HTMLTag {
  let uuid = 1;
  (r as any).delegate = (el: Node, ev: string, expr: any) => {
    if (Array.isArray(expr)) {
      (el as any)[`__${ev}`] = expr[0];
      (el as any)[`__${ev}Data`] = expr[1];
    } else (el as any)[`__${ev}`] = expr;
  };

  function createTemplate(statics: string[]) {
    let i = 0,
      markup = "";
    for (; i < statics.length - 1; i++) {
      markup = markup + statics[i] + "<!--#-->";
    }
    markup = markup + statics[i];
    markup = markup
      .replace(selfClosing, fullClosing)
      .replace(/<(<!--#-->)/g, "<###")
      .replace(attrSeeker, attrReplacer)
      .replace(/>\n+/g, ">")
      .replace(/\s+</g, "<")
      .replace(/>\s+/g, ">");

    const [html, code] = parseTemplate(parse(markup)),
      templates: HTMLTemplateElement[] = [];

    for (let i = 0; i < html.length; i++) {
      templates.push(document.createElement("template"));
      templates[i].innerHTML = html[i];
    }
    (templates[0] as CreateableTemplate).create = code;
    cache.set(statics, templates);
    return templates;
  }

  function parseKeyValue(tag: string, name: string, options: any) {
    let count = options.counter++,
      expr = `!doNotWrap ? exprs[${count}]() : exprs[${count}]`;
    if (name === "style") {
      const id = uuid++;
      options.exprs.push(`const v${id} = ${expr}`, `Object.assign(${tag}.style, v${id})`);
    } else if (name === "classList") {
      options.exprs.push(`r.classList(${tag}, ${expr})`);
    } else if (name === "on") {
      const id = uuid++;
      options.exprs.push(
        `const v${id} = ${expr}`,
        `for (const e in v${id}) ${tag}.addEventListener(e, v${id}[e])`
      );
    } else if (name === "onCapture") {
      const id = uuid++;
      options.exprs.push(
        `const v${id} = ${expr}`,
        `for (const e in v${id}) ${tag}.addEventListener(e, v${id}[e], true)`
      );
    } else options.exprs.push(`${tag}.${name} = ${expr}`);
  }

  function parseAttribute(tag: string, name: string, options: any) {
    if (name.slice(0, 2) === "on" && name !== "on" && name !== "onCapture") {
      const lc = name.toLowerCase();
      if (delegateEvents && !NonComposedEvents.has(lc.slice(2))) {
        const e = lc.slice(2);
        options.delegatedEvents.add(e);
        options.exprs.push(`r.delegate(${tag},"${e}",exprs[${options.counter++}])`);
      } else options.exprs.push(`${tag}.${lc} = exprs[${options.counter++}]`);
    } else if (name === "ref") {
      options.exprs.push(`exprs[${options.counter++}](${tag})`);
    } else {
      const childOptions = Object.assign({}, options, { exprs: [] }),
        count = options.counter;
      parseKeyValue(tag, name, childOptions);
      options.decl.push(`_fn${count} = doNotWrap => {\n${childOptions.exprs.join(";\n")};\n}`);
      options.exprs.push(
        `typeof exprs[${count}] === "function" ? r.wrap(_fn${count}) : _fn${count}(true)`
      );
      options.counter = childOptions.counter;
      options.wrap = false;
    }
  }

  function processChildren(node: IDom, options: any) {
    const childOptions = Object.assign({}, options, {
      first: true,
      multi: false,
      parent: options.path
    });
    if (node.children.length > 1) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (
          (child.type === "comment" && child.content === "#") ||
          (child.type === "tag" && child.name === "###")
        ) {
          childOptions.multi = true;
          break;
        }
      }
    }
    let i = 0;
    while (i < node.children.length) {
      const child = node.children[i];
      if (child.name === "###") {
        if (childOptions.multi) {
          node.children[i] = { type: "comment", content: "#" } as IDom;
          i++;
        } else node.children.splice(i, 1);
        processComponent(child, childOptions);
        continue;
      }
      parseNode(child, childOptions);
      i++;
    }
    options.counter = childOptions.counter;
    options.templateId = childOptions.templateId;
  }

  function processComponent(node: IDom, options: any) {
    const keys = Object.keys(node.attrs),
      props = [],
      componentIdentifier = options.counter++,
      dynamicKeys: string[] = [];

    for (let i = 0; i < keys.length; i++) {
      const name = keys[i],
        value = node.attrs[name];

      if (value === "###") {
        dynamicKeys.push(`"${name}"`);
        let count = options.counter++;
        props.push(
          `${name}: typeof exprs[${count}] === "function" ? exprs[${count}] : () => exprs[${count}]`
        );
      } else props.push(`${name}: "${value}"`);
    }
    if (
      node.children.length === 1 &&
      node.children[0].type === "comment" &&
      node.children[0].content === "#"
    ) {
      props.push(`children: () => exprs[${options.counter++}]`);
      dynamicKeys.push('"children"');
    } else if (node.children.length) {
      const children = { type: "fragment", children: node.children } as IDom,
        childOptions = Object.assign({}, options, {
          first: true,
          decl: [],
          exprs: []
        });
      parseNode(children, childOptions);
      props.push(`children: () => { ${childOptions.exprs.join(";\n")}}`);
      dynamicKeys.push('"children"');
      options.templateId = childOptions.templateId;
      options.counter = childOptions.counter;
    }
    let tag;
    if (options.multi) {
      tag = `_$el${uuid++}`;
      options.decl.push(`${tag} = ${options.path}.${options.first ? "firstChild" : "nextSibling"}`);
    }

    if (options.parent)
      options.exprs.push(
        `r.insert(${options.parent}, r.createComponent(exprs[${componentIdentifier}], {${props.join(
          ", "
        ) || ""}}, [${dynamicKeys}])${tag ? `, ${tag}` : ""})`
      );
    else
      options.exprs.push(
        `${
          options.fragment ? "" : "return "
        }r.createComponent(exprs[${componentIdentifier}], {${props.join(", ") ||
          ""}}, [${dynamicKeys}])`
      );
    options.path = tag;
    options.first = false;
  }

  function parseNode(node: IDom, options: any) {
    if (node.type === "fragment") {
      const parts: string[] = [];
      node.children.forEach((child: IDom) => {
        if (child.type === "tag") {
          if (child.name === "###") {
            const childOptions = Object.assign({}, options, {
              first: true,
              fragment: true,
              decl: [],
              exprs: []
            });
            processComponent(child, childOptions);
            parts.push(childOptions.exprs[0]);
            options.counter = childOptions.counter;
            options.templateId = childOptions.templateId;
            return;
          }
          options.templateId++;
          const id = uuid;
          const childOptions = Object.assign({}, options, {
            first: true,
            decl: [],
            exprs: []
          });
          parseNode(child, childOptions);
          options.templateNodes.push([child]);
          parts.push(
            `function() { ${childOptions.decl.join(",\n") +
              ";\n" +
              childOptions.exprs.join(";\n") +
              `;\nreturn _$el${id};\n`}}()`
          );
          options.counter = childOptions.counter;
          options.templateId = childOptions.templateId;
        } else if (child.type === "text") {
          parts.push(`"${child.content!}"`);
        } else if (child.type === "comment" && child.content === "#") {
          parts.push(`exprs[${options.counter++}]`);
        }
      });
      options.exprs.push(`return [${parts.join(", \n")}]`);
    } else if (node.type === "tag") {
      const tag = `_$el${uuid++}`;
      options.decl.push(
        !options.decl.length
          ? `const ${tag} = tmpls[${options.templateId}].content.firstChild.cloneNode(true)`
          : `${tag} = ${options.path}.${options.first ? "firstChild" : "nextSibling"}`
      );
      const keys = Object.keys(node.attrs);
      for (let i = 0; i < keys.length; i++) {
        const name = keys[i],
          value = node.attrs[name];
        if (value === "###") {
          delete node.attrs[name];
          parseAttribute(tag, name, options);
        }
      }
      options.path = tag;
      options.first = false;
      processChildren(node, options);
    } else if (node.type === "text") {
      const tag = `_$el${uuid++}`;
      options.decl.push(`${tag} = ${options.path}.${options.first ? "firstChild" : "nextSibling"}`);
      options.path = tag;
      options.first = false;
    } else if (node.type === "comment" && node.content === "#") {
      const tag = `_$el${uuid++}`;
      options.decl.push(`${tag} = ${options.path}.${options.first ? "firstChild" : "nextSibling"}`);
      if (options.multi) {
        options.exprs.push(`r.insert(${options.parent}, exprs[${options.counter++}], ${tag})`);
      } else options.exprs.push(`r.insert(${options.parent}, exprs[${options.counter++}])`);
      options.path = tag;
      options.first = false;
    }
  }

  function parseTemplate(nodes: IDom[]): [string[], TemplateCreate] {
    const options = {
        path: "",
        decl: [],
        exprs: [],
        delegatedEvents: new Set(),
        counter: 0,
        first: true,
        multi: false,
        templateId: 0,
        templateNodes: []
      },
      id = uuid,
      origNodes = nodes;
    let toplevel;
    if (nodes.length > 1) {
      nodes = [{ type: "fragment", children: nodes } as IDom];
    }

    if (nodes[0].name === "###") {
      toplevel = true;
      processComponent(nodes[0], options);
    } else parseNode(nodes[0], options);
    r.delegateEvents(Array.from(options.delegatedEvents) as string[]);
    const templateNodes = [origNodes].concat(options.templateNodes);
    return [
      templateNodes.map(t => stringify(t)),
      new Function(
        "tmpls",
        "exprs",
        "r",
        options.decl.join(",\n") +
          ";\n" +
          options.exprs.join(";\n") +
          (toplevel ? "" : `;\nreturn _$el${id};\n`)
      ) as TemplateCreate
    ];
  }

  function html(statics: string[], ...args: unknown[]): Node {
    const templates = cache.get(statics) || createTemplate(statics);
    return templates[0].create(templates, args, r);
  }

  return html;
}
