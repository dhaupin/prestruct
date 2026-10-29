// tests/docs-audit.test.mjs
//
// Battery for the consolidated docs audit (prestruct#75): the shared runner
// (scripts/lib/docs-audit.cjs, vendored from dhaupin/freestruct) plus
// prestruct's gate set (scripts/run-docs-audit.cjs). Three legs:
//
//   1. independence - the convergence must never make one repo import the
//      other at runtime, so the runner is a vendored builtins-only copy and
//      prestruct carries no freestruct dependency in any field (mirrors
//      freestruct's own pin, prestruct#75).
//   2. runner contract - one findings list, per-gate count lines, gate
//      selection, and an unknown-gate throw so the caller owns the exit.
//   3. gate fixtures - each migrated gate still trips on the case it exists
//      for (the six standalone scripts' cases move here, not away).
//
// Named .test.mjs (not .test.js): the root battery runs it, while the release
// artifact battery (init/vitest.config.js include: tests/**/*.test.js) skips
// it - the same mechanism qc.test.mjs uses, because the surfaces it audits
// (scripts/, freestruct independence) are not part of the init/ artifact.

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const { runDocsAudit } = require(path.join(root, 'scripts', 'lib', 'docs-audit.cjs'))
const { gates, urlFor } = require(path.join(root, 'scripts', 'run-docs-audit.cjs'))

// Build a throwaway repo root: docs/ + optional nav + README, then run the
// gates over it. Returns the findings list.
function auditFixture({ docs = {}, nav = null, readme = null, names } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prestruct-docsaudit-'))
  fs.mkdirSync(path.join(dir, 'docs', '_data'), { recursive: true })
  for (const [rel, text] of Object.entries(docs)) {
    const p = path.join(dir, 'docs', rel)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, text)
  }
  fs.writeFileSync(path.join(dir, 'docs', '_data', 'nav.yml'), nav ?? '# empty\n')
  if (readme !== null) fs.writeFileSync(path.join(dir, 'README.md'), readme)
  // The truthfulness gate reads its verb truth from <root>/bin/cli.mjs; give
  // the fixture the two verbs the cases exercise (build + init).
  fs.mkdirSync(path.join(dir, 'bin'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'bin', 'cli.mjs'), "switch (c) {\n  case 'build': break\n  case 'init': break\n}\n")
  const result = runDocsAudit({
    root: dir, gates, names, urlFor, log: () => {},
  })
  fs.rmSync(dir, { recursive: true, force: true })
  return result.findings
}

const FM = (extra = '') => `---
version: 1.2.0
permalink: /guides/x
layout: default
title: X
nav_order: 1
${extra}---
`

describe('docs audit: independence (prestruct#75)', () => {
  it('the shared runner requires node builtins only (vendored, not cross-repo)', () => {
    const lib = fs.readFileSync(path.join(root, 'scripts', 'lib', 'docs-audit.cjs'), 'utf8')
    const requires = [...lib.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((m) => m[1])
    const builtins = new Set(['fs', 'path', 'crypto', 'url', 'child_process', 'os', 'util', 'assert'])
    const foreign = requires.filter((r) => !builtins.has(r) && !r.startsWith('.'))
    expect(foreign, `runner must require node builtins only: got ${JSON.stringify(requires)}`).toEqual([])
  })

  it('no consumer-facing dependency field names freestruct (a consumer never pulls the sibling)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
      const deps = Object.keys(pkg[field] || {})
      expect(deps.some((d) => /^@?freestruct/.test(d)), `${field} must not depend on freestruct`).toBe(false)
    }
  })

  it('the only freestruct dependency is the docs-lane devDep (#59), never shipped', () => {
    // The docs deploy lane consumes freestruct as a devDependency
    // (docs.yml `freestruct-cmd: node node_modules/freestruct/bin/freestruct.mjs`).
    // That is the ONE allowed coupling and it is dev-only - the audit runner
    // itself is vendored, so nothing in the shipped surface needs the sibling.
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    const dev = Object.keys(pkg.devDependencies || {}).filter((d) => /^@?freestruct/.test(d))
    expect(dev, 'the docs lane devDep is the only freestruct dependency').toEqual(['freestruct'])
  })

  it('no shipped surface imports freestruct at runtime (runner is vendored)', () => {
    const re = /(?:require\(|from\s+|import\()\s*['"]freestruct(?:[/'"]|$)/
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name)
      return e.isDirectory() ? walk(p) : [p]
    })
    for (const dir of ['engine', 'bin', 'scripts']) {
      for (const f of walk(path.join(root, dir))) {
        if (!/\.(js|cjs|mjs)$/.test(f)) continue
        expect(re.test(fs.readFileSync(f, 'utf8')), `${path.relative(root, f)} must not import freestruct`).toBe(false)
      }
    }
  })
})

describe('docs audit: runner contract', () => {
  it('an unknown gate throws so the caller decides the exit', () => {
    expect(() => auditFixture({ names: ['bogus'] })).toThrow(/unknown gate/)
  })

  it('gate selection runs exactly the requested gate', () => {
    // A page with a broken link AND missing frontmatter: only `links` runs.
    const findings = auditFixture({
      names: ['links'],
      docs: { 'bad.md': '---\ntitle: x\n---\n\nsee [gone](/guides/nope)\n' },
    })
    expect(findings.length).toBeGreaterThan(0)
    expect(findings.every((f) => f.includes('link'))).toBe(true)
  })
})

