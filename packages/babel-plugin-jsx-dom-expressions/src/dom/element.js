import * as t from "@babel/types";
import {
  Aliases,
  PropAliases,
  Properties,
  ChildProperties,
  SVGNamespace,
  DelegatedEvents,
  SVGElements
} from "dom-expressions/src/constants";
import VoidElements from "../VoidElements";
import {
  getTagName,
  isDynamic,
  isComponent,
  registerImportMethod,
  filterChildren,
  toEventName,
  toPropertyName,
  checkLength,
  getStaticExpression,
  reservedNameSpaces,
  wrappedByText,
  getRendererConfig,
  getConfig,
  escapeBackticks
} from "../shared/utils";
import { transformNode } from "../shared/transform";

export function transformElement(path, info) {
  let tagName = getTagName(path.node),
    config = getConfig(path),
    wrapSVG = info.topLevel && tagName != "svg" && SVGElements.has(tagName),
    voidTag = VoidElements.indexOf(tagName) > -1,
    isCustomElement = tagName.indexOf("-") > -1,
    results = {
      template: `<${tagName}`,
      decl: [],
      exprs: [],
      dynamics: [],
      postExprs: [],
      isSVG: wrapSVG,
      hasCustomElement: isCustomElement,
      tagName,
      renderer: "dom"
    };
  if (tagName === "html" && config.hydratable) results.skipTemplate = true;
  if (wrapSVG) results.template = "<svg>" + results.template;
  if (!info.skipId) results.id = path.scope.generateUidIdentifier("el$");
  transformAttributes(path, results);
  if (config.contextToCustomElements && (tagName === "slot" || isCustomElement)) {
    contextToCustomElement(path, results);
  }
  results.template += ">";
  if (!voidTag) {
    transformChildren(path, results, config);
    results.template += `</${tagName}>`;
  }
  if (info.topLevel && config.hydratable && results.hasHydratableEvent) {
    let runHydrationEvents = registerImportMethod(
      path,
      "runHydrationEvents",
      getRendererConfig(path, "dom").moduleName
    );
    results.postExprs.push(t.expressionStatement(t.callExpression(runHydrationEvents, [])));
  }
  if (wrapSVG) results.template += "</svg>";
  return results;
}

