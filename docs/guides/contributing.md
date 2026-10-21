---
layout: default
title: Contributing
description: "How to contribute to prestruct: development setup, the repository CI gates, and the pull request flow."
nav_order: 16
version: 1.0.0
permalink: /guides/contributing
---

Contributing guidelines for prestruct.

## Getting started

Fork the repo, clone it, and create a feature branch:

```bash
git clone https://github.com/YOUR_USERNAME/prestruct.git
cd prestruct
git checkout -b feature/your-feature
```

## Development setup

Install dependencies and run the test battery:

```bash
npm install                  # root: peer deps + dev tooling

npm run test:run             # vitest battery (root)
```

The repo-level truth gates (run these after any docs or engine change):

```bash
npm run lint:docs            # docs style + links + frontmatter + truthfulness
npm run lint:claims          # fiction-signature scan
npm run sync:check           # engine -> init -> example byte-identity
                            # (CI fails on drift; run `npm run sync` after engine edits)
```

Build the template app locally:

```bash
node bin/cli.mjs init /tmp/prestruct-test && cd /tmp/prestruct-test
npm install && npx prestruct build
```

## Code style

The `init/` template apps use ESLint:

```bash
cd init && npm install && npm run lint       # --fix to autofix
```

There is no Prettier/formatter step in the repo.

## Pull request process

### Before submitting

Test locally and make sure the gates pass:

```bash
npm run test:run && npm run lint:docs && npm run lint:claims && npm run sync:check
```

### PR guidelines

- Clear, descriptive title
- Link related issues
- Include context in description
- Keep changes focused

## Reporting issues

### Bug reports

Include steps to reproduce, expected vs actual behavior, and environment details.

### Feature requests

Describe the problem, proposed solution, and alternatives considered.

## Commit messages

Use conventional commits:

```text
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: restructure code
chore: maintenance tasks
```

## License

LICENSE is MIT; LEGAL.md adds Fair-Code restrictions on commercial SaaS use.
By contributing, you agree that your contributions ship under both.

## Docs contributions

Writing or editing a guide? Follow the
[Content Style](/prestruct/guides/content-style) rules and run the truth gates before
opening the PR:

- every `npx prestruct <verb>` in prose must route to `bin/cli.mjs` -- the
  verbs are `init`, `build`, `validate`, `clean`, `help`
- every `./engine/...`-style module reference must resolve on disk
- claims of behavior need engine backing (see
  `scripts/check-docs-truthfulness.cjs` and `scripts/check-fiction-signatures.cjs`
  for the mechanical definitions)