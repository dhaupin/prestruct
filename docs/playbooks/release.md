---
layout: default
title: Releasing a version
description: "Bump, roll the changelog, push the tag, and watch the two release lanes prove the cut."
nav_order: 25
version: 1.2.0
permalink: /playbooks/release/
---

# Releasing a version

A release is a tag. One workflow fires on it: `publish.yml` runs the npm trust
ladder and cuts the GitHub release from the same tag. The tag, not a finger,
starts the lane.

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

What the tag sets off, all inside `publish.yml`:

- `publish`: OIDC trusted publishing. The `prepublishOnly` gate rides along,
  0.x is refused, and the tag must equal the packaged version.
- `release`: the GitHub release object for the tag, its body the matching
  `CHANGELOG.md` section. Idempotent, so a re-fired tag carries on to verify.
- `verify`: the post-publish truth.

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