export function setAttr(path, elem, name, value, { isSVG, dynamic, prevId, isCE }) {
  // pull out namespace
  const config = getConfig(path)
  let parts, namespace;
  if ((parts = name.split(":")) && parts[1] && reservedNameSpaces.has(parts[0])) {
    name = parts[1];
    namespace = parts[0];
  }

  if (namespace === "style") {
    return t.callExpression(
      t.memberExpression(
        t.memberExpression(elem, t.identifier("style")),
        t.identifier("setProperty")
      ),
      [t.stringLiteral(name), value]
    );
  }

  if (namespace === "class") {
    return t.callExpression(
      t.memberExpression(
        t.memberExpression(elem, t.identifier("classList")),
        t.identifier("toggle")
      ),
      [t.stringLiteral(name), value]
    );
  }

  if (name === "style") {
    return t.callExpression(registerImportMethod(path, "style", getRendererConfig(path, "dom").moduleName), prevId ? [elem, value, prevId] : [elem, value]);
  }

  if (!isSVG && name === "class") {
    return t.callExpression(registerImportMethod(path, "className", getRendererConfig(path, "dom").moduleName), [elem, value]);
  }

  if (name === "classList") {
    return t.callExpression(registerImportMethod(
      path,
      "classList",
      getRendererConfig(path, "dom").moduleName
    ), prevId ? [elem, value, prevId] : [elem, value]);
  }

  if (config.hydratable && name === "innerHTML") {
    return t.callExpression(
      registerImportMethod(path, "innerHTML"),
      [elem, value]
    );
  }

  if (dynamic && name === "textContent") {
    return t.assignmentExpression("=", t.memberExpression(elem, t.identifier("data")), value);
  }

  const isChildProp = ChildProperties.has(name);
  const isProp = Properties.has(name);
  const alias = PropAliases[name];
  if (namespace !== "attr" && (isChildProp || (!isSVG && isProp) || isCE || namespace === "prop")) {
    if (isCE && !isChildProp && !isProp && namespace !== "prop") name = toPropertyName(name);
    return t.assignmentExpression(
      "=",
      t.memberExpression(elem, t.identifier(alias || name)),
      value
    );
  }

  let isNameSpaced = name.indexOf(":") > -1;
  name = Aliases[name] || name;
  !isSVG && (name = name.toLowerCase());
  const ns = isNameSpaced && SVGNamespace[name.split(":")[0]];
  if (ns) {
    return t.callExpression(registerImportMethod(
      path,
      "setAttributeNS",
      getRendererConfig(path, "dom").moduleName
    ), [
      elem,
      t.stringLiteral(ns),
      t.stringLiteral(name),
      value
    ]);
  } else {
    return t.callExpression(registerImportMethod(
      path,
      "setAttribute",
      getRendererConfig(path, "dom").moduleName
    ), [elem, t.stringLiteral(name), value]);
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
    attributes = path.get("openingElement").get("attributes");
  const tagName = getTagName(path.node),
    isSVG = SVGElements.has(tagName),
    isCE = tagName.includes("-"),
    hasChildren = path.node.children.length > 0,
    config = getConfig(path);

  // preprocess styles
  const styleAttribute = attributes.find(
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
            t.JSXAttribute(
              t.JSXNamespacedName(
                t.JSXIdentifier("style"),
                t.JSXIdentifier(t.isIdentifier(p.key) ? p.key.name : p.key.value)
              ),
              t.JSXExpressionContainer(p.value)
            )
          );
        styleAttribute.node.value.expression.properties.splice(index - i - 1, 1);
      }
    });
    if (!styleAttribute.node.value.expression.properties.length)
      path.get("openingElement").node.attributes.splice(styleAttribute.key, 1);
  }

  // preprocess classList
  attributes = path.get("openingElement").get("attributes");
  const classListAttribute = attributes.find(
    a =>
      a.node.name &&
      a.node.name.name === "classList" &&
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
            t.JSXAttribute(
              t.JSXNamespacedName(
                t.JSXIdentifier("class"),
                t.JSXIdentifier(t.isIdentifier(p.key) ? p.key.name : p.key.value)
              ),
              t.JSXExpressionContainer(p.value)
            )
          );
      } else if (computed) {
        path
          .get("openingElement")
          .node.attributes.splice(
            classListAttribute.key + ++i,
            0,
            t.JSXAttribute(
              t.JSXIdentifier("class"),
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
  const classAttributes = attributes.filter(
    a => a.node.name && (a.node.name.name === "class" || a.node.name.name === "className")
  );
  if (classAttributes.length > 1) {
    const first = classAttributes[0].node,
      values = [],
      quasis = [t.TemplateElement({ raw: "" })];
    for (let i = 0; i < classAttributes.length; i++) {
      const attr = classAttributes[i].node,
        isLast = i === classAttributes.length - 1;
      if (!t.isJSXExpressionContainer(attr.value)) {
        const prev = quasis.pop();
        quasis.push(
          t.TemplateElement({
            raw: (prev ? prev.value.raw : "") + `${attr.value.value}` + (isLast ? "" : " ")
          })
        );
      } else {
        values.push(t.logicalExpression("||", attr.value.expression, t.stringLiteral("")));
        quasis.push(t.TemplateElement({ raw: isLast ? "" : " " }));
      }
      i && attributes.splice(attributes.indexOf(classAttributes[i]), 1);
    }
    if (values.length) first.value = t.JSXExpressionContainer(t.TemplateLiteral(quasis, values));
    else first.value = t.stringLiteral(quasis[0].value.raw);
  }
  path.get("openingElement").set(
    "attributes",
    attributes.map(a => a.node)
  );

  path
    .get("openingElement")
    .get("attributes")
    .forEach(attribute => {
      const node = attribute.node;
      if (t.isJSXSpreadAttribute(node)) {
        results.exprs.push(
          t.expressionStatement(
            t.callExpression(registerImportMethod(
              attribute,
              "spread",
              getRendererConfig(path, "dom").moduleName
            ), [
              elem,
              isDynamic(attribute.get("argument"), {
                checkMember: true
              })
                ? t.isCallExpression(node.argument) && !node.argument.arguments.length
                  ? node.argument.callee
                  : t.arrowFunctionExpression([], node.argument)
                : node.argument,
              t.booleanLiteral(isSVG),
              t.booleanLiteral(hasChildren)
            ])
          )
        );
        //NOTE: can't be checked at compile time so add to compiled output
        hasHydratableEvent = true;
        return;
      }

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
          value = t.stringLiteral(String(evaluated));
        }
      }
      if (
        t.isJSXNamespacedName(node.name) &&
        reservedNameSpace &&
        !t.isJSXExpressionContainer(value)
      ) {
        node.value = value = t.JSXExpressionContainer(value || t.JSXEmptyExpression());
      }
      if (
        t.isJSXExpressionContainer(value) &&
        (reservedNameSpace ||
          !(t.isStringLiteral(value.expression) || t.isNumericLiteral(value.expression)))
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
            isFunction =
              t.isIdentifier(value.expression) &&
              (binding = path.scope.getBinding(value.expression.name)) &&
              binding.kind === "const";
          if (!isFunction && t.isLVal(value.expression)) {
            const refIdentifier = path.scope.generateUidIdentifier("_ref$");
            results.exprs.unshift(
              t.variableDeclaration("const", [
                t.variableDeclarator(refIdentifier, value.expression)
              ]),
              t.expressionStatement(
                t.conditionalExpression(
                  t.binaryExpression(
                    "===",
                    t.unaryExpression("typeof", refIdentifier),
                    t.stringLiteral("function")
                  ),
                  t.callExpression(refIdentifier, [elem]),
                  t.assignmentExpression("=", value.expression, elem)
                )
              )
            );
          } else if (isFunction || t.isFunction(value.expression)) {
            results.exprs.unshift(
              t.expressionStatement(t.callExpression(value.expression, [elem]))
            );
          } else if (t.isCallExpression(value.expression)) {
            const refIdentifier = path.scope.generateUidIdentifier("_ref$");
            results.exprs.unshift(
              t.variableDeclaration("const", [
                t.variableDeclarator(refIdentifier, value.expression)
              ]),
              t.expressionStatement(
                t.logicalExpression(
                  "&&",
                  t.binaryExpression(
                    "===",
                    t.unaryExpression("typeof", refIdentifier),
                    t.stringLiteral("function")
                  ),
                  t.callExpression(refIdentifier, [elem])
                )
              )
            );
          }
        } else if (key.startsWith("use:")) {
          // Some trick to treat JSXIdentifier as Identifier
          node.name.name.type = 'Identifier';
          results.exprs.unshift(
            t.expressionStatement(
              t.callExpression(node.name.name, [
                elem,
                t.arrowFunctionExpression(
                  [],
                  t.isJSXEmptyExpression(value.expression)
                    ? t.booleanLiteral(true)
                    : value.expression
                )
              ])
            )
          );
        } else if (key === "children") {
          children = value;
        } else if (key.startsWith("on")) {
          const ev = toEventName(key);
          if (key.startsWith("on:") || key.startsWith("oncapture:")) {
            const listenerOptions = [t.stringLiteral(key.split(":")[1]), value.expression];
            results.exprs.push(
              t.expressionStatement(
                t.callExpression(
                  t.memberExpression(elem, t.identifier("addEventListener")),
                  key.startsWith("oncapture:")
                    ? listenerOptions.concat(t.booleanLiteral(true))
                    : listenerOptions
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
                  t.callExpression(registerImportMethod(
                    path,
                    "addEventListener",
                    getRendererConfig(path, "dom").moduleName
                  ), [
                    elem,
                    t.stringLiteral(ev),
                    handler,
                    t.booleanLiteral(true)
                  ])
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
                  t.callExpression(registerImportMethod(
                    path,
                    "addEventListener",
                    getRendererConfig(path, "dom").moduleName
                  ), [elem, t.stringLiteral(ev), handler])
                )
              );
            }
          }
        } else if (
          config.effectWrapper &&
          isDynamic(attribute.get("value").get("expression"), {
            checkMember: true
          })
        ) {
          let nextElem = elem;
          if (key === "textContent") {
            nextElem = attribute.scope.generateUidIdentifier("el$");
            children = t.JSXText(" ");
            children.extra = { raw: " ", rawValue: " " };
            results.decl.push(
              t.variableDeclarator(nextElem, t.memberExpression(elem, t.identifier("firstChild")))
            );
          }
          results.dynamics.push({ elem: nextElem, key, value: value.expression, isSVG, isCE });
        } else {
          results.exprs.push(
            t.expressionStatement(setAttr(attribute, elem, key, value.expression, { isSVG, isCE }))
          );
        }
      } else {
        if (config.hydratable && key === "$ServerOnly") {
          results.skipTemplate = true;
          return;
        }
        if (t.isJSXExpressionContainer(value)) value = value.expression;
        key = Aliases[key] || key;
        if (value && ChildProperties.has(key)) {
          results.exprs.push(
            t.expressionStatement(setAttr(attribute, elem, key, value, { isSVG, isCE }))
          );
        } else {
          !isSVG && (key = key.toLowerCase());
          results.template += ` ${key}`;
          results.template += value ? `="${escapeBackticks(value.value)}"` : "";
        }
      }
    });
  if (!hasChildren && children) {
    path.node.children.push(children);
  }

  results.hasHydratableEvent = results.hasHydratableEvent || hasHydratableEvent;
}

