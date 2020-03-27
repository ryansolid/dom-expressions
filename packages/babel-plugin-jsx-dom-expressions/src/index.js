import SyntaxJSX from "@babel/plugin-syntax-jsx";
import { addNamed } from "@babel/helper-module-imports";
import { Attributes, SVGAttributes, NonComposedEvents, SVGElements } from "dom-expressions";
import VoidElements from "./VoidElements";

export default babel => {
  const { types: t } = babel;
  const JSXOptions = {
    moduleName: "dom",
    generate: "dom",
    delegateEvents: true,
    nonDelegateEvents: [],
    builtIns: [],
    wrapFragments: false,
    wrapConditionals: false,
    contextToCustomElements: false,
    hydratableEvents: null,
    staticMarker: "@once"
  };

  function assignJSXOptions(opts = {}) {
    if (!Object.keys(opts).length) return;
    for (const opt in opts) {
      JSXOptions[opt] = opts[opt];
    }
  }

  function isComponent(tagName) {
    return (tagName[0] && tagName[0].toLowerCase() !== tagName[0]) || tagName.includes(".");
  }

  function isDynamic(expr, path, { checkMember, checkTags }) {
    if (t.isFunction(expr)) return false;
    if (expr.leadingComments && expr.leadingComments[0].value.trim() === JSXOptions.staticMarker) {
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

  function registerImportMethod(path, name) {
    const imports =
      path.scope.getProgramParent().data.imports ||
      (path.scope.getProgramParent().data.imports = new Set());
    if (!imports.has(name)) {
      addNamed(path, name, JSXOptions.moduleName, { nameHint: `_$${name}` });
      imports.add(name);
    }
  }

  function registerTemplate(path, results) {
    const { generate } = JSXOptions;
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

  function toEventName(name) {
    return name.slice(2).toLowerCase();
  }

  function jsxElementNameToString(jsx) {
    if (t.isJSXMemberExpression(jsx)) {
      return `${jsxElementNameToString(jsx.object)}.${jsx.property.name}`;
    }
    if (t.isJSXIdentifier(jsx)) {
      return jsx.name;
    }
    return `${jsx.namespace.name}:${jsx.name.name}`;
  }

  function tagNameToIdentifier(name) {
    const parts = name.split(".");
    if (parts.length === 1) return t.identifier(name);
    let part;
    let base = t.identifier(parts.shift())
    while (part = parts.shift()) {
      base = t.memberExpression(base, t.identifier(part));
    }
    return base;
  }

  function getTagName(tag) {
    const jsxName = tag.openingElement.name;
    return jsxElementNameToString(jsxName);
  }

  function lookupPathForExpr(path, node) {
    return path.scope.getProgramParent().data.exprs.get(node);
  }

  function setAttr(path, elem, name, value, isSVG, dynamic, prevId) {
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

  function wrapDynamics(path, dynamics) {
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

  function transformCondition(path, expr, deep) {
    registerImportMethod(path, "wrapCondition");
    let dTest, cond;
    if (
      t.isConditionalExpression(expr) &&
      (isDynamic(expr.consequent, path.get("consequent"), {
        checkTags: true
      }) ||
        isDynamic(expr.alternate, path.get("alternate"), { checkTags: true }))
    ) {
      dTest = isDynamic(expr.test, path.get("test"), { checkMember: true });
      if (dTest) {
        cond = expr.test;
        expr.test = t.callExpression(t.identifier("_c$"), []);
        if (t.isConditionalExpression(expr.consequent) || t.isLogicalExpression(expr.consequent)) {
          expr.consequent = transformCondition(path.get("consequent"), expr.consequent, true);
        }
        if (t.isConditionalExpression(expr.alternate) || t.isLogicalExpression(expr.alternate)) {
          expr.alternate = transformCondition(path.get("alternate"), expr.alternate, true);
        }
      }
    } else if (t.isLogicalExpression(expr)) {
      let nextExpr = expr;
      let nextPath = path;
      // handle top-level or, ie cond && <A/> || <B/>
      if (expr.operator === "||" && t.isLogicalExpression(expr.left)) {
        nextExpr = nextExpr.left;
        nextPath = nextPath.get("left");
      }
      isDynamic(nextExpr.right, nextPath.get("right"), { checkTags: true }) &&
        (dTest = isDynamic(nextExpr.left, nextPath.get("left"), {
          checkMember: true
        }));
      if (dTest) {
        cond = nextExpr.left;
        nextExpr.left = t.callExpression(t.identifier("_c$"), []);
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

  function createPlaceholder(path, results, tempPath, i, char) {
    const exprId = path.scope.generateUidIdentifier("el$");
    let contentId;
    results.template += `<!--${char}-->`;
    if (JSXOptions.generate === "hydrate" && char === "/") {
      registerImportMethod(path, "getNextMarker");
      contentId = path.scope.generateUidIdentifier("co$");
      results.decl.push(
        t.variableDeclarator(
          t.arrayPattern([exprId, contentId]),
          t.callExpression(t.identifier("_$getNextMarker"), [
            t.memberExpression(t.identifier(tempPath), t.identifier("nextSibling"))
          ])
        )
      );
    } else
      results.decl.push(
        t.variableDeclarator(
          exprId,
          t.memberExpression(
            t.identifier(tempPath),
            t.identifier(i === 0 ? "firstChild" : "nextSibling")
          )
        )
      );
    return [exprId, contentId];
  }

  function nextChild(children, index) {
    return children[index + 1] && (children[index + 1].id || nextChild(children, index + 1));
  }

  function trimWhitespace(text) {
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

  function checkLength(children) {
    let i = 0;
    children.forEach(child => {
      !(t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) &&
        (!t.isJSXText(child) || !/^\s*$/.test(child.extra.raw)) &&
        i++;
    });
    return i > 1;
  }

  // remove unnecessary JSX Text nodes
  function filterChildren(children, loose) {
    return children.filter(
      child =>
        !(t.isJSXExpressionContainer(child) && t.isJSXEmptyExpression(child.expression)) &&
        (!t.isJSXText(child) ||
          (loose ? !/^[\r\n]\s*$/.test(child.extra.raw) : !/^\s*$/.test(child.extra.raw)))
    );
  }

  function transformComponentChildren(path, children) {
    const filteredChildren = filterChildren(children);
    if (!filteredChildren.length) return;
    let dynamic = false;

    let transformedChildren = filteredChildren.map(child => {
      if (t.isJSXText(child)) {
        return t.stringLiteral(trimWhitespace(child.extra.raw));
      } else {
        child = generateHTMLNode(path, child, {
          topLevel: true,
          componentChild: true
        });
        if (child.id) {
          registerTemplate(path, child);
          if (
            !(child.exprs.length || child.dynamics.length || child.postExprs.length) &&
            child.decl.declarations.length === 1
          ) {
            return child.decl.declarations[0].init;
          } else {
            return t.callExpression(
              t.arrowFunctionExpression(
                [],
                t.blockStatement([
                  child.decl,
                  ...child.exprs.concat(
                    wrapDynamics(path, child.dynamics) || [],
                    child.postExprs || []
                  ),
                  t.returnStatement(child.id)
                ])
              ),
              []
            );
          }
        }
        dynamic = dynamic || child.dynamic;
        if (JSXOptions.wrapFragments && filteredChildren.length > 1) {
          if (child.dynamic) {
            registerImportMethod(path, "wrapMemo");
            return t.callExpression(t.identifier("_$wrapMemo"), [child.exprs[0]]);
          }
        }
        return child.exprs[0];
      }
    });

    if (filteredChildren.length === 1) {
      transformedChildren = transformedChildren[0];
      if (!t.isJSXExpressionContainer(filteredChildren[0])) {
        transformedChildren =
          t.isCallExpression(transformedChildren) && !transformedChildren.arguments.length
            ? transformedChildren.callee
            : t.arrowFunctionExpression([], transformedChildren);
        dynamic = true;
      }
    } else {
      transformedChildren = t.arrowFunctionExpression([], t.arrayExpression(transformedChildren));
      dynamic = true;
    }
    return [transformedChildren, dynamic];
  }

  // reduce unnecessary refs
  function detectExpressions(children, index) {
    if (children[index - 1]) {
      if (
        t.isJSXExpressionContainer(children[index - 1]) &&
        !t.isJSXEmptyExpression(children[index - 1].expression)
      )
        return true;
      let tagName;
      if (
        t.isJSXElement(children[index - 1]) &&
        (tagName = getTagName(children[index - 1])) &&
        isComponent(tagName)
      )
        return true;
    }
    for (let i = index; i < children.length; i++) {
      if (t.isJSXExpressionContainer(children[i])) {
        if (!t.isJSXEmptyExpression(children[i].expression)) return true;
      } else if (t.isJSXElement(children[i])) {
        const tagName = getTagName(children[i]);
        if (isComponent(tagName)) return true;
        if (JSXOptions.contextToCustomElements && (tagName === "slot" || tagName.indexOf("-") > -1))
          return true;
        if (
          children[i].openingElement.attributes.some(
            attr =>
              t.isJSXSpreadAttribute(attr) ||
              (t.isJSXExpressionContainer(attr.value) &&
                (JSXOptions.generate !== "ssr" || !attr.name.name.startsWith("on")) &&
                (attr.name.name.toLowerCase() !== attr.name.name ||
                  !(
                    t.isStringLiteral(attr.value.expression) ||
                    t.isNumericLiteral(attr.value.expression)
                  )))
          )
        )
          return true;
        const nextChildren = filterChildren(children[i].children, true);
        if (nextChildren.length) if (detectExpressions(nextChildren, 0)) return true;
      }
    }
  }

  function generateComponent(path, jsx) {
    let props = [],
      runningObject = [],
      exprs,
      tagName = getTagName(jsx),
      dynamicSpreads = [],
      dynamicKeys = [];

    if (JSXOptions.builtIns.indexOf(tagName) > -1) {
      registerImportMethod(path, tagName);
      tagName = `_$${tagName}`;
    }

    jsx.openingElement.attributes.forEach(attribute => {
      if (t.isJSXSpreadAttribute(attribute)) {
        if (runningObject.length) {
          props.push(t.objectExpression(runningObject));
          runningObject = [];
        }
        const key = t.identifier("k$"),
          memo = t.identifier("m$");
        dynamicSpreads.push(
          t.spreadElement(
            t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("keys")), [
              attribute.argument
            ])
          )
        );
        props.push(
          t.callExpression(
            t.memberExpression(
              t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("keys")), [
                attribute.argument
              ]),
              t.identifier("reduce")
            ),
            [
              t.arrowFunctionExpression(
                [memo, key],
                t.sequenceExpression([
                  t.assignmentExpression(
                    "=",
                    t.memberExpression(memo, key, true),
                    t.arrowFunctionExpression([], t.memberExpression(attribute.argument, key, true))
                  ),
                  memo
                ])
              ),
              t.objectExpression([])
            ]
          )
        );
      } else {
        const value = attribute.value || t.booleanLiteral(true);
        if (t.isJSXExpressionContainer(value))
          if (attribute.name.name === "ref") {
            runningObject.push(
              t.objectProperty(
                t.identifier("ref"),
                t.arrowFunctionExpression(
                  [t.identifier("r$")],
                  t.assignmentExpression("=", value.expression, t.identifier("r$"))
                )
              )
            );
          } else if (attribute.name.name === "forwardRef") {
            runningObject.push(t.objectProperty(t.identifier("ref"), value.expression));
          } else if (
            isDynamic(value.expression, lookupPathForExpr(path, value.expression), {
              checkMember: true,
              checkTags: true
            })
          ) {
            dynamicKeys.push(t.stringLiteral(attribute.name.name));
            const expr =
              JSXOptions.wrapConditionals &&
              (t.isLogicalExpression(value.expression) ||
                t.isConditionalExpression(value.expression))
                ? transformCondition(lookupPathForExpr(path, value.expression), value.expression)
                : t.arrowFunctionExpression([], value.expression);
            runningObject.push(t.objectProperty(t.identifier(attribute.name.name), expr));
          } else
            runningObject.push(
              t.objectProperty(t.identifier(attribute.name.name), value.expression)
            );
        else runningObject.push(t.objectProperty(t.identifier(attribute.name.name), value));
      }
    });

    const childResult = transformComponentChildren(path, jsx.children);
    if (childResult && childResult[0]) {
      childResult[1] && dynamicKeys.push(t.stringLiteral("children"));
      runningObject.push(t.objectProperty(t.identifier("children"), childResult[0]));
    }
    props.push(t.objectExpression(runningObject));

    if (props.length > 1) {
      props = [
        t.callExpression(t.memberExpression(t.identifier("Object"), t.identifier("assign")), props)
      ];
    }
    dynamicKeys.sort((a, b) => a.value.toLowerCase().localeCompare(b.value.toLowerCase()));
    let dynamics;
    if (dynamicSpreads.length) {
      dynamicKeys.push.apply(dynamicKeys, dynamicSpreads);
      dynamics = t.arrayExpression(dynamicKeys);
    } else if (dynamicKeys.length) {
      const hash = dynamicKeys.map(k => k.value).join("|"),
        childKeys =
          path.scope.getProgramParent().data.childKeys ||
          (path.scope.getProgramParent().data.childKeys = new Map());
      if (!childKeys.has(hash)) {
        const identifier = path.scope.generateUidIdentifier("ck$");
        childKeys.set(hash, { identifier, dynamicKeys });
        dynamics = identifier;
      } else {
        dynamics = childKeys.get(hash).identifier;
      }
    }

    registerImportMethod(path, "createComponent");
    const componentArgs = [tagNameToIdentifier(tagName), props[0]];
    if (dynamics) componentArgs.push(dynamics);
    exprs = [t.callExpression(t.identifier("_$createComponent"), componentArgs)];

    return { exprs, template: "", component: true };
  }

  function transformAttributes(path, jsx, results) {
    let elem = results.id,
      hasHydratableEvent = false,
      children;
    const spread = t.identifier("_$spread"),
      tagName = getTagName(jsx),
      isSVG = SVGElements.has(tagName),
      hasChildren = jsx.children.length > 0;

    jsx.openingElement.attributes.forEach(attribute => {
      if (t.isJSXSpreadAttribute(attribute)) {
        registerImportMethod(path, "spread");
        results.exprs.push(
          t.expressionStatement(
            t.callExpression(spread, [
              elem,
              isDynamic(attribute.argument, lookupPathForExpr(path, attribute.argument), {
                checkMember: true
              })
                ? t.arrowFunctionExpression([], attribute.argument)
                : attribute.argument,
              t.booleanLiteral(isSVG),
              t.booleanLiteral(hasChildren)
            ])
          )
        );
        //NOTE: can't be checked at compile time so add to compiled output
        hasHydratableEvent = true;
        return;
      }

      let value = attribute.value,
        key = attribute.name.name;
      if (
        t.isJSXExpressionContainer(value) &&
        (key.toLowerCase() !== key ||
          !(t.isStringLiteral(value.expression) || t.isNumericLiteral(value.expression)))
      ) {
        if (key === "ref") {
          results.exprs.unshift(
            t.expressionStatement(t.assignmentExpression("=", value.expression, elem))
          );
        } else if (key === "children") {
          children = value;
        } else if (key === "forwardRef") {
          results.exprs.unshift(
            t.expressionStatement(
              t.logicalExpression(
                "&&",
                value.expression,
                t.callExpression(value.expression, [elem])
              )
            )
          );
        } else if (key.startsWith("on")) {
          if (JSXOptions.generate === "ssr") return;
          const ev = toEventName(key);
          if (!ev || ev === "capture") {
            value.expression.properties.forEach(prop => {
              const listenerOptions = [
                t.stringLiteral(prop.key.name || prop.key.value),
                prop.value
              ];
              results.exprs.push(
                t.expressionStatement(
                  t.callExpression(
                    t.memberExpression(elem, t.identifier("addEventListener")),
                    ev ? listenerOptions.concat(t.booleanLiteral(true)) : listenerOptions
                  )
                )
              );
            });
          } else if (
            JSXOptions.delegateEvents &&
            !NonComposedEvents.has(ev) &&
            JSXOptions.nonDelegateEvents.indexOf(ev) === -1
          ) {
            // can only hydrate delegated events
            hasHydratableEvent = JSXOptions.hydratableEvents
              ? JSXOptions.hydratableEvents.includes(ev)
              : true;
            const events =
              path.scope.getProgramParent().data.events ||
              (path.scope.getProgramParent().data.events = new Set());
            events.add(ev);
            let handler = value.expression;
            if (t.isArrayExpression(value.expression)) {
              handler = value.expression.elements[0];
              results.exprs.unshift(
                t.expressionStatement(
                  t.assignmentExpression(
                    "=",
                    t.memberExpression(t.identifier(elem.name), t.identifier(`__${ev}Data`)),
                    value.expression.elements[1]
                  )
                )
              );
            }
            results.exprs.unshift(
              t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(t.identifier(elem.name), t.identifier(`__${ev}`)),
                  handler
                )
              )
            );
          } else {
            let handler = value.expression;
            if (t.isArrayExpression(value.expression)) {
              handler = t.arrowFunctionExpression(
                [t.identifier("e")],
                t.callExpression(value.expression.elements[0], [
                  value.expression.elements[1],
                  t.identifier("e")
                ])
              );
            }
            results.exprs.unshift(
              t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(t.identifier(elem.name), t.identifier(`on${ev}`)),
                  handler
                )
              )
            );
          }
        } else if (
          isDynamic(value.expression, lookupPathForExpr(path, value.expression), {
            checkMember: true
          })
        ) {
          if (key === "textContent") {
            const textId = path.scope.generateUidIdentifier("el$");
            results.exprs.push(
              t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(elem, t.identifier("textContent")),
                  value.expression
                )
              ),
              t.variableDeclaration("const", [
                t.variableDeclarator(textId, t.memberExpression(elem, t.identifier("firstChild")))
              ])
            );
            elem = textId;
          }
          results.dynamics.push({ elem, key, value: value.expression, isSVG });
        } else {
          results.exprs.push(
            t.expressionStatement(setAttr(path, elem, key, value.expression, isSVG))
          );
        }
      } else {
        if (t.isJSXExpressionContainer(value)) value = value.expression;
        if (isSVG) {
          attribute = SVGAttributes[key];

          if (attribute) {
            if (attribute.alias) key = attribute.alias;
          } else key = key.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`);
        } else {
          attribute = SVGAttributes[key];
          if (attribute && attribute.alias) key = attribute.alias;
          key = key.toLowerCase();
        }
        results.template += ` ${key}`;
        results.template += value ? `="${value.value}"` : `=""`;
      }
    });
    if (!hasChildren && children) {
      jsx.children.push(children);
    }

    results.hasHydratableEvent = results.hasHydratableEvent || hasHydratableEvent;
  }

  function transformChildren(path, jsx, results) {
    const { generate } = JSXOptions;
    let tempPath = results.id && results.id.name,
      i = 0;
    const jsxChildren = filterChildren(jsx.children, true),
      children = jsxChildren.map((jsxChild, index) =>
        generateHTMLNode(path, jsxChild, {
          skipId: !results.id || !detectExpressions(jsxChildren, index)
        })
      );

    children.forEach((child, index) => {
      if (!child) return;
      results.template += child.template;
      if (child.id) {
        results.decl.push(
          t.variableDeclarator(
            child.id,
            t.memberExpression(
              t.identifier(tempPath),
              t.identifier(i === 0 ? "firstChild" : "nextSibling")
            )
          )
        );
        results.decl.push(...child.decl);
        results.exprs.push(...child.exprs);
        results.dynamics.push(...child.dynamics);
        results.hasHydratableEvent = results.hasHydratableEvent || child.hasHydratableEvent;
        tempPath = child.id.name;
        i++;
      } else if (child.exprs.length) {
        registerImportMethod(path, "insert");
        const multi = checkLength(jsxChildren),
          markers = (generate === "ssr" || generate === "hydrate") && multi;
        // boxed by textNodes
        if (
          markers ||
          (t.isJSXText(jsxChildren[index - 1]) && t.isJSXText(jsxChildren[index + 1]))
        ) {
          if (markers) tempPath = createPlaceholder(path, results, tempPath, i++, "#")[0].name;
          const [exprId, contentId] = createPlaceholder(
            path,
            results,
            tempPath,
            i++,
            markers ? "/" : ""
          );
          results.exprs.push(
            t.expressionStatement(
              t.callExpression(
                t.identifier("_$insert"),
                contentId
                  ? [results.id, child.exprs[0], exprId, contentId]
                  : [results.id, child.exprs[0], exprId]
              )
            )
          );
          tempPath = exprId.name;
        } else if (multi) {
          results.exprs.push(
            t.expressionStatement(
              t.callExpression(t.identifier("_$insert"), [
                results.id,
                child.exprs[0],
                nextChild(children, index) || t.nullLiteral()
              ])
            )
          );
        } else {
          results.exprs.push(
            t.expressionStatement(
              t.callExpression(
                t.identifier("_$insert"),
                generate === "hydrate"
                  ? [
                      results.id,
                      child.exprs[0],
                      t.identifier("undefined"),
                      t.callExpression(
                        t.memberExpression(
                          t.memberExpression(
                            t.memberExpression(t.identifier("Array"), t.identifier("prototype")),
                            t.identifier("slice")
                          ),
                          t.identifier("call")
                        ),
                        [
                          t.memberExpression(results.id, t.identifier("childNodes")),
                          t.numericLiteral(0)
                        ]
                      )
                    ]
                  : [results.id, child.exprs[0]]
              )
            )
          );
        }
      }
    });
  }

  function transformFragmentChildren(path, jsx, results) {
    const jsxChildren = filterChildren(jsx.children, true),
      singleChild = jsxChildren.length === 1,
      children = jsxChildren.map(child => {
        if (t.isJSXText(child)) {
          return t.stringLiteral(trimWhitespace(child.extra.raw));
        } else {
          child = generateHTMLNode(path, child, { topLevel: true });
          if (child.id) {
            registerTemplate(path, child);
            if (
              !(child.exprs.length || child.dynamics.length || child.postExprs.length) &&
              child.decl.declarations.length === 1
            ) {
              return child.decl.declarations[0].init;
            } else {
              return t.callExpression(
                t.arrowFunctionExpression(
                  [],
                  t.blockStatement([
                    child.decl,
                    ...child.exprs.concat(
                      wrapDynamics(path, child.dynamics) || [],
                      child.postExprs || []
                    ),
                    t.returnStatement(child.id)
                  ])
                ),
                []
              );
            }
          }
          if (!singleChild && JSXOptions.wrapFragments && child.dynamic) {
            registerImportMethod(path, "wrapMemo");
            return t.callExpression(t.identifier("_$wrapMemo"), [child.exprs[0]]);
          }
          return child.exprs[0];
        }
      });
    results.exprs.push(singleChild ? children[0] : t.arrayExpression(children));
  }

  function generateHTMLNode(path, jsx, info = {}) {
    if (t.isJSXElement(jsx)) {
      let tagName = getTagName(jsx),
        wrapSVG = info.topLevel && tagName != "svg" && SVGElements.has(tagName),
        voidTag = VoidElements.indexOf(tagName) > -1;
      if (isComponent(tagName)) return generateComponent(path, jsx);
      let results = {
        template: `<${tagName}`,
        decl: [],
        exprs: [],
        dynamics: [],
        postExprs: [],
        isSVG: wrapSVG
      };
      if (wrapSVG) results.template = "<svg>" + results.template;
      if (!info.skipId) results.id = path.scope.generateUidIdentifier("el$");
      transformAttributes(path, jsx, results);
      if (JSXOptions.contextToCustomElements && (tagName === "slot" || tagName.indexOf("-") > -1)) {
        registerImportMethod(path, "currentContext");
        results.exprs.push(
          t.expressionStatement(
            t.assignmentExpression(
              "=",
              t.memberExpression(results.id, t.identifier("_context")),
              t.callExpression(t.identifier("_$currentContext"), [])
            )
          )
        );
      }
      results.template += ">";
      if (!voidTag) {
        transformChildren(path, jsx, results);
        results.template += `</${tagName}>`;
      }
      if (info.topLevel && JSXOptions.generate === "hydrate" && results.hasHydratableEvent) {
        registerImportMethod(path, "runHydrationEvents");
        results.postExprs.push(
          t.expressionStatement(
            t.callExpression(t.identifier("_$runHydrationEvents"), [
              t.callExpression(t.memberExpression(results.id, t.identifier("getAttribute")), [
                t.stringLiteral("_hk")
              ])
            ])
          )
        );
      }
      if (wrapSVG) results.template += "</svg>";
      return results;
    } else if (t.isJSXFragment(jsx)) {
      let results = { template: "", decl: [], exprs: [], dynamics: [] };
      transformFragmentChildren(path, jsx, results);
      return results;
    } else if (
      t.isJSXText(jsx) ||
      (t.isJSXExpressionContainer(jsx) &&
        (t.isStringLiteral(jsx.expression) ||
          (t.isTemplateLiteral(jsx.expression) && jsx.expression.expressions.length === 0)))
    ) {
      const text = trimWhitespace(
        t.isJSXExpressionContainer(jsx)
          ? t.isStringLiteral(jsx.expression)
            ? jsx.expression.value
            : jsx.expression.quasis[0].value.raw
          : jsx.extra.raw
      );
      if (!text.length) return null;
      const results = {
        template: text,
        decl: [],
        exprs: [],
        dynamics: [],
        postExprs: []
      };
      if (!info.skipId) results.id = path.scope.generateUidIdentifier("el$");
      return results;
    } else if (t.isJSXExpressionContainer(jsx)) {
      if (t.isJSXEmptyExpression(jsx.expression)) return null;
      if (
        !isDynamic(jsx.expression, lookupPathForExpr(path, jsx.expression), {
          checkMember: true,
          checkTags: !!info.componentChild
        })
      )
        return { exprs: [jsx.expression], template: "" };
      const expr =
        JSXOptions.wrapConditionals &&
        (t.isLogicalExpression(jsx.expression) || t.isConditionalExpression(jsx.expression))
          ? transformCondition(lookupPathForExpr(path, jsx.expression), jsx.expression)
          : t.arrowFunctionExpression([], jsx.expression);
      return {
        exprs: [expr],
        template: "",
        dynamic: true
      };
    }
  }

  return {
    name: "ast-transform",
    inherits: SyntaxJSX,
    visitor: {
      JSXElement: (path, { opts }) => {
        assignJSXOptions(opts);
        const result = generateHTMLNode(path, path.node, {
          topLevel: true
        });
        if (result.id) {
          registerTemplate(path, result);
          if (
            !(result.exprs.length || result.dynamics.length || result.postExprs.length) &&
            result.decl.declarations.length === 1
          )
            path.replaceWith(result.decl.declarations[0].init);
          else
            path.replaceWithMultiple(
              [result.decl].concat(
                result.exprs,
                wrapDynamics(path, result.dynamics) || [],
                result.postExprs || [],
                t.returnStatement(result.id)
              )
            );
        } else path.replaceWith(result.exprs[0]);
      },
      JSXFragment: (path, { opts }) => {
        assignJSXOptions(opts);
        const result = generateHTMLNode(path, path.node);
        path.replaceWith(result.exprs[0]);
      },
      Program: {
        enter: path => {
          const exprs = (path.scope.data.exprs = new Map());
          path.traverse({
            JSXExpressionContainer(p) {
              exprs.set(p.node.expression, p.get("expression"));
            },
            JSXSpreadAttribute(p) {
              exprs.set(p.node.argument, p.get("arguments"));
            }
          });
        },
        exit: path => {
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
          if (path.scope.data.childKeys) {
            const declarators = [...path.scope.data.childKeys.values()].map(o =>
              t.variableDeclarator(o.identifier, t.arrayExpression(o.dynamicKeys))
            );
            path.node.body.unshift(t.variableDeclaration("const", declarators));
          }
          if (path.scope.data.templates) {
            const declarators = path.scope.data.templates.map(template => {
              const tmpl = {
                cooked: template.template,
                raw: template.template
              };
              registerImportMethod(path, "template");
              return t.variableDeclarator(
                template.id,
                t.callExpression(
                  t.identifier("_$template"),
                  [
                    t.templateLiteral([t.templateElement(tmpl, true)], []),
                    t.numericLiteral(template.elementCount)
                  ].concat(template.isSVG ? t.booleanLiteral(template.isSVG) : [])
                )
              );
            });
            path.node.body.unshift(t.variableDeclaration("const", declarators));
          }
        }
      }
    }
  };
};
