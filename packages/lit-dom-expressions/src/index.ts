import { parse, stringify, IDom } from "html-parse-string";

type MountableElement = Element | Document | ShadowRoot | DocumentFragment | Node;
interface Runtime {
  effect<T>(fn: (prev?: T) => T, init?: T): any;
  untrack<T>(fn: () => T): T;
  insert(parent: MountableElement, accessor: any, marker?: Node | null, init?: any): any;
  spread<T>(node: Element, accessor: (() => T) | T, isSVG?: Boolean, skipChildren?: Boolean): void;
  createComponent(Comp: (props: any) => any, props: any): any;
  addEventListener(node: Element, name: string, handler: () => void, delegate: boolean): void;
  delegateEvents(eventNames: string[]): void;
  classList(node: Element, value: { [k: string]: boolean }, prev?: { [k: string]: boolean }): { [k: string]: boolean };
  style(node: Element, value: { [k: string]: string }, prev?: { [k: string]: string }): void;
  mergeProps(...sources: unknown[]): unknown;
  dynamicProperty(props: any, key: string): any;
  setAttribute(node: Element, name: string, value: any): void;
  setAttributeNS(node: Element, namespace: string, name: string, value: any): void;
  Aliases: Record<string, string>;
  getPropAlias(prop: string, tagName: string): string | undefined;
  Properties: Set<string>;
  ChildProperties: Set<string>;
  DelegatedEvents: Set<string>;
  SVGElements: Set<string>;
  SVGNamespace: Record<string, string>;
}
type TemplateCreate = (tmpl: HTMLTemplateElement[], data: any[], r: Runtime) => Node;
type CreateableTemplate = HTMLTemplateElement & { create: TemplateCreate };

type Options = {
  path?: string,
  decl: string[],
  exprs: string[],
  delegatedEvents: Set<string>,
  counter: number,
  first: boolean,
  multi: boolean,
  templateId: number,
  templateNodes: IDom[][],
  wrap?: boolean,
  hasCustomElement?: boolean,
  parent?: boolean,
  fragment?: boolean,
}

export type HTMLTag = {
  (statics: TemplateStringsArray, ...args: unknown[]): Node | Node[];
};

const cache = new Map<TemplateStringsArray, HTMLTemplateElement[]>();
// Based on https://github.com/WebReflection/domtagger/blob/master/esm/sanitizer.js
const VOID_ELEMENTS = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;
const spaces = " \\f\\n\\r\\t";
const almostEverything = "[^" + spaces + "\\/>\"'=]+";
const attrName = "[ " + spaces + "]+(?:use:<!--#-->|" + almostEverything + ')';
const tagName = "<([A-Za-z$#]+[A-Za-z0-9:_-]*)((?:";
const attrPartials =
  "(?:\\s*=\\s*(?:'[^']*?'|\"[^\"]*?\"|\\([^)]*?\\)|<[^>]*?>|" + almostEverything + "))?)";

const attrSeeker = new RegExp(tagName + attrName + attrPartials + "+)([ " + spaces + "]*/?>)", "g");
const findAttributes = new RegExp(
  "(" + attrName + "\\s*=\\s*)(<!--#-->|['\"(]([\\w\\s]*<!--#-->[\\w\\s]*)*['\")])",
  "gi"
);
const selfClosing = new RegExp(tagName + attrName + attrPartials + "*)([ " + spaces + "]*/>)", "g");
const marker = "<!--#-->";
const reservedNameSpaces = new Set(["class", "on", "oncapture", "style", "use", "prop", "attr"]);

function attrReplacer($0: string, $1: string, $2: string, $3: string) {
  return "<" + $1 + $2.replace(findAttributes, replaceAttributes) + $3;
}

