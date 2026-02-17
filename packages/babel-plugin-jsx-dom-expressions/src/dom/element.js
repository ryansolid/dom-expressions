import * as t from "@babel/types";

import {
  Properties,
  ChildProperties,
  SVGNamespace,
  DelegatedEvents,
  SVGElements
} from "dom-expressions/src/constants";
import VoidElements from "../VoidElements";
import {
  evaluateAndInline,
  getTagName,
  isDynamic,
  isComponent,
  registerImportMethod,
  filterChildren,
  toEventName,
  checkLength,
  getStaticExpression,
  reservedNameSpaces,
  wrappedByText,
  getRendererConfig,
  getConfig,
  escapeHTML,
  convertJSXIdentifier,
  canNativeSpread,
  transformCondition,
  trimWhitespace,
  inlineCallExpression,
  hasStaticMarker
} from "../shared/utils";
import { transformNode } from "../shared/transform";
import { InlineElements, BlockElements } from "./constants";

const alwaysClose = [
  "title",
  "style",
  "a",
  "strong",
  "small",
  "b",
  "u",
  "i",
  "em",
  "s",
  "code",
  "object",
  "table",
  "button",
  "textarea",
  "select",
  "iframe",
  "script",
  "noscript",
  "template",
  "fieldset"
];

export function transformElement(path, info) {
  path
    .get("openingElement")
    .get("attributes")
    .forEach(attr => {
      evaluateAndInline(attr.node.value, attr.get("value"));
    });

  let tagName = getTagName(path.node),
    config = getConfig(path),
    wrapSVG = info.topLevel && tagName != "svg" && SVGElements.has(tagName),
    voidTag = VoidElements.indexOf(tagName) > -1,
    isCustomElement =
      tagName.indexOf("-") > -1 ||
      path
        .get("openingElement")
        .get("attributes")
        .some(a => a.node?.name?.name === "is" || a.name?.name === "is"),
    isImportNode =
      (tagName === "img" || tagName === "iframe") &&
      path
        .get("openingElement")
        .get("attributes")
        .some(a => a.node.name?.name === "loading"),
    results = {
      template: `<${tagName}`,
      templateWithClosingTags: `<${tagName}`,
      declarations: [],
      exprs: [],
      dynamics: [],
      postExprs: [],
      isSVG: wrapSVG,
      hasCustomElement: isCustomElement,
      isImportNode,
      tagName,
      renderer: "dom",
      skipTemplate: false
    };

  if (!config.inlineStyles) {
    path
      .get("openingElement")
      .get("attributes")
      .forEach(a => {
        if (a.node.name?.name === "style") {
          let value = a.node.value.expression ? a.node.value.expression : a.node.value;
          if (t.isStringLiteral(value)) {
            // jsx attribute value is a sting that may takes more than one line
            value = t.templateLiteral(
              [t.templateElement({ raw: value.value, cooked: value.value })],
              []
            );
          }
          a.get("value").replaceWith(
            t.jSXExpressionContainer(t.callExpression(t.arrowFunctionExpression([], value), []))
          );
        }
      });
  }

  path
    .get("openingElement")
    .get("attributes")
    .some(a => {
      if (a.node.name?.name === "_hk") {
        a.remove();
        let filename = "";
        try {
          filename = path.scope.getProgramParent().path.hub.file.opts.filename;
        } catch (e) {}

        console.log(
          "\n" +
            path
              .buildCodeFrameError(
                `"_hk" attribute found in template, which could potentially cause hydration miss-matches. Usually happens when copying and pasting Solid SSRed code into JSX. Please remove the attribute from the JSX. \n\n${filename}\n`
              )
              .toString()
        );
      }
    });
  if (config.hydratable && (tagName === "html" || tagName === "head" || tagName === "body")) {
    results.skipTemplate = true;
    if (tagName === "head" && info.topLevel) {
      const createComponent = registerImportMethod(
        path,
        "createComponent",
        getRendererConfig(path, "dom").moduleName
      );
      const NoHydration = registerImportMethod(
        path,
        "NoHydration",
        getRendererConfig(path, "dom").moduleName
      );
      results.exprs.push(
        t.expressionStatement(
          t.callExpression(createComponent, [NoHydration, t.objectExpression([])])
        )
      );
      return results;
    }
  }
  if (wrapSVG) {
    results.template = "<svg>" + results.template;
    results.templateWithClosingTags = "<svg>" + results.templateWithClosingTags;
  }
  if (!info.skipId) {
    results.id = path.scope.generateUidIdentifier("el$");
  }
  transformAttributes(path, results);
  if (config.contextToCustomElements && (tagName === "slot" || isCustomElement)) {
    contextToCustomElement(path, results);
  }
  results.template += ">";
  results.templateWithClosingTags += ">";
  if (!voidTag) {
    // always close tags can still be skipped if they have no closing parents and are the last element
    const toBeClosed =
      !info.lastElement ||
      !config.omitLastClosingTag ||
      (info.toBeClosed && (!config.omitNestedClosingTags || info.toBeClosed.has(tagName)));
    if (toBeClosed) {
      results.toBeClosed = new Set(info.toBeClosed || alwaysClose);
      results.toBeClosed.add(tagName);
      if (InlineElements.includes(tagName)) BlockElements.forEach(i => results.toBeClosed.add(i));
    } else results.toBeClosed = info.toBeClosed;
    if (tagName !== "noscript") transformChildren(path, results, config);
    if (toBeClosed) results.template += `</${tagName}>`;
    results.templateWithClosingTags += `</${tagName}>`;
  }
  if (info.topLevel && config.hydratable && results.hasHydratableEvent) {
    let runHydrationEvents = registerImportMethod(
      path,
      "runHydrationEvents",
      getRendererConfig(path, "dom").moduleName
    );
    results.postExprs.push(t.expressionStatement(t.callExpression(runHydrationEvents, [])));
  }
  if (wrapSVG) {
    results.template += "</svg>";
    results.templateWithClosingTags += "</svg>";
  }
  return results;
}

