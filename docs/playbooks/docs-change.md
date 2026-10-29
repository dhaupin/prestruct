---
layout: default
title: Shipping a docs change
description: "Edit a page, run the docs gates, build the Jekyll stack with the freestruct strict pass, and let the deploy lane cut it."
nav_order: 25
version: 1.2.0
permalink: /playbooks/docs-change/
---

# Shipping a docs change

A docs page is markdown plus five frontmatter fields. Edit it, run the gates,
build the site locally, then push - the deploy lane does the rest.

Every page carries all five fields:

```yaml
---
version: 1.2.0        # version the page content reflects
permalink: /guides/x  # starts with / - the site links by permalink
layout: default
title: Page Title
nav_order: 10         # integer; sidebar position via _data/nav.yml
---
```

Run the gates before the build. `npm run lint:docs` is node-only and runs
anywhere; it checks style, links, frontmatter, language, and truthfulness.

```bash
npm run lint:docs
```

Build the Jekyll stack locally. The recipe for a rootless build (prebuilt
Ruby, a rootless `libyaml`, shimmed binstubs, `BUNDLE_PATH` outside the tree)
is in `labs/TASKS.md` under pass 61.

```bash
cd docs && bundle exec jekyll build
node node_modules/freestruct/bin/freestruct.mjs --strict
```

The `--strict` pass is the SEO layer: canonical, Open Graph, Twitter, and the
JSON-LD identity. It exits 1 on a broken internal link or a dangerous tag.
Serve `docs/_site` under the real baseurl to click through it:

```bash
ln -sfn "$PWD/docs/_site" /tmp/docs-serve/prestruct
cd /tmp/docs-serve && python3 -m http.server 8899
```

The deploy lane (`docs.yml`) fires on a push to `main` that touches `docs/**`.
Two things it will catch that a local lint cannot: a page that builds headless
because it lost its `layout:` field, and a canonical that doubles its
`/prestruct` prefix because `site.url` and `basePath` both carry it. Check
both before pushing.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/playbooks/' | relative_url }}">all playbooks</a></p>
</div>
