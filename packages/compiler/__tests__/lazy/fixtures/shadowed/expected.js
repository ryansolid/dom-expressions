import { lazy } from "solid-js";
function scope() {
  const lazy = fn => fn;
  return lazy(() => import("./Shadowed"));
}
const D = lazy(() => import("./D"), "__SOLID_LAZY_MODULE__:./D");
export { scope, D };
