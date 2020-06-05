import * as t from "@babel/types";
import { registerImportMethod } from "../shared/utils";

export function createTemplate(path, result) {
  if (!result.template) {
    return result.exprs[0];
  }
  if (!Array.isArray(result.template)) return t.stringLiteral(result.template);
  if (result.template.length === 1) return t.stringLiteral(result.template[0]);

  registerImportMethod(path, "ssr");
  const strings = result.template.map(tmpl => t.stringLiteral(tmpl));
  return t.callExpression(t.identifier("_$ssr"), [t.arrayExpression(strings), ...result.templateValues]);
}
