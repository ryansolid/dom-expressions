// event
`const h = _$HYDRATION = { events: [], completed: new WeakSet() };
const lookup = (el) => {
  return el && el.hasAttribute && (el.hasAttribute("data-hk") && el || lookup((el.host && el.host instanceof Node) ? el.host : el.parentNode));
}
const hydrationEventHandler = (e) => {
  let node = (e.composedPath && e.composedPath()[0]) || e.target,
    el = lookup(node);
  if (el && !h.completed.has(el)) h.events.push([el, e]);
}
["${eventNames.join(
  '","'
)}"].forEach(name => document.addEventListener(name, hydrationEventHandler));`;

// streaming
`const h = _$HYDRATION;
const resources = {};
h.resolveResource = (id, data) => {
  const r = resources[id];
  if(!r) return resources[id] = data;
  delete resources[id];
  r(data);
};
h.loadResource = (id) => {
  const r = resources[id];
  if(!r) {
    let r,
      p = new Promise(res => r = res);
    resources[id] = r;
    return p;
  }
  delete resources[id];
  return Promise.resolve(r);
}`