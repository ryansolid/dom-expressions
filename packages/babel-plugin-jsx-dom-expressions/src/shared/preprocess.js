import * as t from "@babel/types";
import config from "../config";
import { isComponent } from "./utils";
const { isValidHTMLNesting } = require("validate-html-nesting");

// From https://github.com/MananTank/babel-plugin-validate-jsx-nesting/blob/main/src/index.js
const JSXValidator = {
  JSXElement(path) {
    const elName = path.node.openingElement.name;
    const parent = path.parent;

    if (!t.isJSXElement(parent) || !t.isJSXIdentifier(elName)) return;
    const elTagName = elName.name;
    if (isComponent(elTagName)) return;
    const parentElName = parent.openingElement.name;
    if (!t.isJSXIdentifier(parentElName)) return;
    const parentElTagName = parentElName.name;
    if (!isComponent(parentElTagName)) {
      if (!isValidHTMLNesting(parentElTagName, elTagName)) {
        throw path.buildCodeFrameError(
          `Invalid JSX: <${elTagName}> cannot be child of <${parentElTagName}>`
        );
      }
    }
  }
};

export default (path, state) => {
  const merged = (path.hub.file.metadata.config = Object.assign({}, config, state.opts));
  const lib = merged.requireImportSource;
  if (lib) {
    const comments = path.hub.file.ast.comments;
    let process = false;
    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      const pieces = comment.value.split("@jsxImportSource");
      if (pieces.length === 2 && pieces[1].trim() === lib) {
        process = true;
        break;
      }
    }
    if (!process) {
      state.skip = true;
      return;
    }
  }
  if (merged.validate) path.traverse(JSXValidator);
};
