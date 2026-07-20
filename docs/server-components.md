# Solid Server Components

*A usage-first guide to the architecture. For wire-format and runtime
mechanics, see [frame-streams-rfc.md](./frame-streams-rfc.md).*

## The idea in one paragraph

Most frameworks make you choose: islands architectures give you a lean
initial page but fall apart when you navigate; RSC-style server components
give you rich composition but ship every piece of server content twice
(once as HTML, once as serialized data); SPAs keep your client state alive
but pay for it with hydration payloads and client-side data plumbing. This
architecture — think **lakes, not islands** — keeps one copy of everything:
the server owns and streams the content (the lake), the client owns islands
of interactivity *inside* it (positions the server marks but never renders),
and neither side ever re-sends what the other already has. The test is
literal: **view-source the page or the network response and search for any
piece of content — you'll find it exactly once.**

## The mental model

Three sentences carry the whole design:

1. **A server component is a function returned from a server function.**
   The server function's *arguments* are the server's inputs (ids, filters —
   things that drive fetching). The returned component's *props* are client
   positions — holes the client fills — and never travel to the server.
2. **Props are positions, not data.** When a server component renders
   `{props.children}`, it emits a marked range in the HTML, nothing more.
   The client decides what lives there, and whatever it puts there survives
   every server update.
3. **The client owns boundaries.** A server component renders into a frame —
   a region of the page addressed by a client-chosen id. Re-fetching into
   the same id *morphs* the server content in place; it never remounts, so
   client state inside the boundary (focus, input values, toggles, video
   playback) persists across navigations.

## Writing a server component

```tsx
async function getStory(storyId) {
  "use server";
  const story = await db.stories.get(storyId);

  // Returning a function makes it a server component.
  return (props) => (
    <article>
      <h1>{story.title}</h1>
      <section class="comments">
        {story.comments.map((c) => (
          <props.comment cid={c.id}>
            <div class="body">
              <p>{c.text}</p>
              {c.replies.map(renderReply /* recurse the same way */)}
            </div>
          </props.comment>
        ))}
      </section>
      <footer>{props.children}</footer>
    </article>
  );
}
```

What each piece does:

- `story.title`, `c.text` — **server content**. Rendered to HTML, streamed,
  never serialized. This is where your data lives on the wire: in the markup,
  once.
- `{props.children}` — a **direct-insert position**. The server emits an
  empty marked range; the client fills it.
- `<props.comment key={c.id} cid={c.id}>…</props.comment>` — a **render-prop
  position**, one *occurrence* per call. The client's `comment` component
  wraps each comment. Two kinds of things pass through it:
  - `cid={c.id}` — a primitive. Rides along as data (it's tiny and the
    client genuinely needs it as a value).
  - the JSX children — **server content passed into a client position**.
    This does *not* get serialized; it streams as a nested server region the
    client wraps without re-rendering. That's how recursive composition
    stays single-copy: the comment text is inside it, in HTML, once.
Rules of thumb: put content on the server; pass primitives when the client
needs a value; pass JSX when the client should wrap server content. If you
find yourself wanting to pass a big object to the client, ask whether the
client actually needs it as *data* — usually it just needs it rendered, and
rendering is free.

### Identity, if you need it (`$key`)

