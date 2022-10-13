import * as t from "@babel/types";
import { getConfig, registerImportMethod } from "../shared/utils";
import { setAttr } from "./element";

export function createTemplate(path, result, wrap) {
  const config = getConfig(path);
  if (result.id) {
    result.decl = t.variableDeclaration("const", result.decl);
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
  const prevValue = t.identifier("_$p");

  return dynamics.map(({ elem, key, value }) => {
    return t.expressionStatement(
      t.callExpression(effectWrapperId, [
        t.arrowFunctionExpression(
          [prevValue],
          setAttr(path, elem, key, value, {
            dynamic: true,
            prevId: prevValue
          })
        )
      ])
    );
  });
}
