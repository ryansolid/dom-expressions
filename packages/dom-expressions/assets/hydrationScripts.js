`
window._$HY || ((h) => {
  let lookup = el =>
    el &&
    el.hasAttribute &&
    (el.hasAttribute("data-hk") ? el :
      lookup(el.host && el.host.nodeType ? el.host : el.parentNode));
  ["${eventNames.join('", "')}"].forEach(name =>
    document.addEventListener(name, e => {
      if (!h.events) return;
      let el = lookup((e.composedPath && e.composedPath()[0]) || e.target);
      if (el && !h.completed.has(el)) h.events.push([el, e]);
    })
  );
})(_$HY = {
  events: [],
  completed: new WeakSet(),
  r: {},
  fe() {}
});
`