---
"@dom-expressions/runtime": patch
---

Make server-rendered action urls fully self-describing for client interception:

- The server handler now honors url-encoded bound arguments (`?args=`) for instance-carrying POSTs whose body is a natural HTTP encoding (FormData, urlencoded), not just no-JS posts and GETs. A router intercepting a form whose `action` url came off the wire can post the form data to it verbatim and get the same `[boundArgs..., formData]` reconstruction the no-JS path performs. Codec-serialized bodies are unaffected — client stubs with bound arguments serialize the full argument array in the body and never put arguments in the url.
- `createServerReference(id, name, base?)` accepts an explicit base url, targeting calls at it verbatim (preserving `?args=`) instead of deriving from the configured endpoint, so integrations can reconstruct a callable from a server-rendered action url while keeping `prepareRequest` hooks, codec config, and single-flight headers uniform.
