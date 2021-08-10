import * as t from "@babel/types";
import {
  BooleanAttributes,
  Aliases,
  ChildProperties,
  SVGElements
} from "dom-expressions/src/constants";
import VoidElements from "../VoidElements";
import config from "../config";
import {
  getTagName,
  isDynamic,
  registerImportMethod,
  filterChildren,
  checkLength,
  escapeHTML,
  reservedNameSpaces
} from "../shared/utils";
import { transformNode } from "../shared/transform";

function appendToTemplate(template, value) {
  let array;
  if (Array.isArray(value)) {
    [value, ...array] = value;
  }
  template[template.length - 1] += value;
  if (array && array.length) template.push.apply(template, array);
}

export function transformElement(path, info) {
  let tagName = getTagName(path.node),
    voidTag = VoidElements.indexOf(tagName) > -1,
    results = {
      template: [`<${tagName}`],
      templateValues: [],
      decl: [],
      exprs: [],
      dynamics: []
    };
  if (info.topLevel && config.hydratable) {
    registerImportMethod(path, "ssrHydrationKey");
    results.template.push("");
    results.templateValues.push(t.callExpression(t.identifier("_$ssrHydrationKey"), []));
  }
  transformAttributes(path, results);
  appendToTemplate(results.template, ">");
  if (!voidTag) {
    transformChildren(path, results);
    appendToTemplate(results.template, `</${tagName}>`);
  }
  return results;
}

function toAttribute(key, isSVG) {
  key = Aliases[key] || key;
  !isSVG && (key = key.toLowerCase());
  return key;
}

function setAttr(results, name, value, isSVG) {
  // strip out namespaces for now, everything at this point is an attribute
  let parts, namespace;
  if ((parts = name.split(":")) && parts[1] && reservedNameSpaces.has(parts[0])) {
    name = parts[1];
    namespace = parts[0];
  }

  name = toAttribute(name, isSVG);
  appendToTemplate(results.template, ` ${name}="`);
  results.template.push(`"`);
  results.templateValues.push(value);
}

function escapeExpression(path, expression, attr) {
  if (t.isStringLiteral(expression) || t.isNumericLiteral(expression)) {
    return expression;
  } else if (t.isFunction(expression)) {
    expression.body = escapeExpression(path, expression.body, attr);
    return expression;
  } else if (t.isTemplateLiteral(expression)) {
    expression.expressions = expression.expressions.map(e => escapeExpression(path, e, attr));
    return expression;
  } else if (t.isUnaryExpression(expression)) {
    expression.argument = escapeExpression(path, expression.argument, attr);
    return expression;
  } else if (t.isBinaryExpression(expression)) {
    expression.left = escapeExpression(path, expression.left, attr);
    expression.right = escapeExpression(path, expression.right, attr);
    return expression;
  } else if (t.isConditionalExpression(expression)) {
    expression.consequent = escapeExpression(path, expression.consequent, attr);
    expression.alternate = escapeExpression(path, expression.alternate, attr);
    return expression;
  } else if (t.isLogicalExpression(expression)) {
    expression.right = escapeExpression(path, expression.right, attr);
    if (expression.operator !== "&&") {
      expression.left = escapeExpression(path, expression.left, attr);
    }
    return expression;
  } else if (t.isCallExpression(expression) && t.isFunction(expression.callee)) {
    if (t.isBlockStatement(expression.callee.body)) {
      expression.callee.body.body = expression.callee.body.body.map(e => {
        if (t.isReturnStatement(e)) e.argument = escapeExpression(path, e.argument, attr);
        return e;
      });
    } else expression.callee.body = escapeExpression(path, expression.callee.body, attr);
    return expression;
  }

  registerImportMethod(path, "escape");
  return t.callExpression(
    t.identifier("_$escape"),
    [expression].concat(attr ? [t.booleanLiteral(true)] : [])
  );
}

function transformToObject(attrName, attributes, selectedAttributes) {
  const properties = [];
  const existingAttribute = attributes.find(a => a.node.name.name === attrName);
  for (let i = 0; i < selectedAttributes.length; i++) {
    const attr = selectedAttributes[i].node;
    const computed = !t.isValidIdentifier(attr.name.name.name);
    properties.push(
      t.objectProperty(
        computed ? t.stringLiteral(attr.name.name.name) : t.identifier(attr.name.name.name),
        t.isJSXExpressionContainer(attr.value) ? attr.value.expression : attr.value
      )
    );
    (existingAttribute || i) && attributes.splice(selectedAttributes[i].key, 1);
  }
  if (
    existingAttribute &&
    t.isJSXExpressionContainer(existingAttribute.node.value) &&
    t.isObjectExpression(existingAttribute.node.value.expression)
  ) {
    existingAttribute.node.value.expression.properties.push(...properties);
  } else {
    selectedAttributes[0].node = t.jsxAttribute(
      t.jsxIdentifier(attrName),
      t.jsxExpressionContainer(t.objectExpression(properties))
    );
  }
}