Most apps never write this — the defaults do the right thing. Server content
has no identity at all (it's stateless output; updates converge). A
one-of-a-kind position like `props.children` is identified by its prop name,
stable forever. Iterated positions are positional by default, and re-sends
with unchanged args are deduplicated — state inside them already survives
same-list refreshes, and resetting when the list *changes* is usually
correct.

The one case defaults get wrong is a **live list that reorders**: positional
identity means client state stays at position 0 while the entity that owned
it moves away. For that, name the occurrence by entity:

```tsx
<props.comment $key={c.id} cid={c.id}>…</props.comment>
```

If you know Solid 2.0's `<For keyed={item => key}>`, this is the same idea
in the one place references can't carry it: a response re-creates
everything, so identity across responses must be declared. Without `$key`
you have positional semantics (`keyed={false}`); with it, state follows the
entity through reorders, refetches, and navigations.

Two constraints, both by design:

- `$key` means something **only on projection calls**. On a DOM element it's
  just an attribute (server elements have no identity to name).
- Keyed occurrences must be **siblings** for reorders to follow the key —
  don't wrap each call site in its own server element; let the *client*
  wrapper (which the slot returns anyway) provide the per-item element. If a
  server-wrapped occurrence does get reordered, content stays correct but
  its client state resets.

Relatedly: `<For>` and `<Show>` inside a server component work fine, but
they're just one-shot control flow — a server component renders once per
response, so there's no live reactivity for them to manage and no interplay
with `$key`. Write `.map()` and ternaries if you prefer; they're the same
thing here.

## Using it from the client

There is no server-component API on the client. `dynamic` — the same
utility you'd use to swap any component — is the whole surface:

```tsx
import { dynamic } from "@solidjs/web";

function StoryPage(props) {
  const [collapsedAll, setCollapsedAll] = createSignal(false);

  // The source is tracked: when props.storyId changes it re-calls the
  // server function. The call resolves to a STABLE component for this
  // boundary — every response for the same boundary resolves to the same
  // reference — so dynamic's equals-gate sees nothing new and nothing
  // remounts. The real update rides the stream: server content morphs in
  // place underneath.
  const Story = dynamic(() => getStory(props.storyId));

  return (
    <Story
      comment={(p) => (
        <CollapsibleComment cid={p.cid} collapsed={collapsedAll()}>
          {p.children /* the server-owned comment body — wrap it, don't touch it */}
        </CollapsibleComment>
      )}
    >
      <ShareBar /* client-only, persists across every story */ />
    </Story>
  );
}
```

Things to notice:

- **Navigation is just a prop change.** No router ceremony required at
  this layer: the parent (or a router) changes `storyId`, the source
  re-fetches, the boundary morphs. And because the `dynamic()` lives
  inside `StoryPage`, each instance of the page is its own boundary —
  render two story panes and they're independent, with nothing declared.
- **`collapsedAll` never leaves the browser.** The request that fetches a
  story carries the story id and nothing else. This client-only state
  affects the current story and every future one this pane navigates to,
  and the server cannot see it.
- **First load composes with `<Loading>`; refetches don't re-fallback.**
  The initial call is a pending promise like any `lazy` component. A
  refetch resolves to the same component reference, so the swap is
  invisible to the tree — the only observable effect is the server content
  updating.

The trick making this zero-API is a transport policy, the mirror of the
server's `frameTransformResult`: when the client's server-function runtime
sees a frame-stream response, it streams the chunks into the boundary and
resolves the call with a per-boundary stable component (get-or-create).
That component does the mounting work at its one and only mount: create
the boundary element (or claim the server-rendered one at hydration),
register its props as the boundary's slots, dispose on cleanup.

Boundary identity is **derived, never declared**, and it lives in two
layers. On the wire, content is addressed by what the server naturally
knows: the function and its arguments — one logical stream per (function,
args). On the client, every call captures the reactive owner it was made
under — per *call*, not per network fetch, so caching layers that dedupe
requests don't hide it — and that owner binds the call site's boundary to
the logical stream it asked for. The owner is stable across refetches of
one source and unique per call site, so: a param navigation (same owner,
new args) keeps the same component reference — nothing remounts — and
rebinds the boundary to the new stream, morphing in place; two
`dynamic()`s over one function get independent boundaries with nothing to
spell; one component mounted in two places fans its stream out to both
instances, each with its own slots. Imperative calls outside any reactive
scope just warm content, binding nothing.
(`applyFrameResponse(response, host, { as })` remains the low-level
surface routers can drive directly.)

### The data layer is the same data layer

Because fetching a server component is just calling a server function, it
composes with the data patterns apps already use rather than growing its
own:

- **Wrap the section function in `query`** and route-level `preload` warms
  it on intent — the response's chunks buffer until a boundary mounts,
  then drain. The `dynamic()` read resolves through the same cached
  in-flight call.
- **`revalidate` is granular server-content refresh**: re-running the
  query streams a fresh version to every boundary bound to that logical
  stream.
- **Single-flight mutations generalize for free**: content is addressed by
  (function, args), which the server knows for every section a mutation
  invalidates — so the action response carries frames for all affected
  sections in one round trip, and the client routes each to its bound
  boundaries. Sections nobody currently displays are just cache warms.

Preloading, deduping, invalidation, and mutation single-flight need no
server-component-specific mechanism or API.

If a boundary ever *does* re-suspend during a refetch, nothing is lost:
Solid preserves the DOM off screen, the frame client morphs the detached
range as chunks arrive (nothing in it requires document connectivity), and
resolution restores the identical — already updated — nodes.

### Server wiring

Server components ride the ordinary server-function transport — one handler,
one hook:

```ts
import { handleServerFunctionRequest } from "@solidjs/web/server-functions/server";
import { frameTransformResult } from "@solidjs/web/frames/server";

export function handler(request) {
  return handleServerFunctionRequest(request, {
    transformResult: frameTransformResult, // fn result → streamed component
    provideEvent, // your platform's request-event scoping
  });
}
```

A server function that returns data behaves exactly as before. A server
function that returns a *function* streams it as a server component. Need
headers or a status? `return respond(Component, { status, headers })`.

## The initial page load

The first load is a normal streamed SSR document — server components render
inline, and the *client* components inside their positions render on the
server too, so the user sees a complete page before any JS runs. When the
client boots, it **adopts** that DOM rather than re-rendering it: client
components claim their already-rendered markup and bind behavior onto it.

This is where the single-copy rule pays off twice: the initial page has no
hydration data blob for server content (the HTML *is* the data), and
`<Loading>` boundaries stream on first load exactly as they do on
navigation.

One hard rule makes this coherent: **hydration happens once, at load time,
and never again.** After the client is alive, its state has diverged from
anything the server could assume, so the server never again renders client
components — post-load responses carry server content and args only, and
client components render client-side. This isn't a limitation to work
around; it's the boundary that makes state preservation sound.

## Streaming and async

`<Loading>` (Suspense) works inside server components with no ceremony:

```tsx
return (props) => (
  <article>
    <h1>{story.title}</h1>
    <Loading fallback={<CommentsSkeleton />}>
      <Comments /* async read in here */ />
    </Loading>
  </article>
);
```

The shell streams immediately with the fallback; the comments arrive as a
later chunk and reveal in place — on the initial document *and* on every
navigation response. Client positions declared inside the async content
mount when it reveals.

## The architecture contract

For anyone building on top of this (routers, data layers, other agents
working adjacent designs), these are the invariants you can rely on and
must not break:

1. **Everything ships once.** Server content travels as HTML. Values the
   client needs travel as data records. Nothing travels as both. (At initial
   load, values already rendered into the page are recovered *from* the
   page rather than re-sent.)
2. **Hydration is t = 0 only.** Never design a flow where the server renders
   a client component after the page is interactive.
3. **Boundary identity belongs to the client.** A boundary is a client-named
   frame id. Same id ⇒ morph in place ⇒ client state inside survives.
   Different id ⇒ independent boundary. Choose ids like you choose keys.
4. **Occurrence identity belongs to keys.** Iterated client positions keyed
   by entity id keep their state across refetches; unkeyed positions are
   positional.
5. **The server never sees client state; the client never re-renders server
   content.** Requests carry server inputs (function args). Server HTML is
   wrapped, moved, revealed — never rebuilt — by the client.

### What a router does with this

A router integration is thin by design: give each outlet a stable frame id;
translate URL changes into server-function calls; let a `dynamic` source
(or `applyFrameResponse(response, host, { as })` directly) stream the
result into the outlet's id. Back/forward is a re-fetch
into the same id — state inside the boundary survives because of invariant
3, not because the router did anything. Scroll restoration, pending UI, and
prefetching compose on top; none of them need to know how frames work
inside.

## What it costs

Measured, min+gzip, CI-guarded: the whole client machinery — store,
streaming, slot model, transport, the stable-component policy — is
**~5 KB** for an app already using server functions (~11 KB standalone,
dominated by the shared serializer).
The DOM reconciler inside it is 0.7 KB — smaller than micromorph. An app
that imports none of this pays **zero bytes**; that's enforced by the same
CI guard. For scale: the frame runtime costs about as much as Solid's core
renderer itself.

## What it is not

- Not RSC: no serialized element trees, no double-shipped content, and the
  client never diffs a payload against a virtual tree.
- Not islands: the page doesn't fragment into independent apps — one
  client tree wraps and threads through the server content, and navigation
  updates the lake without draining the islands.
- Not hypermedia-with-a-morpher: server updates preserve *client-owned*
  regions structurally, with data and composition flowing through typed
  positions rather than DOM conventions.
