import * as t from "@babel/types";
import { getConfig, getNumberedId, registerImportMethod, inlineCallExpression } from "../shared/utils";
import { setAttr } from "./element";

export function createTemplate(path, result, wrap) {
  const config = getConfig(path);
  if (result.id) {
    result.decl = t.variableDeclaration("var", result.declarations);
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

function wrapDynamics(path, dynamics) {
  if (!dynamics.length) return;
  const config = getConfig(path);

  const effectWrapperId = registerImportMethod(path, config.effectWrapper);

  if (dynamics.length === 1) {
    const prevValue = t.identifier("_$p");
    const newValue = t.identifier("_v$");

    return t.expressionStatement(
      t.callExpression(effectWrapperId, [
        inlineCallExpression(dynamics[0].value),
        t.arrowFunctionExpression(
          [newValue, prevValue],
          setAttr(path, dynamics[0].elem, dynamics[0].key, newValue, {
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

  dynamics.forEach(({ elem, key, value }, index) => {
    const propIdent = t.identifier(getNumberedId(index));
    const propMember = t.memberExpression(prevId, propIdent);

    properties.push(propIdent);
    values.push(t.objectProperty(propIdent, value));

    statements.push(
      t.expressionStatement(
        t.logicalExpression(
          "&&",
          t.binaryExpression("!==", propIdent, propMember),
          setAttr(path, elem, key, propIdent, { dynamic: true, prevId: propMember })
        )
      )
    );
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
