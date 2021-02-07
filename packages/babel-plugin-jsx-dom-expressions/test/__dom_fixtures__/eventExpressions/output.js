import { template as _$template } from "r-dom";
import { delegateEvents as _$delegateEvents } from "r-dom";
import { addEventListener as _$addEventListener } from "r-dom";

const _tmpl$ = _$template(
  `<div id="main"><button>Change Bound</button><button>Change Bound</button><button>Change Bound</button><button>Change Bound</button><button>Click Delegated</button><button>Click Delegated</button><button>Click Delegated</button><button>Click Delegated</button><button>Click Listener</button><button>Click Capture</button></div>`,
  22
);

const template = (() => {
  const _el$ = _tmpl$.cloneNode(true),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.nextSibling,
    _el$4 = _el$3.nextSibling,
    _el$5 = _el$4.nextSibling,
    _el$6 = _el$5.nextSibling,
    _el$7 = _el$6.nextSibling,
    _el$8 = _el$7.nextSibling,
    _el$9 = _el$8.nextSibling,
    _el$10 = _el$9.nextSibling,
    _el$11 = _el$10.nextSibling;

  _el$2.addEventListener("change", () => console.log("bound"));

  _el$3.addEventListener("change", e => (id => console.log("bound", id))(id, e));

  _$addEventListener(_el$4, "change", handler);

  _el$5.addEventListener("change", handler);

  _el$6.$$click = () => console.log("delegated");

  _el$7.$$click = id => console.log("delegated", id);

  _el$7.$$clickData = rowId;

  _$addEventListener(_el$8, "click", handler, true);

  _el$9.$$click = handler;

  _el$10.addEventListener("click", () => console.log("listener"));

  _el$10.addEventListener("CAPS-ev", () => console.log("custom"));

  _el$11.addEventListener("camelClick", () => console.log("listener"), true);

  return _el$;
})();

_$delegateEvents(["click"]);
