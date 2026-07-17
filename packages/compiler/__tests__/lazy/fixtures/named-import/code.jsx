import { lazy } from 'solid-js';

const Home = lazy(() => import('./Home'));

export function routes() {
  // Module-scope binding used from a nested scope still matches.
  const About = lazy(() => import('./About'));
  return [Home, About];
}
