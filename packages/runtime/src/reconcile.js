// Slightly modified version of: https://github.com/WebReflection/udomdiff/blob/master/index.js
import { $$SLOT } from "./constants";
import { slotBoundary } from "./slots";

export default function reconcileArrays(parentNode, a, b, marker, slot) {
  let bLength = b.length,
    aEnd = a.length,
    bEnd = bLength,
    aStart = 0,
    bStart = 0,
    tail = a[aEnd - 1],
    tailTag = tail[$$SLOT],
    // If the tail is no longer owned by this slot, its nextSibling may point
    // into another region. Recover from a later slot boundary when available,
    // otherwise fall back to the physical marker/null anchor.
    after =
      tail.parentNode === parentNode && (!tailTag || tailTag === slot || tailTag === marker)
        ? tail.nextSibling
        : slot
          ? slotBoundary(parentNode, slot, marker)
          : marker || null,
    map = null,
    anchor,
    anchorTag;

  while (aStart < aEnd || bStart < bEnd) {
    // common prefix
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }
    // common suffix
    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }
    // append
    if (aEnd === aStart) {
      let node;
      if (bEnd < bLength) {
        if (bStart) {
          const prev = b[bStart - 1];
          const prevTag = prev[$$SLOT];
          node =
            prev.parentNode === parentNode && (!prevTag || prevTag === slot || prevTag === marker)
              ? prev.nextSibling
              : after;
        } else node = b[bEnd - bStart];
      } else node = after;

      while (bStart < bEnd) {
        const n = b[bStart++];
        // A migrated anchor may also be in `b`; skip the self-insert.
        if (n === node) node = n.nextSibling;
        else parentNode.insertBefore(n, node);
        if (slot && n[$$SLOT] !== slot) n[$$SLOT] = slot;
      }
      // remove
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        const n = a[aStart++];
        if (!map || !map.has(n)) {
          const tag = n[$$SLOT];
          if (n.parentNode === parentNode && (!tag || tag === slot || tag === marker)) n.remove();
        }
      }
      // swap backward — symmetric end-swap detected. Walk inward with a single
      // stable front anchor (a[aStart]); each move targets the same DOM-position
      // so the browser's adjacency cache stays warm and per-call native
      // `insertBefore` cost drops sharply on reorder-heavy patterns (e.g. reverse).
      // Only optimize when the anchor still belongs to us; otherwise fall through
      // to the map branch which gates each destructive op. The anchor and its
      // tag are read once per detected swap and reused — important on hot
      // reorder benches (`reconcile-permute reverse`) where this branch fires
      // on every inner-loop step.
    } else if (
      (anchor = a[aStart]) === b[bEnd - 1] &&
      b[bStart] === a[aEnd - 1] &&
      anchor.parentNode === parentNode &&
      (!(anchorTag = anchor[$$SLOT]) || anchorTag === slot || anchorTag === marker)
    ) {
      // Tightest inner loop in the file; one `insertBefore` per iter plus an
      // end-condition probe. Splitting on `slot` avoids a per-iter branch in
      // the hot path — js-framework-benchmark `05_swap1k` regresses ~6.5% when
      // this is collapsed (validated 2026-05-16 on Chrome headless).
      if (slot) {
        do {
          const n = a[--aEnd];
          parentNode.insertBefore(n, anchor);
          if (n[$$SLOT] !== slot) n[$$SLOT] = slot;
          bStart++;
          if (aStart >= aEnd - 1 || bStart >= bEnd) break;
        } while (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]);
      } else {
        do {
          parentNode.insertBefore(a[--aEnd], anchor);
          bStart++;
          if (aStart >= aEnd - 1 || bStart >= bEnd) break;
        } while (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]);
      }
      // fallback to map
    } else {
      if (!map) {
        map = new Map();
        let i = bStart;

        while (i < bEnd) map.set(b[i], i++);
      }

      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart,
            sequence = 1,
            t;

          while (++i < aEnd && i < bEnd) {
            if ((t = map.get(a[i])) == null || t !== index + sequence) break;
            sequence++;
          }

          if (sequence > index - bStart) {
            const head = a[aStart];
            const headTag = head[$$SLOT];
            const node =
              head.parentNode === parentNode && (!headTag || headTag === slot || headTag === marker)
                ? head
                : after;
            while (bStart < index) {
              const n = b[bStart++];
              parentNode.insertBefore(n, node);
              if (slot && n[$$SLOT] !== slot) n[$$SLOT] = slot;
            }
          } else {
            const oldNode = a[aStart++];
            const newNode = b[bStart++];
            const oldTag = oldNode[$$SLOT];
            if (
              oldNode.parentNode === parentNode &&
              (!oldTag || oldTag === slot || oldTag === marker)
            ) {
              parentNode.replaceChild(newNode, oldNode);
            } else {
              parentNode.insertBefore(newNode, after);
            }
            if (slot && newNode[$$SLOT] !== slot) newNode[$$SLOT] = slot;
          }
        } else aStart++;
      } else {
        const n = a[aStart++];
        const nTag = n[$$SLOT];
        if (n.parentNode === parentNode && (!nTag || nTag === slot || nTag === marker)) n.remove();
      }
    }
  }
}
