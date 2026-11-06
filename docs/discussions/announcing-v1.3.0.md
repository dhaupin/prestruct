---
version: 1.3.0
permalink: /discussions/announcing-v1.3.0/
layout: default
title: "Announcing prestruct v1.3.0"
comments: false
nav_order: 24
---
# prestruct v1.3.0

prestruct is a build-time SEO prerender tool for Vite + React apps. v1.3.0 is the security round since v1.2.0: the opt-in external audit lane learned to refuse a private host before any socket and to re-check the host on every redirect hop, and the family's docs lane folded into one reusable workflow this repo calls. Everything is cumulative on the four-stage pipeline (validate, vite build, inject-brand, prerender). It will be on npm at tag time:

```bash
npm i -D prestruct
```

## What landed

**The external audit lane refuses a private host before any socket.** `prestruct audit --external` fetches the URLs a baked tree names, and a baked tree can be attacker-influenced (a CMS field, a scraped page, a dependency's demo HTML). That made the pass a server-side request forgery primitive: a link to `http://169.254.169.254/...` (cloud metadata), `http://127.0.0.1:<port>/` (a co-located service), or an internal `http://10.0.0.5/` would make the run probe a host the tree's author cannot reach directly, and report the status back in the findings. `engine/scripts/audit.js` now classifies each URL's host **literal** - a network-free, deterministic call - and refuses a private, loopback, link-local, unique-local, or otherwise non-public address before any probe. The classifier covers every spelling a parser accepts (dotted quad, bare integer, octal, hex, short forms, IPv6, the IPv4-mapped/translated/compatible/NAT64/6to4 carriers the URL parser rewrites to hex, and the explicit-root trailing dot), plus the reserved names `localhost`/`*.local`. A refused URL is a WARN finding (`refused: ... SSRF guard`), never a silent skip, and it does not count as `checked`; the summary line and the returned `blocked` count name it.

**The host is re-checked on every redirect hop.** The literal guard checks the URL the pass is handed - not where the server points it. `headCheck` used `redirect: 'follow'`, so a public URL could answer `302 Location: http://169.254.169.254/latest/meta-data/` and the runtime would open the socket to the metadata IP before the guard ever saw the target. `headCheck` now follows redirects manually, one hop at a time, resolving each `Location` against the current hop and re-running the host check on every hop; a hop that lands on a private host is a WARN finding naming the refusal, a public-to-public redirect still resolves to its final answer, and `MAX_REDIRECTS` (5) bounds the chain. `headCheck` is exported so the battery drives it against a real loopback redirect server.

**The docs lane is one lane.** The family built docs from four topologies and the reusable lanes had drifted (ruby 3.2 vs 3.4, pagefind `latest` scrape vs npm pin). The lane is now one canonical reusable workflow in `dhaupin/freestruct`, and this repo is a thin caller of it. The strict link check is back on: the lane pins freestruct 1.2.0, whose checker strips `basePath` before resolving root-absolute hrefs, so a baseurl'd site no longer false-fails on its own nav - proven against a real Jekyll build (0 broken across 37 pages), not asserted.

## Quality layer

Every fix was reproduced first, then corrected, then pinned. The SSRF legs are hermetic: a classifier table plus a no-socket refusal, with the redirect leg driving a real loopback redirect server. A public name that DNS-rebinds to a private address is a separate class (TOCTOU at resolution time) a literal check cannot see; it is noted, not claimed.

## Links

- Repo and docs: https://github.com/dhaupin/prestruct / https://prestruct.creadev.org
- Changelog: https://github.com/dhaupin/prestruct/blob/main/CHANGELOG.md
- Issues: https://github.com/dhaupin/prestruct/issues
