import * as t from "@babel/types";
import { registerImportMethod } from "../shared/utils";

export function createTemplate(path, result) {
  if (!result.template) {
    return result.exprs[0];
  }

  let template, id;

  registerImportMethod(path, "ssr");
  if (!Array.isArray(result.template)) {
    template = t.stringLiteral(result.template);
  } else if (result.template.length === 1) {
    template = t.stringLiteral(result.template[0]);
  } else {
    const strings = result.template.map(tmpl => t.stringLiteral(tmpl));
    template = t.arrayExpression(strings);
  }

  const found = path.state.templates.find(tmp => {
    if (t.isArrayExpression(tmp[1]) && t.isArrayExpression(template)) {
      return tmp[1].elements.every(
        (el, i) => template.elements[i] && el.value === template.elements[i].value
      );
    }
    return tmp[1].value === template.value;
  });
  if (!found) {
    id = path.scope.generateUidIdentifier("tmpl$");
    path.state.templates.push([id, template]);
  } else id = found[0];

  return t.callExpression(
    t.identifier(`_$ssr`),
    result.template.length > 1 ? [id, ...result.templateValues] : [id]
  );
}

export function appendTemplates(path, templates) {
  const declarators = templates.map(template => {
    return t.variableDeclarator(template[0], template[1]);
  });
  path.node.body.unshift(t.variableDeclaration("const", declarators));
}
