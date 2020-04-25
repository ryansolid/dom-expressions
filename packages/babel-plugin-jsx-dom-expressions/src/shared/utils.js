import * as t from "@babel/types";
import { addNamed } from "@babel/helper-module-imports";
import config from "../config";

export function registerImportMethod(path, name) {
  const imports =
    path.scope.getProgramParent().data.imports ||
    (path.scope.getProgramParent().data.imports = new Set());
  if (!imports.has(name)) {
    addNamed(path, name, config.moduleName, { nameHint: `_$${name}` });
    imports.add(name);
  }
}

function jsxElementNameToString(node) {
  if (t.isJSXMemberExpression(node)) {
    return `${jsxElementNameToString(node.object)}.${node.property.name}`;
  }
  if (t.isJSXIdentifier(node)) {
    return node.name;
  }
  return `${node.namespace.name}:${node.name.name}`;
}

export function tagNameToIdentifier(name) {
  const parts = name.split(".");
  if (parts.length === 1) return t.identifier(name);
  let part;
  let base = t.identifier(parts.shift());
  while ((part = parts.shift())) {
    base = t.memberExpression(base, t.identifier(part));
  }
  return base;
}

export function getTagName(tag) {
  const jsxName = tag.openingElement.name;
  return jsxElementNameToString(jsxName);
}

export function isComponent(tagName) {
  return (
    (tagName[0] && tagName[0].toLowerCase() !== tagName[0]) ||
    tagName.includes(".") ||
    /[^a-zA-Z]/.test(tagName[0])
  );
}

export function isDynamic(path, { checkMember, checkTags }) {
  const expr = path.node;
  if (t.isFunction(expr)) return false;
  if (expr.leadingComments && expr.leadingComments[0].value.trim() === config.staticMarker) {
    expr.leadingComments.shift();
    return false;
  }
  if (
    t.isCallExpression(expr) ||
    (checkMember && t.isMemberExpression(expr)) ||
    (checkTags && (t.isJSXElement(expr) || t.isJSXFragment(expr)))
  )
    return true;

  let dynamic;
  path.traverse({
    Function(p) {
      p.skip();
    },
    CallExpression(p) {
      dynamic = true;
      p.stop();
    },
    MemberExpression(p) {
      checkMember && (dynamic = true) && p.stop();
    },
    JSXElement(p) {
      checkTags ? (dynamic = true) && p.stop() : p.skip();
    },
    JSXFragment(p) {
      checkTags ? (dynamic = true) && p.stop() : p.skip();
    }
  });
  return dynamic;
}

// remove unnecessary JSX Text nodes
export function filterChildren(children, loose) {
  return children.filter(
    ({ node: child }) =>
      !(t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) &&
      (!t.isJSXText(child) ||
        (loose ? !/^[\r\n]\s*$/.test(child.extra.raw) : !/^\s*$/.test(child.extra.raw)))
  );
}

export function checkLength(children) {
  let i = 0;
  children.forEach(path => {
    const child = path.node;
    !(t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) &&
      (!t.isJSXText(child) || !/^\s*$/.test(child.extra.raw)) &&
      i++;
  });
  return i > 1;
}

export function trimWhitespace(text) {
  text = text.replace(/\r/g, "");
  if (/\n/g.test(text)) {
    text = text
      .split("\n")
      .map((t, i) => (i ? t.replace(/^\s*/g, "") : t))
      .filter(s => !/^\s*$/.test(s))
      .join("");
  }
  return text.replace(/\s+/g, " ");
}

export function toEventName(name) {
  return name.slice(2).toLowerCase();
}

export function transformCondition(path, deep) {
  const expr = path.node;
  registerImportMethod(path, "memo");
  let dTest, cond;
  if (
    t.isConditionalExpression(expr) &&
    (isDynamic(path.get("consequent"), {
      checkTags: true
    }) ||
      isDynamic(path.get("alternate"), { checkTags: true }))
  ) {
    dTest = isDynamic(path.get("test"), { checkMember: true });
    if (dTest) {
      cond = expr.test;
      expr.test = t.callExpression(t.identifier("_c$"), []);
      if (t.isConditionalExpression(expr.consequent) || t.isLogicalExpression(expr.consequent)) {
        expr.consequent = transformCondition(path.get("consequent"), true);
      }
      if (t.isConditionalExpression(expr.alternate) || t.isLogicalExpression(expr.alternate)) {
        expr.alternate = transformCondition(path.get("alternate"), true);
      }
    }
  } else if (t.isLogicalExpression(expr)) {
    let nextPath = path;
    // handle top-level or, ie cond && <A/> || <B/>
    if (expr.operator === "||" && t.isLogicalExpression(expr.left)) {
      nextPath = nextPath.get("left");
    }
    isDynamic(nextPath.get("right"), { checkTags: true }) &&
      (dTest = isDynamic(nextPath.get("left"), {
        checkMember: true
      }));
    if (dTest) {
      cond = nextPath.node.left;
      nextPath.node.left = t.callExpression(t.identifier("_c$"), []);
    }
  }
  if (dTest) {
    return t.callExpression(
      t.arrowFunctionExpression(
        [],
        t.blockStatement([
          t.variableDeclaration("const", [
            t.variableDeclarator(
              t.identifier("_c$"),
              t.callExpression(t.identifier("_$memo"), [
                t.arrowFunctionExpression([], cond),
                t.booleanLiteral(true)
              ])
            )
          ]),
          t.returnStatement(t.arrowFunctionExpression([], expr))
        ])
      ),
      []
    );
  }
  return deep ? expr : t.arrowFunctionExpression([], expr);
}
