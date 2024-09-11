import SyntaxJSX from "@babel/plugin-syntax-jsx";
import { transformJSX } from "./shared/transform";
import postprocess from "./shared/postprocess";
import preprocess from "./shared/preprocess";
import type { Visitor } from "@babel/core";

export default (): {
  name: string;
  inherits: any;
  visitor: Visitor<{ opts: any }>;
} => {
  return {
    name: "JSX DOM Expressions",
    inherits: SyntaxJSX.default,
    visitor: {
      JSXElement: transformJSX,
      JSXFragment: transformJSX,
      Program: {
        enter: preprocess,
        exit: postprocess
      }
    }
  };
};
