import { template as _$template } from "r-dom";
import { spread as _$spread2 } from "r-dom";
import { insert as _$insert2 } from "r-custom";
import { spread as _$spread } from "r-custom";
import { insertNode as _$insertNode } from "r-custom";
import { memo as _$memo } from "r-custom";
import { createComponent as _$createComponent } from "r-custom";
import { setProp as _$setProp } from "r-custom";
import { createElement as _$createElement } from "r-custom";
import { setAttribute as _$setAttribute } from "r-dom";
import { effect as _$effect } from "r-custom";
import { insert as _$insert } from "r-dom";
import { use as _$use } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(`<div>Hello `),
  _tmpl$2 = /*#__PURE__*/ _$template(`<button>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<div><div>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$5 = /*#__PURE__*/ _$template(`<div><button>`);
import { Show } from "somewhere";
const Child = props => {
  const [s, set] = createSignal();
  return [
    (() => {
      var _el$ = _tmpl$(),
        _el$2 = _el$.firstChild;
      var _ref$ = props.ref;
      typeof _ref$ === "function" ? _$use(_ref$, _el$) : (props.ref = _el$);
      _$insert(_el$, () => props.name, null);
      _$effect(() =>
        _$setAttribute(
          _el$,
          "element",
          (() => {
            var _el$0 = _tmpl$4();
            _$effect(() => _$setAttribute(_el$0, "backgroundcolor", s() ? "red" : "green"));
            return _el$0;
          })()
        )
      );
      return _el$;
    })(),
    (() => {
      var _el$3 = _tmpl$3(),
        _el$4 = _el$3.firstChild;
      _$use(set, _el$4);
      _$insert(_el$4, () => props.children);
      _$insert(
        _el$3,
        _$createComponent(Canvas, {
          get children() {
            return [
              (() => {
                var _el$5 = _$createElement("mesh");
                _$setProp(_el$5, "scale", 2);
                _$setProp(_el$5, "position", [0, 0, 0]);
                _$setProp(
                  _el$5,
                  "geometry",
                  (() => {
                    var _el$1 = _$createElement("boxBufferGeometry");
                    _$setProp(_el$1, "args", [0, 1, 2]);
                    return _el$1;
                  })()
                );
                _$effect(_$p =>
                  _$setProp(
                    _el$5,
                    "material",
                    (() => {
                      var _el$10 = _$createElement("basicMaterial");
                      _$setProp(_el$10, "alpha", 0);
                      _$effect(_$p => _$setProp(_el$10, "color", s() ? "red" : "green", _$p));
                      return _el$10;
                    })(),
                    _$p
                  )
                );
                return _el$5;
              })(),
              _$createElement("pointLight"),
              _$createComponent(HTML, {
                get children() {
                  return [
                    (() => {
                      var _el$7 = _tmpl$(),
                        _el$8 = _el$7.firstChild;
                      var _ref$2 = props.ref;
                      typeof _ref$2 === "function" ? _$use(_ref$2, _el$7) : (props.ref = _el$7);
                      _$insert(_el$7, () => props.name, null);
                      _$effect(() =>
                        _$setAttribute(
                          _el$7,
                          "element",
                          (() => {
                            var _el$11 = _tmpl$4();
                            _$effect(() =>
                              _$setAttribute(_el$11, "backgroundcolor", s() ? "red" : "green")
                            );
                            return _el$11;
                          })()
                        )
                      );
                      return _el$7;
                    })(),
                    _tmpl$2()
                  ];
                }
              })
            ];
          }
        }),
        null
      );
      return _el$3;
    })()
  ];
};
const Component = props => {
  return (() => {
    var _el$12 = _tmpl$4();
    _$insert(
      _el$12,
      (() => {
        var _c$ = _$memo(() => !!props.three);
        return () =>
          _c$()
            ? (() => {
                var _el$13 = _$createElement("mesh"),
                  _el$14 = _$createElement("pointLight");
                _$insertNode(_el$13, _el$14);
                _$setProp(_el$13, "scale", 2);
                _$setProp(_el$13, "position", [0, 0, 0]);
                _$setProp(
                  _el$13,
                  "geometry",
                  (() => {
                    var _el$15 = _$createElement("boxBufferGeometry");
                    _$setProp(_el$15, "args", [0, 1, 2]);
                    return _el$15;
                  })()
                );
                _$effect(_$p =>
                  _$setProp(
                    _el$13,
                    "material",
                    (() => {
                      var _el$16 = _$createElement("basicMaterial");
                      _$setProp(_el$16, "alpha", 0);
                      _$effect(_$p => _$setProp(_el$16, "color", s() ? "red" : "green", _$p));
                      return _el$16;
                    })(),
                    _$p
                  )
                );
                return _el$13;
              })()
            : _tmpl$5();
      })()
    );
    return _el$12;
  })();
};
const Mesh = props => {
  return (() => {
    var _el$18 = _$createElement("group");
    _$spread(_el$18, props, true);
    _$insert2(_el$18, [
      (() => {
        var _el$19 = _$createElement("group");
        _$insert2(_el$19, a ? _$createElement("mesh") : _$createElement("instancedMesh"));
        return _el$19;
      })(),
      _$createComponent(HTML, {
        get children() {
          var _el$20 = _tmpl$4();
          _$spread2(_el$20, props, false, true);
          _$insert(_el$20, b ? _tmpl$4() : _tmpl$2());
          return _el$20;
        }
      })
    ]);
    return _el$18;
  })();
};
