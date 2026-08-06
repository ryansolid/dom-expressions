---
"@dom-expressions/runtime": patch
---

`useHead`: suspend on pending props during a Loading discovery pass instead
of dropping the tag (solid #2975).

Head props are lazy descriptors that nothing reads during render, so an
async value (`<title>{data()}</title>`) never suspended its enclosing
boundary — the pending read surfaced only at flush, where the tag was
warn-dropped and the fallback never showed. Registration now probes the
descriptor's prop/key getters when the reactive library marks a Loading
discovery pass (`_loadingPhase` on the hydration context — the only render
phase with a retryable NotReady catch) and rethrows a NotReady so the
boundary suspends like any other async content; the retry re-registers with
ready values and the resolved tag rides the boundary's stream as a head
patch. The probe's result is discarded — flush evaluation stays
authoritative — and registrations outside a Loading pass keep the
flush-time warn-and-drop path (rethrowing there has no retryable catch and
would loop a wider re-rendering scope). Pending resource-tag props under a
Loading pass suspend the same way; identity dedupe absorbs the retry's
re-emission.