function replaceAttributes($0: string, $1: string, $2: string) {
  return $1.replace(/<!--#-->/g, "###") + ($2[0] === '"' || $2[0] === "'" ? $2.replace(/<!--#-->/g, "###") : '"###"');
}

function fullClosing($0: string, $1: string, $2: string) {
  return VOID_ELEMENTS.test($1) ? $0 : "<" + $1 + $2 + "></" + $1 + ">";
}

function toPropertyName(name: string) {
  return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
}

function parseDirective(name: string, value: string, tag: string, options: Options) {
  if (name === 'use:###' && value === '###') {
    const count = options.counter++;
    options.exprs.push(
      `typeof exprs[${count}] === "function" ? r.use(exprs[${count}], ${tag}, exprs[${options.counter++}]) : (()=>{throw new Error("use:### must be a function")})()`
    );
  } else {
    throw new Error(`Not support syntax ${name} must be use:{function}`);
  }
}

export function createHTML(r: Runtime, { delegateEvents = true, functionBuilder = (...args) => new Function(...args) }: { delegateEvents?: boolean, functionBuilder?: (...args: string[]) => Function } = {}): HTMLTag {
  let uuid = 1;
  (r as any).wrapProps = (props: any) => {
    const d = Object.getOwnPropertyDescriptors(props);
    for (const k in d) {
      if (typeof d[k].value === "function" && !d[k].value.length) r.dynamicProperty(props, k);
    }
    return props;
  };

  function createTemplate(statics: TemplateStringsArray, opt: { funcBuilder: (...args: string[]) => Function }) {
    let i = 0,
      markup = "";
    for (; i < statics.length - 1; i++) {
      markup = markup + statics[i] + "<!--#-->";
    }
    markup = markup + statics[i];
    const replaceList: [string | RegExp, string | ((substring: string, ...args: any[]) => string)][] = [
      [selfClosing, fullClosing],
      [/<(<!--#-->)/g, "<###"],
      [/\.\.\.(<!--#-->)/g, "###"],
      [attrSeeker, attrReplacer],
      [/>\n+\s*/g, ">"],
      [/\n+\s*</g, "<"],
      [/\s+</g, " <"],
      [/>\s+/g, "> "]
    ];
    markup = replaceList.reduce((acc, x) => {
      // if (typeof x[1] === 'string') {
      //   return acc.replace(x[0], x[1]);
      // }
      // @ts-expect-error - TS doesn't like the replace function, you can uncomment the above code to see that everything is fine
      return acc.replace(x[0], x[1]);
    }, markup);
    const pars = parse(markup);
    const [html, code] = parseTemplate(pars, opt.funcBuilder),
      templates: HTMLTemplateElement[] = [];

    for (let i = 0; i < html.length; i++) {
      templates.push(document.createElement("template"));
      templates[i].innerHTML = html[i];
      const nomarkers = templates[i].content.querySelectorAll("script,style");
      for (let j = 0; j < nomarkers.length; j++) {
        const d = (nomarkers[j].firstChild as Text | null)?.data || "";
        if (d.indexOf(marker) > -1) {
          const parts = d.split(marker).reduce((memo, p, i) => {
            i && memo.push("");
            memo.push(p);
            return memo;
          }, [] as string[]);
          nomarkers[i].firstChild!.replaceWith(...parts);
        }
      }
    }
    (templates[0] as CreateableTemplate).create = code;
    cache.set(statics, templates);
    return templates;
  }

  function parseKeyValue(
    node: IDom,
    tag: string,
    name: string,
    value: string,
    isSVG: boolean,
    isCE: boolean,
    options: Options
  ) {
    let expr =
        value === "###"
          ? `!doNotWrap ? exprs[${options.counter}]() : exprs[${options.counter++}]`
          : value
              .split("###")
              .map((v, i) =>
                i
                  ? ` + (typeof exprs[${options.counter}] === "function" ? exprs[${
                      options.counter
                    }]() : exprs[${options.counter++}]) + "${v}"`
                  : `"${v}"`
              )
              .join(""),
      parts,
      namespace;

    if ((parts = name.split(":")) && parts[1] && reservedNameSpaces.has(parts[0])) {
      name = parts[1];
      namespace = parts[0];
    }
    const isChildProp = r.ChildProperties.has(name);
    const isProp = r.Properties.has(name);

    if (name === "style") {
      const prev = `_$v${uuid++}`;
      options.decl.push(`${prev}={}`);
      options.exprs.push(`r.style(${tag},${expr},${prev})`);
    } else if (name === "classList") {
      const prev = `_$v${uuid++}`;
      options.decl.push(`${prev}={}`);
      options.exprs.push(`r.classList(${tag},${expr},${prev})`);
    } else if (
      namespace !== "attr" &&
      (isChildProp || (!isSVG && (r.getPropAlias(name, node.name.toUpperCase()) || isProp)) || isCE || namespace === "prop")
    ) {
      if (isCE && !isChildProp && !isProp && namespace !== "prop") name = toPropertyName(name);
      options.exprs.push(`${tag}.${r.getPropAlias(name, node.name.toUpperCase()) || name} = ${expr}`);
    } else {
      const ns = isSVG && name.indexOf(":") > -1 && r.SVGNamespace[name.split(":")[0]];
      if (ns) options.exprs.push(`r.setAttributeNS(${tag},"${ns}","${name}",${expr})`);
      else options.exprs.push(`r.setAttribute(${tag},"${r.Aliases[name] || name}",${expr})`);
    }
  }

  function parseAttribute(
    node: IDom,
    tag: string,
    name: string,
    value: string,
    isSVG: boolean,
    isCE: boolean,
    options: Options
  ) {
    if (name.slice(0, 2) === "on") {
      if (!name.includes(":")) {
        const lc = name.slice(2).toLowerCase();
        const delegate = delegateEvents && r.DelegatedEvents.has(lc);
        options.exprs.push(
          `r.addEventListener(${tag},"${lc}",exprs[${options.counter++}],${delegate})`
        );
        delegate && options.delegatedEvents.add(lc);
      } else {
        let capture = name.startsWith("oncapture:");
        options.exprs.push(
          `${tag}.addEventListener("${name.slice(capture ? 10 : 3)}",exprs[${options.counter++}]${
            capture ? ",true" : ""
          })`
        );
      }
    } else if (name === "ref") {
      options.exprs.push(`exprs[${options.counter++}](${tag})`);
    } else {
      const childOptions = Object.assign({}, options, { exprs: [] }),
        count = options.counter;
      parseKeyValue(node, tag, name, value, isSVG, isCE, childOptions);
      options.decl.push(
        `_fn${count} = (${value === "###" ? "doNotWrap" : ""}) => {\n${childOptions.exprs.join(
          ";\n"
        )};\n}`
      );
      if (value === "###") {
        options.exprs.push(
          `typeof exprs[${count}] === "function" ? r.effect(_fn${count}) : _fn${count}(true)`
        );
      } else {
        let check = "";
        for (let i = count; i < childOptions.counter; i++) {
          i !== count && (check += " || ");
          check += `typeof exprs[${i}] === "function"`;
        }
        options.exprs.push(check + ` ? r.effect(_fn${count}) : _fn${count}()`);
      }
      options.counter = childOptions.counter;
      options.wrap = false;
    }
  }

  function processChildren(node: IDom, options: Options) {
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
      if (!childOptions.multi && child.type === "comment" && child.content === "#") node.children.splice(i, 1);
      else i++;
    }
    options.counter = childOptions.counter;
    options.templateId = childOptions.templateId;
    options.hasCustomElement = options.hasCustomElement || childOptions.hasCustomElement;
  }

  function processComponentProps(propGroups: (string | string[])[]) {
    let result = [];
    for (const props of propGroups) {
      if (Array.isArray(props)) {
        if (!props.length) continue;
        result.push(`r.wrapProps({${props.join(",") || ""}})`);
      } else result.push(props);
    }
    return result.length > 1 ? `r.mergeProps(${result.join(",")})` : result[0];
  }

  function processComponent(node: IDom, options: Options) {
    let props: string[] = [];
    const keys = Object.keys(node.attrs),
      propGroups: (string | string[])[] = [props],
      componentIdentifier = options.counter++;

    for (let i = 0; i < keys.length; i++) {
      const {type, name, value} = node.attrs[i];
      if (type === 'attr') {
        if (name === "###") {
          propGroups.push(`exprs[${options.counter++}]`);
          propGroups.push((props = []));
        } else if (value === "###") {
          props.push(`${name}: exprs[${options.counter++}]`);
        } else props.push(`${name}: "${value}"`);
      } else if (type === 'directive') {
        const tag = `_$el${uuid++}`;
        const topDecl = !options.decl.length;
        options.decl.push(
          topDecl ? "" : `${tag} = ${options.path}.${options.first ? "firstChild" : "nextSibling"}`
        );
        parseDirective(name, value, tag, options);
      }
    }
    if (
      node.children.length === 1 &&
      node.children[0].type === "comment" &&
      node.children[0].content === "#"
    ) {
      props.push(`children: () => exprs[${options.counter++}]`);
    } else if (node.children.length) {
      const children = { type: "fragment", children: node.children } as IDom,
        childOptions = Object.assign({}, options, {
          first: true,
          decl: [],
          exprs: [],
          parent: false
        });
      parseNode(children, childOptions);
      props.push(`children: () => { ${childOptions.exprs.join(";\n")}}`);
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
        `r.insert(${
          options.parent
        }, r.createComponent(exprs[${componentIdentifier}],${processComponentProps(propGroups)})${
          tag ? `, ${tag}` : ""
        })`
      );
    else
      options.exprs.push(
        `${
          options.fragment ? "" : "return "
        }r.createComponent(exprs[${componentIdentifier}],${processComponentProps(propGroups)})`
      );
    options.path = tag;
    options.first = false;
  }

  function parseNode(node: IDom, options: Options) {
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
          options.templateNodes.push([child]);
          parseNode(child, childOptions);
          parts.push(
            `function() { ${
              childOptions.decl.join(",\n") +
              ";\n" +
              childOptions.exprs.join(";\n") +
              `;\nreturn _$el${id};\n`
            }}()`
          );
          options.counter = childOptions.counter;
          options.templateId = childOptions.templateId;
        } else if (child.type === "text") {
          parts.push(`"${child.content!}"`);
        } else if (child.type === "comment") {
          if (child.content === "#") parts.push(`exprs[${options.counter++}]`);
          else if(child.content) {
            for (let i = 0; i < child.content.split("###").length - 1; i++) {
              parts.push(`exprs[${options.counter++}]`);
            }
          }
        }
      });
      options.exprs.push(`return [${parts.join(", \n")}]`);
    } else if (node.type === "tag") {
      const tag = `_$el${uuid++}`;
      const topDecl = !options.decl.length;
      const templateId = options.templateId;
      options.decl.push(
        topDecl ? "" : `${tag} = ${options.path}.${options.first ? "firstChild" : "nextSibling"}`
      );
      const isSVG = r.SVGElements.has(node.name);
      const isCE = node.name.includes("-");
      options.hasCustomElement = isCE;
      if (node.attrs.some(e => e.name === "###")) {
        const spreadArgs = [];
        let current = "";
        const newAttrs = [];
        for (let i = 0; i < node.attrs.length; i++) {
          const {type, name, value} = node.attrs[i];
          if (type === 'attr') {
            if (value.includes("###")) {
              let count = options.counter++;
              current += `${name}: ${
                name !== "ref" ? `typeof exprs[${count}] === "function" ? exprs[${count}]() : ` : ""
              }exprs[${count}],`;
            } else if (name === "###") {
              if (current.length) {
                spreadArgs.push(`()=>({${current}})`);
                current = "";
              }
              spreadArgs.push(`exprs[${options.counter++}]`);
            } else {
              newAttrs.push(node.attrs[i]);
            }
          } else if (type === 'directive') {
            parseDirective(name, value, tag, options);
          }
        }
        node.attrs = newAttrs;
        if (current.length) {
          spreadArgs.push(`()=>({${current}})`);
        }
        options.exprs.push(
          `r.spread(${tag},${
            spreadArgs.length === 1
              ? `typeof ${spreadArgs[0]} === "function" ? r.mergeProps(${spreadArgs[0]}) : ${spreadArgs[0]}`
              : `r.mergeProps(${spreadArgs.join(",")})`
          },${isSVG},${!!node.children.length})`
        );
      } else {
        for (let i = 0; i < node.attrs.length; i++) {
          const {type, name, value} = node.attrs[i];
          if (type === 'directive') {
            parseDirective(name, value, tag, options);
            node.attrs.splice(i, 1);
            i--;
          } else if (type === "attr") {
            if (value.includes("###")) {
              node.attrs.splice(i, 1);
              i--;
              parseAttribute(node, tag, name, value, isSVG, isCE, options);
            }
          }
        }
      }
      options.path = tag;
      options.first = false;
      processChildren(node, options);
      if (topDecl) {
        options.decl[0] = options.hasCustomElement
          ? `const ${tag} = r.untrack(() => document.importNode(tmpls[${templateId}].content.firstChild, true))`
          : `const ${tag} = tmpls[${templateId}].content.firstChild.cloneNode(true)`;
      }
    } else if (node.type === "text") {
      const tag = `_$el${uuid++}`;
      options.decl.push(`${tag} = ${options.path}.${options.first ? "firstChild" : "nextSibling"}`);
      options.path = tag;
      options.first = false;
    } else if (node.type === "comment") {
      const tag = `_$el${uuid++}`;
      options.decl.push(`${tag} = ${options.path}.${options.first ? "firstChild" : "nextSibling"}`);
      if (node.content === "#") {
        if (options.multi) {
          options.exprs.push(`r.insert(${options.parent}, exprs[${options.counter++}], ${tag})`);
        } else options.exprs.push(`r.insert(${options.parent}, exprs[${options.counter++}])`);
      }
      options.path = tag;
      options.first = false;
    }
  }

  function parseTemplate(nodes: IDom[], funcBuilder: (...args: string[]) => Function): [string[], TemplateCreate] {
    const options: Options = {
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
      funcBuilder(
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

  function html(statics: TemplateStringsArray, ...args: unknown[]): Node {
    const templates = cache.get(statics) || createTemplate(statics, { funcBuilder: functionBuilder });
    return (templates[0] as CreateableTemplate).create(templates, args, r);
  }

  return html;
}
