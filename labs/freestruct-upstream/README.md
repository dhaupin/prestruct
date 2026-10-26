# freestruct upstream-parity pack ("the twins")

prestruct and freestruct are the same project on opposite ends of the stack:
prestruct owns build-time prerender for Vite + React apps; freestruct owns the
post-build SEO layer for static doc sites. Both eds cross-pollinate by design
(their audit came from the prestruct#34 donated script; our audit, ogImage
object form, `assertXmlSafe`, and honest sitemap lastmod came from theirs).
This pack upstreams the remaining prestruct side so neither engine carries a
fix the other lacks.

**Target:** freestruct 1.1.0 (the vendored tree verified here). The 1.2.0
ladder is where these land.

---

## Parity state after this pack

| Surface | prestruct | freestruct 1.1.0 | After patches |
|---|---|---|---|
| AEO robots preset (`robots: { aeo: true, aiBots }`) | shipped (1b5f36d) | missing | **ported (0001+0002)** |
| `og:image:secure_url` companion (http-only source) | shipped (#38 adoption) | missing | **ported (0003)** |
| og.image object form (src/width/height/alt) | shipped | shipped | parity |
| Audit FAIL/WARN ladder (+ --json/--external) | shipped (pass 33) | shipped (theirs was the source) | parity |
| `assertXmlSafe` XML loud-fail | shipped (pass 33 port) | shipped (originated here) | parity |
| Honest per-route sitemap lastmod | shipped (pass 33 port) | shipped (mtime from pre-injection snapshot) | parity |
| Stable content-derived build hash | shipped (deploy-id audit) | shipped (ported from ours) | parity |
| Duplicate-tag audit probes | shipped (pass 33 port) | shipped (Pass 26.11) | parity |
| Icon/code-payload link stripping | shipped (pass 33 port) | shipped (Pass 26.14) | parity |

**Deliberately NOT upstreamed (prestruct-only by scope):** the render-proxy
pair + WORKER bot-list sync (prestruct's CF-Pages/VPS posture; freestruct
docs targets have no bot proxy), the crashtest/attack-pack harness lane, and
`prestruct audit`'s robots-grading gate ("author-owned robots.txt is never
engine-graded") -- freestruct OWNS robots.txt always, so there is no
author-owned copy to protect; `false`/absent keep their all-open default.

**Deliberately NOT ported down to prestruct:** freestruct's discovery-class
machinery (glob scoping for jsonLd/og.scoped/article types, locales stem
swaps) -- prestruct's routes are explicitly declared in ssr.config.js, so a
discovery layer would duplicate what the config already says. R5's future
build-patch pack is the open seam for anything else.

## Patches (unified diffs against engine/, 1.1.0)

Apply in order. `0001` and `0002` pair into the AEO preset (engine + config
diagnostics); `0003` is independent.

```
0001-aeo-robots-preset-xmllike.patch          engine/xmllike.js: AEO bot lists + generateRobots preset branch
0002-aeo-robots-config-diagnostics.patch      engine/config.js: 'robots' key + shape warnings
0003-og-image-secure-url-companion.patch      engine/seo.js: secure_url in the companion set
```

Contract notes every apply-er must keep:

- The AEO bot lists are transcribed IDENTICALLY from prestruct's
  `engine/scripts/prerender.js` (search list: OAI-SearchBot, PerplexityBot,
  Claude-SearchBot, Applebot, Googlebot, Bingbot; training list: GPTBot,
  ClaudeBot, Google-Extended, Applebot-Extended, CCBot). If one side adds a
  bot, the other takes it in the same commit -- they must never drift.
- With `robots` absent (or `true`), output is BYTE-IDENTICAL to 1.1.0's
  all-open default; only `aeo: true` changes anything. No default behavior
  shift, no audit coupling (the Sitemap: pointer ships in every branch).
- `og:image:secure_url` emits ONLY for http:// sources (the upgraded https
  variant); an already-https source stays redundant-free; per-page ogImage
  overrides keep their wholesale-set contract (companions of any kind do not
  ride an override).

## Local verification (performed against the vendored 1.1.0 tree)

Both patches were applied to a vendored copy and verified via direct engine
calls before being frozen as diffs:

- generateRobots: default output byte-stable; robots:true byte-stable;
  aeo block carries every search bot (Allow) + every training bot
  (Disallow), no wildcard, Sitemap: pointer last; aiBots: 'allow' flips the
  training verdict.
- collectConfigDiagnostics: bad aiBots value warns once naming aiBots;
  array-shaped robots warns 'must be true or { aeo: ... }'; a valid preset
  fires zero false-positive robot warnings.
- injectPage: http object-form src emits secure_url + width/height/alt;
  https object form ships companions with NO secure_url; per-page override
  ships the override image with no companions (wholesale contract).

One harness lesson recorded along the way (for their test author): the page
MODEL is the truth -- `injectPage` reads/writes `page.html`, and the page's
`<!-- freestruct: {...} -->` override comment must live in the model's html,
not just on disk, or the override silently does not parse (our over-eager
first assertions hit exactly that before it was straightened out).

## Handoff

This workspace has no GitHub write auth for dhaupin/freestruct, so the
paste-ready PR post is [freestruct-parity-pr-draft.md](freestruct-parity-pr-draft.md).
Patches are small and hunks are anchored on stable lines; if 1.2.0 has
already landed on engine/ by the time this is applied, re-diff from the
pristine copies in [pristine/](pristine/).
