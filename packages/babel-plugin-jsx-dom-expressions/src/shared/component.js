import * as t from "@babel/types";
import config from "../config";
import {
  getTagName,
  isDynamic,
  registerImportMethod,
  tagNameToIdentifier,
  filterChildren,
  trimWhitespace,
  transformCondition
} from "./utils";
import { transformNode } from "./transform";
import { createTemplate as createTemplateDOM } from "../dom/template";
import { createTemplate as createTemplateSSR } from "../ssr/template";

export default function transformComponent(path) {
  let props = [],
    runningObject = [],
    exprs = [],
    tagName = getTagName(path.node);

  if (config.builtIns.indexOf(tagName) > -1 && !path.scope.hasBinding(tagName)) {
    registerImportMethod(path, tagName);
    tagName = `_$${tagName}`;
  }

  path
    .get("openingElement")
    .get("attributes")
    .forEach(attribute => {
      const node = attribute.node;
      if (t.isJSXSpreadAttribute(node)) {
        if (runningObject.length) {
          props.push(t.objectExpression(runningObject));
          runningObject = [];
        }
        props.push(node.argument);
      } else {
        const value = node.value || t.booleanLiteral(true),
          key = t.isJSXNamespacedName(node.name)
            ? `${node.name.namespace.name}:${node.name.name.name}`
            : node.name.name,
          wrapName = t.isValidIdentifier(key) ? t.identifier : t.stringLiteral;
        if (t.isJSXExpressionContainer(value))
          if (key === "ref") {
            if (config.generate === "ssr") return;
            // Normalize expressions for non-null and type-as
            while (t.isTSNonNullExpression(value.expession) || t.isTSAsExpression(value.expression)) {
              value.expression = value.expression.expression;
            }
            if (t.isLVal(value.expression)) {
              const refIdentifier = path.scope.generateUidIdentifier("_ref$");
              runningObject.push(
                t.objectMethod(
                  "method",
                  t.identifier("ref"),
                  [t.identifier("r$")],
                  t.blockStatement([
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
                        t.callExpression(refIdentifier, [t.identifier("r$")]),
                        t.assignmentExpression("=", value.expression, t.identifier("r$"))
                      )
                    )
                  ])
                )
              );
            } else if (t.isFunction(value.expression)) {
              runningObject.push(t.objectProperty(t.identifier("ref"), value.expression));
            } else if (t.isCallExpression(value.expression)) {
              const refIdentifier = path.scope.generateUidIdentifier("_ref$");
              runningObject.push(
                t.objectMethod(
                  "method",
                  t.identifier("ref"),
                  [t.identifier("r$")],
                  t.blockStatement([
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
                        t.callExpression(refIdentifier, [t.identifier("r$")])
                      )
                    )
                  ])
                )
              );
            }
          } else if (
            isDynamic(attribute.get("value").get("expression"), {
              checkMember: true,
              checkTags: true
            })
          ) {
            let expr =
              config.wrapConditionals &&
              config.generate !== "ssr" &&
              (t.isLogicalExpression(value.expression) ||
                t.isConditionalExpression(value.expression))
                ? transformCondition(attribute.get("value").get("expression"))
                : t.arrowFunctionExpression([], value.expression);
            if (expr.length > 1) {
              exprs.push(expr[0]);
              expr = expr[1];
            }
            runningObject.push(
              t.objectMethod(
                "get",
                wrapName(key),
                [],
                t.blockStatement([t.returnStatement(expr.body)]),
                !t.isValidIdentifier(key)
              )
            );
          } else runningObject.push(t.objectProperty(wrapName(key), value.expression));
        else runningObject.push(t.objectProperty(wrapName(key), value));
      }
    });

  const childResult = transformComponentChildren(path.get("children"));
  if (childResult && childResult[0]) {
    if (childResult[1]) {
      const body =
        t.isCallExpression(childResult[0]) && t.isFunction(childResult[0].callee)
          ? childResult[0].callee.body
          : childResult[0].body;
      runningObject.push(
        t.objectMethod(
          "get",
          t.identifier("children"),
          [],
          t.isExpression(body) ? t.blockStatement([t.returnStatement(body)]) : body
        )
      );
    } else runningObject.push(t.objectProperty(t.identifier("children"), childResult[0]));
  }
  if (runningObject.length || !props.length) props.push(t.objectExpression(runningObject));

  if (props.length > 1) {
    registerImportMethod(path, "mergeProps");
    props = [t.callExpression(t.identifier("_$mergeProps"), props)];
  }
  registerImportMethod(path, "createComponent");
  const componentArgs = [tagNameToIdentifier(tagName), props[0]];
  exprs.push(t.callExpression(t.identifier("_$createComponent"), componentArgs));

  // handle hoisting conditionals
  if (exprs.length > 1) {
    const ret = exprs.pop();
    exprs = [
      t.callExpression(
        t.arrowFunctionExpression([], t.blockStatement([...exprs, t.returnStatement(ret)])),
        []
      )
    ];
  }
  return { exprs, template: "", component: true };
}

function transformComponentChildren(children) {
  const createTemplate = config.generate === "ssr" ? createTemplateSSR : createTemplateDOM,
    filteredChildren = filterChildren(children);
  if (!filteredChildren.length) return;
  let dynamic = false;

  let transformedChildren = filteredChildren.map(path => {
    if (t.isJSXText(path.node)) {
      return t.stringLiteral(trimWhitespace(path.node.extra.rawValue));
    } else {
      const child = transformNode(path, {
        topLevel: true,
        componentChild: true
      });
      dynamic = dynamic || child.dynamic;
      return createTemplate(path, child, filteredChildren.length > 1);
    }
  });

  if (filteredChildren.length === 1) {
    transformedChildren = transformedChildren[0];
    if (
      !t.isJSXExpressionContainer(filteredChildren[0]) &&
      !t.isJSXSpreadChild(filteredChildren[0]) &&
      !t.isJSXText(filteredChildren[0])
    ) {
      transformedChildren =
        t.isCallExpression(transformedChildren) &&
        !transformedChildren.arguments.length &&
        !t.isIdentifier(transformedChildren.callee)
          ? transformedChildren.callee
          : t.arrowFunctionExpression([], transformedChildren);
      dynamic = true;
    }
  } else {
    transformedChildren = t.arrowFunctionExpression([], t.arrayExpression(transformedChildren));
    dynamic = true;
  }
  return [transformedChildren, dynamic];
}
