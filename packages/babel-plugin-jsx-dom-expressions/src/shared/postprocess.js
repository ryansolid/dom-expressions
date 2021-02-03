import * as t from "@babel/types";
import { registerImportMethod } from "./utils";
import { appendTemplates as appendTemplatesDOM } from "../dom/template";
import { appendTemplates as appendTemplatesSSR } from "../ssr/template";
import config from "../config";

// add to the top/bottom of the module.
export default path => {
  if (path.state.events.size) {
    registerImportMethod(path, "delegateEvents");
    path.node.body.push(
      t.expressionStatement(
        t.callExpression(t.identifier("_$delegateEvents"), [
          t.arrayExpression(Array.from(path.state.events).map(e => t.stringLiteral(e)))
        ])
      )
    );
  }
  if (path.state.templates.length) {
    const appendTemplates = config.generate === "ssr" ? appendTemplatesSSR : appendTemplatesDOM;
    appendTemplates(path, path.state.templates);
  }
};