function transformAttributes(path, results) {
  let children;
  const tagName = getTagName(path.node),
    isSVG = SVGElements.has(tagName),
    hasChildren = path.node.children.length > 0,
    attributes = path.get("openingElement").get("attributes"),
    styleAttributes = attributes.filter(
      a => t.isJSXNamespacedName(a.node.name) && a.node.name.namespace.name === "style"
    ),
    classNamespaceAttributes = attributes.filter(
      a => t.isJSXNamespacedName(a.node.name) && a.node.name.namespace.name === "class"
    );
  if (classNamespaceAttributes.length)
    transformToObject("classList", attributes, classNamespaceAttributes);
  const classAttributes = attributes.filter(
    a =>
      a.node.name &&
      (a.node.name.name === "class" ||
        a.node.name.name === "className" ||
        a.node.name.name === "classList")
  );
  // combine class propertoes
  if (classAttributes.length > 1) {
    const first = classAttributes[0].node,
      values = [],
      quasis = [t.TemplateElement({ raw: "" })];
    for (let i = 0; i < classAttributes.length; i++) {
      const attr = classAttributes[i].node,
        isLast = i === classAttributes.length - 1;
      if (!t.isJSXExpressionContainer(attr.value)) {
        const prev = quasis.pop();
        quasis.push(
          t.TemplateElement({
            raw:
              (prev ? prev.value.raw : "") +
              (i ? " " : "") +
              `${attr.value.value}` +
              (isLast ? "" : " ")
          })
        );
      } else {
        let expr = attr.value.expression;
        if (attr.name.name === "classList") {
          if (t.isObjectExpression(expr) && !expr.properties.some(p => t.isSpreadElement(p))) {
            transformClasslistObject(path, expr, values, quasis);
            i && attributes.splice(attributes.indexOf(classAttributes[i].node), 1);
            continue;
          }
          registerImportMethod(path, "ssrClassList");
          expr = t.callExpression(t.identifier("_$ssrClassList"), [expr]);
        }
        values.push(t.logicalExpression("||", expr, t.stringLiteral("")));
        quasis.push(t.TemplateElement({ raw: isLast ? "" : " " }));
      }
      i && attributes.splice(attributes.indexOf(classAttributes[i].node), 1);
    }
    first.value = t.JSXExpressionContainer(t.TemplateLiteral(quasis, values));
  }
  if (styleAttributes.length) transformToObject("style", attributes, styleAttributes);

  attributes.forEach(attribute => {
    const node = attribute.node;
    if (t.isJSXSpreadAttribute(node)) {
      registerImportMethod(attribute, "ssrSpread");
      appendToTemplate(results.template, " ");
      results.template.push("");
      results.templateValues.push(
        t.callExpression(t.identifier("_$ssrSpread"), [
          isDynamic(attribute.get("argument"), {
            checkMember: true,
            native: true
          })
            ? t.arrowFunctionExpression([], node.argument)
            : node.argument,
          t.booleanLiteral(isSVG),
          t.booleanLiteral(hasChildren)
        ])
      );
      return;
    }

    let value = node.value,
      key = t.isJSXNamespacedName(node.name)
        ? `${node.name.namespace.name}:${node.name.name.name}`
        : node.name.name,
      reservedNameSpace =
        t.isJSXNamespacedName(node.name) && reservedNameSpaces.has(node.name.namespace.name);
    if (
      ((t.isJSXNamespacedName(node.name) && reservedNameSpace) || ChildProperties.has(key)) &&
      !t.isJSXExpressionContainer(value)
    ) {
      node.value = value = t.JSXExpressionContainer(value || t.JSXEmptyExpression());
    }

    if (
      t.isJSXExpressionContainer(value) &&
      (reservedNameSpace ||
        ChildProperties.has(key) ||
        !(t.isStringLiteral(value.expression) || t.isNumericLiteral(value.expression)))
    ) {
      if (
        key === "ref" ||
        key.startsWith("use:") ||
        key.startsWith("prop:") ||
        key.startsWith("on")
      )
        return;
      else if (ChildProperties.has(key)) {
        children = value;
        if (key === "innerHTML") path.doNotEscape = true;
      } else {
        let dynamic = false,
          doEscape = true;
        if (
          isDynamic(attribute.get("value").get("expression"), {
            checkMember: true,
            native: true
          })
        )
          dynamic = true;

        if (BooleanAttributes.has(key)) {
          registerImportMethod(attribute, "ssrBoolean");
          results.template.push("");
          const fn = t.callExpression(t.identifier("_$ssrBoolean"), [
            t.stringLiteral(key),
            value.expression
          ]);
          results.templateValues.push(dynamic ? t.arrowFunctionExpression([], fn) : fn);
          return;
        }
        if (key === "style") {
          if (
            t.isJSXExpressionContainer(value) &&
            t.isObjectExpression(value.expression) &&
            !value.expression.properties.some(p => t.isSpreadElement(p))
          ) {
            registerImportMethod(path, "escape");
            const props = value.expression.properties.map((p, i) =>
              t.binaryExpression(
                "+",
                t.stringLiteral(
                  (i ? ";" : "") + (t.isIdentifier(p.key) ? p.key.name : p.key.value) + ":"
                ),
                t.isStringLiteral(p.value)
                  ? t.stringLiteral(escapeHTML(p.value.value))
                  : t.isNumericLiteral(p.value)
                  ? p.value
                  : t.isTemplateLiteral(p.value) && p.value.expressions.length === 0
                  ? t.stringLiteral(escapeHTML(p.value.quasis[0].value.raw))
                  : t.callExpression(t.identifier("_$escape"), [p.value, t.booleanLiteral(true)])
              )
            );
            let res = props[0];
            for (let i = 1; i < props.length; i++) {
              res = t.binaryExpression("+", res, props[i]);
            }
            value.expression = res;
          } else {
            registerImportMethod(path, "ssrStyle");
            value.expression = t.callExpression(t.identifier("_$ssrStyle"), [value.expression]);
          }
          doEscape = false;
        }
        if (key === "classList") {
          if (
            t.isObjectExpression(value.expression) &&
            !value.expression.properties.some(p => t.isSpreadElement(p))
          ) {
            const values = [],
              quasis = [t.TemplateElement({ raw: "" })];
            transformClasslistObject(path, value.expression, values, quasis);
            if (!values.length) value.expression = t.stringLiteral(quasis[0].value.raw);
            else if (values.length === 1 && !quasis[0].value.raw && !quasis[1].value.raw) {
              value.expression = values[0];
            } else value.expression = t.templateLiteral(quasis, values);
          } else {
            registerImportMethod(path, "ssrClassList");
            value.expression = t.callExpression(t.identifier("_$ssrClassList"), [value.expression]);
          }
          key = "class";
          doEscape = false;
        }
        if (dynamic)
          value.expression = t.arrowFunctionExpression(
            [],
            doEscape ? escapeExpression(path, value.expression, true) : value.expression
          );
        else if (doEscape) value.expression = escapeExpression(path, value.expression, true);
        setAttr(results, key, value.expression, isSVG);
      }
    } else {
      if (key === "$ServerOnly") return;
      if (t.isJSXExpressionContainer(value)) value = value.expression;
      key = toAttribute(key, isSVG);
      appendToTemplate(results.template, ` ${key}`);
      appendToTemplate(results.template, value ? `="${escapeHTML(value.value, true)}"` : `=""`);
    }
  });
  if (!hasChildren && children) {
    path.node.children.push(children);
  }
}

