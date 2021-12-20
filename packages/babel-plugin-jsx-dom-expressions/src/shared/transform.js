import * as t from "@babel/types";
import { transformElement as transformElementDOM } from "../dom/element";
import { createTemplate as createTemplateDOM } from "../dom/template";
import { transformElement as transformElementSSR } from "../ssr/element";
import { createTemplate as createTemplateSSR } from "../ssr/template";
import { transformElement as transformElementUniversal } from "../universal/element";
import { createTemplate as createTemplateUniversal } from "../universal/template";
import {
  getTagName,
  isComponent,
  isDynamic,
  trimWhitespace,
  transformCondition,
  getStaticExpression,
  escapeHTML,
  getConfig,
  escapeBackticks
} from "./utils";
import transformComponent from "./component";
import transformFragmentChildren from "./fragment";

export function transformJSX(path) {
  const config = getConfig(path);
  const replace = transformThis(path);
  const result = transformNode(
    path,
    t.isJSXFragment(path.node)
      ? {}
      : {
          topLevel: true
        }
  );

  const template = getCreateTemplate(config, path, result);

  path.replaceWith(replace(template(path, result, false)));
}

export function transformThis(path) {
  let thisId;
  path.traverse({
    ThisExpression(path) {
      thisId || (thisId = path.scope.generateUidIdentifier("self$"));
      path.replaceWith(thisId);
    }
  });
  return node => {
    if (thisId) {
      let parent = path.getStatementParent();
      const decl = t.variableDeclaration("const", [
        t.variableDeclarator(thisId, t.thisExpression())
      ]);
      parent.insertBefore(decl);
    }
    return node;
  };
}

export function transformNode(path, info = {}) {
  const config = getConfig(path);
  const node = path.node;
  let staticValue;
  if (t.isJSXElement(node)) {
    return transformElement(config, path, info);
  } else if (t.isJSXFragment(node)) {
    let results = { template: "", decl: [], exprs: [], dynamics: [] };
    // <><div /><Component /></>
    transformFragmentChildren(path.get("children"), results, config);
    return results;
  } else if (t.isJSXText(node) || (staticValue = getStaticExpression(path))) {
    const text =
      staticValue !== undefined
        ? !info.doNotEscape
          ? escapeHTML(staticValue.toString())
          : staticValue.toString()
        : trimWhitespace(node.extra.raw);
    if (!text.length) return null;
    const results = {
      template: config.generate === "ssr" ? text : escapeBackticks(text),
      decl: [],
      exprs: [],
      dynamics: [],
      postExprs: [],
      text: true
    };
    if (!info.skipId && config.generate !== "ssr")
      results.id = path.scope.generateUidIdentifier("el$");
    return results;
  } else if (t.isJSXExpressionContainer(node)) {
    if (t.isJSXEmptyExpression(node.expression)) return null;
    if (
      !isDynamic(path.get("expression"), {
        checkMember: true,
        checkTags: !!info.componentChild,
        native: !info.componentChild
      })
    ) {
      return { exprs: [node.expression], template: "" };
    }
    const expr =
      config.wrapConditionals &&
      config.generate !== "ssr" &&
      (t.isLogicalExpression(node.expression) || t.isConditionalExpression(node.expression))
        ? transformCondition(path.get("expression"), info.componentChild)
        : !info.componentChild &&
          (config.generate !== "ssr" || info.fragmentChild) &&
          t.isCallExpression(node.expression) &&
          !t.isMemberExpression(node.expression.callee) &&
          node.expression.arguments.length === 0
        ? node.expression.callee
        : t.arrowFunctionExpression([], node.expression);
    return {
      exprs:
        expr.length > 1
          ? [
              t.callExpression(
                t.arrowFunctionExpression(
                  [],
                  t.blockStatement([expr[0], t.returnStatement(expr[1])])
                ),
                []
              )
            ]
          : [expr],
      template: "",
      dynamic: true
    };
  } else if (t.isJSXSpreadChild(node)) {
    if (
      !isDynamic(path.get("expression"), {
        checkMember: true,
        native: !info.componentChild
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

export function getCreateTemplate(config, path, result) {
  if ((result.tagName && result.renderer === "dom") || config.generate === "dom") {
    return createTemplateDOM;
  }

  if (result.renderer === "ssr" || config.generate === "ssr") {
    return createTemplateSSR;
  }

  return createTemplateUniversal;
}

export function transformElement(config, path, info = {}) {
  const node = path.node;
  let tagName = getTagName(node);
  // <Component ...></Component>
  if (isComponent(tagName)) return transformComponent(path);

  // <div ...></div>
  // const element = getTransformElemet(config, path, tagName);

  let tagRenderer;
  for (var renderer of config.renderers ?? []) {
    if (renderer.elements.indexOf(tagName) !== -1) {
      tagRenderer = renderer;
      break;
    }
  }

  if (tagRenderer?.name === "dom" || getConfig(path).generate === "dom") {
    return transformElementDOM(path, info);
  }

  if (getConfig(path).generate === "ssr") {
    return transformElementSSR(path, info);
  }

  return transformElementUniversal(path, info);
}
