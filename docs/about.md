---
layout: default
title: About
description: "Who builds prestruct, the struct family it belongs to, the demo site it ships, and the MIT license and provenance terms."
nav_order: 27
version: 1.2.0
permalink: /about
---

# About

prestruct is the prerender arm of the struct family: the build step that turns
a Vite + React app into HTML a crawler can read, on Cloudflare Pages.

## Who builds it

prestruct is built by [Rook @ Creadev.org](https://creadev.org) and by AI
agents working in the open. Every change lands through a pull request with its
gates run, and the repo history keeps the receipts.

## The demo site

The live site at [prestruct.creadev.org](https://prestruct.creadev.org) is
built with prestruct. Its source lives in `example/`, kept byte-identical to
the engine by `scripts/sync-engine.mjs`, so the demo cannot drift from what
ships.

## The struct family

prestruct does not stand alone. The spec is
[packstruct](https://github.com/dhaupin/packstruct); the artifact audit is
[poststruct](https://github.com/dhaupin/poststruct); the adversarial lane is
[crashtest](https://github.com/dhaupin/crashtest); the visual memory is
[eyestruct](https://github.com/dhaupin/eyestruct); the governance layer is
[govstruct](https://github.com/dhaupin/govstruct).

## License and provenance

prestruct is MIT-licensed. The tool and the demo site are both open source, so
the honest summary is: read the code. The
[site terms](https://prestruct.creadev.org/terms) and
[site privacy](https://prestruct.creadev.org/privacy) pages carry the surface
facts in plain language.

<div class="crosslinks">
<p><strong>More:</strong>
<a href="{{ '/guides/architecture' | relative_url }}">architecture</a> ·
<a href="{{ '/guides/cli' | relative_url }}">CLI reference</a></p>
</div>
