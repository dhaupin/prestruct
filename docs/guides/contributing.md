---
layout: default
title: Contributing
nav_order: 16
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

Install dependencies and run the build:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build locally
npm run build
```

## Code style

Use ESLint and Prettier for consistent code:

```bash
# Lint
npm run lint

# Format
npm run format
```

## Pull request process

### Before submitting

Test locally and ensure lint passes:

```bash
npm run build && npm run lint
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

```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: restructure code
chore: maintenance tasks
```

## License

By contributing, you agree that your contributions will be licensed under MIT.