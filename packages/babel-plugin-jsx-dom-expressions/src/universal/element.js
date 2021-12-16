import * as t from "@babel/types";
import { decode } from "html-entities";
import {
  getTagName,
  isDynamic,
  registerImportMethod,
  filterChildren,
  checkLength,
  getConfig
} from "../shared/utils";
import { transformNode } from "../shared/transform";

export function transformElement(path, info) {
  let tagName = getTagName(path.node),
    results = {
      id: path.scope.generateUidIdentifier("el$"),
      decl: [],
      exprs: [],
      dynamics: [],
      postExprs: [],
      tagName
    };

  results.decl.push(
    t.variableDeclarator(
      results.id,
      t.callExpression(registerImportMethod(path, "createElement"), [t.stringLiteral(tagName)])
    )
  );

  transformAttributes(path, results);
  transformChildren(path, results);

  return results;
}

function transformAttributes(path, results) {
  let children;
  const elem = results.id,
    hasChildren = path.node.children.length > 0,
    config = getConfig(path);

  path
    .get("openingElement")
    .get("attributes")
    .forEach(attribute => {
      const node = attribute.node;
      if (t.isJSXSpreadAttribute(node)) {
        results.exprs.push(
          t.expressionStatement(
            t.callExpression(registerImportMethod(attribute, "spread"), [
              elem,
              isDynamic(attribute.get("argument"), {
                checkMember: true
              })
                ? t.isCallExpression(node.argument) && !node.argument.arguments.length
                  ? node.argument.callee
                  : t.arrowFunctionExpression([], node.argument)
                : node.argument,
              t.booleanLiteral(hasChildren)
            ])
          )
        );
        return;
      }

      let value = node.value,
        key = t.isJSXNamespacedName(node.name)
          ? `${node.name.namespace.name}:${node.name.name.name}`
          : node.name.name,
        reservedNameSpace = t.isJSXNamespacedName(node.name) && node.name.namespace.name === "use";
      if (
        t.isJSXNamespacedName(node.name) &&
        reservedNameSpace &&
        !t.isJSXExpressionContainer(value)
      ) {
        node.value = value = t.JSXExpressionContainer(value || t.JSXEmptyExpression());
      }
      if (t.isJSXExpressionContainer(value)) {
        if (key === "ref") {
          // Normalize expressions for non-null and type-as
          while (
            t.isTSNonNullExpression(value.expression) ||
            t.isTSAsExpression(value.expression)
          ) {
            value.expression = value.expression.expression;
          }
          if (t.isLVal(value.expression)) {
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
          } else if (t.isFunction(value.expression)) {
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
          results.exprs.unshift(
            t.expressionStatement(
              t.callExpression(t.identifier(node.name.name.name), [
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
        } else if (
          config.effectWrapper &&
          isDynamic(attribute.get("value").get("expression"), {
            checkMember: true
          })
        ) {
          results.dynamics.push({ elem, key, value: value.expression });
        } else {
          results.exprs.push(
            t.expressionStatement(setAttr(attribute, elem, key, value.expression))
          );
        }
      } else {
        results.exprs.push(t.expressionStatement(setAttr(attribute, elem, key, value)));
      }
    });
  if (!hasChildren && children) {
    path.node.children.push(children);
  }
}

export function setAttr(path, elem, name, value, { prevId } = {}) {
  if (!value) value = t.booleanLiteral(true);
  return t.callExpression(
    registerImportMethod(path, "setProp"),
    prevId ? [elem, t.stringLiteral(name), value, prevId] : [elem, t.stringLiteral(name), value]
  );
}

function transformChildren(path, results) {
  const filteredChildren = filterChildren(path.get("children")),
    multi = checkLength(filteredChildren),
    childNodes = filteredChildren.map(transformNode).reduce((memo, child) => {
      if (!child) return memo;
      const i = memo.length;
      if (child.text && i && memo[i - 1].text) {
        memo[i - 1].template += child.template;
      } else memo.push(child);
      return memo;
    }, []);

  const appends = [];
  childNodes.forEach((child, index) => {
    if (!child) return;
    if (child.id) {
      const insertNode = registerImportMethod(path, "insertNode");
      let insert = child.id;
      if (child.text) {
        const createTextNode = registerImportMethod(path, "createTextNode");
        if (multi) {
          results.decl.push(
            t.variableDeclarator(
              child.id,
              t.callExpression(createTextNode, [
                t.stringLiteral(decode(child.template))
              ])
            )
          );
        } else
          insert = t.callExpression(createTextNode, [
            t.stringLiteral(decode(child.template))
          ]);
      }
      appends.push(
        t.expressionStatement(t.callExpression(insertNode, [results.id, insert]))
      );
      results.decl.push(...child.decl);
      results.exprs.push(...child.exprs);
      results.dynamics.push(...child.dynamics);
    } else if (child.exprs.length) {
      const insert = registerImportMethod(path, "insert");
      if (multi) {
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
            t.callExpression(insert, [results.id, child.exprs[0]])
          )
        );
      }
    }
  });
  results.exprs.unshift(...appends);
}

function nextChild(children, index) {
  return children[index + 1] && (children[index + 1].id || nextChild(children, index + 1));
}
