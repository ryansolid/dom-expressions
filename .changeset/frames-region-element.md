---
"@dom-expressions/runtime": patch
---

Frame regions (server content passed through a client wrapper — `props.children` / `<props.comment>{serverJSX}</props.comment>`) are now DOM elements instead of comment-marker ranges, completing the boundary+region half of the element-seams decision (`docs/frame-seams-decision.md`). A region is `<dx-frame>` (`display:contents`, layout-transparent) — the same DOM contract as the boundary, one level down. The wrapper places the region element; on re-call it re-places the same single node (the platform moves the subtree), replacing the marker-range fragment-refill dance. The document producer emits region elements at t=0; the consumer discovers them with a scoped element walk instead of a flat-comment-list + depth-stack pairing.

Net: the depth-stack region discovery, the fragment-refill in `#resolveArgs`, and the `frame:`-marker range helpers (`frameRegionStartId`/`afterFrameRegion`/`FRAME_REGION_START`) are deleted. The frames consumer drops 6550 → 6331 gz (254 below its pre-decision 6585; core stays 51 lighter for every app from the boundary half). Behavioral change to note: server content inside a region now sits inside a `display:contents` element rather than directly between markers — visually identical, but `parentElement` of the content is the region element. Slots (client positions inside server HTML) remain ranges by design.
