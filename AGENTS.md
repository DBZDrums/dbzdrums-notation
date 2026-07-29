# Agent instructions for `@dbzdrums/notation`

This file is for coding agents. It complements, but does not replace, the human
contribution guide in [CONTRIBUTING.md](CONTRIBUTING.md) or the user-facing
[README](README.md).

## Repository contract

- Keep this a standalone TypeScript notation library. Do not introduce React,
  DBZDrums application types, persistence, playback, MIDI, PDF, or application adapters.
- Preserve the three boundaries in [docs/architecture.md](docs/architecture.md): pure
  bar/kit validation, deterministic MusicXML compilation, and browser-only OSMD SVG
  rendering.
- Treat the public exports in `src/index.ts`, documented README behavior, and generated
  MusicXML as compatibility-sensitive. Update user documentation and add tests when they
  change.
- Preserve the standard-kit technique contract: an unqualified hit is the base state,
  `normal` and `closed` are explicit but redundant primary techniques, and `default` is
  not a public technique. Standard-kit hits allow one primary technique; custom kits may
  additionally define ordered modifiers. Do not add combinations that lack clear
  drum-notation meaning.
- Prefer small, scoped changes. Do not alter generated `dist/`, Playwright reports, or
  visual snapshots unless the requested behavior intentionally changes.

## Working rules

- Inspect the relevant source, tests, and documentation before editing. Preserve existing
  user changes in a dirty worktree.
- Use `rg` for repository searches. Use `gh-axi` when available for GitHub operations or
  GitHub research. Use browser automation only to develop or debug the running browser
  experience, not to read public documentation.
- Do not create commits, push, change repository settings, publish a package, or create a
  release unless the user explicitly requests it.
- [docs/releasing.md](docs/releasing.md) is the human-owned release procedure.
  Agents may prepare its release files and run its validation only when asked;
  never create or push a release tag, approve an environment, or publish npm
  packages without explicit current-turn authorization.
- Keep audience-specific documentation separate: `README.md` is for consumers,
  `CONTRIBUTING.md` is for human contributors, and this file is for agents.
- Keep repository documentation limited to durable, public project information: library
  behavior, contribution workflow, public security-reporting policy, and architecture.
  Do not commit local planning, administrative checklists, unpublished roadmaps, internal
  contacts, repository permissions, deployment details, or incident notes.
- Use the ignored `MAINTENANCE.local.md` only for local, non-secret maintenance notes when
  the user requests them. Never commit it or copy its contents into issues, pull requests,
  release notes, or tracked documentation. Keep credentials and other secrets out of it;
  use an approved secret store instead.

## Required validation

| Change type | Required command |
| --- | --- |
| Source, types, validation, or MusicXML | `npm run check` |
| OSMD renderer, playground, or visual output | `npm run check` and `npm run test:browser` |
| Package metadata, entrypoints, or release files | `npm run check` and `npm run pack:check` |

For user-visible changes, add a Changeset unless the user explicitly says the change is
unreleased housekeeping. Report the commands run and any unrun relevant checks in the
handoff.