export function setAttr(path, elem, name, value, { isSVG, dynamic, prevId, tagName }) {
  // pull out namespace
  const config = getConfig(path);
  let parts, namespace;
  if ((parts = name.split(":")) && parts[1] && reservedNameSpaces.has(parts[0])) {
    name = parts[1];
    namespace = parts[0];
  }

  if (namespace === "style") {
    const setStyleProperty = registerImportMethod(
      path,
      "setStyleProperty",
      getRendererConfig(path, "dom").moduleName
    );

    return t.callExpression(setStyleProperty, [
      elem,
      t.stringLiteral(name),
      t.isAssignmentExpression(value) && t.isIdentifier(value.left) ? value.right : value
    ]);
  }

  if (namespace === "class") {
    return t.callExpression(
      t.memberExpression(
        t.memberExpression(elem, t.identifier("classList")),
        t.identifier("toggle")
      ),
      [
        t.stringLiteral(name),
        dynamic ? value : t.unaryExpression("!", t.unaryExpression("!", value))
      ]
    );
  }

  if (name === "style") {
    return t.callExpression(
      registerImportMethod(path, "style", getRendererConfig(path, "dom").moduleName),
      prevId ? [elem, value, prevId] : [elem, value]
    );
  }

  if (name === "class") {
    return t.callExpression(
      registerImportMethod(path, "className", getRendererConfig(path, "dom").moduleName),
      prevId
        ? [elem, value, t.booleanLiteral(isSVG), prevId]
        : isSVG
          ? [elem, value, t.booleanLiteral(true)]
          : [elem, value]
    );
  }

  if (dynamic && name === "textContent") {
    if (config.hydratable) {
      return t.callExpression(registerImportMethod(path, "setProperty"), [
        elem,
        t.stringLiteral("data"),
        value
      ]);
    }
    return t.assignmentExpression("=", t.memberExpression(elem, t.identifier("data")), value);
  }

  const isChildProp = ChildProperties.has(name);
  const isProp = Properties.has(name);
  if (isChildProp || (!isSVG && isProp) || namespace === "prop") {
    if (config.hydratable && namespace !== "prop") {
      return t.callExpression(registerImportMethod(path, "setProperty"), [
        elem,
        t.stringLiteral(name),
        value
      ]);
    }
    const assignment = t.assignmentExpression(
      "=",
      t.memberExpression(elem, t.identifier(name)),
      value
    );
    // handle select/options... TODO: consider other ways in the future
    if (name === "value" && tagName === "select") {
      return t.logicalExpression(
        "||",
        t.callExpression(t.identifier("queueMicrotask"), [
          t.arrowFunctionExpression([], assignment)
        ]),
        assignment
      );
    }
    return assignment;
  }

  let isNameSpaced = name.indexOf(":") > -1;
  const ns = isNameSpaced && SVGNamespace[name.split(":")[0]];
  if (ns) {
    return t.callExpression(
      registerImportMethod(path, "setAttributeNS", getRendererConfig(path, "dom").moduleName),
      [elem, t.stringLiteral(ns), t.stringLiteral(name), value]
    );
  } else {
    return t.callExpression(
      registerImportMethod(path, "setAttribute", getRendererConfig(path, "dom").moduleName),
      [elem, t.stringLiteral(name), value]
    );
  }
}

function detectResolvableEventHandler(attribute, handler) {
  while (t.isIdentifier(handler)) {
    const lookup = attribute.scope.getBinding(handler.name);
    if (lookup) {
      if (t.isVariableDeclarator(lookup.path.node)) {
        handler = lookup.path.node.init;
      } else if (t.isFunctionDeclaration(lookup.path.node)) {
        return true;
      } else return false;
    } else return false;
  }
  return t.isFunction(handler);
}

