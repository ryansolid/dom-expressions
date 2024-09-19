import { ssr as _$ssr } from "r-server";
import { NoHydration as _$NoHydration } from "r-server";
import { escape as _$escape } from "r-server";
import { createComponent as _$createComponent } from "r-server";
import { useHead as _$useHead } from "r-server";
var _tmpl$ = ["<head>", "", "", "", "", "</head>"],
  _tmpl$2 = [
    "<html>",
    "<body><header><h1>Welcome to the Jungle</h1></header>",
    "<footer>The Bottom</footer></body></html>"
  ],
  _tmpl$3 = [
    "<body><header><h1>Welcome to the Jungle</h1></header>",
    "<footer>The Bottom</footer></body>"
  ],
  _tmpl$4 = ["<html>", "", "</html>"],
  _tmpl$5 = [
    "<div>",
    "",
    "",
    "",
    '<style>div { background-color: red }</style><meta name="description" itemprop="section"><script>console.log("hi")</script><script src="/script.js"></script>',
    "</div>"
  ],
  _tmpl$6 = "<style>div { background-color: red }</style>",
  _tmpl$7 = '<meta name="description" itemprop="section">',
  _tmpl$8 = '<script>console.log("hi")</script>',
  _tmpl$9 = '<script src="/script.js"></script>';
const template = _$ssr(
  _tmpl$2,
  _$createComponent(_$NoHydration, {
    get children() {
      return _$ssr(
        _tmpl$,
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
        _$useHead({
          tag: "link",
          props: {
            rel: "stylesheet",
            href: "/styles.css"
          }
        }),
        _$escape(_$createComponent(Assets, {}))
      );
    }
  }),
  _$escape(_$createComponent(App, {}))
);
const templateHead = _$ssr(
  _tmpl$,
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
  _$useHead({
    tag: "link",
    props: {
      rel: "stylesheet",
      href: "/styles.css"
    }
  }),
  _$escape(_$createComponent(Assets, {}))
);
const templateBody = _$ssr(_tmpl$3, _$escape(_$createComponent(App, {})));
const templateEmptied = _$ssr(
  _tmpl$4,
  _$escape(_$createComponent(Head, {})),
  _$escape(_$createComponent(Body, {}))
);
const notInHead = _$ssr(
  _tmpl$5,
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
    : _$escape(null),
  _$useHead({
    tag: "script",
    props: {
      src: "/async.js",
      async: true
    }
  })
);
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
      someCondition
        ? _$useHead({
            tag: "link",
            props: {
              rel: "stylesheet",
              href: "/styles.css"
            }
          })
        : null,
      _$ssr(_tmpl$6),
      _$ssr(_tmpl$7),
      _$ssr(_tmpl$8),
      _$ssr(_tmpl$9),
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
  _$ssr(_tmpl$6),
  _$ssr(_tmpl$7),
  _$ssr(_tmpl$8),
  _$ssr(_tmpl$9)
];
