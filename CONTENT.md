# CONTENT.md - Language, tone, and code style reference

Read this before writing copy, documentation, or code comments for prestruct.
It applies to: the example site, README, AGENTS, SCOPE, code comments, and any
content that ships in the repo.

Referenced from AGENTS.md so AI agents pick it up automatically.

---

## Tone and voice

This is a developer tool. The audience is engineers who are confident with Vite,
React, and deployment pipelines. They do not need to be coaxed or sold.

- **Direct.** Say what a thing does. Skip the build-up.
- **Honest.** Note limitations plainly. Do not oversell.
- **Peer-level.** Write as one developer to another. No hand-holding, no condescension.
- **Dry.** Subtle wit is fine. Enthusiasm is not. No exclamation points unless
  genuinely required for tone or a warning state.

Examples:

| Wrong | Right |
|-------|-------|
| "Supercharge your SEO!" | "Makes your routes crawlable." |
| "It's incredibly easy to set up!" | "Takes about 15 minutes." |
| "prestruct is amazing because..." | "prestruct solves X by doing Y." |
| "Don't worry, it's simple!" | "The only structural change is extracting AppLayout." |

---

## Sentence structure

- Short sentences. One idea per sentence.
- Active voice. "prerender.js renders each route" not "each route is rendered by prerender.js".
- Present tense for how things work. "prerender.js spins up a Vite dev server."
- No throat-clearing openers. Never start a sentence with "So," "Well," "Note that," or "As you can see."

---

## Headings and labels

- Sentence case everywhere. "How it works" not "How It Works".
- No Title Case For Everything.
- Headings should state a fact or outcome, not a category.
  - Wrong: "Features"
  - Right: "What you get"
  - Wrong: "Getting started"
  - Right: "Integrate in minutes"
- Mono-style labels (like section eyebrows) can be lowercase: "how it works", "build pipeline".

---

## Formatting

- **Bold** only when the word or phrase genuinely needs to stand out. If everything is bold, nothing is.
- *Italic* for introducing a term, not for emphasis.
- `code` for all file names, paths, commands, config keys, prop names, and code snippets.
- No nested bullet lists. If a list needs sub-items, rewrite it as prose or a table.
- Tables for structured comparisons. Not for anything that reads better as prose.

---

## Code comments

Comments explain *why*, not *what*. If the code is clear, do not comment it.
Reserve comments for:
- Non-obvious decisions: "ssrLoadModule, not vite build --ssr, because..."
- Gotchas: "BrowserRouter must not appear anywhere in AppLayout's import graph"
- Intent that the code cannot express: "Fails gracefully -- exit 0 so deploy continues as SPA"

Comment style:
- Single line: `// comment` with one space after slashes
- Block comments in JSDoc files use `/** ... */`
- No section dividers like `// ============` unless they separate genuinely distinct logical blocks
- No trailing comments on every line of a function

---

## Naming

- Files: kebab-case for scripts and configs. PascalCase for React components.
- Variables: camelCase. Constants: SCREAMING_SNAKE_CASE only for true top-level singletons (SITE_URL, GITHUB).
- Route paths: lowercase, hyphenated. `/how-it-works` not `/HowItWorks`.
- Config keys in ssr.config.js: camelCase. No abbreviations.

---

## What to avoid in copy

- Em dashes (--). Use a comma, period, or colon.
- Double hyphens as dash substitutes. Rewrite the sentence.
- Ellipsis (...) except in UI loading states or "read more" truncation.
- Formatted/curly quotes. Use straight quotes always.
- Oxford comma: always include it. "title, description, and canonical" not "title, description and canonical."
- Exclamation points: avoid unless required for genuine warning or critical state.
- Filler adverbs: "simply", "just", "easily", "basically", "actually".
- Vague superlatives: "best", "powerful", "robust", "seamless".
- Passive constructions that obscure who does what.

---

## What to avoid in UI

- Eyebrow tags that state the obvious category. ("Features" above a list of features.)
- Gradient dividers above section headings.
- Cards that repeat the section heading as their own title.
- Filler placeholder states like "No items yet." -- if a state can occur, handle it with real copy.
- Progress indicators for operations that complete in under 200ms.

---

## Punctuation/style quick reference

- No em dashes. Use a comma, period, or colon.
- No double hyphens ( -- ) as dash substitutes.
- No ellipsis (... or &hellip;) except in loading states or truncation UI.
- Oxford comma always.
- No formatted quotes or &ldquo; &rdquo; style. Use straight quotes.
- No exclamation points unless genuinely earned or required for a warning state.
- Sentence case on all headings and labels.
- Limited bold and italic. Save them so they have impact.
