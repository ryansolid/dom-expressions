import * as t from "@babel/types";
import config from "../config";
import { transformElement as transformElementDOM } from "../dom/element";
import { createTemplate as createTemplateDOM } from "../dom/template";
import { transformElement as transformElementSSR } from "../ssr/element";
import { createTemplate as createTemplateSSR } from "../ssr/template";
import { getTagName, isComponent, isDynamic, trimWhitespace, transformCondition } from "./utils";
import transformComponent from "./component";
import transformFragmentChildren from "./fragment";

export function transformJSX(path, { opts }) {
  Object.assign(config, opts);
  const result = transformNode(
    path,
    t.isJSXFragment(path.node)
      ? {}
      : {
          topLevel: true
        }
  );
  const template = config.generate === "ssr" ? createTemplateSSR : createTemplateDOM;
  path.replaceWith(template(path, result, false));
}

export function transformNode(path, info = {}) {
  const node = path.node;
  if (t.isJSXElement(node)) {
    let tagName = getTagName(node);
    if (isComponent(tagName)) return transformComponent(path);
    const element = config.generate === "ssr" ? transformElementSSR : transformElementDOM;
    return element(path, info);
  } else if (t.isJSXFragment(node)) {
    let results = { template: "", decl: [], exprs: [], dynamics: [] };
    transformFragmentChildren(path.get("children"), results);
    return results;
  } else if (
    t.isJSXText(node) ||
    (t.isJSXExpressionContainer(node) &&
      t.isJSXElement(path.parent) &&
      !isComponent(getTagName(path.parent)) &&
      (t.isStringLiteral(node.expression) ||
        (t.isTemplateLiteral(node.expression) && node.expression.expressions.length === 0)))
  ) {
    const text = trimWhitespace(
      t.isJSXExpressionContainer(node)
        ? t.isStringLiteral(node.expression)
          ? node.expression.value
          : node.expression.quasis[0].value.raw
        : node.extra.raw
    );
    if (!text.length) return null;
    const results = {
      template: text,
      decl: [],
      exprs: [],
      dynamics: [],
      postExprs: []
    };
    if (!info.skipId && config.generate !== "ssr")
      results.id = path.scope.generateUidIdentifier("el$");
    return results;
  } else if (t.isJSXExpressionContainer(node)) {
    if (t.isJSXEmptyExpression(node.expression)) return null;
    if (
      !isDynamic(path.get("expression"), {
        checkMember: true,
        checkTags: !!info.componentChild
      })
    ) {
      return { exprs: [node.expression], template: "" };
    }
    const expr =
      config.wrapConditionals &&
      (t.isLogicalExpression(node.expression) || t.isConditionalExpression(node.expression))
        ? transformCondition(path.get("expression"))
        : t.arrowFunctionExpression([], node.expression);
    return {
      exprs: [expr],
      template: "",
      dynamic: true
    };
  } else if (t.isJSXSpreadChild(node)) {
    if (
      !isDynamic(path.get("expression"), {
        checkMember: true
      })
    )
      return { exprs: [node.expression], template: "" };
    const expr = t.arrowFunctionExpression([], node.expression);
    return {
      exprs: [expr],
      template: "",
      dynamic: true
    };
  }
}
