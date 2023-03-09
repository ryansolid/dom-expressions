import * as t from "@babel/types";
import { getConfig, registerImportMethod } from "../shared/utils";
import { setAttr } from "./element";

export function createTemplate(path, result, wrap) {
  const config = getConfig(path);
  if (result.id) {
    result.decl = t.variableDeclaration("const", result.declarations);
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

    return t.expressionStatement(
      t.callExpression(effectWrapperId, [
        t.arrowFunctionExpression(
          [prevValue],
          setAttr(path, dynamics[0].elem, dynamics[0].key, dynamics[0].value, {
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
  dynamics.forEach(({ elem, key, value }) => {
    const identifier = path.scope.generateUidIdentifier("v$");
    identifiers.push(identifier);
    declarations.push(t.variableDeclarator(identifier, value));
    const prev = t.memberExpression(prevId, identifier);
    statements.push(
      t.expressionStatement(
        t.logicalExpression(
          "&&",
          t.binaryExpression("!==", identifier, t.memberExpression(prevId, identifier)),
          t.assignmentExpression("=", t.memberExpression(prevId, identifier), setAttr(
            path,
            elem,
            key,
            identifier,
            { dynamic: true, prevId: prev }
          ))
        )
      )
    );
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
