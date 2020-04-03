import * as t from "@babel/types";
import config from "../config";
import {
  wrapDynamics,
  registerTemplate
} from "../utils";
import transformNode from "./node";

export default function transform(path, { opts }) {
  Object.assign(config, opts);
  const result = transformNode(
    path,
    t.isJSXFragment(path.node)
      ? {}
      : {
          topLevel: true
        }
  );
  if (result.id) {
    registerTemplate(path, result);
    if (
      !(result.exprs.length || result.dynamics.length || result.postExprs.length) &&
      result.decl.declarations.length === 1
    )
      path.replaceWith(result.decl.declarations[0].init);
    else
      path.replaceWithMultiple(
        [result.decl].concat(
          result.exprs,
          wrapDynamics(path, result.dynamics) || [],
          result.postExprs || [],
          t.returnStatement(result.id)
        )
      );
  } else path.replaceWith(result.exprs[0]);
}