function transformClasslistObject(path, expr, values, quasis) {
  expr.properties.forEach((prop, i) => {
    const isLast = expr.properties.length - 1 === i;
    let key = prop.key;
    if (t.isIdentifier(prop.key) && !prop.computed) key = t.stringLiteral(key.name);
    else if (prop.computed) {
      registerImportMethod(path, "escape");
      key = t.callExpression(t.identifier("_$escape"), [prop.key, t.booleanLiteral(true)]);
    } else key = t.stringLiteral(escapeHTML(prop.key.value));
    if (t.isBooleanLiteral(prop.value)) {
      if (prop.value.value === true) {
        if (!prop.computed) {
          const prev = quasis.pop();
          quasis.push(
            t.TemplateElement({
              raw:
                (prev ? prev.value.raw : "") + (i ? " " : "") + `${key.value}` + (isLast ? "" : " ")
            })
          );
        } else {
          values.push(key);
          quasis.push(t.TemplateElement({ raw: isLast ? "" : " " }));
        }
      }
    } else {
      values.push(t.conditionalExpression(prop.value, key, t.stringLiteral("")));
      quasis.push(t.TemplateElement({ raw: isLast ? "" : " " }));
    }
  });
}

function transformChildren(path, results) {
  const { hydratable } = config,
    doNotEscape = path.doNotEscape;
  const filteredChildren = filterChildren(path.get("children"), true);
  filteredChildren.forEach(node => {
    const child = transformNode(node, { doNotEscape });
    appendToTemplate(results.template, child.template);
    results.templateValues.push.apply(results.templateValues, child.templateValues || []);
    if (child.exprs.length) {
      const multi = checkLength(filteredChildren),
        markers = hydratable && multi;

      if (!doNotEscape) child.exprs[0] = escapeExpression(path, child.exprs[0]);

      // boxed by textNodes
      if (markers) {
        appendToTemplate(results.template, `<!--#-->`);
        results.template.push("");
        results.templateValues.push(child.exprs[0]);
        appendToTemplate(results.template, `<!--/-->`);
      } else {
        results.template.push("");
        results.templateValues.push(child.exprs[0]);
      }
    }
  });
}