describe('docs audit: gate fixtures (each migrated gate trips its case)', () => {
  it('frontmatter: a missing field is a finding', () => {
    const findings = auditFixture({ docs: { 'a.md': '---\npermalink: /a\ntitle: A\nlayout: default\nnav_order: 1\n---\n' } })
    expect(findings.some((f) => f.includes('missing frontmatter field "version"'))).toBe(true)
  })

  it('frontmatter: a non-integer nav_order is a finding', () => {
    const findings = auditFixture({ docs: { 'a.md': FM().replace('nav_order: 1', 'nav_order: first') } })
    expect(findings.some((f) => f.includes('nav_order'))).toBe(true)
  })

  it('links: a broken absolute link is a finding', () => {
    const findings = auditFixture({ docs: { 'a.md': FM() + '\nsee [x](/guides/does-not-exist)\n' } })
    expect(findings.some((f) => f.includes('broken docs link'))).toBe(true)
  })

  it('links: an external URL is not a finding', () => {
    const findings = auditFixture({ docs: { 'a.md': FM() + '\nsee [x](https://example.com/nope)\n' } })
    expect(findings).toEqual([])
  })

  it('nav: a URL that resolves to no page is a finding', () => {
    const findings = auditFixture({
      docs: { 'a.md': FM() },
      nav: '- title: S\n  items:\n    - title: A\n      url: /guides/x\n    - title: Ghost\n      url: /guides/ghost\n',
    })
    expect(findings.some((f) => f.includes('resolves to no docs page'))).toBe(true)
  })

  it('nav: a duplicate URL is a finding', () => {
    const findings = auditFixture({
      docs: { 'a.md': FM() },
      nav: '- title: S\n  items:\n    - title: A\n      url: /guides/x\n    - title: A2\n      url: /guides/x\n',
    })
    expect(findings.some((f) => f.includes('listed more than once'))).toBe(true)
  })

  it('style: an untagged opening fence is a finding', () => {
    const findings = auditFixture({ docs: { 'a.md': FM() + '\n```\ncode\n```\n' } })
    expect(findings.some((f) => f.includes('missing language tag'))).toBe(true)
  })

  it('style: an em dash in prose is a finding (CHANGELOG exempt)', () => {
    const findings = auditFixture({ docs: { 'a.md': FM() + '\na \u2014 b\n' } })
    expect(findings.some((f) => f.includes('em/en dash'))).toBe(true)
  })

  it('style: a heading level skip is a finding', () => {
    const findings = auditFixture({ docs: { 'a.md': FM() + '\n# h1\n\n### h3\n' } })
    expect(findings.some((f) => f.includes('heading skips'))).toBe(true)
  })

  it('truthfulness: an unknown prestruct verb is a finding', () => {
    const findings = auditFixture({ docs: { 'a.md': FM() + '\n```bash\nnpx prestruct frobnicate\n```\n' } })
    expect(findings.some((f) => f.includes('unknown prestruct verb'))).toBe(true)
  })

  it('truthfulness: a real verb (build) is not a finding', () => {
    const findings = auditFixture({ docs: { 'a.md': FM() + '\n```bash\nnpx prestruct build\n```\n' } })
    expect(findings).toEqual([])
  })

  it('jekyll: an unknown Liquid tag is a finding (prestruct#77)', () => {
    const findings = auditFixture({ names: ['jekyll'], docs: { 'a.md': 'see `{% seo %}` here\n' } })
    expect(findings.some((f) => f.includes('unknown Liquid tag "seo"'))).toBe(true)
  })

  it('jekyll: a two-argument single-arg filter is a finding (crashtest#23)', () => {
    const findings = auditFixture({ names: ['jekyll'], docs: { 'a.md': "{{ x | remove: '/a', '' }}\n" } })
    expect(findings.some((f) => f.includes('"remove" takes exactly one argument'))).toBe(true)
  })

  it('jekyll: a {% raw %} block exempts its contents', () => {
    const findings = auditFixture({ names: ['jekyll'], docs: { 'a.md': '{% raw %}{% seo %}{% endraw %}\n' } })
    expect(findings).toEqual([])
  })

  it('jekyll: known tags and a legal one-arg filter are not findings', () => {
    const findings = auditFixture({
      names: ['jekyll'],
      docs: { 'a.md': '{% if x %}{% assign y = 1 %}{% endif %}\n{{ s | remove: "/a" }}\n' },
    })
    expect(findings).toEqual([])
  })

  it('jekyll: scans html under `_`-prefixed dirs (the runner walk skips them)', () => {
    const findings = auditFixture({
      names: ['jekyll'],
      docs: { '_layouts/default.html': '<body>{% seo %}</body>\n' },
    })
    expect(findings.some((f) => f.includes('unknown Liquid tag "seo"'))).toBe(true)
    expect(findings.some((f) => f.includes('_layouts/default.html'))).toBe(true)
  })
})
