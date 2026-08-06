# RFC: Head Management (`useHead`)

> **Status: draft for review.** Supersedes the design direction of
> [solid#2294 (RFC - Metadata & JSX Head Tags)](https://github.com/solidjs/solid/discussions/2294)
> (Sep 2024). Written against the `next` branch. Nothing here is implemented;
> this document exists to pressure-test the design before code.

## Summary

A head-management primitive in `dom-expressions` core: a `useHead` registry
that collects head tags reactively, renders them into `<head>` at first SSR
flush, streams diff patches for tags that arrive after the shell, and keeps
the document head in sync on the client. Core ships **only the
primitive** — no component surface. The application authoring surface is
**Solid Meta 2.0**: a thin set of components (`Title`, `Meta`, `Link`,
`Style`, `Script`, `Base`, and a `Head` group) over `useHead`, whose
semantics are specified here because they are also what the deferred
compile-time JSX path — native `<title>`/`<meta>`/`<link>` tags and a
nested `<head>` element — lowers to if it ever ships. Every hard question
the JSX path raises gates only that sugar.

Three ideas distinguish this from the 2024 RFC and from prior art:

1. **Two tag classes with different streaming semantics.** Replaceable
   metadata (title, meta, canonical) resolves at its suspense boundary's
   flush and patches the head *together with that boundary's reveal*;
   resource tags (preload, stylesheets) skip resolution and stream
   eagerly, because their value is earliness. No prior art makes this
   split, and it is what makes streaming head management coherent.
2. **Grouping is always explicit.** Single tags are groups of one; the
   `Head` component (and, in the deferred JSX tier, the nested `<head>`
   element) is the only multi-tag group boundary. There is no implicit
   adjacency/lexical grouping to silently break under refactoring.
3. **Resolution is deliberately simple: last committed group wins**, per
   identity, with explicit `key`s for cross-cutting control and a hard
   singleton stack for `title`. Server/client agreement comes from the
   bootstrap queue preserving the server's commit order — hydration never
   flickers head state. A more ambitious owner-tree positional model was
   designed and deliberately deferred (see
   [Alternatives considered](#alternatives-considered-tree-position-resolution)).

The mechanism lives in `dom-expressions` (which owns the stream, document
assembly, hydration, and both compilers); opinionated policy layers
(Solid Meta, router-level metadata APIs, unhead adapters) build on top.

## Background

### Why now

The original RFC targeted `solid-js/web`. Since then:

- **React 19 shipped** metadata hoisting: bare `<title>`/`<meta>`/`<link>`
  render anywhere and hoist to head, `itemProp` opts out, link/style/script
  dedupe by href/src with a `precedence` prop, and Suspense boundaries can
  hold for stylesheet loads. Titles do not dedupe, and the recurring
  production complaint is exactly that: route-level title overrides still
  need a helmet-alike. Mechanism-without-policy held up; no-dedupe-at-all
  did not.
- **Unhead v3 shipped streaming** (Nuxt 4.5): a synchronous side-effect-free
  render engine, inline `<script>` DOM patches injected between suspense
  chunks, and a `window.__unhead__` bootstrap queue that collects streamed
  patches before the client bundle loads so nothing is lost regardless of
  timing. This validates the streaming architecture the 2024 RFC proposed
  as unexplored territory, and contributes one design improvement we adopt
  (the bootstrap queue).
- **The `next` branch built most of the hard infrastructure** without
  labeling it as head management — see
  [Existing infrastructure](#existing-infrastructure-this-builds-on).

### Problems with `useAssets` (unchanged from 2024)

- Deferred until flush; surprising evaluation timing.
- No client counterpart (`voidFn` in `client.js`) — libraries reimplement
  the client half.
- First flush only — tags registered inside a Suspense boundary after the
  shell flushed never reach the document until that boundary hydrates,
  producing the hydrate-time correction races (title revert/redo under
  lazy-loading latency) described in the original RFC.

### The dedupe research, revisited

The 2024 RFC's survey found that **grouped** solutions (Next, Remix, React
Helmet) dedupe well without explicit keys, because groups provide a layered
precedence (deeper layer wins) and a set boundary (a group's tags replace a
shallower group's matching set wholesale). Ungrouped last-render-wins
solutions are fundamentally order-fragile: anything rendered anywhere,
whenever it happens to execute, wins.

The apparent dilemma: grouped shapes have better behavior, but the
element-shaped JSX authoring model everyone wants (proven by React 19) is
inherently per-tag. This RFC's position is that the dilemma is false for
this architecture:

- Grouping-as-set-boundary must be **explicit** to be robust, and the
  least clunky explicit spelling is the `<head>` element itself. This RFC
  adopts that fully.
- Grouping-as-precedence is a proxy for **hierarchy**. We explored
  deriving hierarchy from the owner tree (depth or preorder position) and
  **deferred it**: owner structure is an implementation artifact, not a
  measure of metadata specificity, and it would have been the proposal's
  most novel, least-proven feature. Phase 1 resolution is last committed
  group wins, with hierarchy remaining available to policy layers
  (route-aware layering in Solid Meta or routers). See
  [Alternatives considered](#alternatives-considered-tree-position-resolution).

## Goals

- Streaming-correct head management usable by any policy layer.
- Server/client-convergent resolution: hydration never flickers head
  state, regardless of chunk and patch timing.
- Core ships the primitive only; no intermediate component surface in
  core that a later JSX transform would supersede (public surfaces are
  forever). Components live in Solid Meta 2.0; native-JSX authoring
  (`<title>` not `<Title>`) is the deferred path that would eventually
  deprecate it.
- Small client runtime. Honest revision of the 2024 RFC's ~500B estimate:
  with group set-replacement and hydration adoption the realistic target
  is **~1.5KB minified / under 1KB gzipped**, and zero for apps that
  never import `useHead` (see [Client footprint](#client-footprint)).
- Replace `useAssets` as the public head-injection surface before `0.50.0`
  stable, while the prerelease window allows contract changes.

## Non-goals

- `htmlAttrs` / `bodyAttrs` management (unhead supports these; out of scope
  here, policy layers can address).
- `noscript` in the head (unhead supports it). Its value is raw nested
  markup (`<link>`/`<style>`/`<meta>` fallbacks), which conflicts with the
  always-escape/`textContent` body model — supporting it would mean shipping
  unescaped HTML through markup emission, patch payloads, and client apply.
  And a JS-executing registry can never make a `noscript` take effect, so it
  is inherently static shell content: author it directly in the document
  template. Reactive/streamed `noscript` is an oxymoron by definition.
- Title templates, SEO schema helpers, social-tag presets — policy layer.
- A `precedence`-style manual priority attribute (possible future
  addition; explicit `key`s plus group commit order cover phase 1, and
  route-aware layering belongs to policy layers).
- Making streamed meta corrections meaningful to search crawlers. First
  flush should be best-effort correct (blocking via existing `deferStream`
  mechanisms remains available); streaming patches are progressive
  enhancement for users, not for bots. This limitation is inherent to
  streaming anything and applies equally to all prior art.

## Design

### The registry and resolution model

Every registration carries:

- **tags**: one or more `{ tag, props }` descriptors (the array is the
  group — see below).
- **commit order**: a monotonically increasing sequence assigned when the
  registration's flush boundary commits. On the server this is boundary
  flush order (shell first, then fragments as they complete). On the
  client it is registration order. During hydration the client does not
  invent an order: it **adopts the server's** — first-flush tags plus the
  bootstrap queue replay the server's exact commit sequence, and
  post-hydration registrations append after it. Convergence is
  bookkeeping, not a structural assumption.
- **identity** (per tag): a built-in dedupe identity, overridable with an
  explicit `key`:

| Tag | Class | Default identity |
| --- | --- | --- |
| `title` | replaceable | hard singleton (`key` cannot fork it — see below) |
| `base` | replaceable, shell-only | singleton |
| `meta[charset]` | replaceable, shell-only | singleton |
| `meta` | replaceable | `name` \| `property` \| `http-equiv`, qualified by `media` where present |
| `link` (canonical, alternate, …) | replaceable | `rel` + `href` |
| `link` (icon, apple-touch-icon) | replaceable | `rel` + `sizes` + `type` — deliberately **excluding** `href`, so a swapped icon (per-route favicons, notification badges) replaces its predecessor while size/type variants coexist |
| `link` (preload, modulepreload, prefetch, preconnect, dns-prefetch, stylesheet) | resource | `rel` + URL + qualifying attrs (`as`, `crossorigin`, `type`, `media`, `imagesrcset`/`imagesizes` where present) |
| `style[href]` | resource | `href` + qualifying attrs |
| `script[src]` | resource | `src` + qualifying attrs |
| `style` / `script` (inline body, API-only) | replaceable | explicit `key`, else unique per registration (append) |

Resource identities include qualifying attributes because URL alone is
not sufficient — the same `href` preloaded `as="image"` and `as="fetch"`
are different resource requests, and `crossorigin` changes cacheability.
Whatever identity scheme the existing asset registry uses is the one to
share; resource tags must not maintain a second notion of "same asset."

### Two tag classes: replaceable vs. resource

Tags split into two classes with different streaming semantics, because
they answer different questions:

- **Replaceable tags** answer "which one wins." Identity resolution,
  diffing, and streamed patches (below) apply. Arrival timing is
  cosmetic; correctness is what matters.
- **Resource tags** answer "how early can the browser start fetching."
  Identity dedupe by URL is sufficient — the same `href` *is* the same
  resource, so there is no override question and position is
  meaningless. What matters is earliness, so on the server they are
  **eager and append-only**: written into the stream at the next flush
  opportunity the moment they register, in arrival order, never replaced
  or retracted. A preload that only reached the browser as a patch when
  its suspense boundary completed would be useless — the content needing
  the resource has already arrived. (This mirrors React 19's model, which
  is correct for exactly this class.)

Resource-tag integration requirements:

- The existing boundary-scoped **asset tracking** (manifest-driven
  stylesheet/modulepreload emission via `registerAsset`/`sink.asset`)
  remains the primary mechanism for bundler-known assets and already
  implements the eager path. `useHead` resource tags cover the
  user-authored cases (hero-image preloads, font hints declared in JSX)
  and must **share one identity set** with it, so a user-authored preload
  never duplicates a manifest-emitted link for the same URL.
- A user-authored `rel=stylesheet` arriving with a streamed fragment
  should participate in the existing style-gated reveal (`$dfs`/`$dfc`),
  same as tracked boundary CSS. The gating rule is by what the sheet's
  attributes *mean*: fetch metadata (`crossorigin`, `integrity`,
  `referrerpolicy`, `fetchpriority`) doesn't change render-criticality,
  so those sheets gate with their attributes intact; condition-changing
  attributes (`media`, `title`/alternate, `disabled`) exclude a sheet
  from gating — a `media` sheet still fetches (at low priority) and
  fires `load` even when its query doesn't match, so gating a reveal on
  it would hold content hostage to a fetch that may never apply.
- On the client, resource tags apply immediately at registration
  (identity-deduped against server-emitted links); disposal does not
  remove preload/preconnect hints (pointless churn), but may remove
  stylesheets (visible effect, follows the owner like tracked boundary
  CSS does).
- The eager, append-only, identity-keyed class is also the natural feed
  for **103 Early Hints** — future work, not scope, but the split keeps
  it possible.

Resolution, for each **replaceable** identity:

1. Collect all live registrations containing tags with that identity.
2. **The latest-committed group wins.**
3. The winning group's tags with that identity all render (this is how
   multiple `og:image` within one group coexist); every other group's tags
   with that identity are suppressed (set replacement).
4. Disposal removes a registration and re-resolves: the previous
   committed group with that identity is restored. Commit order makes
   this naturally stack-like.

This is deliberately the simple, proven model — unhead-style last-wins
with explicit `key`s — rather than the owner-tree positional model this
RFC previously proposed (see
[Alternatives considered](#alternatives-considered-tree-position-resolution)).
What matters is that the *common* streaming and hydration hazards are
handled by the transport, not the comparator:

- The lazy-page-vs-shell title case works because the page's boundary
  commits *after* the shell — last-committed wins gives the right answer
  without any tree analysis.
- The hydrate-time "shell takes back the title" race is prevented by
  commit-order adoption: the client replays the server's sequence from
  the bootstrap queue instead of re-deriving order from its own render
  timing, so hydration cannot reorder winners.
- The remaining known trade-off is real and documented: a shallow widget
  whose boundary happens to commit after the page wins. Every shipping
  everywhere-solution has this property; `key`s and route-aware layering
  in policy layers are the tools when it matters.

#### `title`: hard singleton with stack semantics

`title` is more special than a default identity row can express, and the
special-casing is small enough to belong in core:

- Every title registration shares one intrinsic identity; **`key` cannot
  create multiple titles.**
- The winning registration sets `document.title`; disposing it restores
  the previous one (commit order acts as the stack).
- Multiple titles within one group: dev warning; last in the group wins.
- SSR emits only the winner; late boundaries patch the singleton.
- A static `<title>` in the document shell is the fallback: it is
  restored when no registrations remain.
- Title templates (`"%s — Site"`) are Solid Meta policy, not core.

### `useHead`

```ts
type HeadTag = {
  tag: "title" | "meta" | "link" | "style" | "script" | "base";
  props: Record<string, any>; // getters allowed; evaluated lazily/reactively
  key?: string;               // explicit identity override
};

function useHead(tag: HeadTag | HeadTag[] | (() => HeadTag | HeadTag[])): void;
```

- Registers under the current owner; disposed with it.
- **An array is a group** — its tags form one replacement set. A single tag
  is a group of one. There is no other grouping mechanism at the API level.
- **A function is a reactive group**: membership is re-read in the tracking
  scope on the client, and resolved at the owning boundary's flush on the
  server. This is what component-level grouping (Solid Meta's `<Head>`)
  builds on — the group registers before its members exist and composes its
  list as children render. Membership changes keep the registration's
  original commit position, same as prop updates. Resource tags inside a
  function-form group emit at that flush rather than eagerly (late
  membership trades away earliness), and keyless inline `style`/`script`
  in a dynamic group should carry explicit `key`s (the unique fallback is
  slot-indexed and can swap identities when membership shifts).
- `props` values may be getters, making tags reactive; `key` may also be a
  getter (reactive identity, as in the 2024 RFC).
- **Getters must be plain reads — they must not allocate reactive owners.**
  Getters evaluate at different owner positions on the two sides: the
  client evaluates them inside registry-owned computations (whose id-owner
  chain resolves to the registering component), the server at flush time
  under no component owner at all. A getter that creates an id-consuming
  computation — `createMemo`, solid's `children()` helper, anything that
  calls `getNextChildId` — therefore consumes a hydration id slot on the
  client that the server never consumed, and every id allocated after the
  `useHead` call desyncs (observed downstream as a `<Title>` hydration
  error in the meta layer). Owner-allocating work belongs at component
  position, eagerly, on both sides — e.g.
  `const body = createMemo(() => flattenChildren(props.children))` in the
  component body, then `props: { children: () => body() }` — which
  allocates identically in the server and client render and leaves the
  getter as a pure read.
- Lazy evaluation at flush/apply time is a contract: this is the migration
  path for CSS-in-JS collectors that today rely on `useAssets`'
  deferred-closure semantics
  (`useHead({ tag: "style", props: { children: () => collectedCss } })`),
  and it gains streaming updates for late-collected styles, which
  `useAssets` never had.
- **Inline bodies are supported at the API level** (unlike the JSX
  transform): `style` text children for CSS collectors, and `script` text
  children because JSON-LD structured data
  (`<script type="application/ld+json">`) is a first-class head use case
  every metadata library must express. Content rides the same
  escaped/validated patch channel as everything else (including
  `</script>`-sequence escaping for inline scripts).
- Intended primarily for library authors (routers, collectors, policy
  layers). Application authors use Solid Meta 2.0's components (or,
  eventually, native JSX tags if stage 3 ships).

### Head components: Solid Meta 2.0 (not core)

The application authoring surface is a small, tree-shakable set of
components over `useHead`, each a few lines — living in **Solid Meta**,
deliberately not in core. Core's public surface is permanent; shipping a
component tier that the stage-3 JSX transform would supersede means
carrying two authoring surfaces forever. The component semantics are
specified here regardless, because they define what the JSX transform
lowers to:

```jsx
<Title>{product().name}</Title>
<Meta name="description" content={desc()} />
<Link rel="canonical" href={url()} />

<Head>
  <Title>{product().name}</Title>
  <Meta property="og:image" content={product().image} />
  <Meta property="og:image" content={product().altImage} />
</Head>
```

- `Title`, `Meta`, `Link`, `Style`, `Script`, `Base` each register a
  single-tag group. `Head` is the explicit multi-tag group: it establishes
  the group scope via context, so any registration during evaluation of
  its children — including inside component calls (`<MyMeta />` ≡
  `MyMeta()`) — joins the group. Dynamic extent is not a novel contract
  here; it is ordinary component/context behavior.
- A `Head` inside another `Head`'s extent forms its **own independent
  group** (it provides its own context unconditionally). Nesting is not a
  feature — it happens emergently when a component with an internal `Head`
  is used inside a caller's group, and own-group semantics keep that
  component's replacement set stable regardless of call site. A component
  that wants to contribute tags *into* the caller's set renders bare tag
  components instead; the two intents have distinct spellings. (No dev
  warning on nesting: lexical and composed nesting are indistinguishable
  at runtime, so a warning would flag legitimate composition.)
- Every semantic that was hard to specify for a compile-time transform is
  native component behavior: registration on evaluation under the
  evaluating owner, lifetime following the owner, laziness through
  children props, spreads handled at runtime, no SVG-`<title>` ambiguity
  (nothing to confuse), no `itemprop` exception needed.
- **This is Solid Meta 2.0**: same component names and mental model as
  today's Solid Meta, minus the provider (the registry is ambient), plus
  streaming/hydration correctness — its internals collapse to a thin
  wrapper (~100 lines) over `useHead`. Solid Meta's eventual deprecation
  rides on the stage-3 JSX transform; until/unless that ships, it
  persists as this wrapper, a maintenance footnote rather than a design
  liability.

### JSX authoring (deferred): native tags as sugar

This section specifies the compile-time path so its semantics are pinned,
but it is **deferred** (stage 3, possibly indefinitely): the transform is
defined as *lowering native tags to the head components* — `<title>` means
`<Title>`, nested `<head>` means `<Head>` — so it adds authoring
convenience (no imports, React 19-style bare tags), not capability. All of
its open questions (SVG `<title>` ancestry, `itemprop`, spread bail-outs,
the compiler flag, dual-compiler parity cost) gate only this sugar, and
the decision whether it is worth taking on can be made later with usage
data from the components.

**Tier 1 — loose tags, groups of one.** Native `<title>`, `<meta>`,
`<link>`, `<style href>`, `<script src async>` anywhere in the tree compile
to single-tag `useHead` calls. This is the React 19 authoring model and
covers the common cases (title as singleton, description by name). Because
each loose tag is its own group, **no refactor can break a group of one** —
adjacency carries no meaning whatsoever.

Compile-time exceptions (loose tags only):

- `itemprop` attribute present → not head metadata; leave in place.
- `<title>` with a known-SVG ancestor in the same JSX expression → SVG
  title; leave in place. (Cross-expression SVG ancestry is not statically
  knowable; the escape hatch is that `<title>` inside an SVG subtree
  authored separately can suppress the transform with `itemprop`-style
  opt-out or the compiler flag. Flagged as an open question below.)
- Spread attributes → bail; the defining attributes are not statically
  knowable. Runtime does not attempt detection.
- Inline bodies are never hoisted: `<style>` without `href` and `<script>`
  without `src` render in place (matching React 19, which hoists `<style>`
  only with `href`+`precedence` and `<script>` only with `async src`).
  People deliberately render inline style/script tags in the body; the
  transform must not move them. Inline content in the head goes through
  the `useHead` API (below).

**Expression-position semantics.** JSX elements are expressions — stored
in variables, passed as children props, returned from ternaries, produced
in `map` callbacks. The transform therefore emits an expression that
**registers on evaluation**, under the evaluating owner, and renders
nothing in place (on both server and client — no hydration mismatch).
Because children props are lazily evaluated getters, a `<title>` passed as
children registers when (and only if) the receiving component actually
evaluates it, and its lifetime follows that owner. This is the
compile-time analogue of React's render-time hoisting, with Solid's
laziness supplying the conditionality.

**Tier 2 — nested `<head>`, the explicit group.** A `<head>` element
anywhere in the tree compiles to one grouped `useHead` call containing its
children. This is the *only* multi-tag group boundary:

```jsx
function ProductPage(props) {
  return (
    <>
      <head>
        <title>{props.product.name}</title>
        <meta property="og:image" content={props.product.image} />
        <meta property="og:image" content={props.product.altImage} />
      </head>
      <article>…</article>
    </>
  );
}
```

Both `og:image` tags coexist (same group); together they replace any
earlier-committed `og:image` set from another `<head>` or loose tags. The
boundary is visible in source and travels with the markup when extracted
into another function — the styled-jsx failure mode (invisible lexical
semantics broken by refactoring) cannot occur because implicit multi-tag
grouping does not exist.

Additional properties of the explicit boundary:

- **Group membership is dynamic extent, not lexical.** The `<head>` group
  establishes a scope; any registration that occurs during evaluation of
  its children — including inside component calls — joins the group. In
  Solid, `<MyMeta />` *is* `MyMeta()`, so a lexical-only boundary would
  make extracting tags into a component silently change group semantics;
  dynamic extent keeps composition transparent, the same way context
  flows. The compiler lowering native children directly to tag
  descriptors is a fast path, not the semantics. Group contents may grow
  as lazy/async members evaluate; late members trigger re-resolution like
  any other registration.
- Inside `<head>`, none of the loose-tag detection hedges apply: no SVG
  ambiguity, no itemprop question, and **spreads and dynamic children are
  permitted** because the wrapper declares intent.
- Validation is two-layer, because there is no cross-file analysis.
  Compile time catches only what is lexically visible: a non-head-eligible
  *native* element written directly inside `<head>` is a compile error.
  Components, spreads, and `{expression}` children are permitted and only
  checkable at runtime: values produced during the group's evaluation that
  are not head registrations (e.g. a component that returns a `<div>`) are
  **discarded** — the nested `<head>` renders nothing in place, so there
  is nowhere for them to go — with a dev-mode warning (`_DX_DEV_`).
  Deliberately unlike browsers, which relocate invalid head content into
  the body: silent relocation would be far more confusing than a warning.

**The document head is the root group.** In document-shell JSX
(`<html><head>…`), the head under `<html>` is both the physical mount
point and the first-committed group. App-shell defaults (viewport,
fallback title) are ordinary registrations that anything committing later
overrides. One concept from document shell to leaf; no special-cased
"real head" code path in the authoring model.

Until stage 3, the equivalent is authored, not transformed: app-shell
defaults that should be overridable go in the root component as Solid Meta
components or direct `useHead` calls (first-committed registrations); markup
written statically in the
document template stays entirely outside the registry — never touched
(ownership marking protects it), and never overridden. Guidance: author
statically only what nothing should override (charset, viewport); a
static `<title>` alongside a registered `Title` would yield duplicate
elements, which the client warns about in dev.

### SSR

**The model in one rule.** The server renders once. Every registration
belongs to a *flush boundary* — the shell, or its nearest enclosing
suspense fragment. Every boundary flush does the same three things:

1. **evaluate** the registrations that belong to it (props getters run
   here, once),
2. **resolve** (commit the boundary's groups and re-run identity
   resolution against everything committed so far),
3. **write** — for the shell, splice the winning tags into `<head>`; for
   any later boundary, emit diff ops as a `<script>` batched with that
   fragment's activation.

Resource-class tags are the single exception: they skip resolution and
write eagerly at registration, because their value is earliness.
Everything below is placement detail under this rule; the moving parts
(task pipeline, fragment batching, style gates, document splice) are the
existing streaming machinery — the new server logic is the registry, the
evaluate-at-boundary-flush rule, and the diff.

| Moment | Replaceable tags | Resource tags |
| --- | --- | --- |
| Registration (during render) | Recorded; getters **not** evaluated | Evaluated, identity-deduped, written at next flush opportunity |
| Shell flush | Evaluate + resolve + splice into `<head>` (charset/base into the prelude) | Already emitted, or emitted with the shell head |
| Fragment flush | Evaluate + resolve + diff vs. flushed state; ops batched with that fragment's `$df`, riding its style gate | — |
| After emission | Never re-evaluated; server signal changes emit nothing | Never retracted |
| Stream end / cancel | Patch emission stops with the stream | — |

**Worked trace.** A store: the document shell has a static charset and a
root `<Title>Store</Title>`; a suspense-wrapped product page contains a
`<Head>` group (product `Title`, two `og:image` `Meta`s) and a hero-image
`<link rel="preload">`.

1. Render pass: everything registers. The preload — resource class —
   is evaluated immediately and written with the shell even though its
   boundary is still pending; that is the point of the class split.
2. Shell flush: registry evaluates and resolves shell-boundary
   registrations. "Store" wins title (nothing else has committed);
   charset rides the prelude. Snapshot retained.
3. The product boundary completes: its registrations evaluate *now*
   (collection window closed) and commit, resolution re-runs — the
   product title wins as the later-committed group, the og:image group
   replaces nothing (no earlier set) — and the diff (retitle + two
   metas) is emitted in the same script batch as the fragment's `$df`,
   gated with its reveal. Title and content change together; a slow
   chunk can never retitle early or late.

The reference details follow.

**First flush.** `useHead` registrations accumulate in
`sharedConfig.context` (alongside the existing `assets`, `serialize`,
`registerAsset` machinery). At shell assembly, the registry resolves and
renders winning tags before `</head>` via the existing single-pass
`assembleDocument` splice, ordered by category: `link`/`style`, `meta`,
others, `script` — merged with (eventually unified with) the existing
emitted-asset link injection. The flushed resolution snapshot is retained.

**Head prelude.** `meta[charset]` and `base` have hard placement
constraints (charset within the first 1024 bytes; base before anything
that consumes URLs), which splicing before `</head>` cannot guarantee.
These two identities splice at an additional insertion point immediately
after the `<head>` open tag — `assembleDocument` is already a single-pass
multi-marker splice, so this is one more marker, not a new mechanism.
Both are **shell-only**: registrations arriving after shell flush are
ignored with a dev warning, and neither is reactive or stream-patchable —
a charset that changes mid-stream or a base that changes after relative
URLs resolved is incoherent by definition. Recommendation remains to
author charset statically in the document shell; the prelude is the
correctness backstop.

**Evaluation timing (render-once model).** The server renders once; there
is no re-render at flush. The two moments are therefore *registration*
(during render) and *flush of the registration's nearest enclosing flush
boundary* — the shell for pre-shell registrations, the owning suspense
fragment for post-shell ones (boundary membership is tracked the same way
the boundary-scoped asset tracking already scopes CSS/JS to fragments).
Replaceable-tag props getters evaluate at **boundary flush**, exactly
once. This point is forced, not chosen: a deferred getter's collection
window is its boundary's render — evaluating at registration would miss
values collected later in the same subtree (breaking the CSS-collector
pattern), and any later point is arbitrary. Getters are never
re-evaluated: server-side signal changes after a boundary flushes do not
produce patches; only new registrations do. Tags suppressed by resolution
are never evaluated at all. Resource-class tags are exempt: they evaluate
at eager emission, because arriving before the content that needs them is
their entire purpose.

**Streaming, resource tags.** Resource-class registrations that arrive
after the shell are written into the stream **eagerly at the next flush
opportunity** — as literal `<link>`/`<script>` markup via the `sink.asset`
path the boundary asset tracking already uses — not held for diffing.
Earliness is their entire value; identity dedupe against everything
already emitted (including manifest-driven asset links) prevents
duplicates.

**Streaming, replaceable tags.** Replaceable tags registered after the
shell evaluate, re-resolve, and diff against the flushed snapshot **at
their owning boundary's fragment flush**, and the resulting patch ops are
emitted in the same task batch as that fragment's `$df` activation. A tag
can register synchronously early in a boundary that stays pending on a
sibling await; patching at registration would retitle the document long
before its content appears. Tying the patch to the fragment flush makes
the head update and the content reveal travel together. Diffs ride the
existing `pushTask` pipeline — the same batched post-flush `<script>`
channel as seroval data and `$df` — so ordering is inherent rather than
coordinated. The patch payload is a call to a small helper (sibling of
`$df`/`$dfs`) that applies add/replace/remove operations against
`document.head`; where the fragment's reveal is style-gated
(`$dfs`/`$dfc`), the head patch rides the same gate so the two remain
atomic.

Patch payloads are constructed from resolved tag descriptors with full
attribute/text escaping (same discipline as existing hydration scripts);
tag names and attribute names are validated against the head-eligible set,
so arbitrary markup cannot ride the patch channel.

**Bootstrap queue (adopted from unhead v3).** The hydration script
bootstrap installs a tiny queue stub. Patch scripts that execute before the
client bundle loads push operations into the queue *and* apply them to the
DOM. When the client registry initializes, it drains the queue to
reconstruct authoritative flushed state, then takes over. No entry is lost
regardless of chunk/bundle timing. This closes the gap the 2024 RFC's
"collect on hydration" left open (patches racing bundle load).

**Cancellation.** Stream teardown (client navigated away, consumer
cancelled) stops patch emission along with the rest of the stream — no
head-specific machinery needed beyond respecting existing stream
completion/disposal.

**Blocking.** Nothing here forces blocking; `deferStream`/`context.block`
remain the tools for "this metadata must be in the first flush." The
default is stream-and-patch.

**Frame sink.** Head patches are document-sink semantics. The frame sink
(frame streams RFC) needs a policy decision: most likely head registrations
inside a frame render surface as frame records for the consumer to apply
through the client registry, rather than as script patches. Deferred to the
frame-streams work; the registry design keeps tag descriptors structured
(not pre-rendered HTML) so this stays possible.

**Embedded renders (host-owned documents).** When Solid renders a fragment
for a host template to embed — the case `getAssets()` served — there is no
`</head>` to splice into. The `onHead(head: string)` render option is the
successor contract: when the output contains no `</head>`, everything
head-bound at first flush (resolved winners with their ownership markers,
eager resources, tracked asset links, inline styles) is delivered as one
string — prelude first, its placement becoming the host's responsibility —
for the host to splice into its own `<head>`. For `renderToString` it fires
synchronously before return; for `renderToStream`, before the first chunk,
so the host writes its head ahead of piping the stream. Post-shell head
updates need nothing: patches and eager resources ride the body stream as
script tasks and apply to `document.head` in the browser, and hydration
claiming works because the `data-dh` markers ride whatever markup the host
spliced. When the output does contain `</head>`, splicing is automatic and
`onHead` is not called — one mode or the other, decided by the render
output itself. Unlike `getAssets()`, which reads ambient render state after
the fact (unsafe across concurrent renders), `onHead` is closure-bound to
its render.

### Hydration and client

- **During hydration: collect, don't touch.** Registrations rebuild the
  registry; DOM writes are suppressed (consistent with existing
  `isHydrating` write-skipping). The server-flushed state — reconstructed
  from the bootstrap queue plus first-flush tags — remains authoritative
  until hydration completes, preventing revert/redo flicker.
- **Server patches never bypass the registry once it is live.** Before the
  client bundle loads, streamed patches apply directly to the DOM and
  enqueue (the bootstrap stub). Once the registry initializes, an incoming
  patch updates the corresponding server-snapshot entry and triggers
  re-resolution — the same code path as a client-side registration, not a
  second reconciliation system. Because the bootstrap queue replays the
  server's exact commit sequence, the client's adopted order *is* the
  server's order; resolution converges regardless of how patch arrival
  interleaves with hydration or client updates. "Who wins" is never a
  timing question.
- **After hydration / client-only:** registrations and disposals trigger
  re-resolution; the winning set is diffed against the DOM and applied.
  The registry owns head tags outright — it does **not** layer over
  `acquireAsset` exclusive slots (bare slot semantics cannot express
  groups, the title stack, or server-order adoption, and two ownership
  systems for the same DOM elements is a bug farm). `acquireAsset` keeps
  its existing non-head jobs.
- Tags rendered by the client registry are marked (attribute or comment
  ownership) so user-authored static head content and third-party script
  insertions are never clobbered by diffing.

### Client footprint

What must ship in the bundle, paid only when `useHead` is imported (zero
otherwise, via tree-shaking):

- Registry add/remove, hooked to owner disposal — reuses rxcore
  `cleanup`/`effect`; no head-specific reactivity system.
- Commit-order bookkeeping — an integer sequence, plus adopting the
  server's order from the queue during hydration.
- Per-identity resolution with group set-replacement — the largest single
  piece of logic.
- DOM apply — deliberately **no attribute diffing**: head tags carry a
  handful of attributes and N is head-sized, so "remove owned tag,
  re-render winner" is correct and materially less code.
- Hydration adoption (claim server-emitted tags by their ownership
  marker) and the bootstrap-queue drain (iterate an ops array).

Not in the bundle: the patch helper and bootstrap stub are streamed
inline script (server-emitted bytes like `$df`, a few hundred bytes);
resource-tag eagerness, boundary batching, evaluation timing, and the
head prelude are entirely server-side; Solid Meta's components are a few
lines each and tree-shake per tag.

A disciplined implementation is on the order of 60–90 lines —
**~1.5KB minified, under 1KB gzipped** — a fraction of unhead's client
(no plugin pipeline, no template params, no priority DSL) and comparable
to or smaller than today's solid-meta client while doing strictly more.
If the budget ever forces a cut, the lever is group set-replacement
(roughly a third of the registry logic), but it is the og:image
semantics this design exists to provide; spend the bytes.

### Compiler (stage 3 only)

Both compilers (Babel plugin and the Oxc/Rust `jsx-compiler`) implement the
transform; parity fixtures ride the existing harness
(`packages/compiler/__tests__/parity/`). Precedent for "native tag lowers
to a runtime call under conditions" exists in the `claimElement` emission
for `a[href]`/`form[action]`.

- Loose head tags → `useHead({ tag, props })` (import from module, emitted
  as an expression that registers on evaluation).
- Nested `<head>` → a group-scope call: lexically native children lower
  directly to tag descriptors (fast path); remaining children evaluate
  within the group scope so component/dynamic registrations join per
  dynamic extent.
- Document-shell `<head>` → root-group registration + mount-point handling
  in document assembly.
- All modes must agree: dom, ssr, hydratable variants; universal mode
  policy is an open question below.
- **Compiler flag to disable** the transform entirely (`headTags: false` or
  similar), per the original RFC's opt-out requirement. On by default.

## What this replaces

`useAssets`, `Assets`, and `getAssets` are removed (done in `0.50.0-next`,
along with the `context.assets` evaluation pipeline they fed). Known
downstream consumers and their migrations:

| Consumer | Usage | Migration |
| --- | --- | --- |
| `solid-meta` | head tags via `useAssets` | **Solid Meta 2.0**: internals become a thin component wrapper over `useHead` (no provider); eventual deprecation rides on the stage-3 JSX transform |
| `solid-start` | manifest/asset + shell injection | largely superseded by `next`'s built-in asset tracking; remainder moves to `useHead` |
| TanStack Solid Router | `RouterServer.tsx` head/meta | `useHead` (gains streaming + client sync) |
| `solid-styled` (lxsmnsyc) | deferred CSS collection | getter-props style tag (see `useHead` section) |
| SUID styled-engine | deferred CSS collection | same |

The internal machinery `useAssets` never covered (bundler asset links,
inline-style registration, hydration script placement) is unaffected. No
public raw-HTML escape hatch is added preemptively; if a real case emerges
that structured tags can't express, expose one then.

`getAssets`'s embedded-render role (host owns the document and splices head
content into its own template) is succeeded by the `onHead` render option
(see "Embedded renders" under SSR), which is closure-bound to its render
rather than reading ambient state, and carries `useHead` output.

## Existing infrastructure this builds on

All on `next`, production-tested:

- **Post-flush script task pipeline** — `pushTask`/`writeTasks` in
  `packages/runtime/src/server.js`, carrying seroval data and `$df*`
  fragment activation. Head patches are one more task type.
- **Style-gated fragment reveal** — `$dfs`/`$dfc` already hold fragment
  swaps for stylesheet loads; the 2024 RFC's "suspend until stylesheets
  load" possible-addition partially exists.
- **Single-pass document assembly** — `assembleDocument` splices before
  `</head>` and at `<!--xs-->`; first-flush injection is solved.
- **Owner tree** — commit-order resolution requires nothing from the
  reactive core beyond owner disposal hooks. Should the deferred
  tree-position model ever be revisited, the substrate exists: parent
  links on every owner, and `@solidjs/signals` path ids
  (`getNextChildId` / `_childCount`) as intrinsic owner identity (see
  [Alternatives considered](#alternatives-considered-tree-position-resolution)).
- **`acquireAsset` exclusive slots** — client last-writer-wins ownership
  with release-on-dispose. Originally built as the Title/Meta substrate,
  but the registry now owns head tags outright (see Hydration and
  client); `acquireAsset` keeps its non-head roles and served as the
  design proof for owner-following DOM ownership.
- **Compiler parity harness + `claimElement` precedent** — the shape of a
  dual-compiler native-tag transform exists.

Greenfield: the registry itself (ordering, identities, set replacement,
diffing), the patch helper + bootstrap queue, hydration collect-only mode,
and the JSX transform in both compilers.

## Relationship to unhead

Unhead v3's streaming design independently validates this architecture, and
its bootstrap-queue handoff is adopted here. We do not build *on* unhead:
the core registry stays in-house for the client byte budget, so patch
scripts share the single existing task pipeline instead of introducing a
second script emitter, and because the hydration-id/`isHydrating` interplay
is subtle enough that owning it matters. Unhead remains an excellent
*policy layer* target — an `@unhead/solid` built over `useHead` gets
streaming and hydration correctness for free.

## Staging

1. **Runtime `useHead`** — registry, resolution, first-flush rendering,
   streaming diffs, bootstrap queue, hydration semantics, client layer.
   Gives library authors the streaming-safe primitive nothing else in the
   ecosystem exposes. No irreversible authoring decisions in core.
2. **Solid Meta 2.0 adopts it** (outside this repo, but sequenced here):
   internals replaced with the thin component wrapper over `useHead`,
   dropping the provider and gaining streaming/hydration correctness.
   Zero compiler work. This is the interim application authoring surface.
3. **JSX transform (deferred, possibly indefinitely)** — both compilers,
   pure sugar lowering native tags to the component semantics above. This
   is the step that would deprecate Solid Meta. Decided later with usage
   data; its open questions (SVG ancestry, itemprop, spreads, opt-out
   flag, dual-compiler parity cost) gate nothing else.

Changesets: `patch` (prerelease policy), listing `@dom-expressions/runtime`
for stage 1; stage 3, if taken, adds `@dom-expressions/babel-plugin-jsx`
and `@dom-expressions/jsx-compiler`. Stage 2 is a Solid Meta release, not
a changeset here.

**Validation before implementation** — four scenarios to prototype first,
because they exercise every seam at once:

1. Two suspense boundaries completing in reverse order (commit order vs.
   arrival, patch batching).
2. A streamed patch arriving during hydration (queue adoption, registry
   handoff).
3. A client navigation disposing the winning metadata (stack restore,
   DOM ownership).
4. A deferred style collector read exactly at boundary flush (evaluation
   timing contract).

## Open questions

1. **Criteria for revisiting tree-based layering.** Phase 1 ships
   last-committed-group resolution. The concrete signal that would
   justify revisiting the positional model: recurring real-world reports
   that commit order picks the wrong winner in ways `key`s and
   policy-layer layering cannot reasonably fix. Until then it stays in
   [Alternatives considered](#alternatives-considered-tree-position-resolution).
2. **SVG `<title>` detection across expressions** *(stage 3 only)*.
   Ancestry within one JSX expression is statically knowable; a bare
   `<title>` at the root of a separately-authored SVG-subtree component is
   not. Options: accept the edge (document the opt-out), a `no-head`
   opt-out attribute, or runtime parent-sniffing in dev mode to warn.
   React 19 has the same blind spot.
3. **Universal renderer policy.** `createRenderer` targets may have no
   document head. Likely: the transform is off for universal mode and
   `useHead` is a no-op or pluggable sink there.
4. **Where does the nested-`<head>` JSX type live** *(stage 3 only)* —
   JSX types must permit `<head>` in flow content positions; coordinate
   with `jsx.d.ts` generation (`jsx-sync-types`).
5. **Interaction with `NoHydration` / islands.** Registrations inside
   server-only regions have no client counterpart to re-register on
   navigation; their flushed entries must persist in the client registry
   (adopted from the queue, never re-registered) until their region is
   replaced. Needs a worked example against the frames design.
6. **Should `meta[name]` vs `meta[property]` share an identity namespace?**
   (OpenGraph uses `property`; some tools emit both for the same logical
   tag.) Default proposed: separate namespaces, `key` to unify.

## Alternatives considered: tree-position resolution

Earlier drafts of this RFC resolved precedence by owner-tree position —
first full document preorder from owner path ids, then owner depth with
registration-order tiebreaks. The attraction: the layered override
(shell < layout < page) falls out of nesting, deterministically, immune
to lazy-loading arrival order, with no explicit keys. The substrate
exists (`@solidjs/signals` assigns path ids as intrinsic owner identity;
parent links are on every owner in every mode).

It was deferred, not rejected, for three reasons:

1. **Owner structure is an implementation artifact, not metadata
   specificity.** Wrapping a subtree in `<Show>` or adding a structural
   memo moves precedence without the author intending it; a deeply
   nested non-route widget can out-depth a page under an outlet.
   Restricting to non-transparent owners softens but does not fix this.
2. **It was the proposal's most novel, least-proven feature**, carrying
   its own open questions (CSR root ids for preorder, encoding
   verification, portal/keyed-list edge cases, server/client depth
   agreement) — most of the spec's complexity traced to it.
3. **The transport handles the hazards that motivated it.** Boundary
   commit order gives the lazy-page-beats-shell result; queue adoption
   eliminates hydration flicker. What remains uncovered (late-committing
   shallow widgets) is the same trade-off every shipping
   everywhere-solution accepts, with `key`s and route-aware policy
   layering as the escape hatches.

Revisit trigger: recurring real-world resolution complaints that
commit order plus keys cannot reasonably address (open question 1).
The comparator is confined to one function, so the upgrade path stays
open — but it is observable behavior, so changing it after stable is a
breaking change.

## Prior art (updated from the 2024 survey)

| Library | Scope | Dedupes meta | Dedupes title | Explicit keys | Streaming |
| --- | --- | --- | --- | --- | --- |
| React 19 | everywhere | link/style/script only (`precedence`) | No | No | Yes (hoist-time) |
| Svelte | `<svelte:head>` | No | Yes | `svelte:unique` | No |
| Next | route group | Yes (shallow merge) | Yes | No | n/a (blocking metadata) |
| Nuxt 4 / unhead v3 | everywhere | Yes | Yes | Yes | **Yes** (script patches + bootstrap queue) |
| Remix / RR7 | route group | merge/replace | Yes | No | No |
| **This proposal** | everywhere + explicit `Head` groups | Yes (identity, last-committed group) | Yes (singleton stack) | Yes | **Yes** (boundary-committed patches riding fragment reveals + bootstrap queue) |

The distinguishing claims are in the streaming column, not the dedupe
column: no prior art evaluates metadata at its suspense boundary's flush,
patches the head atomically with that boundary's reveal, splits resource
tags into an eager append-only class, or guarantees hydration
convergence by replaying the server's commit order. Dedupe semantics are
deliberately boring — proven last-wins with explicit keys — with the more
ambitious positional model documented above should experience demand it.

### References

- Katja ("katywings"),
  [The state of CSS in Vite and Solid](https://gist.github.com/katywings/26969473d295ca6e7cd4debc5138f715)
  (Feb 2026) — the originating design discussion for the
  ambient-vs-directly-mounted CSS lifecycle split this design assumes:
  ambient, bundler-injected imports are never lifecycle-managed, while
  URL-imported / directly-mounted stylesheet links follow their owners.
