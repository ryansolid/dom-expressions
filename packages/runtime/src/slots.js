// Slot registry for multi-expression parents, in creation order (document
// order for compiled output). Token ownership and positional recovery only
// engage once a parent has more than one slot; single-slot parents keep using
// their physical marker as the ownership tag when one exists.
//
// Entries are append-only for a parent's lifetime. Stale entries may retain
// their last `current` arrays, but boundary scans only use nodes still in the
// parent and not tagged to another token-owned slot.
import { $$SLOT } from "./constants";

export function createSlot(current) {
  // Keep the shape stable for hot-path reads.
  return { current, shared: false, index: 0 };
}

export function registerSlot(parent, slot) {
  const existing = parent._$slots;
  if (existing === undefined) {
    parent._$slots = slot;
  } else if (Array.isArray(existing)) {
    slot.index = existing.length;
    existing.push(slot);
    slot.shared = true;
  } else {
    slot.index = 1;
    parent._$slots = [existing, slot];
    existing.shared = true;
    slot.shared = true;
  }
}

// First usable node in `parent` from a slot created after `slot`; falls back to
// the shared physical marker (or null = append). Used when the current slot
// cannot derive an insertion point from its own nodes.
export function slotBoundary(parent, slot, marker) {
  const slots = parent._$slots;
  if (Array.isArray(slots)) {
    for (let i = slot.index + 1; i < slots.length; i++) {
      const s = slots[i];
      const cur = s.current;
      if (!cur) continue;
      for (let j = 0; j < cur.length; j++) {
        const n = cur[j];
        if (n && n.nodeType && n.parentNode === parent) {
          const t = n[$$SLOT];
          if (t && !t.nodeType && t !== s) continue;
          return n;
        }
      }
    }
  }
  return marker || null;
}
