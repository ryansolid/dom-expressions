import { template as _$template } from "r-dom";
import { delegateEvents as _$delegateEvents } from "r-dom";
import { getNextElement as _$getNextElement } from "r-dom";
import { runHydrationEvents as _$runHydrationEvents } from "r-dom";
import { addEventListener as _$addEventListener } from "r-dom";
var _tmpl$ = /*#__PURE__*/ _$template(
  `<div id=main><button>Change Bound</button><button>Change Bound</button><button>Click Delegated</button><button>Click Delegated</button><button>Click Listener</button><button>Click Capture`
);
function hoistedCustomEvent1() {
  console.log("hoisted");
}
const hoistedcustomevent2 = () => console.log("hoisted");
const template = (() => {
  var _el$ = _$getNextElement(_tmpl$),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.nextSibling,
    _el$4 = _el$3.nextSibling,
    _el$5 = _el$4.nextSibling,
    _el$6 = _el$5.nextSibling,
    _el$7 = _el$6.nextSibling;
  _el$2.addEventListener("change", () => console.log("bound"));
  _el$3.addEventListener("change", e => (id => console.log("bound", id))(id, e));
  _el$4.$$click = () => console.log("delegated");
  _el$5.$$click = id => console.log("delegated", id);
  _el$5.$$clickData = rowId;
  _$addEventListener(_el$6, "inlined-to-hoisted2", {
    handleEvent: hoistedcustomevent2
  });
  _$addEventListener(_el$6, "inlined-to-hoisted1", {
    handleEvent: hoistedCustomEvent1
  });
  _$addEventListener(_el$6, "inlined-with-options", {
    handleEvent: () => console.log("listener"),
    once: false
  });
  _$addEventListener(_el$6, "inlined", () => console.log("listener"));
  _$addEventListener(_el$6, "hoisted-custom-event2", hoistedCustomEvent2);
  _$addEventListener(_el$6, "hoisted-custom-event1", hoistedCustomEvent1);
  _$addEventListener(_el$6, "CAPS-ev2", () => console.log("custom"));
  _$addEventListener(_el$6, "click", () => console.log("listener"));
  _el$7.addEventListener("camelClick", () => console.log("listener"), true);
  _$runHydrationEvents();
  return _el$;
})();
_$delegateEvents(["click"]);
