import * as t from "@babel/types";
import { SVGAttributes, SVGElements } from "dom-expressions/src/constants";
import VoidElements from "../VoidElements";
import config from "../config";
import {
  getTagName,
  isDynamic,
  registerImportMethod,
  filterChildren,
  checkLength
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
    registerImportMethod(path, "getHydrationKey");
    appendToTemplate(results.template, ` _hk="`);
    results.template.push(`"`);
    results.templateValues.push(t.callExpression(t.identifier("_$getHydrationKey"), []));
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
  if (isSVG) {
    const attr = SVGAttributes[key];

    if (attr) {
      if (attr.alias) key = attr.alias;
    } else key = key.replace(/([A-Z])/g, g => `-${g[0].toLowerCase()}`);
  } else {
    const attr = SVGAttributes[key];
    if (attr && attr.alias) key = attr.alias;
    key = key.toLowerCase();
  }
  return key;
}

function setAttr(results, name, value, isSVG) {
  name = toAttribute(name, isSVG);
  appendToTemplate(results.template, ` ${name}="`);
  results.template.push(`"`);
  results.templateValues.push(value);
}

function transformAttributes(path, results) {
  let children;
  const tagName = getTagName(path.node),
    isSVG = SVGElements.has(tagName),
    hasChildren = path.node.children.length > 0,
    attributes = path.get("openingElement").get("attributes"),
    classAttributes = attributes.filter(
      a => a.node.name && (a.node.name.name === "class" || a.node.name.name === "className")
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
        quasis.pop();
        quasis.push(
          t.TemplateElement({ raw: (i ? " " : "") + `${attr.value.value}` + (isLast ? "" : " ") })
        );
      } else {
        values.push(attr.value.expression);
        quasis.push(t.TemplateElement({ raw: isLast ? "" : " " }));
      }
      i && attributes.splice(classAttributes[i].key);
    }
    first.value = t.JSXExpressionContainer(t.TemplateLiteral(quasis, values));
  }

  attributes.forEach(attribute => {
    const node = attribute.node;
    if (t.isJSXSpreadAttribute(node)) {
      registerImportMethod(attribute, "ssrSpread");
      appendToTemplate(results.template, " ");
      results.template.push("");
      results.templateValues.push(
        t.callExpression(t.identifier("_$ssrSpread"), [
          isDynamic(attribute.get("argument"), {
            checkMember: true
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
      key = node.name.name;
    if (
      t.isJSXExpressionContainer(value) &&
      (key.toLowerCase() !== key ||
        !(t.isStringLiteral(value.expression) || t.isNumericLiteral(value.expression)))
    ) {
      if (key === "ref" || key.startsWith("on")) return;
      else if (
        key === "children" ||
        key === "textContent" ||
        key === "innerHTML" ||
        key === "innerText"
      ) {
        children = value;
      } else {
        let dynamic = false,
          prev;
        if (
          isDynamic(attribute.get("value").get("expression"), {
            checkMember: true
          })
        )
          dynamic = true;

        if ((dynamic && key === "style") || key === "classList") prev = t.identifier("_p$");
        if (key === "style") {
          registerImportMethod(path, "ssrStyle");
          value.expression = t.callExpression(t.identifier("_$ssrStyle"), prev ? [value.expression, prev] : [value.expression]);
        }
        if (key === "classList") {
          registerImportMethod(path, "ssrClassList");
          value.expression = t.callExpression(t.identifier("_$ssrClassList"), prev ? [value.expression, prev] :[value.expression]);
          key = "class";
        }
        if (dynamic)
          value.expression = t.arrowFunctionExpression(prev ? [prev] : [], value.expression);
        setAttr(results, key, value.expression, isSVG);
      }
    } else {
      if (t.isJSXExpressionContainer(value)) value = value.expression;
      key = toAttribute(key, isSVG);
      appendToTemplate(results.template, ` ${key}`);
      appendToTemplate(results.template, value ? `="${value.value}"` : `=""`);
    }
  });
  if (!hasChildren && children) {
    path.node.children.push(children);
  }
}

function transformChildren(path, results) {
  const { hydratable } = config;
  const filteredChildren = filterChildren(path.get("children"), true);
  filteredChildren.forEach((node, index) => {
    const child = transformNode(node);
    appendToTemplate(results.template, child.template);
    results.templateValues.push.apply(results.templateValues, child.templateValues || []);
    if (child.exprs.length) {
      const multi = checkLength(filteredChildren),
        markers = hydratable && multi;

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
