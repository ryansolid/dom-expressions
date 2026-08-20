---
"@dom-expressions/runtime": patch
---

Behavior claims, client half: frames sweep materialized/adopted subtrees for `_bnd` markers — stamping each marked element with its owning frame, arming document listeners for claimed event types, and firing ref positions once per (element, prop) with morph-replacement re-fire. The delegation walk resolves marked elements at dispatch time by prop name through the frame's live client props (`FrameOptions.props`), so re-renders are latest-props by construction.
