---
"@dom-expressions/compiler": patch
---

Align the native JSX compiler's DOM output with babel-plugin-jsx across a set of behavioral gaps found by the new compiler parity suite:

- SVG/MathML partials (e.g. a top-level `<rect>` or `<mrow>`) are now wrapped in their owner tag and compiled with template flag `2`, and templates whose subtree needs `importNode` cloning (custom elements, `is` attributes, lazy-loading `img`/`iframe`) are flagged with `1`. The `xmlns` attribute used to detect the namespace is dropped from serialized templates.
- Hydratable mode now honors `$ServerOnly` and skips templates for `html`/`head`/`body` document shells, resolving `html` children by tag via `getNextMatch`.
- Hydratable dynamic slots adjacent to text now emit `<!$><!/>` marker pairs instead of client-only `<!>` placeholders, positional walks are hoisted ahead of inserts and chain from the previous marker's end node (root-relative paths could land inside SSR'd marker content), and closing tags are no longer omitted before hydration markers.
- `runHydrationEvents()` is emitted once per template root after setup (including for spreads, which may carry delegated handlers) instead of after every delegated event assignment.
- Dynamic `prop:*` attribute values are now wrapped in effects instead of being assigned once, comma/sequence expressions in child positions are treated as dynamic, and the `/*@static*/` marker is respected on inserted child expressions.
