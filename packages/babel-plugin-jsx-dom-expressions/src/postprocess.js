import * as t from "@babel/types";
import { registerImportMethod } from "./utils";

// add to the top/bottom of the module.
export default path => {
  if (path.scope.data.events) {
    registerImportMethod(path, "delegateEvents");
    path.node.body.push(
      t.expressionStatement(
        t.callExpression(t.identifier("_$delegateEvents"), [
          t.arrayExpression(Array.from(path.scope.data.events).map(e => t.stringLiteral(e)))
        ])
      )
    );
  }
  if (path.scope.data.childKeys) {
    const declarators = [...path.scope.data.childKeys.values()].map(o =>
      t.variableDeclarator(o.identifier, t.arrayExpression(o.dynamicKeys))
    );
    path.node.body.unshift(t.variableDeclaration("const", declarators));
  }
  if (path.scope.data.templates) {
    const declarators = path.scope.data.templates.map(template => {
      const tmpl = {
        cooked: template.template,
        raw: template.template
      };
      registerImportMethod(path, "template");
      return t.variableDeclarator(
        template.id,
        t.callExpression(
          t.identifier("_$template"),
          [
            t.templateLiteral([t.templateElement(tmpl, true)], []),
            t.numericLiteral(template.elementCount)
          ].concat(template.isSVG ? t.booleanLiteral(template.isSVG) : [])
        )
      );
    });
    path.node.body.unshift(t.variableDeclaration("const", declarators));
  }
};
