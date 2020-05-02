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
    exprs,
    tagName = getTagName(path.node),
    dynamicSpreads = [],
    dynamicKeys = [];

  if (config.builtIns.indexOf(tagName) > -1) {
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
        const key = t.identifier("k$"),
          memo = t.identifier("m$");
        dynamicSpreads.push(
          t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("keys")), [
            node.argument
          ])
        );
        props.push(
          t.callExpression(
            t.memberExpression(
              t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("keys")), [
                node.argument
              ]),
              t.identifier("reduce")
            ),
            [
              t.arrowFunctionExpression(
                [memo, key],
                t.sequenceExpression([
                  t.assignmentExpression(
                    "=",
                    t.memberExpression(memo, key, true),
                    t.arrowFunctionExpression([], t.memberExpression(node.argument, key, true))
                  ),
                  memo
                ])
              ),
              t.objectExpression([])
            ]
          )
        );
      } else {
        const value = node.value || t.booleanLiteral(true),
          wrapName = t.isValidIdentifier(node.name.name) ? t.identifier : t.stringLiteral;
        if (t.isJSXExpressionContainer(value))
          if (node.name.name === "ref") {
            if (config.generate === "ssr") return;
            runningObject.push(
              t.objectProperty(
                t.identifier("ref"),
                t.arrowFunctionExpression(
                  [t.identifier("r$")],
                  t.conditionalExpression(
                    t.binaryExpression(
                      "===",
                      t.unaryExpression("typeof", value.expression),
                      t.stringLiteral("function")
                    ),
                    t.callExpression(value.expression, [t.identifier("r$")]),
                    t.assignmentExpression("=", value.expression, t.identifier("r$"))
                  )
                )
              )
            );
          } else if (
            isDynamic(attribute.get("value").get("expression"), {
              checkMember: true,
              checkTags: true
            })
          ) {
            dynamicKeys.push(t.stringLiteral(node.name.name));
            const expr =
              config.wrapConditionals &&
              (t.isLogicalExpression(value.expression) ||
                t.isConditionalExpression(value.expression))
                ? transformCondition(attribute.get("value").get("expression"))
                : t.arrowFunctionExpression([], value.expression);
            runningObject.push(t.objectProperty(wrapName(node.name.name), expr));
          } else runningObject.push(t.objectProperty(wrapName(node.name.name), value.expression));
        else runningObject.push(t.objectProperty(wrapName(node.name.name), value));
      }
    });

  const childResult = transformComponentChildren(path.get("children"));
  if (childResult && childResult[0]) {
    childResult[1] && dynamicKeys.push(t.stringLiteral("children"));
    runningObject.push(t.objectProperty(t.identifier("children"), childResult[0]));
  }
  props.push(t.objectExpression(runningObject));

  if (props.length > 1) {
    props = [
      t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("assign")), props)
    ];
  }
  dynamicKeys.sort((a, b) => a.value.toLowerCase().localeCompare(b.value.toLowerCase()));
  let dynamics;
  if (dynamicSpreads.length) {
    if (dynamicSpreads.length === 1 && !dynamicKeys.length) dynamics = dynamicSpreads[0];
    else {
      dynamicKeys.push.apply(
        dynamicKeys,
        dynamicSpreads.map(s => t.spreadElement(s))
      );
      dynamics = t.arrayExpression(dynamicKeys);
    }
  } else if (dynamicKeys.length) {
    const hash = dynamicKeys.map(k => k.value).join("|"),
      childKeys =
        path.scope.getProgramParent().data.childKeys ||
        (path.scope.getProgramParent().data.childKeys = new Map());
    if (!childKeys.has(hash)) {
      const identifier = path.scope.generateUidIdentifier("ck$");
      childKeys.set(hash, { identifier, dynamicKeys });
      dynamics = identifier;
    } else {
      dynamics = childKeys.get(hash).identifier;
    }
  }

  registerImportMethod(path, "createComponent");
  const componentArgs = [tagNameToIdentifier(tagName), props[0]];
  if (dynamics) componentArgs.push(dynamics);
  exprs = [t.callExpression(t.identifier("_$createComponent"), componentArgs)];

  return { exprs, template: "", component: true };
}

function transformComponentChildren(children) {
  const createTemplate = config.generate === "ssr" ? createTemplateSSR : createTemplateDOM,
    filteredChildren = filterChildren(children);
  if (!filteredChildren.length) return;
  let dynamic = false;

  let transformedChildren = filteredChildren.map(path => {
    if (t.isJSXText(path.node)) {
      return t.stringLiteral(trimWhitespace(path.node.extra.raw));
    } else {
      const child = transformNode(path, {
        topLevel: true,
        componentChild: true
      });
      dynamic = dynamic || child.dynamic;
      return createTemplate(path, child, config.wrapFragments && filteredChildren.length > 1);
    }
  });

  if (filteredChildren.length === 1) {
    transformedChildren = transformedChildren[0];
    if (!t.isJSXExpressionContainer(filteredChildren[0]) && !t.isJSXSpreadChild(filteredChildren[0]) && !t.isJSXText(filteredChildren[0])) {
      transformedChildren =
        t.isCallExpression(transformedChildren) && !transformedChildren.arguments.length
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