function transformChildren(path, results, config) {
  let tempPath = results.id && results.id.name,
    tagName = getTagName(path.node),
    nextPlaceholder,
    i = 0;
  const filteredChildren = filterChildren(path.get("children")),
    childNodes = filteredChildren
      .map(
        (child, index) =>
          transformNode(child, {
            skipId: !results.id || !detectExpressions(filteredChildren, index, config)
          })
        // combine adjacent textNodes
      )
      .reduce((memo, child) => {
        if (!child) return memo;
        const i = memo.length;
        if (child.text && i && memo[i - 1].text) {
          memo[i - 1].template += child.template;
        } else memo.push(child);
        return memo;
      }, []);

  childNodes.forEach((child, index) => {
    if (!child) return;
    if (child.tagName && child.renderer !== "dom") {
      throw new Error(`<${child.tagName}> is not supported in <${tagName}>.
      Wrap the usage with a component that would render this element, eg. Canvas`);
    }

    results.template += child.template;
    if (child.id) {
      if (child.tagName === "head") return;

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
      results.decl.push(
        t.variableDeclarator(
          child.id,
          config.hydratable && tagName === "html"
            ? t.callExpression(getNextMatch, [walk, t.stringLiteral(child.tagName)])
            : walk
        )
      );
      results.decl.push(...child.decl);
      results.exprs.push(...child.exprs);
      results.dynamics.push(...child.dynamics);
      results.hasHydratableEvent = results.hasHydratableEvent || child.hasHydratableEvent;
      results.hasCustomElement = results.hasCustomElement || child.hasCustomElement;
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
        if (markers) tempPath = createPlaceholder(path, results, tempPath, i++, "#")[0].name;
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
          t.expressionStatement(
            t.callExpression(
              insert,
              [results.id, child.exprs[0]]
            )
          )
        );
      }
    } else nextPlaceholder = null;
  });
}

