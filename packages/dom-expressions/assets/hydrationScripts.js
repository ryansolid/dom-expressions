`
((h, lookup) => {
  lookup = el =>
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
  h.init = (id, res) => {
    h.r[id] = [new Promise((r, e) => res = r), res];
  }
  h.set = (id, data, res) => {
    res = h.r[id];
    if (res) res[1](data);
    h.r[id] = [data];
  };
  h.unset = (id) => {
    delete h.r[id];
  };
  h.load = (id, res) => {
    res = h.r[id];
    if(res) return res[0];
  }
})(window._$HY || (_$HY = { events: [], completed: new WeakSet(), r: {} }));
`