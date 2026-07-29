# Contributing to `@dbzdrums/notation`

This guide is for human contributors. Coding agents follow the repository-specific
instructions in [AGENTS.md](AGENTS.md). Library users should start with the
[README](README.md).

## Local setup

The supported runtime is Node.js 20 or newer; the repository is maintained with npm
12.0.1. Install the lockfile exactly:

```sh
npm ci
npm run dev
```

The development server exposes the interactive notation playground. It is a development
tool and is not published as part of the package.

## Before opening a pull request

Run the checks that correspond to the change:

```sh
npm run check             # TypeScript, unit tests, and package build
npm run test:browser      # Required for renderer, playground, or visual changes
npm run pack:check        # Required for package or release changes
```

Run `npm run setup:browsers` once when Playwright browsers are not installed. Do not
update browser snapshots unless the rendered notation change is intentional and reviewed.

Keep the package independent from React and DBZDrums application types. Preserve the
boundaries described in [docs/architecture.md](docs/architecture.md).

## Changes, documentation, and releases

- Add a Changeset for every user-visible API, behavior, or package change:
  `npx changeset`.
- Update the README when a consumer-facing API, supported notation behavior, setup, or
  limitation changes.
- Update architecture documentation when a package boundary or durable design decision
  changes.
- Do not commit `dist/`, test reports, or other generated output; they are intentionally
  ignored and verified during packaging.

Releases are performed by project maintainers; the durable process is documented
in [docs/releasing.md](docs/releasing.md). Contributors should include the
appropriate Changeset, but must not bump versions, tag, or publish from a pull
request.

## Getting help and reporting problems

Use the GitHub issue forms for reproducible bugs and feature proposals. Do not put
security vulnerabilities in a public issue; follow [SECURITY.md](SECURITY.md) instead.
