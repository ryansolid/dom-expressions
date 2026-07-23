# Frame Seams: Value Elements, Position Ranges

> **Decision record — ratified 2026-07-23 (Ryan).** Supersedes the
> boundary/region marker vocabulary in
> [frame-streams-rfc.md](./frame-streams-rfc.md); the slot model and
> everything above the DOM representation (store, versioning, readiness, wire
> chunks, occlusion) are unchanged. Trigger: issue #550 plus the hardening
> review that followed it. The table-context consequences were reviewed and
> accepted: frames can *be* table sections (`as`) but cannot interleave into
> client-composed ones, while client positions inside server tables remain
> unrestricted; the flipped assignment (elements at slots) was considered and
> rejected — it lands the wrapper tax on the fine-grained, high-frequency
> seam inside server-authored markup.

## The question

A frame system has three DOM seams:

1. **Boundary** — where a frame mounts at a JSX insert position
   (`dynamic(() => getStory(id))` returning into a fragment, an array, a map).
2. **Region** — server content passed *through* a client wrapper
   (`props.comment({children: <serverJSX/>})` → the wrapper places
   `p.children` somewhere in its own output).
3. **Slot** — a client position *inside* server-owned HTML
   (`{props.children}` in a server component's markup; iterated
   `<props.comment>` occurrences).

Today all three are comment-marker ranges. #550 showed the boundary crashes in
array/fragment positions because only the single-expression path of `insert`
knows the brand. The question is not "how do we patch that" — it is: **what is
the correct representation of each seam, and why.**

## Constraints

- **No virtual tree.** The client core diffs real node arrays
  (`reconcileArrays`) and tracks real nodes as `current`. This is load-bearing
  for everything else Solid is.
- **Initial-load performance is the point.** Payload and runtime bytes are
  first-class; the frames consumer is CI-guarded
  ([size-guard.mjs](../scripts/size-guard.mjs), currently 6585 gz against a
  6600 ceiling — up from 4967 at landing across five hardening rounds, several
  of which were range bookkeeping).
- **Zero cost when unused.** Apps without frames must pay nothing — enforced
  today by importless registered-symbol brands and byte-stable client
  scenarios in the guard.
- **State-preserving morphs and single-copy content** are the product. Whatever
  the representation, a client-owned unit is never detached by a server update,
  and content ships exactly once.

## Survey: who does what, and what it cost them

