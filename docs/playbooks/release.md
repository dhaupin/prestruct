---
layout: default
title: Releasing a version
description: "Bump, roll the changelog, push the tag, and watch the two release lanes prove the cut."
nav_order: 25
version: 1.2.0
permalink: /playbooks/release/
---

# Releasing a version

A release is a tag. Two workflows fire on it: `release.yml` builds the
copy-shipped starter zip, and `publish.yml` runs the npm trust ladder. The
tag, not a finger, starts both.

Green the gate first. It is the same aggregate CI runs, and `prepublishOnly`
is set to it, so a red gate cannot mint a tarball.

```bash
npm run gate
npm pack --dry-run            # confirm the tarball: bin/, engine/, init/ only
```

Bump the version, roll the changelog and the announcement, then push the tag.

```bash
npm version minor             # or patch - updates package.json + commits + tags
# roll docs/guides/changelog.md (## <version>) and add docs/discussions/announcing-v<version>.md
git push origin main --follow-tags
```

The changelog heading is what `scripts/release-notes.cjs` extracts for the
GitHub release body. The matcher accepts `## 1.2.0`, `## v1.1.0`, and
`## [1.0.0]` forms. An empty extraction refuses the cut, so a version with no
changelog section mints no release.

What the tag sets off:

- `release.yml` (`v*.*.*`) builds the starter zip, runs the zip's own test
  battery from the extracted artifact, then attaches the zip to the GitHub
  release.
- `publish.yml` (`v*`) runs the ladder: `publish` (OIDC trusted publishing,
  the gate riding along, 0.x refused, tag must equal the packaged version),
  `release` (the GitHub release object and its changelog notes), and `verify`
  (the post-publish truth).

The `verify` job is the one that makes green mean something. It checks the
registry's latest, the served tarball's sha512 against the registry integrity,
provenance attestations, the full pack ladder, the release object's target
commit, and the source tarball against `git archive`. One disconnect reads red
after the cut looked green.

If a later workflow fix needs a re-run without re-publishing, dispatch
`publish.yml` with mode `verify-only`: the verify job runs alone against what
is already served.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/playbooks/' | relative_url }}">all playbooks</a></p>
</div>
