# Versioning

This repository uses [Changesets](https://github.com/changesets/changesets) with
all four published packages pinned together as a `fixed` group in
`.changeset/config.json` — every release bumps them in lockstep.

## Version ranges

- **`0.40.x`** — Solid 1.x maintenance line. Patched on a long-lived maintenance
  branch for security and critical fixes only.
- **`0.41.0` – `0.49.x`** — **Reserved.** Intentionally left unused to give the
  Solid 1.x maintenance line room to grow if a breaking bump is ever required
  there. Do not publish into this range from this branch.
- **`0.50.0`+** — Active development, targeting Solid 2.x. This is the current
  `main`/`next` line.
- **`1.0.0`** — Deferred. Will be cut once the runtime contract (including
  anything that Server Components / Resumability require) is stable enough to
  commit to semver.

## Prerelease workflow

Active development runs in Changesets prerelease mode with the `next` tag. Every
release publishes as `X.Y.Z-next.N`.

Adding a change:

```sh
pnpm changeset
```

When prompted, select **`patch`** for the bump type. During a prerelease window
aimed at an eventual `X.Y.0` stable release, `minor` or `major` changesets will
overshoot the target — keep everything at `patch` unless you intend to bump the
stable target.

Releasing a prerelease:

```sh
pnpm changeset version   # consumes pending changesets, bumps -next.N
pnpm install              # updates lockfile
git commit -am "chore: version"
pnpm publish:release      # builds + publishes
```

Exiting prerelease (when ready to cut stable):

```sh
pnpm changeset pre exit
pnpm changeset version    # drops -next.N suffix, produces final version
```

Before running `pre exit`, verify with `pnpm changeset status --verbose` that no
accumulated changeset has a `minor` or `major` bump — otherwise the exit version
will skip past the intended target.
