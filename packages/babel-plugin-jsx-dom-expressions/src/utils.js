import * as t from "@babel/types";
import { addNamed } from "@babel/helper-module-imports";
import { Attributes, SVGAttributes } from "dom-expressions";
import config from "./config";

export function registerImportMethod(path, name) {
  const imports =
    path.scope.getProgramParent().data.imports ||
    (path.scope.getProgramParent().data.imports = new Set());
  if (!imports.has(name)) {
    addNamed(path, name, config.moduleName, { nameHint: `_$${name}` });
    imports.add(name);
  }
}

export function registerTemplate(path, results) {
  const { generate } = config;
  const generateIsHydrateOrSsr = generate === "hydrate" || generate === "ssr";
  let decl;
  if (results.template.length) {
    const templates =
      path.scope.getProgramParent().data.templates ||
      (path.scope.getProgramParent().data.templates = []);
    let templateDef, templateId;
    if ((templateDef = templates.find(t => t.template === results.template))) {
      templateId = templateDef.id;
    } else {
      templateId = path.scope.generateUidIdentifier("tmpl$");
      templates.push({
        id: templateId,
        template: results.template,
        elementCount: results.template.split("<").length - 1,
        isSVG: results.isSVG
      });
    }
    generateIsHydrateOrSsr && registerImportMethod(path, "getNextElement");
    decl = t.variableDeclarator(
      results.id,
      generateIsHydrateOrSsr
        ? t.callExpression(
            t.identifier("_$getNextElement"),
            generate === "ssr" ? [templateId, t.booleanLiteral(true)] : [templateId]
          )
        : t.callExpression(t.memberExpression(templateId, t.identifier("cloneNode")), [
            t.booleanLiteral(true)
          ])
    );
  }
  results.decl.unshift(decl);
  results.decl = t.variableDeclaration("const", results.decl);
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
  return (tagName[0] && tagName[0].toLowerCase() !== tagName[0]) || tagName.includes(".");
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
  registerImportMethod(path, "wrapCondition");
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
              t.callExpression(t.identifier("_$wrapCondition"), [
                t.arrowFunctionExpression([], cond)
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

export function wrapDynamics(path, dynamics) {
  if (!dynamics.length) return;
  registerImportMethod(path, "wrap");
  if (dynamics.length === 1) {
    return t.expressionStatement(
      t.callExpression(t.identifier("_$wrap"), [
        t.arrowFunctionExpression(
          [],
          setAttr(
            path,
            dynamics[0].elem,
            dynamics[0].key,
            dynamics[0].value,
            dynamics[0].isSVG,
            true
          )
        )
      ])
    );
  }
  const decls = [],
    statements = [],
    identifiers = [],
    prevId = t.identifier("_p$");
  dynamics.forEach(({ elem, key, value, isSVG }) => {
    // no point diffing at this point as object
    if (key === "style") {
      statements.push(t.expressionStatement(setAttr(path, elem, key, value, isSVG, true)));
    } else {
      const identifier = path.scope.generateUidIdentifier("v$");
      identifiers.push(identifier);
      decls.push(t.variableDeclarator(identifier, value));
      // stash prev value for comparison
      let prevValue;
      if (key === "classList") {
        prevValue = path.scope.generateUidIdentifier("v$");
        decls.push(t.variableDeclarator(prevValue, t.memberExpression(prevId, identifier)));
      }
      statements.push(
        t.expressionStatement(
          t.logicalExpression(
            "&&",
            t.binaryExpression("!==", identifier, t.memberExpression(prevId, identifier)),
            setAttr(
              path,
              elem,
              key,
              t.assignmentExpression("=", t.memberExpression(prevId, identifier), identifier),
              isSVG,
              true,
              prevValue
            )
          )
        )
      );
    }
  });

  return t.expressionStatement(
    t.callExpression(t.identifier("_$wrap"), [
      t.arrowFunctionExpression(
        [prevId],
        t.blockStatement([
          t.variableDeclaration("const", decls),
          ...statements,
          t.returnStatement(prevId)
        ])
      ),
      t.objectExpression(identifiers.map(id => t.objectProperty(id, t.identifier("undefined"))))
    ])
  );
}

export function setAttr(path, elem, name, value, isSVG, dynamic, prevId) {
  if (name === "style") {
    return t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("assign")), [
      t.memberExpression(elem, t.identifier(name)),
      value
    ]);
  }

  if (name === "classList") {
    registerImportMethod(path, "classList");
    return t.callExpression(
      t.identifier("_$classList"),
      prevId ? [elem, value, prevId] : [elem, value]
    );
  }

  if (dynamic && name === "textContent") {
    return t.assignmentExpression("=", t.memberExpression(elem, t.identifier("data")), value);
  }

  let isAttribute = isSVG || name.indexOf("-") > -1,
    attribute = isSVG ? SVGAttributes[name] : Attributes[name];

  if (attribute) {
    if (attribute.type === "attribute") isAttribute = true;
    if (attribute.alias) name = attribute.alias;
  } else if (isSVG) name = name.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`);

  if (isAttribute)
    return t.callExpression(t.memberExpression(elem, t.identifier("setAttribute")), [
      t.stringLiteral(name),
      value
    ]);
  return t.assignmentExpression("=", t.memberExpression(elem, t.identifier(name)), value);
}
