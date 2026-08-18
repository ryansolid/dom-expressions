---
"@dom-expressions/compiler": patch
---

The WASI compiler binary links on rust-lld 1.95 again. `napi-build` 2.4.1 hard-exported `emnapi_create_env` / `emnapi_delete_env` for emnapi v2 archives; we still ship emnapi 1.x, so those `--export`s now use `--export-if-defined`.
