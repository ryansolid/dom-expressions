// unminified source
`(function() {
  window._$HYDRATION = { events: [], completed: new Set() };
  function lookup(el) {
    return el && (el.getAttribute("_hk") || lookup((el.host && el.host instanceof Node) ? el.host : el.parentNode));
  }
  function hydrationEventHandler(e) {
    let node = (e.composedPath && e.composedPath()[0]) || e.target;
    const id = lookup(node);
    if (id && !window._$HYDRATION.completed.has(id)) window._$HYDRATION.events.push([id, e]);
  }
  ["${eventNames.join(
    '","'
  )}"].forEach(name => document.addEventListener(name, hydrationEventHandler));
})();`