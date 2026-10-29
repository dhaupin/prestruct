---
layout: default
title: Content Style
description: "The documentation style contract: frontmatter fields, voice, formatting, and truthfulness rules this repo enforces."
nav_order: 20
version: 1.0.0
permalink: /guides/content-style
---

Language, content, tone, and style reference for prestruct.

## Tone and voice

This is a developer tool. The audience is engineers who are confident with Vite, React, and deployment pipelines.

- **Direct.** Say what a thing does. Skip the build-up.
- **Honest.** Note limitations plainly. Do not oversell.
- **Peer-level.** Write as one developer to another. No hand-holding, no condescension.
- **Dry.** Subtle wit is fine. Enthusiasm is not. No exclamation points unless genuinely required for tone or a warning state.

| Wrong | Right |
|-------|-------|
| "Supercharge your SEO!" | "Makes your routes crawlable." |
| "It's incredibly easy to set up!" | "Takes about 15 minutes." |
| "Prestruct is amazing because..." | "Prestruct solves X by doing Y." |
| "Don't worry, it's simple!" | "The only structural change is extracting AppLayout." |

## Sentence structure

- Short sentences. One idea per sentence.
- Active voice. "prerender.js renders each route" not "each route is rendered by prerender.js".
- Present tense for how things work.
- No throat-clearing openers. Never start with "So," "Well," "Note that," or "As you can see."

## Headings and labels

- Sentence case everywhere. "How it works" not "How It Works".
- No title case for everything.
- Headings should state a fact or outcome, not a category.
  - Wrong: "Features"
  - Right: "What you get"

### Briefs

Every section, code block, and list needs a one-line brief before it.

The brief explains *why*, not *what*. It sets context before diving in.

- Wrong: "Steps:" -> [list]
- Wrong: "```bash" -> [code without intro]
- Right: "Build the project:" -> ```bash
- Right: "Use this when the server needs to stay warm:" -> [configuration]

Briefs are not required for short pages. Use judgment. If a section needs setup, add one.

## Frontmatter (every page, enforced)

Every docs page carries all five fields. The `frontmatter` gate in
`scripts/run-docs-audit.cjs` gates CI on this; a page missing `layout:` silently
renders as raw HTML with no site chrome (Jekyll has no defaults block, so there
is no fallback).

```yaml
---
version: 1.0.0        # version the page content reflects
permalink: /guides/x  # starts with / - the site links by permalink
layout: default
title: Page Title
nav_order: 10         # integer; controls sidebar position via _data/nav.yml
---
```

## Code blocks

- Every opening fence carries a language tag (`bash`, `js`, `yaml`, `text`).
  ASCII diagrams and directory trees are `text`. Enforced by the `style` gate in
  `scripts/run-docs-audit.cjs`.
- Every code block needs a 1-sentence brief before it (see Briefs).
- Never use numbered lists (`1. 2. 3.`) inside code blocks. Use dashes.
- Bullets use `-`, never `*`.
- Links are descriptive ("see docs/guides/config.md"), never "click here".
- Markdown is the source of truth: root docs link INTO `docs/`, not the other way around.

## Structure and flow

- Never open a section with "This section covers...". Write the content instead.
- Every section header gets a 1-2 sentence intro: what it is and why you need it.

## Formatting

- **Bold** only when the word or phrase genuinely needs to stand out.
- *Italic* for introducing a term, not for emphasis.
- `code` for all file names, paths, commands, config keys, prop names, and code snippets.
- No nested bullet lists.
- Tables for structured comparisons.

## What to avoid

- Em dashes (--). Use a comma, period, or colon.
- Double hyphens as dash substitutes.
- Ellipsis (...) except in loading states or truncation.
- Exclamation points: avoid unless required for warning or critical state.
- Filler adverbs: "simply", "just", "easily", "basically", "actually".
- Vague superlatives: "best", "powerful", "robust", "seamless".
- AI clichés: "delve into", "leverage", "unlock", "empower", "journey", "realm", "game-changer", "cutting-edge", "revolutionary", "we're excited to". Say what you mean.

## Punctuation

- Oxford comma: always include it.
- No formatted quotes. Use straight quotes.
- No exclamation points unless genuinely earned.
- Entity names: Capitalized when first in a sentence or heading.

---

## Next steps

- [Contributing](/prestruct/guides/contributing) - where these rules are enforced: the documentation linters in CI
- [Roadmap](/prestruct/guides/roadmap) - what the documentation is planning to cover next