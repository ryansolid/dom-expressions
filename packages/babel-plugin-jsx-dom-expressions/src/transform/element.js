import * as t from "@babel/types";
import { SVGAttributes, NonComposedEvents, SVGElements } from "dom-expressions";
import config from "../config";
import {
  getTagName,
  isDynamic,
  isComponent,
  registerImportMethod,
  filterChildren,
  toEventName,
  setAttr
} from "../utils";
import transformNode from "./node";

function checkLength(children) {
  let i = 0;
  children.forEach(path => {
    const child = path.node;
    !(t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) &&
      (!t.isJSXText(child) || !/^\s*$/.test(child.extra.raw)) &&
      i++;
  });
  return i > 1;
}

export function createPlaceholder(path, results, tempPath, i, char) {
  const exprId = path.scope.generateUidIdentifier("el$");
  let contentId;
  results.template += `<!--${char}-->`;
  if (config.generate === "hydrate" && char === "/") {
    registerImportMethod(path, "getNextMarker");
    contentId = path.scope.generateUidIdentifier("co$");
    results.decl.push(
      t.variableDeclarator(
        t.arrayPattern([exprId, contentId]),
        t.callExpression(t.identifier("_$getNextMarker"), [
          t.memberExpression(t.identifier(tempPath), t.identifier("nextSibling"))
        ])
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

export function nextChild(children, index) {
  return children[index + 1] && (children[index + 1].id || nextChild(children, index + 1));
}

// reduce unnecessary refs
export function detectExpressions(children, index) {
  if (children[index - 1]) {
    const node = children[index - 1].node;
    if (t.isJSXExpressionContainer(node) && !t.isJSXEmptyExpression(node.expression)) return true;
    let tagName;
    if (t.isJSXElement(node) && (tagName = getTagName(node)) && isComponent(tagName)) return true;
  }
  for (let i = index; i < children.length; i++) {
    const child = children[i].node;
    if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) return true;
    } else if (t.isJSXElement(child)) {
      const tagName = getTagName(child);
      if (isComponent(tagName)) return true;
      if (config.contextToCustomElements && (tagName === "slot" || tagName.indexOf("-") > -1))
        return true;
      if (
        child.openingElement.attributes.some(
          attr =>
            t.isJSXSpreadAttribute(attr) ||
            (t.isJSXExpressionContainer(attr.value) &&
              (config.generate !== "ssr" || !attr.name.name.startsWith("on")) &&
              (attr.name.name.toLowerCase() !== attr.name.name ||
                !(
                  t.isStringLiteral(attr.value.expression) ||
                  t.isNumericLiteral(attr.value.expression)
                )))
        )
      )
        return true;
      const nextChildren = filterChildren(children[i].get("children"), true);
      if (nextChildren.length) if (detectExpressions(nextChildren, 0)) return true;
    }
  }
}

export function transformAttributes(path, results) {
  let elem = results.id,
    hasHydratableEvent = false,
    children;
  const spread = t.identifier("_$spread"),
    tagName = getTagName(path.node),
    isSVG = SVGElements.has(tagName),
    hasChildren = path.node.children.length > 0;

  path
    .get("openingElement")
    .get("attributes")
    .forEach(attribute => {
      const node = attribute.node;
      if (t.isJSXSpreadAttribute(node)) {
        registerImportMethod(attribute, "spread");
        results.exprs.push(
          t.expressionStatement(
            t.callExpression(spread, [
              elem,
              isDynamic(attribute.get("argument"), {
                checkMember: true
              })
                ? t.arrowFunctionExpression([], node.argument)
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
        key = node.name.name;
      if (
        t.isJSXExpressionContainer(value) &&
        (key.toLowerCase() !== key ||
          !(t.isStringLiteral(value.expression) || t.isNumericLiteral(value.expression)))
      ) {
        if (key === "ref") {
          results.exprs.unshift(
            t.expressionStatement(t.assignmentExpression("=", value.expression, elem))
          );
        } else if (key === "children") {
          children = value;
        } else if (key === "forwardRef") {
          results.exprs.unshift(
            t.expressionStatement(
              t.logicalExpression(
                "&&",
                value.expression,
                t.callExpression(value.expression, [elem])
              )
            )
          );
        } else if (key.startsWith("on")) {
          if (config.generate === "ssr") return;
          const ev = toEventName(key);
          if (!ev || ev === "capture") {
            value.expression.properties.forEach(prop => {
              const listenerOptions = [
                t.stringLiteral(prop.key.name || prop.key.value),
                prop.value
              ];
              results.exprs.push(
                t.expressionStatement(
                  t.callExpression(
                    t.memberExpression(elem, t.identifier("addEventListener")),
                    ev ? listenerOptions.concat(t.booleanLiteral(true)) : listenerOptions
                  )
                )
              );
            });
          } else if (
            config.delegateEvents &&
            !NonComposedEvents.has(ev) &&
            config.nonDelegateEvents.indexOf(ev) === -1
          ) {
            // can only hydrate delegated events
            hasHydratableEvent = config.hydratableEvents
              ? config.hydratableEvents.includes(ev)
              : true;
            const events =
              attribute.scope.getProgramParent().data.events ||
              (attribute.scope.getProgramParent().data.events = new Set());
            events.add(ev);
            let handler = value.expression;
            if (t.isArrayExpression(value.expression)) {
              handler = value.expression.elements[0];
              results.exprs.unshift(
                t.expressionStatement(
                  t.assignmentExpression(
                    "=",
                    t.memberExpression(t.identifier(elem.name), t.identifier(`__${ev}Data`)),
                    value.expression.elements[1]
                  )
                )
              );
            }
            results.exprs.unshift(
              t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(t.identifier(elem.name), t.identifier(`__${ev}`)),
                  handler
                )
              )
            );
          } else {
            let handler = value.expression;
            if (t.isArrayExpression(value.expression)) {
              handler = t.arrowFunctionExpression(
                [t.identifier("e")],
                t.callExpression(value.expression.elements[0], [
                  value.expression.elements[1],
                  t.identifier("e")
                ])
              );
            }
            results.exprs.unshift(
              t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(t.identifier(elem.name), t.identifier(`on${ev}`)),
                  handler
                )
              )
            );
          }
        } else if (
          isDynamic(attribute.get("value").get("expression"), {
            checkMember: true
          })
        ) {
          let nextElem = elem;
          if (key === "textContent") {
            const textId = attribute.scope.generateUidIdentifier("el$");
            results.exprs.push(
              t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(elem, t.identifier("textContent")),
                  value.expression
                )
              ),
              t.variableDeclaration("const", [
                t.variableDeclarator(textId, t.memberExpression(elem, t.identifier("firstChild")))
              ])
            );
            nextElem = textId;
          }
          results.dynamics.push({ elem: nextElem, key, value: value.expression, isSVG });
        } else {
          results.exprs.push(
            t.expressionStatement(setAttr(attribute, elem, key, value.expression, isSVG))
          );
        }
      } else {
        if (t.isJSXExpressionContainer(value)) value = value.expression;
        if (isSVG) {
          const attr = SVGAttributes[key];

          if (attr) {
            if (attr.alias) key = attr.alias;
          } else key = key.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`);
        } else {
          const attr = SVGAttributes[key];
          if (attr && attr.alias) key = attr.alias;
          key = key.toLowerCase();
        }
        results.template += ` ${key}`;
        results.template += value ? `="${value.value}"` : `=""`;
      }
    });
  if (!hasChildren && children) {
    path.node.children.push(children);
  }

  results.hasHydratableEvent = results.hasHydratableEvent || hasHydratableEvent;
}

export function transformChildren(path, results) {
  const { generate } = config;
  let tempPath = results.id && results.id.name,
    i = 0;
  const filteredChildren = filterChildren(path.get("children"), true),
    childNodes = filteredChildren.map((child, index) =>
      transformNode(child, {
        skipId: !results.id || !detectExpressions(filteredChildren, index)
      })
    );

  childNodes.forEach((child, index) => {
    if (!child) return;
    results.template += child.template;
    if (child.id) {
      results.decl.push(
        t.variableDeclarator(
          child.id,
          t.memberExpression(
            t.identifier(tempPath),
            t.identifier(i === 0 ? "firstChild" : "nextSibling")
          )
        )
      );
      results.decl.push(...child.decl);
      results.exprs.push(...child.exprs);
      results.dynamics.push(...child.dynamics);
      results.hasHydratableEvent = results.hasHydratableEvent || child.hasHydratableEvent;
      tempPath = child.id.name;
      i++;
    } else if (child.exprs.length) {
      registerImportMethod(path, "insert");
      const multi = checkLength(filteredChildren),
        markers = (generate === "ssr" || generate === "hydrate") && multi;
      // boxed by textNodes
      if (
        markers ||
        (filteredChildren[index - 1] &&
          t.isJSXText(filteredChildren[index - 1].node) &&
          filteredChildren[index + 1] &&
          t.isJSXText(filteredChildren[index + 1].node))
      ) {
        if (markers) tempPath = createPlaceholder(path, results, tempPath, i++, "#")[0].name;
        const [exprId, contentId] = createPlaceholder(
          path,
          results,
          tempPath,
          i++,
          markers ? "/" : ""
        );
        results.exprs.push(
          t.expressionStatement(
            t.callExpression(
              t.identifier("_$insert"),
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
            t.callExpression(t.identifier("_$insert"), [
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
              t.identifier("_$insert"),
              generate === "hydrate"
                ? [
                    results.id,
                    child.exprs[0],
                    t.identifier("undefined"),
                    t.callExpression(
                      t.memberExpression(
                        t.memberExpression(
                          t.memberExpression(t.identifier("Array"), t.identifier("prototype")),
                          t.identifier("slice")
                        ),
                        t.identifier("call")
                      ),
                      [
                        t.memberExpression(results.id, t.identifier("childNodes")),
                        t.numericLiteral(0)
                      ]
                    )
                  ]
                : [results.id, child.exprs[0]]
            )
          )
        );
      }
    }
  });
}