function transformAttributes(path, results) {
  let elem = results.id,
    hasHydratableEvent = false,
    children,
    spreadExpr,
    attributes = path.get("openingElement").get("attributes");
  const tagName = getTagName(path.node),
    isSVG = SVGElements.has(tagName),
    hasChildren = path.node.children.length > 0,
    config = getConfig(path);

  // preprocess spreads
  if (attributes.some(attribute => t.isJSXSpreadAttribute(attribute.node))) {
    [attributes, spreadExpr] = processSpreads(path, attributes, {
      elem,
      isSVG,
      hasChildren,
      wrapConditionals: config.wrapConditionals
    });
    path.get("openingElement").set(
      "attributes",
      attributes.map(a => a.node)
    );
    //NOTE: can't be checked at compile time so add to compiled output
    hasHydratableEvent = true;
  }

  /**
   * Inline styles
   *
   * 1. When string
   * 2. When is an object, the key is a string, and value is string/numeric
   * 3. Remove properties from object when value is undefined/null
   * 4. When `value.evaluate().confident`
   *
   * Also, when `key` is computed value is also `value.evaluate().confident`
   */

  attributes = path.get("openingElement").get("attributes");

  const styleAttributes = attributes.filter(a => a.node.name && a.node.name.name === "style");
  if (styleAttributes.length > 0) {
    let inlinedStyle = "";

    for (let i = 0; i < styleAttributes.length; i++) {
      const attr = styleAttributes[i];

      let value = attr.node.value;
      const node = attr.get("value");
      if (t.isJSXExpressionContainer(value)) {
        value = value.expression;
      }

      if (t.isStringLiteral(value)) {
        inlinedStyle += `${value.value.replace(/;$/, "")};`;
        attr.remove();
      } else if (t.isObjectExpression(value)) {
        const properties = value.properties;
        const propertiesNode = node.get("expression").get("properties");
        const toRemoveProperty = [];
        for (let i = 0; i < properties.length; i++) {
          const property = properties[i];

          if (property.computed) {
            /* { [computed]: `${1+1}px` } => { [computed]: `2px` } */
            const r = propertiesNode[i].get("value").evaluate();
            if (r.confident && (typeof r.value === "string" || typeof r.value === "number")) {
              property.value = t.inherits(t.stringLiteral(`${r.value}`), property.value);
            }
            // computed cannot be inlined - maybe can be evaluated but this is pretty rare
            continue;
          }

          if (t.isObjectProperty(property)) {
            const key = t.isIdentifier(property.key) ? property.key.name : property.key.value;
            if (t.isStringLiteral(property.value) || t.isNumericLiteral(property.value)) {
              inlinedStyle += `${key}:${property.value.value};`;
              toRemoveProperty.push(property);
            } else if (
              (t.isIdentifier(property.value) && property.value.name === "undefined") ||
              t.isNullLiteral(property.value)
            ) {
              toRemoveProperty.push(property);
            } else {
              const r = propertiesNode[i].get("value").evaluate();
              if (r.confident && (typeof r.value === "string" || typeof r.value === "number")) {
                inlinedStyle += `${key}:${r.value};`;
                toRemoveProperty.push(property);
              }
            }
          }
        }
        for (const remove of toRemoveProperty) {
          value.properties.splice(value.properties.indexOf(remove), 1);
        }
        if (value.properties.length === 0) {
          attr.remove();
        }
      }
    }

    if (inlinedStyle !== "") {
      const styleAttribute = t.jsxAttribute(
        t.jsxIdentifier("style"),
        t.stringLiteral(inlinedStyle.replace(/;$/, ""))
      );
      path.get("openingElement").node.attributes.push(styleAttribute);
    }
  }

  // preprocess styles
  const styleAttribute = path
    .get("openingElement")
    .get("attributes")
    .find(
      a =>
        a.node.name &&
        a.node.name.name === "style" &&
        t.isJSXExpressionContainer(a.node.value) &&
        t.isObjectExpression(a.node.value.expression) &&
        !a.node.value.expression.properties.some(p => t.isSpreadElement(p))
    );
  if (styleAttribute) {
    let i = 0,
      leading = styleAttribute.node.value.expression.leadingComments;
    styleAttribute.node.value.expression.properties.slice().forEach((p, index) => {
      if (!p.computed) {
        if (leading) p.value.leadingComments = leading;
        path
          .get("openingElement")
          .node.attributes.splice(
            styleAttribute.key + ++i,
            0,
            t.jsxAttribute(
              t.jsxNamespacedName(
                t.jsxIdentifier("style"),
                t.jsxIdentifier(t.isIdentifier(p.key) ? p.key.name : p.key.value)
              ),
              t.jsxExpressionContainer(p.value)
            )
          );
        styleAttribute.node.value.expression.properties.splice(index - i - 1, 1);
      }
    });
    if (!styleAttribute.node.value.expression.properties.length)
      path.get("openingElement").node.attributes.splice(styleAttribute.key, 1);
  }

  // preprocess optimal class objects
  attributes = path.get("openingElement").get("attributes");
  const classListAttribute = attributes.find(
    a =>
      a.node.name &&
      a.node.name.name === "class" &&
      t.isJSXExpressionContainer(a.node.value) &&
      t.isObjectExpression(a.node.value.expression) &&
      !a.node.value.expression.properties.some(
        p =>
          t.isSpreadElement(p) ||
          p.computed ||
          (t.isStringLiteral(p.key) && (p.key.value.includes(" ") || p.key.value.includes(":")))
      )
  );
  if (classListAttribute) {
    let i = 0,
      leading = classListAttribute.node.value.expression.leadingComments,
      classListProperties = classListAttribute.get("value").get("expression").get("properties");
    classListProperties.slice().forEach((propPath, index) => {
      const p = propPath.node;
      const { confident, value: computed } = propPath.get("value").evaluate();
      if (leading) p.value.leadingComments = leading;
      if (!confident) {
        path
          .get("openingElement")
          .node.attributes.splice(
            classListAttribute.key + ++i,
            0,
            t.jsxAttribute(
              t.jsxNamespacedName(
                t.jsxIdentifier("class"),
                t.jsxIdentifier(t.isIdentifier(p.key) ? p.key.name : p.key.value)
              ),
              t.jsxExpressionContainer(p.value)
            )
          );
      } else if (computed) {
        path
          .get("openingElement")
          .node.attributes.splice(
            classListAttribute.key + ++i,
            0,
            t.jsxAttribute(
              t.jsxIdentifier("class"),
              t.stringLiteral(t.isIdentifier(p.key) ? p.key.name : p.key.value)
            )
          );
      }
      classListProperties.splice(index - i - 1, 1);
    });
    if (!classListProperties.length)
      path.get("openingElement").node.attributes.splice(classListAttribute.key, 1);
  }

  // combine class properties
  attributes = path.get("openingElement").get("attributes");
  const classAttributes = attributes.filter(a => a.node.name && a.node.name.name === "class");
  if (classAttributes.length > 1) {
    const first = classAttributes[0].node,
      values = [],
      quasis = [t.templateElement({ raw: "" })];
    for (let i = 0; i < classAttributes.length; i++) {
      const attr = classAttributes[i].node,
        isLast = i === classAttributes.length - 1;
      if (!t.isJSXExpressionContainer(attr.value)) {
        const prev = quasis.pop();
        quasis.push(
          t.templateElement({
            raw: (prev ? prev.value.raw : "") + `${attr.value.value}` + (isLast ? "" : " ")
          })
        );
      } else {
        values.push(t.logicalExpression("||", attr.value.expression, t.stringLiteral("")));
        quasis.push(t.templateElement({ raw: isLast ? "" : " " }));
      }
      i && attributes.splice(attributes.indexOf(classAttributes[i]), 1);
    }
    if (values.length) first.value = t.jsxExpressionContainer(t.templateLiteral(quasis, values));
    else first.value = t.stringLiteral(quasis[0].value.raw);
  }
  path.get("openingElement").set(
    "attributes",
    attributes.map(a => a.node)
  );

  let needsSpacing = true;

  // scoped because of `needsSpacing`
  function inlineAttributeOnTemplate(isSVG, key, results, value) {
    results.template += `${needsSpacing ? " " : ""}${key}`;

    if (!value) {
      needsSpacing = true;
      return;
    }

    let text = value.value;
    if (typeof text === "number") text = String(text);
    let needsQuoting = !config.omitQuotes;

    if (key === "style" || key === "class") {
      text = trimWhitespace(text);
      if (key === "style") {
        text = text.replace(/; /g, ";").replace(/: /g, ":");
      }
    }

    if (!text.length) {
      needsSpacing = true;
      results.template += ``;
      return;
    }

    for (let i = 0, len = text.length; i < len; i++) {
      let char = text[i];

      if (
        char === "'" ||
        char === '"' ||
        char === " " ||
        char === "\t" ||
        char === "\n" ||
        char === "\r" ||
        char === "`" ||
        char === "=" ||
        char === "<" ||
        char === ">"
      ) {
        needsQuoting = true;
      }
    }

    if (needsQuoting) {
      needsSpacing = false;
      results.template += `="${escapeHTML(text, true)}"`;
    } else {
      needsSpacing = true;
      results.template += `=${escapeHTML(text, true)}`;
    }
  }

  path
    .get("openingElement")
    .get("attributes")
    .forEach(attribute => {
      const node = attribute.node;
      let value = node.value,
        key = t.isJSXNamespacedName(node.name)
          ? `${node.name.namespace.name}:${node.name.name.name}`
          : node.name.name,
        reservedNameSpace =
          t.isJSXNamespacedName(node.name) && reservedNameSpaces.has(node.name.namespace.name);
      if (t.isJSXExpressionContainer(value) && !key.startsWith("use:")) {
        const evaluated = attribute.get("value").get("expression").evaluate().value;
        let type;
        if (
          evaluated !== undefined &&
          ((type = typeof evaluated) === "string" || type === "number")
        ) {
          if (type === "number" && (Properties.has(key) || key.startsWith("prop:"))) {
            value = t.jsxExpressionContainer(t.numericLiteral(evaluated));
          } else value = t.stringLiteral(String(evaluated));
        }
      }
      if (
        t.isJSXNamespacedName(node.name) &&
        reservedNameSpace &&
        !t.isJSXExpressionContainer(value)
      ) {
        node.value = value = t.jsxExpressionContainer(value || t.jsxEmptyExpression());
      }
      if (
        t.isJSXExpressionContainer(value) &&
        (reservedNameSpace ||
          !(
            t.isStringLiteral(value.expression) ||
            t.isNumericLiteral(value.expression) ||
            t.isBooleanLiteral(value.expression)
          ))
      ) {
        if (key === "ref") {
          // Normalize expressions for non-null and type-as
          while (
            t.isTSNonNullExpression(value.expression) ||
            t.isTSAsExpression(value.expression)
          ) {
            value.expression = value.expression.expression;
          }
          let binding,
            isConstant =
              t.isIdentifier(value.expression) &&
              (binding = path.scope.getBinding(value.expression.name)) &&
              (binding.kind === "const" || binding.kind === "module");
          if (!isConstant && t.isLVal(value.expression)) {
            const refIdentifier = path.scope.generateUidIdentifier("_ref$");
            results.exprs.unshift(
              t.variableDeclaration("var", [t.variableDeclarator(refIdentifier, value.expression)]),
              t.expressionStatement(
                t.conditionalExpression(
                  t.binaryExpression(
                    "===",
                    t.unaryExpression("typeof", refIdentifier),
                    t.stringLiteral("function")
                  ),
                  t.callExpression(
                    registerImportMethod(path, "use", getRendererConfig(path, "dom").moduleName),
                    [refIdentifier, elem]
                  ),
                  t.assignmentExpression("=", value.expression, elem)
                )
              )
            );
          } else if (isConstant || t.isFunction(value.expression)) {
            results.exprs.unshift(
              t.expressionStatement(
                t.callExpression(
                  registerImportMethod(path, "use", getRendererConfig(path, "dom").moduleName),
                  [value.expression, elem]
                )
              )
            );
          } else {
            const refIdentifier = path.scope.generateUidIdentifier("_ref$");
            results.exprs.unshift(
              t.variableDeclaration("var", [t.variableDeclarator(refIdentifier, value.expression)]),
              t.expressionStatement(
                t.logicalExpression(
                  "&&",
                  t.binaryExpression(
                    "===",
                    t.unaryExpression("typeof", refIdentifier),
                    t.stringLiteral("function")
                  ),
                  t.callExpression(
                    registerImportMethod(path, "use", getRendererConfig(path, "dom").moduleName),
                    [refIdentifier, elem]
                  )
                )
              )
            );
          }
        } else if (key.startsWith("use:")) {
          // Some trick to treat JSXIdentifier as Identifier
          node.name.name.type = "Identifier";
          results.exprs.unshift(
            t.expressionStatement(
              t.callExpression(
                registerImportMethod(path, "use", getRendererConfig(path, "dom").moduleName),
                [
                  node.name.name,
                  elem,
                  t.arrowFunctionExpression(
                    [],
                    t.isJSXEmptyExpression(value.expression)
                      ? t.booleanLiteral(true)
                      : value.expression
                  )
                ]
              )
            )
          );
        } else if (key === "children") {
          children = value;
        } else if (key.startsWith("on")) {
          const ev = toEventName(key);
          if (key.startsWith("on:")) {
            const args = [elem, t.stringLiteral(key.split(":")[1]), value.expression];

            results.exprs.unshift(
              t.expressionStatement(
                t.callExpression(
                  registerImportMethod(
                    path,
                    "addEventListener",
                    getRendererConfig(path, "dom").moduleName
                  ),
                  args
                )
              )
            );
          } else if (
            config.delegateEvents &&
            (DelegatedEvents.has(ev) || config.delegatedEvents.indexOf(ev) !== -1)
          ) {
            // can only hydrate delegated events
            hasHydratableEvent = true;
            const events =
              attribute.scope.getProgramParent().data.events ||
              (attribute.scope.getProgramParent().data.events = new Set());
            events.add(ev);
            let handler = value.expression;
            const resolveable = detectResolvableEventHandler(attribute, handler);
            if (t.isArrayExpression(handler)) {
              if (handler.elements.length > 1) {
                results.exprs.unshift(
                  t.expressionStatement(
                    t.assignmentExpression(
                      "=",
                      t.memberExpression(elem, t.identifier(`$$${ev}Data`)),
                      handler.elements[1]
                    )
                  )
                );
              }
              handler = handler.elements[0];
              results.exprs.unshift(
                t.expressionStatement(
                  t.assignmentExpression(
                    "=",
                    t.memberExpression(elem, t.identifier(`$$${ev}`)),
                    handler
                  )
                )
              );
            } else if (t.isFunction(handler) || resolveable) {
              results.exprs.unshift(
                t.expressionStatement(
                  t.assignmentExpression(
                    "=",
                    t.memberExpression(elem, t.identifier(`$$${ev}`)),
                    handler
                  )
                )
              );
            } else {
              results.exprs.unshift(
                t.expressionStatement(
                  t.callExpression(
                    registerImportMethod(
                      path,
                      "addEventListener",
                      getRendererConfig(path, "dom").moduleName
                    ),
                    [elem, t.stringLiteral(ev), handler, t.booleanLiteral(true)]
                  )
                )
              );
            }
          } else {
            let handler = value.expression;
            const resolveable = detectResolvableEventHandler(attribute, handler);
            if (t.isArrayExpression(handler)) {
              if (handler.elements.length > 1) {
                handler = t.arrowFunctionExpression(
                  [t.identifier("e")],
                  t.callExpression(handler.elements[0], [handler.elements[1], t.identifier("e")])
                );
              } else handler = handler.elements[0];
              results.exprs.unshift(
                t.expressionStatement(
                  t.callExpression(t.memberExpression(elem, t.identifier("addEventListener")), [
                    t.stringLiteral(ev),
                    handler
                  ])
                )
              );
            } else if (t.isFunction(handler) || resolveable) {
              results.exprs.unshift(
                t.expressionStatement(
                  t.callExpression(t.memberExpression(elem, t.identifier("addEventListener")), [
                    t.stringLiteral(ev),
                    handler
                  ])
                )
              );
            } else {
              results.exprs.unshift(
                t.expressionStatement(
                  t.callExpression(
                    registerImportMethod(
                      path,
                      "addEventListener",
                      getRendererConfig(path, "dom").moduleName
                    ),
                    [elem, t.stringLiteral(ev), handler]
                  )
                )
              );
            }
          }
        } else if (
          config.effectWrapper &&
          (isDynamic(attribute.get("value").get("expression"), {
            checkMember: true
          }) ||
            ((key === "class" || key === "style") &&
              !attribute.get("value").get("expression").evaluate().confident &&
              !hasStaticMarker(value, path)))
        ) {
          let nextElem = elem;
          if (key === "value" || key === "checked") {
            const effectWrapperId = registerImportMethod(path, config.effectWrapper);
            const v = t.identifier("_v$");
            results.postExprs.push(
              t.expressionStatement(
                t.callExpression(effectWrapperId, [
                  inlineCallExpression(value.expression),
                  t.arrowFunctionExpression(
                    [v],
                    t.blockStatement([
                      t.expressionStatement(
                        setAttr(path, elem, key, v, {
                          tagName,
                          isSVG
                        })
                      )
                    ])
                  )
                ])
              )
            );
            return;
          }
          if (key === "textContent") {
            nextElem = attribute.scope.generateUidIdentifier("el$");
            children = t.jsxText(" ");
            children.extra = { raw: " ", rawValue: " " };
            results.declarations.push(
              t.variableDeclarator(nextElem, t.memberExpression(elem, t.identifier("firstChild")))
            );
          }
          results.dynamics.push({
            elem: nextElem,
            key,
            value: value.expression,
            isSVG,
            tagName
          });
        } else {
          results.exprs.push(
            t.expressionStatement(
              setAttr(attribute, elem, key, value.expression, { isSVG, tagName })
            )
          );
        }
      } else {
        if (config.hydratable && key === "$ServerOnly") {
          results.skipTemplate = true;
          return;
        }
        if (t.isJSXExpressionContainer(value)) value = value.expression;

        // boolean as `<el attr={true | false}/>`, not as `<el attr={"true" | "false"}/>`
        // `<el attr={true}/>` becomes `<el attr/>`
        // `<el attr={false}/>` becomes `<el/>`
        if (t.isBooleanLiteral(value)) {
          if (value.value === true) {
            results.template += `${needsSpacing ? " " : ""}${key}`;
            needsSpacing = true;
          }
          return;
        }

        // properties
        if (value && ChildProperties.has(key)) {
          results.exprs.push(
            t.expressionStatement(setAttr(attribute, elem, key, value, { isSVG, tagName }))
          );
        } else {
          inlineAttributeOnTemplate(isSVG, key, results, value);
        }
      }
    });
  if (!hasChildren && children) {
    path.node.children.push(children);
  }
  if (spreadExpr) results.exprs.push(spreadExpr);

  results.hasHydratableEvent = results.hasHydratableEvent || hasHydratableEvent;
}

