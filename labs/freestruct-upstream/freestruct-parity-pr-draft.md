# Upstream-parity pack: AEO robots preset + og:image:secure_url (from prestruct)

## Summary

The twins gap-scan after prestruct's audit/ogImage passes (their pass 33
adopted our audit mechanics back -- thanks) left exactly two prestruct-side
fixes freestruct does not carry yet. Both are ported below as small,
independently verifiable engine diffs, targeted at your 1.2.0 ladder:

1. **AEO robots preset** (prestruct commit 1b5f36d, ported 1:1): your
   `generateRobots` always writes the all-open `User-agent: *`. Search-allow
   / training-block preset files:

   ```yaml
   robots: { aeo: true, aiBots: block }   # 'allow' flips the training verdict
   ```

   Search-surface bots keep the site: OAI-SearchBot, PerplexityBot,
   Claude-SearchBot, Applebot, Googlebot, Bingbot. Training/corpus crawlers
   get the verdict: GPTBot, ClaudeBot, Google-Extended, Applebot-Extended,
   CCBot. Sitemap pointer ships in every branch. Absent/`true` config =
   byte-identical to today's output, so this is opt-in with zero default
   shift, and your audit stays green (the pointer survives both branches).
   The bot lists must never drift between twins: one side adds a bot, the
   other takes it in the same commit.

2. **`og:image:secure_url` companion** (prestruct #38 shape): your
   companion set (width/height/alt) gains the secure_url line ONLY when the
   resolved og image is an http:// source -- the upgraded https variant. An
   already-https source gets nothing (og:image itself is the secure form;
   emitting it is just the same URL twice). A per-page ogImage override
   stays wholesale: an override ships no companions at all, secure_url
   included.

## Patches (unified diffs, engine/ 1.1.0 anchors)

- `0001-aeo-robots-preset-xmllike.patch` -- engine/xmllike.js (bot lists
  verbatim from prestruct `engine/scripts/prerender.js` + the preset branch)
- `0002-aeo-robots-config-diagnostics.patch` -- engine/config.js (`robots`
  joins KNOWN_CONFIG_KEYS; shape warnings stay warn-not-gate, same ladder as
  your other keys: bad aiBots value, non-object robots, aeo: false)
- `0003-og-image-secure-url-companion.patch` -- engine/seo.js (one line in
  the companion builder + the reasoning comment)

Applying onto 1.2.0 work? The hunks anchor on stable lines (the robots
writer and the companion array); re-diff from the pristine copies if the
1.2.0 engine has moved beneath them.

## Verification evidence

All checks ran against the patched vendored 1.1.0 tree before freeze:

- generateRobots: default byte-stable; `robots: true` byte-stable; the aeo
  block carries every search bot as Allow, every training bot as Disallow,
  no wildcard, pointer last; `aiBots: 'allow'` flips the training verdict.
- collectConfigDiagnostics: `aiBots: 'no'` warns once and names aiBots; an
  array robots warns the shape line; a valid `{ aeo: true, aiBots: 'allow' }`
  emits zero robot warnings.
- injectPage: http object-form src emits
  `og:image:secure_url content="https://..."` next to its width/height/alt
  companions; https object form ships companions with NO secure_url; the
  per-page override ships the override image and no companions.

## One test-author note

Your page model is the single truth: `injectPage` reads and writes the
model's `html`, so a `<!-- freestruct: {...} -->` per-page override comment
must be IN the modeled html, not merely on disk -- a disk-only comment is
silently invisible to the override parser (the first false stars in the
verification run were exactly this, not an engine bug).
