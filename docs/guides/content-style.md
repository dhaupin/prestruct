---
layout: default
title: Content Style
nav_order: 20
---

# Content Style

Guidelines for writing prestruct documentation.

## Voice & Tone

- **Direct** - Get to the point quickly
- **Practical** - Show how, not just what
- **Confident** - State things as facts when possible
- **Helpful** - Anticipate reader questions

### Avoid
- Filler ("In order to", "In this section we will")
- Passive voice ("can be configured", "is recommended")
- Jargon without explanation
- Apologies ("Sorry, but...")

## Structure

### Headings
- Use sentence case: "Build optimization" not "Build Optimization"
- Lead with keywords
- Front-load meaning: "Deploy to Cloudflare" not "How to Deploy to Cloudflare"

### Paragraphs
- One idea per paragraph
- 2-4 sentences typical
- Lead with the point

### Code Blocks
- Always specify language: ` ```bash `, ` ```jsx `
- Include comments for complex steps
- Show realistic values, not placeholder `foo`, `bar`

### Lists
- Use for steps or options
- Use sparingly for prose flow

## Formatting

### Code vs UI
- **Code**: Monospace, backticks
- **UI labels**: Regular text
- **Commands**: In code blocks with shell prompt

```bash
npm run build
```

### Emphasis
- **Bold**: Critical info, warnings
- *Italic*: Terminology introduction
- `Code`: File paths, functions, values

### Links
- Descriptive link text: "See [Troubleshooting](/guides/troubleshooting)" not "click here"
- Internal links: relative paths
- External links: full URLs

## Common Patterns

### Tutorial Style
1. Goal statement first
2. Prerequisites
3. Step-by-step with code
4. Verification step

### Reference Style
- Definition lists for options
- Tables for comparison
- Examples for each variant

## What to Avoid

- Repetitive intros ("In this guide...")
- Generic disclaimers
- Outdated patterns
- Contradicting other docs

## Examples

### Good
```bash
# Deploy to production
npm run build
wrangler pages deploy dist
```

### Bad
```bash
# This is the build command
# Run this to build your app
npm run build
```

## Voice Examples

| Instead of | Use |
|------------|-----|
| "You can configure..." | "Configure..." |
| "It is recommended to..." | "Recommended: ..." |
| "In this section..." | Omit |
| "Sorry for the inconvenience" | Omit |
| "Here is how you can..." | "How to..." |