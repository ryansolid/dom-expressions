---
"@dom-expressions/runtime": patch
---

Adopted server-component boundaries no longer drop nested `{$frame}` regions
on their first post-boot stream (#547). Three coordinated fixes:

- The t=0 recoverability check strips `_hk` attributes (they embed the
  occurrence's `$key`), so `cid === $key` occurrences arm their records
  instead of matching their own wrapper's hydration key.
- A slot record whose only difference is ADDED `{$frame}` refs to regions
  the occurrence already holds counts as unchanged — the t=0 record omits
  used regions by design, so the first stream always re-introduces them;
  re-calling would tear out the live ranges. Region discovery now runs for
  armed adopted mounts too (previously record-less only), and a record-less
  adoption's baseline is empty args.
- `SlotContext` gains `adopted`: true only for the hydration-attach mount of
  an adopted range — the one invocation a consumer may answer with a claim.
  Stream-driven re-calls leave it unset and must render for real; claiming
  them silently dropped whatever the re-call displaced.
