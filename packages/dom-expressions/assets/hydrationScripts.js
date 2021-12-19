`
((h, lookup, resources={}) => {
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
  h.init = (id, res, rej) => {
    resources[id] = [new Promise((r, e) => (res = r, rej = e)), res, rej]
  }
  h.set = (id, data, err, res) => {
    res = resources[id];
    if (res) err ? res[2](err) : res[1](data);
    resources[id] = [data]
  };
  h.unset = (id) => {
    delete resources[id];
  };
  h.load = (id, res) => {
    res = resources[id];
    if(res) return res[0];
  }
})(window._$HY || (_$HY = { events: [], completed: new WeakSet() }));
`