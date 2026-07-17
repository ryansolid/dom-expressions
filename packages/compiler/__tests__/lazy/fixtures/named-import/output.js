import { lazy } from "solid-js";
const Home = lazy(() => import("./Home"), "__SOLID_LAZY_MODULE__:./Home");
export function routes() {
	// Module-scope binding used from a nested scope still matches.
	const About = lazy(() => import("./About"), "__SOLID_LAZY_MODULE__:./About");
	return [Home, About];
}
