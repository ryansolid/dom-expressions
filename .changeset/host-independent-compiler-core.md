---
"@dom-expressions/compiler": patch
---

Expose a host-independent Rust compile API while keeping the existing Node
adapter and its interface enabled by default. The Rust API surface is
unstable pre-1.0 and carries no semver commitment; the Node `transform()`
interface remains the supported public contract.