function findLastElement(children, hydratable) {
  let lastElement = -1,
    tagName;
  for (let i = children.length - 1; i >= 0; i--) {
    const node = children[i].node;
    if (
      hydratable ||
      t.isJSXText(node) ||
      getStaticExpression(children[i]) !== false ||
      (t.isJSXElement(node) && (tagName = getTagName(node)) && !isComponent(tagName))
    ) {
      lastElement = i;
      break;
    }
  }
  return lastElement;
}

function transformChildren(path, results, config) {
  let tempPath = results.id && results.id.name,
    tagName = getTagName(path.node),
    nextPlaceholder,
    childPostExprs = [],
    i = 0;
  const filteredChildren = filterChildren(path.get("children")),
    lastElement = findLastElement(filteredChildren, config.hydratable),
    childNodes = filteredChildren.reduce((memo, child, index) => {
      if (child.isJSXFragment()) {
        throw new Error(
          `Fragments can only be used top level in JSX. Not used under a <${tagName}>.`
        );
      }
      const transformed = transformNode(child, {
        toBeClosed: results.toBeClosed,
        lastElement: index === lastElement,
        skipId: !results.id || !detectExpressions(filteredChildren, index, config)
      });
      if (!transformed) return memo;
      const i = memo.length;
      if (transformed.text && i && memo[i - 1].text) {
        memo[i - 1].template += transformed.template;
        memo[i - 1].templateWithClosingTags +=
          transformed.templateWithClosingTags || transformed.template;
      } else memo.push(transformed);
      return memo;
    }, []);

  childNodes.forEach((child, index) => {
    if (!child) return;
    if (child.tagName && child.renderer !== "dom") {
      throw new Error(`<${child.tagName}> is not supported in <${tagName}>.
      Wrap the usage with a component that would render this element, eg. Canvas`);
    }

    results.template += child.template;
    results.templateWithClosingTags += child.templateWithClosingTags || child.template;
    results.isImportNode = results.isImportNode || child.isImportNode;

    if (child.id) {
      if (child.tagName === "head") {
        if (config.hydratable) {
          const createComponent = registerImportMethod(
            path,
            "createComponent",
            getRendererConfig(path, "dom").moduleName
          );
          const NoHydration = registerImportMethod(
            path,
            "NoHydration",
            getRendererConfig(path, "dom").moduleName
          );
          results.exprs.push(
            t.expressionStatement(
              t.callExpression(createComponent, [NoHydration, t.objectExpression([])])
            )
          );
        }
        return;
      }

      let getNextMatch;
      if (config.hydratable && tagName === "html") {
        getNextMatch = registerImportMethod(
          path,
          "getNextMatch",
          getRendererConfig(path, "dom").moduleName
        );
      }
      const walk = t.memberExpression(
        t.identifier(tempPath),
        t.identifier(i === 0 ? "firstChild" : "nextSibling")
      );
      results.declarations.push(
        t.variableDeclarator(
          child.id,
          config.hydratable && tagName === "html"
            ? t.callExpression(getNextMatch, [walk, t.stringLiteral(child.tagName)])
            : walk
        )
      );
      results.declarations.push(...child.declarations);
      results.exprs.push(...child.exprs);
      results.dynamics.push(...child.dynamics);
      childPostExprs.push(...child.postExprs);
      results.hasHydratableEvent = results.hasHydratableEvent || child.hasHydratableEvent;
      results.hasCustomElement = results.hasCustomElement || child.hasCustomElement;
      results.isImportNode = results.isImportNode || child.isImportNode;
      tempPath = child.id.name;
      nextPlaceholder = null;
      i++;
    } else if (child.exprs.length) {
      let insert = registerImportMethod(path, "insert", getRendererConfig(path, "dom").moduleName);
      const multi = checkLength(filteredChildren),
        markers = config.hydratable && multi;
      // boxed by textNodes
      if (markers || wrappedByText(childNodes, index)) {
        let exprId, contentId;
        if (markers) tempPath = createPlaceholder(path, results, tempPath, i++, "$")[0].name;
        if (nextPlaceholder) {
          exprId = nextPlaceholder;
        } else {
          [exprId, contentId] = createPlaceholder(path, results, tempPath, i++, markers ? "/" : "");
        }
        if (!markers) nextPlaceholder = exprId;
        results.exprs.push(
          t.expressionStatement(
            t.callExpression(
              insert,
              contentId
                ? [results.id, child.exprs[0], exprId, contentId]
                : [results.id, child.exprs[0], exprId]
            )
          )
        );
        tempPath = exprId.name;
      } else if (multi) {
        results.exprs.push(
          t.expressionStatement(
            t.callExpression(insert, [
              results.id,
              child.exprs[0],
              nextChild(childNodes, index) || t.nullLiteral()
            ])
          )
        );
      } else {
        results.exprs.push(
          t.expressionStatement(t.callExpression(insert, [results.id, child.exprs[0]]))
        );
      }
    } else nextPlaceholder = null;
  });
  results.postExprs.unshift(...childPostExprs);
}

