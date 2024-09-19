import { template as _$template } from "r-dom";
import { memo as _$memo } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { getNextMatch as _$getNextMatch } from "r-dom";
import { NoHydration as _$NoHydration } from "r-dom";
import { getNextMarker as _$getNextMarker } from "r-dom";
import { insert as _$insert } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { useHead as _$useHead } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(
    `<div><!$><!/><style>div \{ background-color: red }</style><meta name=description itemprop=section><script>console.log("hi")</script><script src=/script.js></script>`
  ),
  _tmpl$2 = /*#__PURE__*/ _$template(`<style>div \{ background-color: red }`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<meta name=description itemprop=section>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<script>console.log("hi")`),
  _tmpl$5 = /*#__PURE__*/ _$template(`<script src=/script.js>`);
const template = (() => {
  var _el$ = _$getNextElement(),
    _el$5 = _$getNextMatch(_el$.firstChild, "body"),
    _el$6 = _el$5.firstChild,
    _el$8 = _el$6.nextSibling,
    [_el$9, _co$2] = _$getNextMarker(_el$8.nextSibling),
    _el$7 = _el$9.nextSibling;
  _$createComponent(_$NoHydration, {});
  _$insert(_el$5, _$createComponent(App, {}), _el$9, _co$2);
  return _el$;
})();
const templateHead = _$createComponent(_$NoHydration, {});
const templateBody = (() => {
  var _el$10 = _$getNextElement(),
    _el$11 = _el$10.firstChild,
    _el$13 = _el$11.nextSibling,
    [_el$14, _co$3] = _$getNextMarker(_el$13.nextSibling),
    _el$12 = _el$14.nextSibling;
  _$insert(_el$10, _$createComponent(App, {}), _el$14, _co$3);
  return _el$10;
})();
const templateEmptied = (() => {
  var _el$15 = _$getNextElement(),
    _el$16 = _el$15.firstChild,
    [_el$17, _co$4] = _$getNextMarker(_el$16.nextSibling),
    _el$18 = _el$17.nextSibling,
    [_el$19, _co$5] = _$getNextMarker(_el$18.nextSibling);
  _$insert(_el$15, _$createComponent(Head, {}), _el$17, _co$4);
  _$insert(_el$15, _$createComponent(Body, {}), _el$19, _co$5);
  return _el$15;
})();

// ideally we'd remove the insert on conditional but its a bit tricky
const notInHead = (() => {
  var _el$20 = _$getNextElement(_tmpl$),
    _el$22 = _el$20.firstChild,
    [_el$23, _co$6] = _$getNextMarker(_el$22.nextSibling),
    _el$21 = _el$23.nextSibling;
  _$useHead({
    tag: "title",
    props: {
      children: "\uD83D\uDD25 Blazing \uD83D\uDD25"
    }
  });
  _$useHead({
    tag: "meta",
    props: {
      charset: "UTF-8"
    }
  });
  _$useHead({
    tag: "meta",
    props: {
      name: "viewport",
      content: "width=device-width, initial-scale=1.0"
    }
  });
  _$insert(
    _el$20,
    someCondition
      ? _$useHead({
          tag: "link",
          props: {
            rel: "stylesheet",
            href: "/styles.css"
          }
        })
      : null,
    _el$23,
    _co$6
  );
  _$useHead({
    tag: "script",
    props: {
      src: "/async.js",
      async: true
    }
  });
  return _el$20;
})();
const notInHeadComponent = _$createComponent(Comp, {
  get children() {
    return [
      _$useHead({
        tag: "title",
        props: {
          children: "\uD83D\uDD25 Blazing \uD83D\uDD25"
        }
      }),
      _$useHead({
        tag: "meta",
        props: {
          charset: "UTF-8"
        }
      }),
      _$useHead({
        tag: "meta",
        props: {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0"
        }
      }),
      _$memo(() =>
        someCondition
          ? _$useHead({
              tag: "link",
              props: {
                rel: "stylesheet",
                href: "/styles.css"
              }
            })
          : null
      ),
      _$getNextElement(_tmpl$2),
      _$getNextElement(_tmpl$3),
      _$getNextElement(_tmpl$4),
      _$getNextElement(_tmpl$5),
      _$useHead({
        tag: "script",
        props: {
          src: "/async.js",
          async: true
        }
      })
    ];
  }
});
const notInHeadFragment = [
  _$useHead({
    tag: "title",
    props: {
      children: "\uD83D\uDD25 Blazing \uD83D\uDD25"
    }
  }),
  _$useHead({
    tag: "meta",
    props: {
      charset: "UTF-8"
    }
  }),
  _$useHead({
    tag: "meta",
    props: {
      name: "viewport",
      content: "width=device-width, initial-scale=1.0"
    }
  }),
  someCondition
    ? _$useHead({
        tag: "link",
        props: {
          rel: "stylesheet",
          href: "/styles.css"
        }
      })
    : null,
  _$getNextElement(_tmpl$2),
  _$getNextElement(_tmpl$3),
  _$getNextElement(_tmpl$4),
  _$getNextElement(_tmpl$5),
  _$useHead({
    tag: "script",
    props: {
      src: "/async.js",
      async: true
    }
  })
];
