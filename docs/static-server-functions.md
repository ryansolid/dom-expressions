# Static Server Functions

*A usage-and-integration guide. For the request-time server function ABI
these build on, see the doc comments in
`packages/runtime/src/server-functions/`.*

## The idea in one paragraph

Some server functions are reads whose answers are fully determined at build
time — docs pages, marketing content, configuration that ships with a
release. Running a server (or a lambda) to answer them in production is
pure overhead. A **static server function** is declared like a `GET` read,
runs normally during development and server-side rendering, and during a
**prerender build** every call it actually receives is captured to a static
artifact file. The production client then answers the same calls by
fetching those files from a static host — no function executes at request
time. A call the prerender pass never exercised **throws** in production:
coverage is the build's responsibility, and a miss is a build error
surfaced loudly, never a silent fallback to a live endpoint the deployment
may not even have.

## Declaring one

Wrap the reference at its declaration, exactly like `GET(fn)` — the
compiler round-trips the wrapper call in both builds, so no compiler or
bundler changes are involved:

```ts
export const getDocs = staticFunction(async (slug: string) => {
  "use server";
  return loadDocs(slug);
});
```

What the declaration does on each side:

- **Both halves** brand `{ method: "GET", static: true }` on the metadata
  channel (`getServerFunctionMetadata(fn)`), composing with `withMeta` in
  either order. Routers and integrations detect static-ness from there.
- **Server half** is identity-flavored — SSR calls stay in-process — and
  grants GET dispatch (static implies GET; development and build-time
  clients call over the live GET transport). It also enrolls the id for
  prerender capture.
- **Client half** behaves exactly like the `GET` wrapper in development
  (`process.env.NODE_ENV !== "production"`): a live GET request, so
  iteration never waits on an artifact build. In production it fetches the
  artifact instead (below).

## Key derivation

Both peers must independently name the same artifact for the same call.
The derivation is shared (`packages/runtime/src/server-functions/shared.js`)
and fully deterministic:

1. `encodeArgumentsKey(args, codec)` produces the canonical encoded-args
   string: `""` for no arguments; **sorted-key JSON** when the argument
   list is JSON-safe (plain `JSON.stringify` preserves insertion order, so
   `{ a, b }` and `{ b, a }` would otherwise produce different keys and a
   spurious production miss); otherwise the codec's framed
   `serializeString` output. The codec options must match across peers,
   like everywhere else in the protocol.
2. `getStaticCacheKey(id, args, codec)` returns `{id}-{hash}` — the id
   plus an FNV-1a hex hash of the id and the encoded arguments. The key
   doubles as a filename and a URL path segment, so characters that cannot
   ride either (`#` starts a URL fragment, `/` a path segment) are
   normalized out of the readable prefix; the raw id still participates in
   the hash, so normalized-away distinctions never collide.
3. `staticArtifactName(key)` returns `{key}.txt`.

## Artifact format

An artifact stores the **framed codec string** — the exact bytes the live
GET response body would have carried: length-prefixed chunks of serialized
data, with async values (promises, streams) resolved and folded in at
capture time. It is *not* JSON, which is why the extension is `.txt`
(matching the live wire's `text/plain`) rather than a misleading `.json`.
The production client decodes it with the same `deserializeStream` path it
uses for live responses, so rich types (Dates, Maps, typed arrays) and
resolved async values round-trip identically.

## The prerender integration contract

Core owns key derivation and capture; the framework/bundler owns the
writer. Artifact generation is **execution-driven, not enumerated**: the
argument space of a function cannot be known statically, so the artifact
set is by definition the set of calls the prerender pass exercised.
Whatever static functions the rendered pages actually call run in-process
(or over HTTP GET, for crawled prerenders), and each settled `(id, args)`
pair produces one artifact through the `staticCache` seam:

```ts
configureServerFunctionsServer({
  staticCache: {
    async set({ filename, payload }) {
      await fs.writeFile(path.join(clientOutDir, "_server-static", filename), payload);
    }
  }
});
```

The entry also carries `id`, `key`, `args`, and the settled `value` for
writers that want manifests or logging. Capture fires from both prerender
call paths — the in-process apply trap and `handleServerFunctionRequest`
GET dispatch — after result transforms, and only for plain values: thrown
errors, raw `Response`s, and `ResponseEnvelope`s are skipped (HTTP metadata
cannot ride a static file; development builds warn when it happens). A
capture failure warns and never breaks the call it observed.

Integration obligations:

1. **Resolve the client output directory at prerender time, not
   bundler-config time.** TanStack's static server functions hit exactly
   this with Nitro: the output directory was baked into the bundler config
   before Nitro had decided where the client build actually lands, and the
   artifacts were written to the wrong place. Read the destination when the
   prerender pass starts, from the final resolved build output.
2. **Keep the writer's path prefix in sync with the client's
   `staticEndpoint`** (default `/_server-static`) — typically both pinned
   from one framework config value.
3. **Prerender every page whose static calls the client will replay.**
   Coverage is execution-driven; a production call with no artifact throws.
4. **Dedup is the writer's choice.** The same `(id, args)` across pages
   yields the same filename; overwrites are idempotent.

Dev servers and non-prerender deploys configure nothing: without a
`staticCache` the capture branch never runs, and clients use the live GET
transport.

## Production client behavior

`configureServerFunctionsClient({ staticEndpoint })` names where artifacts
are served from (default `"/_server-static"`). A production call:

1. answers from `responseHandler.intercept` first if the integration holds
   the result locally (the hydration seam, same as every reference);
2. derives the cache key and fetches
   `${staticEndpoint}/${staticArtifactName(key)}` as a **plain asset
   fetch** — no server-function headers and no `prepareRequest`, because
   nothing answers but a file server;
3. decodes the framed body and resolves the value; or
4. **throws on any non-OK response**, naming the function id and key. A
   miss means the `(function, arguments)` pair was never executed during
   prerendering — fix the build's coverage, don't catch the error.

## Possible later tooling (out of scope)

The Rust directive transform already emits per-module
`functions: [{ id, name, exports }]` metadata; extending it to flag static
declarations would enable build-time coverage warnings, or eager execution
of zero-argument static functions that no prerendered page happens to call.
