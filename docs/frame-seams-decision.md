# Frame Seams: Value Elements, Position Ranges

> **Decision record — ratified 2026-07-23 (Ryan).** Supersedes the
> boundary/region marker vocabulary in
> [frame-streams-rfc.md](./frame-streams-rfc.md); the slot model and
> everything above the DOM representation (store, versioning, readiness, wire
> chunks, occlusion) are unchanged. Trigger: issue #550 plus the hardening
> review that followed it. The table-context consequences were reviewed and
> accepted: a boundary can't sit inside table internals (the parser
> foster-parents a `<dx-frame>` out of a `<table>`), while client positions
> inside server tables remain unrestricted; the flipped assignment (elements
> at slots) was considered and rejected — it lands the wrapper tax on the
> fine-grained, high-frequency seam inside server-authored markup.

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

- A frame mounts into a client-created `<dx-frame>` element, always
  `display: contents` (layout- and box-transparent, exactly like the comment
  range it replaces). The client names it; the server never dictates it —
  "boundary identity belongs to the client" becomes literal DOM. The tag is
  fixed, not author-overridable: one seam representation, no modes.
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
- Constraint accepted and named: a boundary can't sit inside table internals.
  At t=0 the HTML parser foster-parents any non-table element (a `<dx-frame>`
  included) out of a `<table>`/`<tbody>`/`<tr>`, so a server-component
  boundary can't be *some rows inside a client-composed table* — own the whole
  table in the server component, or supply the rows via a client slot (the
  range seam has no such restriction). This is the Turbo `tbody` lesson,
  accepted as a named limitation rather than papered over with an `as`
  escape hatch — a second tag would be a mode, and modes are a smell. Producer
  can dev-warn when it knows the enclosing tag.

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
- **Payload modes**: `html` only. The `template`/`block` payload mode (markup
  compression — send structure once, values per instance) is **removed** from
  the wire and the client (`chunkToRecords` cases, `#materialize`'s block leg,
  `materializeBlock`, the readiness template-gate, the chunk types). It was
  dead — the producer never emitted it — and it is farther than the one dedup
  worth doing. The only content dedup is **free reference-equality at
  serialization**: seroval already emits one copy and a `{$ref}` when the same
  server-content *reference* is serialized twice (the codec shares one refs
  map). That fires opportunistically (rare — calls are usually unique; never in
  HN) and needs no new code. Structural *repetition* in markup is not deduped
  at all — it is ordinary HTML (gzip's job), and compressing it via template
  chunks or DOM-recovery skeletons is explicitly not pursued. (Adoption /
  DOM recovery of *rendered* content at t=0 is a separate, kept faculty — the
  client claims the page; it does not use `template`/`block` chunks.)
- **Region/boundary ids**: all ids in a response are relative to its root;
  the client rebases the whole tree under its boundary id at application.
  Fixes cross-boundary contamination when one function feeds two boundaries
  (today `fnId.occurrence.key` collides in the shared host).
- **The core invariant — single-copy — can never be broken; it is the whole
  point.** Every piece of content ships exactly once (as HTML), every value the
  client needs ships exactly once (as data on the args channel), and *nothing*
  is ever shipped as both HTML-for-paint and serialized-data-for-hydration. The
  RSC double-ship is what this architecture exists to kill; frames guarantee
  single-copy today with `html`-mode chunks, independent of any payload mode.
  Two faculties serve it, and the line between them is the whole subtlety:

  - **Structure/templates ARE recovered from the DOM — this is crucial.** t=0
    adoption is exactly this: the client claims the server-rendered content
    from the page rather than taking a second serialized copy. Structural dedup
    is the same faculty (clone a template skeleton from a rendered instance).
    Structure is losslessly present in the DOM, so recovering it *is* how
    single-copy holds.
  - **Scalar data is NEVER recovered from the DOM.** The removed "recoverable
    from the page" substring heuristic made the category error of treating
    rendered HTML as a data store. It is not — the DOM is presentation, lossy
    and partial: an arg may drive client *logic* and never render
    (`p.cid === "c1" ? collapsed : expanded`), or render *transformed*
    (`toUpperCase()`), so the DOM form is not the value. Dropping an arg because
    its string coincided with rendered text silently corrupted the data channel
    (`cid={1}` read `undefined` at boot) and forced a strip-rule for every
    construct embedding the occurrence id into markup (`_hk`, region
    `data-fid`). Data always ships. This is the RFC's own "[HTML] must not
    become the source of truth for reconstructing slot *values*" principle.

  So a value that is *both* rendered as content and passed as an arg
  legitimately appears in both channels (content once, data once) — not a
  double-ship, because the content and the datum are different things that
  happen to share a value; unifying them would require the forbidden data
  recovery. And repeated static *structure* within one HTML stream is not a
  double-ship either — it is ordinary HTML (gzip handles it), and template mode,
  if pursued, removes it by DOM recovery, not by re-shipping. Single-copy is
  about representations, never about coincidental value or structure repetition.
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
  *regions/boundaries* need restructuring (own the table, or feed rows through
  a slot).
- **Migration**: producer emission (`frameTransformDirectResult`, region
  emission, `slotRange` untouched), consumer mount paths, adoption, and the
  Solid binding's `documentBoundary`. Wire chunk schema unchanged except id
  rebasing semantics. All pre-1.0/experimental surface.

## The producer-side problems

Both are now built (see the per-point notes). Neither ever blocked the shipping
element-seams work (html-mode + synchronous occlusion); the first was the
genuinely hard one (the streaming-occlusion lock), the second turned out to be
already-the-mechanism once framed correctly.

1. **Knowing insertion status before flush (streaming occlusion) — the hard
   one.** The
   occlusion choice is exclusive per slot: server-rendered ⇒ adopt from
   markup; unrendered ⇒ serialize as data; never both (single-copy). Usage
   tracking gives the signal *after* the wrapper reads the prop — fine
   synchronously, but streaming may force a shell flush before an async
   wrapper has decided. Bounded by the `double-data.ts` proof: the only
   undecidable case is a slot **conditionally** read inside an async segment.
   Sync reads and slots *statically forwarded* into a pending segment are
   decidable at flush. For the residue the policy is locked — **serialize once
   at flush and suppress any later server markup for that slot id** (or CSR
   that instance) — trading one slot's adoption for a guaranteed
   no-double-ship. *Built.* The usage flip already serializes a region unused
   at the wrapper's synchronous return; each such region is now **locked**, so
   a wrapper that places it behind an async boundary (its thunk called after
   the flip) contributes *nothing* to markup rather than re-emitting the
   content — identical to a region never placed, mounted on the client from the
   `sc:region:` record. The decision is committed eagerly (at sync return, ≤ the
   flush), which is the conservative side of the policy: never a double-ship,
   at the cost of that one region adopting from data instead of markup.
   `frame-fn-args.spec.js` covers the late-placement lock and the synchronous
   control (still ships inline, never locked). Producer-only; consumer reuses
   the existing occlusion mount, no client change.

2. **Identifying that a prop is content vs data** (tractable — the mechanism
   already exists). Per prop, at serialize time: content ⇒ ships as HTML (a
   region), never serialized; scalar ⇒ serialized as the arg. No cross-instance
   comparison — **every server→client call is unique** (no "previous instance"
   to dedup against), so each prop stands on its own. We already intercept
   every prop at the slot-props **Proxy getter** (that *is* the usage-tracking
   machinery), so the classification happens right there by **shape**:

   - `{t}`-shaped ⇒ an SSR template ⇒ content.
   - an array whose every element is `{t}`-shaped ⇒ a **fragment** of
     templates ⇒ content (one layer deeper). Top-level one-shot reactive
     control flow reduces to this — `<For>` → an array of `{t}` items, `<Show>`
     → a `{t}` or nothing.
   - a **function** ⇒ content, because **a function cannot be serialized** —
     the serialize branch is impossible for it, so it must be a thunk producing
     content: resolve it once (one-shot), then classify what it produced (a
     `<For>` thunk → the `{t}` array → HTML; a getter → its scalar → data).
     This closes the lazy-control-flow case and fixes a latent bug (today a
     function-valued arg falls into `serialize()` and breaks on seroval).
   - everything else ⇒ scalar data.

   This is `isServerContent` plus the function rule, now implemented on both
   proxy faces (`createSlotProps`, `createDocumentSlotProps`) with
   `frame-fn-args.spec.js` covering thunks, `<For>`-shaped arrays, nested
   thunks, getters-producing-scalars, and the occluded-thunk case. The `{t}`
   shape is ours to assume (symbol-brand for certainty if ever wanted). It is a
   *type* check on our own output — categorically unlike the removed substring
   heuristic, which read the rendered *page*. No compiler involvement;
   single-copy holds by construction (content ⇒ HTML once, scalar ⇒ data
   once).

3. **Async content inside a region — routed to the region (BUILT).** A region
   (`{$frame}` slot arg) is a nested frame the client binds under its own
   `childId` and owns end-to-end: its range, its morph, its reveal. So a
   `<Suspense>` rendered *inside* region content must stream its `fragment` +
   `reveal` addressed to the region, not the enclosing root frame. It wasn't:
   the frame sink is single-id, so a region's deferred fill went out under the
   root id. The initial reveal still *landed* (the consumer's placeholder DFS
   descends into region subtrees), but the root store then carried segment
   state belonging to the region — and the region morphs independently across
   responses, so the two desync. Fixed on the producer: the response-face
   getter wraps `ctx.registerFragment` for the window in which each arg
   resolves, tagging every fragment key it registers to that arg's `childId`
   (first write wins, so a fragment inside a *nested* region tags to the
   innermost); `sink.fragment`/`sink.reveal` then address `regionKeys.get(key)
   ?? id`, and a mixed reveal group splits per frame. Covered by
   `frame-region-async.spec.js` (producer routing + a control that keeps a
   root fragment on the root, and an end-to-end client reveal into the region's
   own DOM). Only a **bare** async read in a slot arg (no boundary, so nothing
   to show and no fragment to reveal into) still throws, pointing at
   `<Suspense>`.

## Client-side reveal: boundary-driven (BUILT)

The remaining client-side hole: a streamed segment reveals content containing a
client fill that is async and has no `<Loading>` of its own. The imperative
swap revealed the segment before the fill was ready, so the fill's readiness had
nowhere to land — the frame's own `<Loading>` already latched (2.0 boundaries
never revert), so the fill flashed **empty** inside painted content.

