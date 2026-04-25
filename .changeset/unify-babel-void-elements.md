---
"babel-plugin-jsx-dom-expressions": patch
---

Unify the compiler's void-element list with the runtime's `VoidElements` set in `dom-expressions/src/constants`. The compiler previously kept its own array (`src/VoidElements.ts`) that still contained the long-deprecated `keygen` and `menuitem` tags. Both have been removed from the HTML standard and are no longer parsed as void by modern browsers, so the compiler now emits closing tags for them — which is the correct behaviour in current browsers and was a latent bug otherwise. All other void elements are unaffected.
