---
"@dom-expressions/runtime": patch
---

Export patchDriver from the client and universal runtimes. Compiled patch-mode output imports it from the runtime module: with a patch-aware core (optional patchableRaw/registerPatch rxcore seams) records register on the store's patch channel; unaware cores and universal renderers run every compiled body through the classic dual-phase effect, so behavior is unchanged where the seams are absent.
