import { template as _$template } from "r-dom";
import { delegateEvents as _$delegateEvents } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { runHydrationEvents as _$runHydrationEvents } from "r-dom";

const _tmpl$ = _$template(
  `<div id="main"><button>Change Bound</button><button>Change Bound</button><button>Click Delegated</button><button>Click Delegated</button><button>Click Listener</button><button>Click Capture</button></div>`
);

const template = (function() {
  const _el$ = _$getNextElement(_tmpl$),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.nextSibling,
    _el$4 = _el$3.nextSibling,
    _el$5 = _el$4.nextSibling,
    _el$6 = _el$5.nextSibling,
    _el$7 = _el$6.nextSibling;

  _el$2.onchange = () => console.log("bound");

  _el$3.onchange = () => console.log("bound");

  _el$4.__click = () => console.log("delegated");

  _el$5.__click = () => console.log("delegated");

  _el$6.addEventListener("click", () => console.log("listener"));

  _el$6.addEventListener("CAPS-ev", () => console.log("custom"));

  _el$7.addEventListener("camelClick", () => console.log("listener"), true);

  _$runHydrationEvents(_el$.getAttribute("_hk"));

  return _el$;
})();

_$delegateEvents(["click"]);
