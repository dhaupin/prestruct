---
version: 1.2.0
permalink: /discussions/
layout: default
title: Release Posts
description: The release-post system - one announcing-vX.Y.Z.md per release, the file IS the announcement, drafted against the released npm version, gated like every docs page.
comments: false
nav_order: 24
---

# Release posts

One post per release, the conventions prestruct pioneered and the creadev family adopted: crashtest carried the shape forward and the struct-family first releases follow it so approaches to the community discussion stay uniform. The post lives in `docs/discussions/` as versioned source so the release trail is in the same tree as the changelog it summarizes, and the file's raw markdown IS the GitHub Discussions announcement - view source on the file, copy, strip the frontmatter, post.

Prose on these pages flows - paragraphs keep their natural length, and nothing in the toolchain re-wraps them at commit time. Hard-wrapped prose is a commit-time artifact, and it dies at every reflow of an upstream forum renderer. Tables and frontmatter keep their own natural line lengths.

## The conventions

- **One file per release, named after it.** `announcing-vX.Y.Z.md`, matching the npm version on the day the post is drafted. Never reuse a filename; if a release gets a retry, fold the delta into the same post instead.
- **Frontmatter contract.** Same five required fields every docs page gates on (`version`, `permalink`, `layout`, `title`, `nav_order`), plus `comments: false`. The permalink is `/discussions/announcing-vX.Y.Z/`.
- **The file IS the post.** No wrapper prose, no nested copy block: below the frontmatter the file carries the announcement body itself, so the source of the doc is the source of the post. To publish, copy the raw markdown from GitHub, stripping ONLY the frontmatter lines at the top. The posting mechanics live in this index, never inside a post.
- **Voice and facts.** The same rules every page here gates on (the style/voice checker plus the fiction-signature scanner): no marketing language, and every number and claim verified against the shipped artifact before it lands. If you cannot run it, do not write it.
- **Timing.** Draft the post against the released version, not the dev tree: cite what shipped in the npm tarball, and keep unreleased changelog rows out of it. A post describing a version that is not on npm yet is fiction by promotion.
- **Gates.** `npm run lint:docs` runs on these files like everything else - frontmatter, heading levels, the dash and cliche scans, fiction signatures, and the Jekyll filter trap.

## The index

| post | version | live |
| --- | --- | --- |
| [Announcing prestruct v0.9.0](/prestruct/discussions/announcing-v0.9.0/) | 0.9.0 | 2026-10-21 on npm - the manual bootstrap release |
| [Announcing prestruct v1.0.0](/prestruct/discussions/announcing-v1.0.0/) | 1.0.0 | 2026-10-21 on npm - the first stable release |
| [Announcing prestruct v1.1.0](/prestruct/discussions/announcing-v1.1.0/) | 1.1.0 | on npm |
| [Announcing prestruct v1.2.0](/prestruct/discussions/announcing-v1.2.0/) | 1.2.0 | on npm - the current release |

History: prestruct pioneered the format, crashtest adopted it, and the struct-family first releases follow the same shape so approaches to the community discussion stay uniform across the creadev family.
