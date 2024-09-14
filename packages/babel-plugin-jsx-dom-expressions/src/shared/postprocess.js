import * as t from "@babel/types";
import { getRendererConfig, registerImportMethod } from "./utils";
import { appendTemplates as appendTemplatesDOM } from "../dom/template";
import { appendTemplates as appendTemplatesSSR } from "../ssr/template";
import { isInvalidMarkup } from "./validate.js";

// add to the top/bottom of the module.
export default path => {
  if (path.scope.data.events) {
    path.node.body.push(
      t.expressionStatement(
        t.callExpression(
          registerImportMethod(path, "delegateEvents", getRendererConfig(path, "dom").moduleName),
          [t.arrayExpression(Array.from(path.scope.data.events).map(e => t.stringLiteral(e)))]
        )
      )
    );
  }
  if (path.scope.data.templates?.length) {
    for (const template of path.scope.data.templates) {
      const html = template.template;
      // not sure when/why this is not a string
      if (typeof html === "string") {
        if (isInvalidMarkup(html)) {
          console.warn("Invalid Markup: " + html);
          // throw path.buildCodeFrameError("Invalid Markup: " + html);
        }
      }
    }
    let domTemplates = path.scope.data.templates.filter(temp => temp.renderer === "dom");
    let ssrTemplates = path.scope.data.templates.filter(temp => temp.renderer === "ssr");
    domTemplates.length > 0 && appendTemplatesDOM(path, domTemplates);
    ssrTemplates.length > 0 && appendTemplatesSSR(path, ssrTemplates);
  }
};