Resolved by making the reveal itself a boundary. A streamed segment's `pl-KEY`
placeholder **is** the client-side footprint of the server `<Loading>` that
produced it, so the reveal reconstructs a client `<Loading>` right there:
fallback = the placeholder's own template content, children = the segment
content **plus its client fills, rendered inside the boundary**. An unboundaried
async fill's `NotReadyError` then propagates *up to that reconstructed boundary*
and is covered (the segment fallback holds until it settles); a fill with its
own boundary contains itself. This is React's RSC model — server Suspense
boundaries reconstructed on the client — and it costs exactly what React pays:
**one boundary per revealed segment, and segments are author-placed `<Loading>`
boundaries** (a single high one for most apps), not a per-chunk tax. The
imperative HTML fast-path *inside* each boundary is untouched; a segment with no
pending fill resolves instantly.

The earlier "hold the fallback per segment" framing mispriced this as
per-serialization-point (prohibitive) and nearly shipped a warn-only non-fix.
The correction: reveal points are `<Loading>` boundaries, so the hold is
per-`<Loading>` = React granularity. React itself has **no** backstop boundary
(it requires author-placed ones exactly as we do; with none, it blanks the root
or blocks the unit — our miss is a *localized* empty slot, gentler), and its
coverage of a no-local-boundary fill is Suspense (the boundary waits for its
whole subtree), never the transition — the transition is over the moment a
fallback shows.

