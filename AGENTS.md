# AI Agent Guidelines

This repo uses the same policies for AI-assisted work as for human contributors.

## Required Reading

- [`VERSIONING.md`](./VERSIONING.md) — version ranges, prerelease workflow, and
  the `0.41`–`0.49` reservation for the Solid 1.x maintenance line.
- [`.cursor/rules/`](./.cursor/rules/) — concrete rules for architecture, the
  babel plugin, the DOM runtime, engineering standards, releases, and testing
  patterns. Read these before making changes.

## Release Policy (Summary)

Any change with a consumer-visible effect must ship with a Changeset in
`.changeset/`. During the current `next` prerelease window, **every changeset
must use `patch`** — `minor`/`major` will overshoot the `0.50.0` target. See
[`.cursor/rules/releases.mdc`](./.cursor/rules/releases.mdc) for the full
policy, fixed-group convention, and changeset template.
