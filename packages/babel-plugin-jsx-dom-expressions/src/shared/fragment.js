import * as t from "@babel/types";
import { decode } from "html-entities";
import { filterChildren, trimWhitespace, checkLength } from "./utils";
import { transformNode, getCreateTemplate } from "./transform";

function insertMarker(path, config, result) {
  if (config.generate === "ssr") {
    const open = { template: "<!---->", exprs: [] };
    result.push(getCreateTemplate(config, path, open)(path, open, true));
  } else {
    result.push(t.stringLiteral("<!>"));
  }
}

export default function transformFragmentChildren(children, results, config) {
  let prevResult;
  const filteredChildren = filterChildren(children),
    childNodes = filteredChildren.reduce((memo, path) => {
      if (t.isJSXText(path.node)) {
        const v = decode(trimWhitespace(path.node.extra.raw));
        if (v.length) {
          if (config.hydratable &&
            prevResult &&
            !prevResult.tagName &&
            !prevResult.component &&
            prevResult.exprs.length &&
            !prevResult.spreadElement) insertMarker(path, config, memo);
          memo.push(t.stringLiteral(v));
          prevResult = v;
        }
      } else {
        const child = transformNode(path, { topLevel: true, fragmentChild: true, lastElement: true });
        const insertMarkers =
          config.hydratable &&
          !child.component &&
          child.exprs.length &&
          !child.spreadElement &&
          prevResult &&
          (typeof prevResult !== "object" || !(prevResult.tagName || prevResult.component));
        if (insertMarkers) insertMarker(path, config, memo);
        memo.push(getCreateTemplate(config, path, child)(path, child, true));
        prevResult = child;
      }
      return memo;
    }, []);
  results.exprs.push(childNodes.length === 1 ? childNodes[0] : t.arrayExpression(childNodes));
}