function createPlaceholder(path, results, tempPath, i, char) {
  const exprId = path.scope.generateUidIdentifier("el$"),
    config = getConfig(path);
  let contentId;
  results.template += `<!${char}>`;
  results.templateWithClosingTags += `<!${char}>`;
  if (config.hydratable && char === "/") {
    contentId = path.scope.generateUidIdentifier("co$");
    results.declarations.push(
      t.variableDeclarator(
        t.arrayPattern([exprId, contentId]),
        t.callExpression(
          registerImportMethod(path, "getNextMarker", getRendererConfig(path, "dom").moduleName),
          [t.memberExpression(t.identifier(tempPath), t.identifier("nextSibling"))]
        )
      )
    );
  } else
    results.declarations.push(
      t.variableDeclarator(
        exprId,
        t.memberExpression(
          t.identifier(tempPath),
          t.identifier(i === 0 ? "firstChild" : "nextSibling")
        )
      )
    );
  return [exprId, contentId];
}

function nextChild(children, index) {
  return children[index + 1] && (children[index + 1].id || nextChild(children, index + 1));
}

// reduce unnecessary refs
function detectExpressions(children, index, config) {
  if (children[index - 1]) {
    const node = children[index - 1].node;
    if (
      t.isJSXExpressionContainer(node) &&
      !t.isJSXEmptyExpression(node.expression) &&
      getStaticExpression(children[index - 1]) === false
    )
      return true;
    let tagName;
    if (t.isJSXElement(node) && (tagName = getTagName(node)) && isComponent(tagName)) return true;
  }
  for (let i = index; i < children.length; i++) {
    const child = children[i].node;
    if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression) && getStaticExpression(children[i]) === false)
        return true;
    } else if (t.isJSXElement(child)) {
      const tagName = getTagName(child);
      if (isComponent(tagName)) return true;
      if (
        config.contextToCustomElements &&
        (tagName === "slot" ||
          tagName.indexOf("-") > -1 ||
          child.openingElement.attributes.some(a => a.name?.name === "is"))
      )
        return true;
      if (
        child.openingElement.attributes.some(
          attr =>
            t.isJSXSpreadAttribute(attr) ||
            ["textContent", "innerHTML", "innerText"].includes(attr.name.name) ||
            (attr.name.namespace &&
              (attr.name.namespace.name === "use" || attr.name.namespace.name === "prop")) ||
            (t.isJSXExpressionContainer(attr.value) &&
              !(
                t.isStringLiteral(attr.value.expression) ||
                t.isNumericLiteral(attr.value.expression)
              ))
        )
      )
        return true;
      const nextChildren = filterChildren(children[i].get("children"));
      if (nextChildren.length) if (detectExpressions(nextChildren, 0, config)) return true;
    }
  }
}

