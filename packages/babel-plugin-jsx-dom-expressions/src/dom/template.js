import * as t from "@babel/types";
import { getConfig, getRendererConfig, registerImportMethod } from "../shared/utils";
import { setAttr } from "./element";

export function createTemplate(path, result, wrap) {
  const config = getConfig(path);
  if (result.id) {
    registerTemplate(path, result);
    if (
      !(result.exprs.length || result.dynamics.length || result.postExprs.length) &&
      result.decl.declarations.length === 1
    ) {
      return result.decl.declarations[0].init;
    } else {
      return t.callExpression(
        t.arrowFunctionExpression(
          [],
          t.blockStatement([
            result.decl,
            ...result.exprs.concat(
              wrapDynamics(path, result.dynamics) || [],
              result.postExprs || []
            ),
            t.returnStatement(result.id)
          ])
        ),
        []
      );
    }
  }
  if (wrap && result.dynamic && config.memoWrapper) {
    return t.callExpression(registerImportMethod(path, config.memoWrapper), [result.exprs[0]]);
  }
  return result.exprs[0];
}

export function appendTemplates(path, templates) {
  const declarators = templates.map(template => {
    const tmpl = {
      cooked: template.template,
      raw: template.template
    };
    return t.variableDeclarator(
      template.id,
      t.addComment(
        t.callExpression(
          registerImportMethod(path, "template", getRendererConfig(path, "dom").moduleName),
          [t.templateLiteral([t.templateElement(tmpl, true)], [])].concat(
            template.isSVG || template.isCE
              ? [t.booleanLiteral(template.isCE), t.booleanLiteral(template.isSVG)]
              : []
          )
        ),
        "leading",
        "#__PURE__"
      )
    );
  });
  path.node.body.unshift(t.variableDeclaration("const", declarators));
}

function registerTemplate(path, results) {
  const { hydratable } = getConfig(path);
  let decl;
  if (results.template.length) {
    let templateDef, templateId;
    if (!results.skipTemplate) {
      const templates =
        path.scope.getProgramParent().data.templates ||
        (path.scope.getProgramParent().data.templates = []);
      if ((templateDef = templates.find(t => t.template === results.template))) {
        templateId = templateDef.id;
      } else {
        templateId = path.scope.generateUidIdentifier("tmpl$");
        templates.push({
          id: templateId,
          template: results.template,
          isSVG: results.isSVG,
          isCE: results.hasCustomElement,
          renderer: "dom"
        });
      }
    }
    decl = t.variableDeclarator(
      results.id,
      hydratable
        ? t.callExpression(
            registerImportMethod(path, "getNextElement", getRendererConfig(path, "dom").moduleName),
            templateId ? [templateId] : []
          )
        : t.callExpression(templateId, [])
    );
  }
  results.declarations.unshift(decl);
  results.decl = t.variableDeclaration("const", results.declarations);
}

function wrapDynamics(path, dynamics) {
  if (!dynamics.length) return;
  const config = getConfig(path);

  const effectWrapperId = registerImportMethod(path, config.effectWrapper);

  if (dynamics.length === 1) {
    const prevValue =
      dynamics[0].key === "classList" || dynamics[0].key === "style"
        ? t.identifier("_$p")
        : undefined;
    if (
      dynamics[0].key.startsWith("class:") &&
      !t.isBooleanLiteral(dynamics[0].value) &&
      !t.isUnaryExpression(dynamics[0].value)
    ) {
      dynamics[0].value = t.unaryExpression("!", t.unaryExpression("!", dynamics[0].value));
    }

    return t.expressionStatement(
      t.callExpression(effectWrapperId, [
        t.arrowFunctionExpression(
          prevValue ? [prevValue] : [],
          setAttr(path, dynamics[0].elem, dynamics[0].key, dynamics[0].value, {
            isSVG: dynamics[0].isSVG,
            isCE: dynamics[0].isCE,
            tagName: dynamics[0].tagName,
            dynamic: true,
            prevId: prevValue
          })
        )
      ])
    );
  }
  const declarations = [],
    statements = [],
    identifiers = [],
    prevId = t.identifier("_p$");
  dynamics.forEach(({ elem, key, value, isSVG, isCE, tagName }) => {
    const identifier = path.scope.generateUidIdentifier("v$");
    if (key.startsWith("class:") && !t.isBooleanLiteral(value) && !t.isUnaryExpression(value)) {
      value = t.unaryExpression("!", t.unaryExpression("!", value));
    }
    identifiers.push(identifier);
    declarations.push(t.variableDeclarator(identifier, value));
    if (key === "classList" || key === "style") {
      const prev = t.memberExpression(prevId, identifier);
      statements.push(
        t.expressionStatement(
          t.assignmentExpression(
            "=",
            prev,
            setAttr(path, elem, key, identifier, {
              isSVG,
              isCE,
              tagName,
              dynamic: true,
              prevId: prev
            })
          )
        )
      );
    } else {
      const prev = key.startsWith("style:") ? identifier : undefined;
      statements.push(
        t.expressionStatement(
          t.logicalExpression(
            "&&",
            t.binaryExpression("!==", identifier, t.memberExpression(prevId, identifier)),
            setAttr(
              path,
              elem,
              key,
              t.assignmentExpression("=", t.memberExpression(prevId, identifier), identifier),
              { isSVG, isCE, tagName, dynamic: true, prevId: prev }
            )
          )
        )
      );
    }
  });

  return t.expressionStatement(
    t.callExpression(effectWrapperId, [
      t.arrowFunctionExpression(
        [prevId],
        t.blockStatement([
          t.variableDeclaration("const", declarations),
          ...statements,
          t.returnStatement(prevId)
        ])
      ),
      t.objectExpression(identifiers.map(id => t.objectProperty(id, t.identifier("undefined"))))
    ])
  );
}
