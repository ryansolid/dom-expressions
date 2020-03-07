/// <reference path="../../dom-expressions/runtime.d.ts" />
import { NonComposedEvents } from "dom-expressions";
import {
  wrap,
  insert,
  createComponent,
  delegateEvents,
  classList
} from "dom-expressions-runtime";

interface Runtime {
  wrap: typeof wrap;
  insert: typeof insert;
  createComponent: typeof createComponent;
  delegateEvents: typeof delegateEvents;
  classList: typeof classList;
}

type ExpandableNode = Node & { [key: string]: any };
type Props = { [key: string]: any };

export type HyperScript = {
  (...args: any[]): ExpandableNode | ExpandableNode[];
};

// Inspired by https://github.com/hyperhype/hyperscript
export function createHyperScript(
  r: Runtime,
  { delegateEvents = true } = {}
): HyperScript {
  function h() {
    let args: any = [].slice.call(arguments),
      e: ExpandableNode | undefined,
      multiExpression = false,
      delegatedEvents = new Set<string>();

    function item(l: any) {
      const type = typeof l;
      if (l == null) void 0;
      else if ("string" === type) {
        if (!e) parseClass(l);
        else e.appendChild(document.createTextNode(l));
      } else if (
        "number" === type ||
        "boolean" === type ||
        l instanceof Date ||
        l instanceof RegExp
      ) {
        (e as Node).appendChild(document.createTextNode(l.toString()));
      } else if (Array.isArray(l)) {
        for (let i = 0; i < l.length; i++) item(l[i]);
      } else if (l instanceof Element) {
        r.insert(e as Element, l, multiExpression ? null : undefined);
      } else if ("object" === type) {
        for (const k in l) {
          if ("function" === typeof l[k]) {
            if (k.slice(0, 2) === "on") {
              const lc = k.toLowerCase();
              if (
                delegateEvents &&
                !NonComposedEvents.has(lc.slice(2))
              ) {
                const name = lc.slice(2);
                delegatedEvents.add(name);
                (e as ExpandableNode)[`__${name}`] = l[k];
              } else (e as ExpandableNode)[lc] = l[k];
            } else if (k === "ref") {
              l[k](e);
            } else
              (function(k, l) {
                r.wrap(() => parseKeyValue(k, l[k]()));
              })(k, l);
          } else parseKeyValue(k, l[k]);
        }
      } else if ("function" === typeof l) {
        if (!e) {
          let props: Props = {},
            dynamic = [];
          if (typeof args[0] === "object") props = args.shift();
          for (const k in props) {
            if (typeof props[k] === "function") dynamic.push(k);
          }
          props.children = args.length > 1 ? args : args[0];
          if (
            props.children &&
            typeof props.children === "function" &&
            !props.children.length
          )
            dynamic.push("children");
          e = r.createComponent(l, props, dynamic);
          args = [];
        } else r.insert(e as Element, l, multiExpression ? null : undefined);
      }
    }
    detectMultiExpression(args);
    while (args.length) item(args.shift());
    r.delegateEvents(Array.from(delegatedEvents));
    return e as ExpandableNode;

    function parseClass(string: string) {
      // Our minimal parser doesn’t understand escaping CSS special
      // characters like `#`. Don’t use them. More reading:
      // https://mathiasbynens.be/notes/css-escapes .

      const m = string.split(/([\.#]?[^\s#.]+)/);
      if (/^\.|#/.test(m[1])) e = document.createElement("div");
      for (let i = 0; i < m.length; i++) {
        const v = m[i],
          s = v.substring(1, v.length);
        if (!v) continue;
        if (!e) e = document.createElement(v);
        else if (v[0] === ".") e.classList.add(s);
        else if (v[0] === "#") e.setAttribute("id", s);
      }
    }
    function parseKeyValue(k: string, v: any) {
      if (k === "style") {
        if ("string" === typeof v)
          (e as HTMLElement | SVGElement).style.cssText = v;
        else Object.assign((e as HTMLElement | SVGElement).style, v);
      } else if (k === "classList") {
        r.classList(e as Element, v);
      } else if (k === "on") {
        for (const c in v) (e as Element).addEventListener(c, v[c]);
      } else if (k === "onCapture") {
        for (const c in v) (e as Element).addEventListener(c, v[c], true);
      } else if (k === "attrs") {
        for (const a in v) (e as Element).setAttribute(a, v[a]);
      } else (e as ExpandableNode)[k] = v;
    }
    function detectMultiExpression(list: any[]) {
      for (let i = 0; i < list.length; i++) {
        if (typeof list[i] === "function") {
          multiExpression = true;
          return;
        } else if (Array.isArray(list[i])) {
          detectMultiExpression(list[i]);
        }
      }
    }
  }

  return h;
}