function contextToCustomElement(path, results) {
  results.exprs.push(
    t.expressionStatement(
      t.assignmentExpression(
        "=",
        t.memberExpression(results.id, t.identifier("_$owner")),
        t.callExpression(
          registerImportMethod(path, "getOwner", getRendererConfig(path, "dom").moduleName),
          []
        )
      )
    )
  );
}

function processSpreads(path, attributes, { elem, isSVG, hasChildren, wrapConditionals }) {
  const config = getConfig(path);
  // TODO: skip but collect the names of any properties after the last spread to not overwrite them
  const filteredAttributes = [];
  const spreadArgs = [];
  let runningObject = [];
  let dynamicSpread = false;
  let firstSpread = false;
  attributes.forEach(attribute => {
    const node = attribute.node;
    const key =
      !t.isJSXSpreadAttribute(node) &&
      (t.isJSXNamespacedName(node.name)
        ? `${node.name.namespace.name}:${node.name.name.name}`
        : node.name.name);
    if (t.isJSXSpreadAttribute(node)) {
      const isStatic =
        node.innerComments &&
        node.innerComments[0] &&
        node.innerComments[0].value.trim() === config.staticMarker;

      firstSpread = true;
      if (runningObject.length) {
        spreadArgs.push(t.objectExpression(runningObject));
        runningObject = [];
      }

      const s =
        isDynamic(attribute.get("argument"), {
          checkMember: true
        }) && (dynamicSpread = true)
          ? inlineCallExpression(node.argument)
          : node.argument;

      spreadArgs.push(isStatic ? t.objectExpression([t.spreadElement(s)]) : s);
    } else if (
      (firstSpread ||
        (t.isJSXExpressionContainer(node.value) &&
          isDynamic(attribute.get("value").get("expression"), { checkMember: true }))) &&
      canNativeSpread(key, { checkNameSpaces: true })
    ) {
      const isContainer = t.isJSXExpressionContainer(node.value);
      const dynamic =
        isContainer && isDynamic(attribute.get("value").get("expression"), { checkMember: true });
      if (dynamic) {
        const id = convertJSXIdentifier(node.name);
        let expr =
          wrapConditionals &&
          (t.isLogicalExpression(node.value.expression) ||
            t.isConditionalExpression(node.value.expression))
            ? transformCondition(attribute.get("value").get("expression"), true)
            : t.arrowFunctionExpression([], node.value.expression);
        runningObject.push(
          t.objectMethod(
            "get",
            id,
            [],
            t.blockStatement([t.returnStatement(expr.body)]),
            !t.isValidIdentifier(key)
          )
        );
      } else {
        runningObject.push(
          t.objectProperty(
            t.stringLiteral(key),
            isContainer ? node.value.expression : node.value || t.stringLiteral("")
          )
        );
      }
    } else filteredAttributes.push(attribute);
  });

  if (runningObject.length) {
    spreadArgs.push(t.objectExpression(runningObject));
  }

  const props =
    spreadArgs.length === 1 && !dynamicSpread
      ? spreadArgs[0]
      : t.callExpression(registerImportMethod(path, "mergeProps"), spreadArgs);

  return [
    filteredAttributes,
    t.expressionStatement(
      t.callExpression(
        registerImportMethod(path, "spread", getRendererConfig(path, "dom").moduleName),
        [elem, props, t.booleanLiteral(isSVG), t.booleanLiteral(hasChildren)]
      )
    )
  ];
}
