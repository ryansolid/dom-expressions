import * as t from "@babel/types";
import config from "../config";
import {
  wrapDynamics,
  registerImportMethod,
  registerTemplate,
  filterChildren,
  trimWhitespace
} from "../utils";
import transformNode from "./node";

export default function transformFragmentChildren(children, results) {
  const filteredChildren = filterChildren(children, true),
    singleChild = filteredChildren.length === 1,
    childNodes = filteredChildren.map(path => {
      if (t.isJSXText(path.node)) {
        return t.stringLiteral(trimWhitespace(path.node.extra.raw));
      } else {
        const child = transformNode(path, { topLevel: true });
        if (child.id) {
          registerTemplate(path, child);
          if (
            !(child.exprs.length || child.dynamics.length || child.postExprs.length) &&
            child.decl.declarations.length === 1
          ) {
            return child.decl.declarations[0].init;
          } else {
            return t.callExpression(
              t.arrowFunctionExpression(
                [],
                t.blockStatement([
                  child.decl,
                  ...child.exprs.concat(
                    wrapDynamics(path, child.dynamics) || [],
                    child.postExprs || []
                  ),
                  t.returnStatement(child.id)
                ])
              ),
              []
            );
          }
        }
        if (!singleChild && config.wrapFragments && child.dynamic) {
          registerImportMethod(path, "wrapMemo");
          return t.callExpression(t.identifier("_$wrapMemo"), [child.exprs[0]]);
        }
        return child.exprs[0];
      }
    });
  results.exprs.push(singleChild ? childNodes[0] : t.arrayExpression(childNodes));
}
