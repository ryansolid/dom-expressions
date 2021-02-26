import * as t from "@babel/types";
import { registerImportMethod } from "./utils";
import { appendTemplates as appendTemplatesDOM } from "../dom/template";
import { appendTemplates as appendTemplatesSSR } from "../ssr/template";
import config from "../config";

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
  if (path.scope.data.templates) {
    const appendTemplates = config.generate === "ssr" ? appendTemplatesSSR : appendTemplatesDOM;
    appendTemplates(path, path.scope.data.templates);
  }
};