Split across `@dom-expressions/runtime` (the `reveal` hook on `FrameOptions`;
`#revealSegment` delegates, `#syncSlots` gained a scoped-fragment mode; imperative
swap kept as the framework-agnostic default) and the framework binding (a client
`createLoadingBoundary` reconstructed at each seam). Covered by
`frame-reveal-boundary.spec.js` and, in the Solid binding, an end-to-end test
that an unboundaried async fill revealed in a deferred segment holds the segment
fallback then reveals — coverage, not orphan.

## Open questions

Resolved during implementation: the element is `<dx-frame>` with an inline
`style="display:contents"` (not a bootstrap stylesheet — the inline rule holds
before any bundle loads, and an undefined custom element is inert). The tag is
fixed and not author-overridable; an `as`/tag-passthrough escape hatch was
considered and dropped — it would be a second seam representation (a mode), and
the table-interior case it addressed is a named limitation instead (own the
table, or feed rows through a slot).

1. Dev diagnostics: producer-side warning for frame elements emitted into
   element-restricted parsing contexts; adoption-time marker integrity
   report.
2. Whether the morph live-state deny-list is fixed or pluggable.
3. Occlusion container: keep the hydration data record (`sc:region:…`), or
   park occluded content in an inert `<template>` element like Astro-Solid —
   keeping content entirely out of the data channel (stronger single-copy
   surface, CSP-friendlier; frames already own the `<template id="pl-…">`
   vocabulary).
