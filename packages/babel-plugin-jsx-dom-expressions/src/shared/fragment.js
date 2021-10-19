import * as t from "@babel/types";
import { decode } from 'html-entities';
import { filterChildren, trimWhitespace } from "./utils";
import { transformNode } from "./transform";
import { createTemplate as createTemplateDOM } from "../dom/template";
import { createTemplate as createTemplateSSR } from "../ssr/template";
import { createTemplate as createTemplateUniversal } from "../universal/template";

export default function transformFragmentChildren(children, results, config) {
  const createTemplate =
      config.generate === "universal"
        ? createTemplateUniversal
        : config.generate === "ssr"
        ? createTemplateSSR
        : createTemplateDOM,
    filteredChildren = filterChildren(children),
    singleChild = filteredChildren.length === 1,
    childNodes = filteredChildren.reduce((memo, path) => {
      if (t.isJSXText(path.node)) {
        const v =  decode(trimWhitespace(path.node.extra.raw));
        if (v.length) memo.push(t.stringLiteral(v));
      } else {
        const child = transformNode(path, { topLevel: true, fragmentChild: true });
        memo.push(createTemplate(path, child, !singleChild));
      }
      return memo;
    }, []);
  results.exprs.push(singleChild ? childNodes[0] : t.arrayExpression(childNodes));
}
