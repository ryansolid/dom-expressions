import * as t from "@babel/types";
import { SVGElements } from "dom-expressions";
import VoidElements from "../VoidElements";
import config from "../config";
import {
  getTagName,
  isComponent,
  isDynamic,
  registerImportMethod,
  trimWhitespace,
  transformCondition
} from "../utils";
import { transformAttributes, transformChildren } from "./element";
import transformComponent from "./component";
import transformFragmentChildren from "./fragment";

export default function transformNode(path, info = {}) {
  const node = path.node;
  if (t.isJSXElement(node)) {
    let tagName = getTagName(node),
      wrapSVG = info.topLevel && tagName != "svg" && SVGElements.has(tagName),
      voidTag = VoidElements.indexOf(tagName) > -1;
    if (isComponent(tagName)) return transformComponent(path);
    let results = {
      template: `<${tagName}`,
      decl: [],
      exprs: [],
      dynamics: [],
      postExprs: [],
      isSVG: wrapSVG
    };
    if (wrapSVG) results.template = "<svg>" + results.template;
    if (!info.skipId) results.id = path.scope.generateUidIdentifier("el$");
    transformAttributes(path, results);
    if (config.contextToCustomElements && (tagName === "slot" || tagName.indexOf("-") > -1)) {
      registerImportMethod(path, "currentContext");
      results.exprs.push(
        t.expressionStatement(
          t.assignmentExpression(
            "=",
            t.memberExpression(results.id, t.identifier("_context")),
            t.callExpression(t.identifier("_$currentContext"), [])
          )
        )
      );
    }
    results.template += ">";
    if (!voidTag) {
      transformChildren(path, results);
      results.template += `</${tagName}>`;
    }
    if (info.topLevel && config.generate === "hydrate" && results.hasHydratableEvent) {
      registerImportMethod(path, "runHydrationEvents");
      results.postExprs.push(
        t.expressionStatement(
          t.callExpression(t.identifier("_$runHydrationEvents"), [
            t.callExpression(t.memberExpression(results.id, t.identifier("getAttribute")), [
              t.stringLiteral("_hk")
            ])
          ])
        )
      );
    }
    if (wrapSVG) results.template += "</svg>";
    return results;
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
    if (!info.skipId) results.id = path.scope.generateUidIdentifier("el$");
    return results;
  } else if (t.isJSXExpressionContainer(node)) {
    if (t.isJSXEmptyExpression(node.expression)) return null;
    if (
      !isDynamic(path.get("expression"), {
        checkMember: true,
        checkTags: !!info.componentChild
      })
    )
      return { exprs: [node.expression], template: "" };
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
  }
}
