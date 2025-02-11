import * as t from "@babel/types";
import {
  escapeStringForTemplate,
  getConfig,
  getNumberedId,
  getRendererConfig,
  inlineCallExpression,
  registerImportMethod
} from "../shared/utils";
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
      raw: escapeStringForTemplate(template.template)
    };

    const shouldUseImportNode = template.isCE || template.isImportNode;
    const isMathML =
      /^<(math|annotation|annotation-xml|maction|math|merror|mfrac|mi|mmultiscripts|mn|mo|mover|mpadded|mphantom|mprescripts|mroot|mrow|ms|mspace|msqrt|mstyle|msub|msubsup|msup|mtable|mtd|mtext|mtr|munder|munderover|semantics|menclose|mfenced)(\s|>)/.test(
        template.template
      );

    return t.variableDeclarator(
      template.id,
      t.addComment(
        t.callExpression(
          registerImportMethod(path, "template", getRendererConfig(path, "dom").moduleName),
          [t.templateLiteral([t.templateElement(tmpl, true)], [])].concat(
            template.isSVG || shouldUseImportNode || isMathML
              ? [
                  t.booleanLiteral(!!shouldUseImportNode),
                  t.booleanLiteral(template.isSVG),
                  t.booleanLiteral(isMathML)
                ]
              : []
          )
        ),
        "leading",
        "#__PURE__"
      )
    );
  });
  path.node.body.unshift(t.variableDeclaration("var", declarators));
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
          templateWithClosingTags: results.templateWithClosingTags,
          isSVG: results.isSVG,
          isCE: results.hasCustomElement,
          isImportNode: results.isImportNode,
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
  results.decl = t.variableDeclaration("var", results.declarations);
}

function wrapDynamics(path, dynamics) {
  if (!dynamics.length) return;
  const config = getConfig(path);

  const effectWrapperId = registerImportMethod(path, config.effectWrapper);

  if (dynamics.length === 1) {
    const prevValue =
      dynamics[0].key === "class" || dynamics[0].key === "style" ? t.identifier("_$p") : undefined;
    if (
      dynamics[0].key.startsWith("class:") &&
      !t.isBooleanLiteral(dynamics[0].value) &&
      !t.isUnaryExpression(dynamics[0].value)
    ) {
      dynamics[0].value = t.unaryExpression("!", t.unaryExpression("!", dynamics[0].value));
    }

    const newValue = t.identifier("_v$");
    return t.expressionStatement(
      t.callExpression(effectWrapperId, [
        inlineCallExpression(dynamics[0].value),
        t.arrowFunctionExpression(
          prevValue ? [newValue, prevValue] : [newValue],
          setAttr(path, dynamics[0].elem, dynamics[0].key, newValue, {
            isSVG: dynamics[0].isSVG,
            tagName: dynamics[0].tagName,
            dynamic: true,
            prevId: prevValue
          })
        )
      ])
    );
  }

  const prevId = t.identifier("_p$");

  /** @type {t.ObjectProperty[]} */
  const values = [];
  /** @type {t.ExpressionStatement[]} */
  const statements = [];
  /** @type {t.Identifier[]} */
  const properties = [];

  dynamics.forEach(({ elem, key, value, isSVG, tagName }, index) => {
    const propIdent = t.identifier(getNumberedId(index));
    const propMember = t.memberExpression(prevId, propIdent);

    if (key.startsWith("class:") && !t.isBooleanLiteral(value) && !t.isUnaryExpression(value)) {
      value = t.unaryExpression("!", t.unaryExpression("!", value));
    }

    properties.push(propIdent);
    values.push(t.objectProperty(propIdent, value));

    if (key === "class" || key === "style") {
      statements.push(
        t.expressionStatement(
          setAttr(path, elem, key, propIdent, {
            isSVG,
            tagName,
            dynamic: true,
            prevId: propMember
          })
        )
      );
    } else {
      const prev = key.startsWith("style:") ? propIdent : undefined;
      statements.push(
        t.expressionStatement(
          t.logicalExpression(
            "&&",
            t.binaryExpression("!==", propIdent, propMember),
            setAttr(path, elem, key, propIdent, {
              isSVG,
              tagName,
              dynamic: true,
              prevId: prev
            })
          )
        )
      );
    }
  });

  return t.expressionStatement(
    t.callExpression(effectWrapperId, [
      t.arrowFunctionExpression([], t.objectExpression(values)),
      t.arrowFunctionExpression(
        [t.objectPattern(properties.map(id => t.objectProperty(id, id, false, true))), prevId],
        t.blockStatement(statements)
      ),
      t.objectExpression(properties.map(id => t.objectProperty(id, t.identifier("undefined"))))
    ])
  );
}