| System | Seam representation | Post-load server HTML into live DOM | Where multi-node unit-ness lives |
| --- | --- | --- | --- |
| React (Fizz) | comment ranges `<!--$-->…<!--/$-->` + `<template id="B:n">` anchors | one-shot `$RC` replacement pre-hydration only | fibers — post-hydration DOM extent is derived from the vtree, never re-discovered |
| Remix 3 (beta) | comment ranges `<!-- rmx:f:id -->` + `rmx-data` JSON side-table; islands as `<!-- rmx:h:id -->` ranges | yes — bespoke range-aware differ; hydration ranges are hard ownership boundaries it never crosses | Preact-fork vtree — a `<Frame>` in any JSX position is a vdom component; markers are its render output |
| Fresh | comment ranges (`frsh:island/slot/partial`) | partial responses are parsed then **lifted DOM→vnodes**; Preact diffs against live instances | Preact vtree + `createRootFragment` — a fabricated parent object with overridden `insertBefore` so a range impersonates an element |
| Qwik v1 | comment ranges `<!--qv …-->` | no — boot-only resumability; containers replaced wholesale via `innerHTML` | `VirtualElementImpl` — a fabricated Element (`nodeType: 111`) wrapping the comment pair |
| Qwik v2 | out-of-band vnode side-table (depth-first indices); per-component comments deleted | no | side-table indices |
| Turbo 8 | **element** `<turbo-frame>` | frames: children swap (no morph — [#1357](https://github.com/hotwired/turbo/issues/1357) open); page refresh: idiomorph | the platform |
| Astro islands | **element** `<astro-island>` | `server:defer` placeholder swap | the platform |
| dom-expressions frames (today) | comment ranges at all three seams | yes — bespoke range-preserving morph | compiled metadata for client templates; the morph inside frames; **nothing at the insert seam — that gap is #550** |

Three findings from the survey carry the decision:

**1. Ranges are vtree-subsidized everywhere they work.** React, Remix, and
Fresh compose ranges into arbitrary positions because a virtual layer owns
unit identity; the DOM markers are just its serialization. The two systems
that had to make ranges interact with element-shaped machinery *fabricated
elements*: Qwik's `VirtualElementImpl`, Fresh's `createRootFragment`. There is
no precedent for what #550 asks of us — teaching a real-DOM array reconciler
(and Suspense, portals, and every future node-enumerating mechanism) about
multi-node units — because everyone who reached that fork built a virtual
element instead. We have no vtree, and building a virtual-element layer for
one value type is the same complexity wearing a different name.

**2. Comment protocols share two field-failure classes across ecosystems.**
(a) HTML-rewriting infrastructure deletes them: Cloudflare Auto Minify broke
React hydration ([cloudflare community](https://community.cloudflare.com/t/auto-minify-html-and-react-hydrate/528537))
and Fresh islands ([fresh#2659](https://github.com/denoland/fresh/issues/2659)).
(b) Parser/extension reparenting splits a range's ends across parents: Fresh's
fatal `DOMException` when an island `<div>` sits inside a `<p>`
([fresh#2121](https://github.com/denoland/fresh/issues/2121)); Google Translate
breaking Qwik v2's positional addressing
([qwik#7461](https://github.com/QwikDev/qwik/issues/7461) — which opens with
"probably we should use some comments nodes," after v2 removed them). Elements
are immune to both. Also directly relevant:
**[GHSA-m6jq-g7gq-5w3c](https://github.com/QwikDev/qwik/security/advisories/GHSA-m6jq-g7gq-5w3c)**
— Qwik shipped an XSS because user-controlled keys were concatenated into
marker comments unescaped. Our `$key` flows into
`<!--slot:comment#${k}:start-->` the same way today. That must be fixed in the
producer regardless of this decision.

**3. Elements have a documented tax, and its shape is granularity-dependent.**
Turbo's decade of issues: `<turbo-frame>` inside `<tbody>` is foster-parented
out of the table ([turbo#48](https://github.com/hotwired/turbo/issues/48),
[#160](https://github.com/hotwired/turbo/issues/160)); the extra box breaks
grid/flex parents until `display: contents`
([Arkency](https://blog.arkency.com/turbo-frames-and-the-extra-dom-node-how-to-handle-it/));
unknown elements default to `display: inline`. Note the tax scales with
*instance count*: one element per coarse frame is a rounding error; one element
per iterated list-item position is a structural change to every list an app
renders. Turbo also demonstrates the ceiling of elements-everywhere: it has no
projection/composition story at all — server HTML inside a frame is opaque,
and client-enhanced content inside it is destroyed on navigation.

## The rule

**Anything that crosses the runtime as a first-class insertable value is an
element. Anything that exists only as a position inside owned content is a
range.**

A *value* flows through core `insert`/`reconcileArrays`/`cleanChildren`,
Suspense moves, portals — machinery that speaks nodes and enumerates children.
Handing that machinery a multi-node range requires it (all of it, forever) to
learn range semantics; handing it an element requires nothing. A *position*
never exists as a value: core code only ever operates *inside* it, anchored at
its markers, and the only thing that walks *across* it is the frame morph —
one closed, benched code path we own.

Applying the rule:

| Seam | Is it a value? | Representation |
| --- | --- | --- |
| Boundary | yes — a component's return value, in any JSX position | **element** |
| Region | yes — resolves to a prop the wrapper inserts (`{p.children}`) | **element** |
| Slot | no — a marker position inside server HTML; fills are anchored inserts | **range** |

This also collapses two concepts into one: a region *is* a frame boundary one
level down. After this change the spec has exactly two seam kinds: **a frame
mounts into an element; a slot is a range.**

## Decision detail

### Boundary and region: one element concept

- A frame mounts into a client-created element (custom element, name TBD —
  `display: contents` by default, overridable via `as`/attrs at the call
  site for semantics, styling, or parsing contexts: `as="tbody"` for a frame
  of table rows). The client names it; the server never dictates it —
  "boundary identity belongs to the client" becomes literal DOM.
- t=0: the document face emits the element (with its frame id as an
  attribute) instead of a comment pair. Adoption is an attribute query, not a
  comment TreeWalk. The element is robust against minifiers, translators, and
  reparenting — it cannot be "split."
- Regions: `#resolveArgs` resolves a `{$frame}` arg to a persistent element
  (child frame bound in element mode — which `FrameImpl` already supports).
  Re-calls re-place the same element; the fragment-refill dance, the
  depth-stack `#discoverRegions` pairing, and the region-marker skip logic in
  the morph all delete. This closes a latent #550-class hole: a region
  fragment sitting in an array position of a wrapper's own reactive insert
  desynchronizes core's array bookkeeping today.
- Core impact: the `$$FRAME` brand, the `insertExpression` branch, and the
  `normalize` check delete from client.js. `insert` never learns frames
  existed. #550 closes as *unrepresentable*, and the same holds for every
  mechanism we'd otherwise audit (Suspense off-screen moves, portals,
  transitions).
- Constraint accepted and named: frame elements in element-restricted parsing
  contexts need `as` to match the context (the Turbo tbody lesson), and a
  frame that is "some rows inside a tbody the client also composes into" is
  not representable — own the section instead. Producer can dev-warn when it
  knows the enclosing tag.

### Slot: range, kept

- Slots stay `<!--slot:key:start/end-->` pairs, opaque protected units of the
  morph, iterated per occurrence with positional-or-`$key` identity — the part
  of this design Remix 3 and Fresh independently converged on (Remix's differ
  never crosses `rmx:h` island ranges; Fresh's slots ship server JSX once in
  HTML with a `<template>` fallback for conditionally-unrendered children —
  their version of our occlusion flip). This is also where elements would
  multiply Turbo's wrapper tax by list length and cap composition at
  islands-grade.
- Hardening folded in (from the survey's failure classes):
  - **Escape/validate `$key` and every producer-emitted marker payload**
    (the Qwik CVE class). Spec the occurrence-id alphabet; encode anything
    outside it. Same treatment for `_hk` (quote it) and serialize keys.
  - **Marker integrity check at adoption**: paired markers must share a
    parent; on violation, a loud dev-mode error naming the likely cause
    (invalid nesting like block-in-`<p>`, or an HTML-rewriting layer) — not
    Fresh's fatal mystery `DOMException`. Document `Cache-Control:
    no-transform` for frame responses.

### Adjacent decisions folded in (one line + reason each)

- **Wire data dialect**: keyed JSON codec only for frame streams; the
  eval-`payload` path stays document-SSR-only. One decoder on the client,
  CSP-clean.
- **Payload modes**: `html` only in v1; `template`/`block` come out of the
  wire and the client (they're implemented but unused — carrying two
  materialization paths is "support both" with no why). Qwik v2's side-table
  experience is the cautionary note for when template mode returns: keep
  addressing in-band.
- **Region/boundary ids**: all ids in a response are relative to its root;
  the client rebases the whole tree under its boundary id at application.
  Fixes cross-boundary contamination when one function feeds two boundaries
  (today `fnId.occurrence.key` collides in the shared host).
- **t=0 slot args always ship.** The "recoverable from the page" substring
  heuristic is removed: `cid={1}` must not read `undefined` at boot because a
  "1" appeared in rendered text. The single-copy invariant covers *content*;
  primitive args are data. Reverse-templating may return only as a
  structurally-guaranteed template-mode feature.
- **Async server content in slot args**: supported via deferred region
  emission (emit the region's chunk when its holes settle — the store's
  readiness model already handles late arrival). The current throw is
  unfinished work, not a spec position.
- **Morph live-state policy**: the morph gets an explicit stance on
  browser-owned state the server can't know — `open` on
  `details`/`dialog`, dirty input value/checked, open popovers (today we
  clobber `open`; inputs survive only via the dirty-value accident). Remix's
  differ and idiomorph both ship this; ours is one attribute deny-list plus a
  documented `data-preserve` escape hatch, mirroring the claim contract.

## Alternatives rejected

- **Ranges everywhere + a fake-element/virtual-node layer** (#550's implied
  ask; the Fresh/Qwik trick, given its fair hearing). First, the precedent
  distinction: Fresh's `createRootFragment` is a *render-target adapter* —
  calls flow INTO it (`fakeRoot.insertBefore(realChild)`) and it is never an
  argument to a native DOM call, because everywhere an island appears as a
  sibling, Preact's vtree owns unit identity. Our boundary runs the other
  direction: it is a *value* handed to natives
  (`parent.insertBefore(value, ref)` — the #550 TypeError itself), so a fake
  element here means wrapping every mutation site in core with a brand check
  plus proxied `parentNode`/`nextSibling` coherence — `VirtualElementImpl`
  territory, which Qwik built and then deleted. The strongest version is a
  **flagged fork**: `normalize` already walks arrays, so it can mark ones
  containing branded members; unflagged arrays take today's exact code
  (byte-stable, zero cost to non-frame apps), flagged arrays route to a
  range-aware variant expanding ranges as units at the ~8 mutation sites.
  Residual costs that don't go away: a second reconcile path kept correct
  forever; ref-read subtleties (`prev.nextSibling` when prev ends a range);
  the open set beyond insert (Suspense off-screen moves, portals, anything
  enumerating children it didn't insert); and marker-protocol field failures
  at value seams (the Fresh #2121 split-range fatal has no element
  equivalent). Choosing this is choosing to own a virtual-node protocol in
  core — coherent if wrapper-free purity outweighs that, but it must be
  chosen as that, not as a bug fix.
- **Elements everywhere** (uniform, smallest runtime): kills iterated
  composition ergonomics — an element per occurrence in every server-rendered
  list — and lands the wrapper tax on the highest-traffic authoring surface.
  That's islands-grade composition; the slot model is the differentiator this
  architecture exists for.
- **Out-of-band side-table addressing** (Qwik v2): cleanest payload, but
  positional addressing is fragile against anything that mutates the DOM
  before/around us (translate, extensions) — and we morph *live, user-mutated*
  DOM for a living. In-band identity only.

## Consequences

- **Size** (estimates — verify with [size-guard.mjs](../scripts/size-guard.mjs)
  after implementation): frames consumer sheds the insertable range dance,
  FrameImpl's range-boundary mode (bounded walks, `boundStart`/`boundEnd`
  reconcile legs), region depth-stack discovery, and the region
  fragment-refill — ~0.4–0.6 KB gz of the current 6585, plus ~0.2–0.3 KB
  from the folded cuts (one wire dialect, no `template`/`block`
  materialization): ~5.7–6.0 KB expected. Core client sheds the brand
  branches for everyone; the Solid binding drops the boundary TreeWalker.
  Slot machinery and the 874 gz morph stay — deliberately (they are the
  product). The larger effect is slope, not intercept: the guard's growth
  history (4967 → 6585) was dominated by range-bookkeeping hardening rounds
  (region discovery, adoption arming, zombie-remount guards) — categories
  that cease to exist. Re-ratchet ceilings downward in each implementing PR.
- **Payload**: boundary/region comment pairs become elements — roughly
  size-neutral per instance, minus duplicate closer text, plus attribute
  names. Not a decision driver either way.
- **Behavioral**: `{p.children}` renders inside a visible (but
  `display: contents`) element — client wrapper CSS can see it; documented.
  Table-interior *slots* keep working (they're ranges); table-interior
  *regions/boundaries* need `as` or restructuring.
- **Migration**: producer emission (`frameTransformDirectResult`, region
  emission, `slotRange` untouched), consumer mount paths, adoption, and the
  Solid binding's `documentBoundary`. Wire chunk schema unchanged except id
  rebasing semantics. All pre-1.0/experimental surface.

## Open questions

1. Element naming and the `display: contents` delivery mechanism (inline
   style attr vs a one-rule stylesheet in the document bootstrap; unknown
   elements render inline until defined — Turbo's default-display lesson).
2. `as`/attribute passthrough ergonomics on `dynamic()` and on region args.
3. Dev diagnostics: producer-side warning for frame elements emitted into
   element-restricted parsing contexts; adoption-time marker integrity
   report.
4. Whether the morph live-state deny-list is fixed or pluggable.
