import * as t from "@babel/types";
import { decode } from "html-entities";
import {
  getConfig,
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
import { createTemplate as createTemplateUniversal } from "../universal/template";

export default function transformComponent(path) {
  let exprs = [],
    config = getConfig(path),
    tagName = getTagName(path.node),
    props = [],
    runningObject = [],
    hasChildren = path.node.children.length > 0;

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
        props.push(
          isDynamic(attribute.get("argument"), {
            checkMember: true
          })
            ? t.isCallExpression(node.argument)
              ? node.argument.callee
              : t.arrowFunctionExpression([], node.argument)
            : node.argument
        );
      } else {
        const value = node.value || t.booleanLiteral(true),
          key = t.isJSXNamespacedName(node.name)
            ? `${node.name.namespace.name}:${node.name.name.name}`
            : node.name.name,
          wrapName = t.isValidIdentifier(key) ? t.identifier : t.stringLiteral;
        if (hasChildren && key === "children") return;
        if (t.isJSXExpressionContainer(value))
          if (key === "ref") {
            if (config.generate === "ssr") return;
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
            } else if (isFunction || t.isFunction(value.expression)) {
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

  const childResult = transformComponentChildren(path.get("children"), config);
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

function transformComponentChildren(children, config) {
  const createTemplate =
      config.generate === "universal"
        ? createTemplateUniversal
        : config.generate === "ssr"
        ? createTemplateSSR
        : createTemplateDOM,
    filteredChildren = filterChildren(children);
  if (!filteredChildren.length) return;
  let dynamic = false;

  let transformedChildren = filteredChildren.reduce((memo, path) => {
    if (t.isJSXText(path.node)) {
      const v = decode(trimWhitespace(path.node.extra.raw));
      if (v.length) memo.push(t.stringLiteral(v));
    } else {
      const child = transformNode(path, {
        topLevel: true,
        componentChild: true
      });
      dynamic = dynamic || child.dynamic;
      memo.push(createTemplate(path, child, filteredChildren.length > 1));
    }
    return memo;
  }, []);

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
