import * as t from "@babel/types";
import { registerImportMethod } from "../shared/utils";

export function createTemplate(path, result) {
  if (!result.template) {
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
      renderer: "ssr"
    });
  } else id = found.id;

  return t.callExpression(
    registerImportMethod(path, "ssr"),
    result.template.length > 1 ? [id, ...result.templateValues] : [id]
  );
}

export function appendTemplates(path, templates) {
  const declarators = templates.map(template => {
    return t.variableDeclarator(template.id, template.template);
  });
  path.node.body.unshift(t.variableDeclaration("const", declarators));
}
