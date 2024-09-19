import { template as _$template } from "r-dom";
import { memo as _$memo } from "r-dom";
import { insert as _$insert } from "r-dom";
import { createComponent as _$createComponent } from "r-dom";
import { useHead as _$useHead } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(
    `<html><head></head><body><header><h1>Welcome to the Jungle</h1></header><footer>The Bottom`
  ),
  _tmpl$2 = /*#__PURE__*/ _$template(`<head>`),
  _tmpl$3 = /*#__PURE__*/ _$template(
    `<body><header><h1>Welcome to the Jungle</h1></header><footer>The Bottom`
  ),
  _tmpl$4 = /*#__PURE__*/ _$template(`<html>`),
  _tmpl$5 = /*#__PURE__*/ _$template(
    `<div><style>div \{ background-color: red }</style><meta name=description itemprop=section><script>console.log("hi")</script><script src=/script.js></script>`
  ),
  _tmpl$6 = /*#__PURE__*/ _$template(`<style>div \{ background-color: red }`),
  _tmpl$7 = /*#__PURE__*/ _$template(`<meta name=description itemprop=section>`),
  _tmpl$8 = /*#__PURE__*/ _$template(`<script>console.log("hi")`),
  _tmpl$9 = /*#__PURE__*/ _$template(`<script src=/script.js>`);
const template = (() => {
  var _el$ = _tmpl$(),
    _el$3 = _el$.firstChild,
    _el$4 = _el$3.firstChild,
    _el$5 = _el$4.nextSibling;
  _$insert(_el$3, _$createComponent(App, {}), _el$5);
  return _el$;
})();
const templateHead = (() => {
  var _el$6 = _tmpl$2();
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
  _$useHead({
    tag: "link",
    props: {
      rel: "stylesheet",
      href: "/styles.css"
    }
  });
  _$insert(_el$6, _$createComponent(Assets, {}), null);
  return _el$6;
})();
const templateBody = (() => {
  var _el$7 = _tmpl$3(),
    _el$8 = _el$7.firstChild,
    _el$9 = _el$8.nextSibling;
  _$insert(_el$7, _$createComponent(App, {}), _el$9);
  return _el$7;
})();
const templateEmptied = (() => {
  var _el$10 = _tmpl$4();
  _$insert(_el$10, _$createComponent(Head, {}), null);
  _$insert(_el$10, _$createComponent(Body, {}), null);
  return _el$10;
})();

// ideally we'd remove the insert on conditional but its a bit tricky
const notInHead = (() => {
  var _el$11 = _tmpl$5(),
    _el$12 = _el$11.firstChild;
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
    _el$11,
    someCondition
      ? _$useHead({
          tag: "link",
          props: {
            rel: "stylesheet",
            href: "/styles.css"
          }
        })
      : null,
    _el$12
  );
  _$useHead({
    tag: "script",
    props: {
      src: "/async.js",
      async: true
    }
  });
  return _el$11;
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
      _tmpl$6(),
      _tmpl$7(),
      _tmpl$8(),
      _tmpl$9(),
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
  _tmpl$6(),
  _tmpl$7(),
  _tmpl$8(),
  _tmpl$9(),
  _$useHead({
    tag: "script",
    props: {
      src: "/async.js",
      async: true
    }
  })
];
