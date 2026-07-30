# Releasing `@dbzdrums/notation`

This document is the durable release procedure for maintainers. It is not a
roadmap or a release checklist for uncommitted work.

## Release contract

- Releases use Semantic Versioning and an annotated Git tag named `vX.Y.Z`.
- The tag must point to a commit already reachable from `main`.
- The tag version must exactly match the `version` in `package.json`.
- Pushing the tag starts the **Release** workflow. Its validation job runs the
  package checks, browser tests, and package-content check before the publish
  job can request approval for the GitHub `npm` environment.
- After approval, the workflow publishes with npm provenance. The normal path
  uses npm trusted publishing and GitHub Actions OIDC; no persistent npm token
  is needed.

The workflow rejects lightweight tags, mismatched tag and package versions,
and tags that do not come from `main`. It intentionally has no manual-dispatch
trigger. Do not run `npm publish` from a local checkout.

## Routine release

The repository Makefile automates the normal flow. It requires a clean local
`main`, verifies that it contains the current remote `main`, rejects existing
local or remote tags, and uses an atomic push so `main` and its release tag are
published together. It never runs `npm publish`. These targets are for routine
releases after the initial-publication bootstrap described below.

```sh
make full-release
```

`full-release` derives the Semantic Version from the pending Changesets, then
synchronizes `package-lock.json`, commits only release metadata as
`chore: release vX.Y.Z`, runs package and browser validation, creates the
annotated `vX.Y.Z` tag, then pushes `main` and the tag. For a review point
between stages, first run the versioning target and inspect the generated
version in `package.json`. Then substitute that version for `X.Y.Z` below:

```sh
make release-prepare
make release-commit VERSION=X.Y.Z
make release-tag VERSION=X.Y.Z
make release-push VERSION=X.Y.Z
```

Review the validation job, then approve the pending deployment to the `npm`
environment. A successful publish makes the version permanent in the npm
registry; never reuse a published version number.

## Trusted publisher configuration

The npm package must authorize exactly this GitHub Actions identity:

| Setting | Value |
| --- | --- |
| GitHub organization | `DBZDrums` |
| Repository | `dbzdrums-notation` |
| Workflow filename | `release.yml` |
| Environment | `npm` |
| Allowed action | `npm publish` |

After the package exists, configure it from the npm package settings or with
the following interactive command (npm requires 2FA for this action):

```sh
npm trust github @dbzdrums/notation \
  --file release.yml \
  --repo DBZDrums/dbzdrums-notation \
  --env npm \
  --allow-publish
```

Confirm the result with `npm trust list @dbzdrums/notation`. In npm package
settings, then choose **Require two-factor authentication and disallow tokens**
under **Publishing access**.

## One-time initial-publication bootstrap

npm requires the package to exist before a trusted publisher can be configured.
The first publication is therefore the sole bootstrap exception to the normal
OIDC-only process:

`0.1.0` is the first intended registry version for this repository. Before that
initial publication, changesets created during pre-release development do not
represent increments from an already published package. Update the `0.1.0`
changelog entry and remove those accumulated changesets during release
preparation; do not run `changeset version`, which would incorrectly promote
the unpublished baseline. After `0.1.0` is published, use the normal changeset
versioning flow for every release.

1. Create a short-lived granular npm token with read/write access restricted to
   the `@dbzdrums` scope and the minimum expiry allowed by npm. Enable bypass
   2FA only for this one non-interactive publish.
2. Add it as the `NPM_PUBLISH_TOKEN` **environment secret** of GitHub's `npm`
   environment, never as a repository secret or tracked file.
3. Follow the routine-release procedure. The environment approval protects the
   workflow before that temporary credential is available to it.
4. Configure the trusted publisher immediately after the successful first
   publish, then remove the environment secret and revoke the temporary token.
5. Restrict package publishing to 2FA and disallow traditional tokens as
   described above.

The `NPM_PUBLISH_TOKEN` reference in the workflow is intentionally empty during
normal releases. npm prefers the GitHub OIDC trusted-publishing credential when
the trusted publisher is configured.
