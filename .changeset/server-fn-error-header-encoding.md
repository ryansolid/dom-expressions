---
"@dom-expressions/runtime": patch
---

Encode non-latin1 error messages safely in the `X-Server-Function-Error` header. Header values are latin1 ByteStrings, so a thrown error whose message contained CJK, emoji, or other non-latin1 characters made `Headers.set` throw and collapsed the whole call into a bare 500 (solidjs/solid-start#1874 / #2215 — the guard from Start's bespoke handler was lost when the core runtime took over this path). Plain printable-latin1 messages still ride the header verbatim (the historical wire format, byte-identical); anything else travels percent-encoded behind a `=?1?` marker, with CR/LF stripped and lone surrogates well-formed first, so the decoded message round-trips exactly — astral-plane characters included. `ERROR_HEADER`, `encodeErrorHeaderValue`, and `decodeErrorHeaderValue` are exported from the shared/server/client entries (tagged `@internal`) for integrations that surface the header themselves.
