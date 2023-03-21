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
const _tmpl$ = /*#__PURE__*/ _$template(`<div>Hello `),
  _tmpl$2 = /*#__PURE__*/ _$template(`<button>`),
  _tmpl$3 = /*#__PURE__*/ _$template(`<div><div>`),
  _tmpl$4 = /*#__PURE__*/ _$template(`<div>`),
  _tmpl$5 = /*#__PURE__*/ _$template(`<div><button>`);
import { Show } from "somewhere";
const Child = props => {
  const [s, set] = createSignal();
  return [
    (() => {
      const _el$ = _tmpl$(),
        _el$2 = _el$.firstChild;
      const _ref$ = props.ref;
      typeof _ref$ === "function" ? _$use(_ref$, _el$) : (props.ref = _el$);
      _$insert(_el$, () => props.name, null);
      _$effect(() =>
        _$setAttribute(
          _el$,
          "element",
          (() => {
            const _el$10 = _tmpl$4();
            _$effect(() => _$setAttribute(_el$10, "backgroundcolor", s() ? "red" : "green"));
            return _el$10;
          })()
        )
      );
      return _el$;
    })(),
    (() => {
      const _el$3 = _tmpl$3(),
        _el$4 = _el$3.firstChild;
      _$use(set, _el$4);
      _$insert(_el$4, () => props.children);
      _$insert(
        _el$3,
        _$createComponent(Canvas, {
          get children() {
            return [
              (() => {
                const _el$5 = _$createElement("mesh");
                _$setProp(_el$5, "scale", 2);
                _$setProp(_el$5, "position", [0, 0, 0]);
                _$setProp(
                  _el$5,
                  "geometry",
                  (() => {
                    const _el$11 = _$createElement("boxBufferGeometry");
                    _$setProp(_el$11, "args", [0, 1, 2]);
                    return _el$11;
                  })()
                );
                _$effect(_$p =>
                  _$setProp(
                    _el$5,
                    "material",
                    (() => {
                      const _el$12 = _$createElement("basicMaterial");
                      _$setProp(_el$12, "alpha", 0);
                      _$effect(_$p => _$setProp(_el$12, "color", s() ? "red" : "green", _$p));
                      return _el$12;
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
                      const _el$7 = _tmpl$(),
                        _el$8 = _el$7.firstChild;
                      const _ref$2 = props.ref;
                      typeof _ref$2 === "function" ? _$use(_ref$2, _el$7) : (props.ref = _el$7);
                      _$insert(_el$7, () => props.name, null);
                      _$effect(() =>
                        _$setAttribute(
                          _el$7,
                          "element",
                          (() => {
                            const _el$13 = _tmpl$4();
                            _$effect(() =>
                              _$setAttribute(_el$13, "backgroundcolor", s() ? "red" : "green")
                            );
                            return _el$13;
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
    const _el$14 = _tmpl$4();
    _$insert(
      _el$14,
      (() => {
        const _c$ = _$memo(() => !!props.three);
        return () =>
          _c$()
            ? (() => {
                const _el$15 = _$createElement("mesh"),
                  _el$16 = _$createElement("pointLight");
                _$insertNode(_el$15, _el$16);
                _$setProp(_el$15, "scale", 2);
                _$setProp(_el$15, "position", [0, 0, 0]);
                _$setProp(
                  _el$15,
                  "geometry",
                  (() => {
                    const _el$17 = _$createElement("boxBufferGeometry");
                    _$setProp(_el$17, "args", [0, 1, 2]);
                    return _el$17;
                  })()
                );
                _$effect(_$p =>
                  _$setProp(
                    _el$15,
                    "material",
                    (() => {
                      const _el$18 = _$createElement("basicMaterial");
                      _$setProp(_el$18, "alpha", 0);
                      _$effect(_$p => _$setProp(_el$18, "color", s() ? "red" : "green", _$p));
                      return _el$18;
                    })(),
                    _$p
                  )
                );
                return _el$15;
              })()
            : _tmpl$5();
      })()
    );
    return _el$14;
  })();
};
const Mesh = props => {
  return (() => {
    const _el$20 = _$createElement("group");
    _$spread(_el$20, props, true);
    _$insert2(_el$20, [
      (() => {
        const _el$21 = _$createElement("group");
        _$insert2(_el$21, a ? _$createElement("mesh") : _$createElement("instancedMesh"));
        return _el$21;
      })(),
      _$createComponent(HTML, {
        get children() {
          const _el$22 = _tmpl$4();
          _$spread2(_el$22, props, false, true);
          _$insert(_el$22, b ? _tmpl$4() : _tmpl$2());
          return _el$22;
        }
      })
    ]);
    return _el$20;
  })();
};
