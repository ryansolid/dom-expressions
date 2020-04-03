import SyntaxJSX from "@babel/plugin-syntax-jsx";
import transform from "./transform";
import postprocess from "./postprocess";

export default () => {
  return {
    name: "JSX DOM Expressions",
    inherits: SyntaxJSX,
    visitor: {
      JSXElement: transform,
      JSXFragment: transform,
      Program: {
        exit: postprocess
      }
    }
  };
};
