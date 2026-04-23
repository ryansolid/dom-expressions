import * as t from "@babel/types";
import { getConfig, registerImportMethod } from "../shared/utils";

// Wrap the *inner* value of a fragment-child accessor with `_$escape` so that
// hostile string values returned from reactive accessors cannot be
// concatenated raw into the SSR output. Element-child expressions already get
// this treatment via `escapeExpression` in `ssr/element.js`; fragment
// children reach SSR via a different code path and would otherwise skip the
// escape step.
//
// `expr` is the first entry of `result.exprs` produced by `transformNode`
// for a `JSXExpressionContainer`. It is either:
//   - an arrow function `() => X` (default case)
//   - a bare callee (`fnRef`, emitted when the expression is `fnRef()` with
//     no args — see the JSXExpressionContainer branch in shared/transform.js)
//   - the result of `transformCondition(..., inline=true)`, which also
//     returns an arrow function
// For arrows with an expression body we rewrite in place; for anything else
// we conservatively wrap in a new arrow that calls and escapes.
function wrapFragmentChildWithEscape(path, expr) {
  const escape = registerImportMethod(path, "escape");
  if (t.isArrowFunctionExpression(expr) && !t.isBlockStatement(expr.body)) {
    expr.body = t.callExpression(escape, [expr.body]);
    return expr;
  }
  return t.arrowFunctionExpression([], t.callExpression(escape, [t.callExpression(expr, [])]));
}

export function createTemplate(path, result, wrap) {
  if (!result.template) {
    if (wrap && result.dynamic && getConfig(path).memoWrapper) {
      // wontEscape is set on JSXElement children whose compiled form is
      // already a safe SSR node (e.g. `_$ssr(...)` call). Wrapping those in
      // escape would be a no-op at runtime but obscures intent — skip it.
      const inner = result.wontEscape
        ? result.exprs[0]
        : wrapFragmentChildWithEscape(path, result.exprs[0]);
      return t.callExpression(registerImportMethod(path, getConfig(path).memoWrapper), [inner]);
    }
    return result.exprs[0];
  }

  let template, id;

  if (!Array.isArray(result.template)) {
    template = t.stringLiteral(result.template);
  } else if (result.template.length === 1) {
    template = t.stringLiteral(result.template[0]);
  } else {
    const strings = result.template.map(tmpl => t.stringLiteral(tmpl));
    template = t.arrayExpression(strings);
  }

  const templates =
    path.scope.getProgramParent().data.templates ||
    (path.scope.getProgramParent().data.templates = []);
  const found = templates.find(tmp => {
    if (t.isArrayExpression(tmp.template) && t.isArrayExpression(template)) {
      return tmp.template.elements.every(
        (el, i) => template.elements[i] && el.value === template.elements[i].value
      );
    }
    return tmp.template.value === template.value;
  });
  if (!found) {
    id = path.scope.generateUidIdentifier("tmpl$");
    templates.push({
      id,
      template,
      templateWithClosingTags: template,
      renderer: "ssr"
    });
  } else id = found.id;

  if (result.wontEscape) {
    if (!Array.isArray(result.template) || result.template.length === 1) return id;
    else if (
      Array.isArray(result.template) &&
      result.template.length === 2 &&
      result.templateValues[0].type === "CallExpression" &&
      result.templateValues[0].callee.name === "_$ssrHydrationKey"
    ) {
      // remove unnecessary ssr call when only hydration key is used
      return t.binaryExpression(
        "+",
        t.binaryExpression(
          "+",
          t.memberExpression(id, t.numericLiteral(0), true),
          result.templateValues[0]
        ),
        t.memberExpression(id, t.numericLiteral(1), true)
      );
    }
  }

  const dynamicDecl = wrapDynamics(path, result.groupId, result.dynamics);
  if (!result.declarations.length && !dynamicDecl && !result.postDeclarations.length) {
    return t.callExpression(
      registerImportMethod(path, "ssr"),
      Array.isArray(result.template) && result.template.length > 1
        ? [id, ...result.templateValues]
        : [id]
    );
  }
  return t.callExpression(
    t.arrowFunctionExpression(
      [],
      t.blockStatement([
        t.variableDeclaration(
          "var",
          [...result.declarations, dynamicDecl, ...result.postDeclarations].filter(Boolean)
        ),
        t.returnStatement(
          t.callExpression(
            registerImportMethod(path, "ssr"),
            Array.isArray(result.template) && result.template.length > 1
              ? [id, ...result.templateValues]
              : [id]
          )
        )
      ])
    ),
    []
  );
}

export function appendTemplates(path, templates) {
  const declarators = templates.map(template => {
    return t.variableDeclarator(template.id, template.template);
  });
  path.node.body.unshift(t.variableDeclaration("var", declarators));
}

function wrapDynamics(path, groupId, dynamics) {
  if (!dynamics || !dynamics.length) return null;
  const run = registerImportMethod(path, "ssrRunInScope");
  return t.variableDeclarator(groupId, t.callExpression(run, [t.arrayExpression(dynamics)]));
}
