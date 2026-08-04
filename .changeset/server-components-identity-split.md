---
"@dom-expressions/runtime": minor
---

Server components Stage 2 (identity split + one record shape, per docs/server-components-principles.md):

- **A5 — one record shape.** The t=0 document emits the same slot/region records a stream would: every invoked occurrence gets a record, and every region arg rides as its `{$frame}` address ref (used or occluded). The consumer's region-threading patches and the #547 `$frame`-addition leniency delete with the skew.
- **Resident-store host.** The frame host owns per-id stores as first-class residents: chunk writes land whether or not anything is mounted, and registering frames seed from the store. The unregistered-chunk buffer, retention snapshots, and sibling seeding all delete into that one shape; preloads warm stores by construction.
- **DR-1 — the identity split.** `createServerComponentHandler` mints ONE mount component per server function and resolves calls with per-address **bindings** (`COMPONENT_BINDING: { component, address }`, the address delivered as a second-argument accessor). An equals-gated reader keeps its instance across argument changes and delivers the new address; the instance re-binds its frame's pull to the new address's store. The `COMPONENT_HANDOFF` protocol, `forwards` map, `documentComponent` seam, and the flight `route` map are deleted.
- Region discovery membership is structural (dotted id inside this interior) instead of producer-prefix-matched, so address-keyed mounts adopt function-id-prefixed markup.
- Guards against a recycled occurrence name's up-threaded record removal deleting a newer stream's live record.

Net −402 B on the frames consumer bundle (8,610 → 8,208 min+gzip); size guard ratcheted to 8,228.
