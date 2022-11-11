`
((h) => {
  let lookup = el =>
    el &&
    el.hasAttribute &&
    (el.hasAttribute("data-hk") ? el :
      lookup(el.host && el.host instanceof Node ? el.host : el.parentNode));
  ["${eventNames.join('", "')}"].forEach(name =>
    document.addEventListener(name, e => {
      let node = (e.composedPath && e.composedPath()[0]) || e.target,
        el = lookup(node);
      if (el && !h.completed.has(el)) h.events.push([el, e]);
    })
  );
})(window._$HY || (_$HY = {
  events: [],
  completed: new WeakSet(),
  r: {},
  fe() {},
  init(id, res) {
    _$HY.r[id] = [new Promise((r) => res = r), res];
  },
  set(id, data, res) {
    res = _$HY.r[id];
    if (res) res[1](data);
    _$HY.r[id] = [data];
  },
  unset(id) {
    delete _$HY.r[id];
  },
  load: (id) => _$HY.r[id]
}));
`