function createPlaceholder(path, results, tempPath, i, char) {
  const exprId = path.scope.generateUidIdentifier("el$"),
    config = getConfig(path);
  let contentId;
  results.template += `<!${char}>`;
  if (config.hydratable && char === "/") {
    contentId = path.scope.generateUidIdentifier("co$");
    results.decl.push(
      t.variableDeclarator(
        t.arrayPattern([exprId, contentId]),
        t.callExpression(
          registerImportMethod(path, "getNextMarker", getRendererConfig(path, "dom").moduleName),
          [t.memberExpression(t.identifier(tempPath), t.identifier("nextSibling"))]
        )
      )
    );
  } else
    results.decl.push(
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
      !getStaticExpression(children[index - 1])
    )
      return true;
    let tagName;
    if (t.isJSXElement(node) && (tagName = getTagName(node)) && isComponent(tagName)) return true;
  }
  for (let i = index; i < children.length; i++) {
    const child = children[i].node;
    if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression) && !getStaticExpression(children[i]))
        return true;
    } else if (t.isJSXElement(child)) {
      const tagName = getTagName(child);
      if (isComponent(tagName)) return true;
      if (config.contextToCustomElements && (tagName === "slot" || tagName.indexOf("-") > -1))
        return true;
      if (
        child.openingElement.attributes.some(
          attr =>
            t.isJSXSpreadAttribute(attr) ||
            ["textContent", "innerHTML", "innerText"].includes(attr.name.name) ||
            (attr.name.namespace && attr.name.namespace.name === "use") ||
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
