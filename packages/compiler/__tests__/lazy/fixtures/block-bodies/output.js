import { lazy } from "solid-js";
const A = lazy(function() {
	return import("./A");
}, "__SOLID_LAZY_MODULE__:./A");
const B = lazy(() => {
	return import("./B");
}, "__SOLID_LAZY_MODULE__:./B");
// Two statements in the body: not a plain thunk, must NOT transform.
const C = lazy(() => {
	console.log("loading");
	return import("./C");
});
export { A, B, C };
