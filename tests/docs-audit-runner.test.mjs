// Shared docs-audit runner pins (prestruct#75). prestruct and freestruct now
// carry ONE docs-audit runner shape (discovery, one findings list, per-gate
// count line, gate selection) and differ only in gate set, globs and
// allow-lists. The runner is VENDORED - a copied file, never a cross-repo
// import and never a package dependency in either direction - so a consumer
// may have freestruct without prestruct, or prestruct without freestruct.
//
// Named .test.mjs (not .test.js) so the root battery runs it while the release
// artifact battery (init/vitest.config.js include: tests/**/*.test.js) skips
// it - the same mechanism census.test.mjs and qc.test.mjs use, because the
// surfaces it audits (scripts/, package.json) are not part of the init/ artifact.

import { test, expect } from 'vitest'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const RUNNER = require('../scripts/lib/docs-audit.cjs')
const { gates } = require('../scripts/run-docs-audit.cjs')

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

// A fixture tree that trips every gate: one page missing `layout:` (frontmatter),
// a broken /prestruct/ link (links), trailing whitespace + an h1->h3 skip
// (style), a Chinese run (language), and an unknown `prestruct <verb>`
// (truthfulness). The truth sources each gate reads (bin/cli.mjs, the real
// scripts/check-language.cjs the language gate shells to) are built in.
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'docs-audit-fixture-'))
  mkdirSync(join(root, 'docs'))
  mkdirSync(join(root, 'bin'))
  mkdirSync(join(root, 'scripts'))
  writeFileSync(join(root, 'bin', 'cli.mjs'), "switch (cmd) {\n  case 'init':\n    break\n}\n")
  cpSync(join(REPO, 'scripts', 'check-language.cjs'), join(root, 'scripts', 'check-language.cjs'))
  writeFileSync(join(root, 'docs', 'index.md'), [
    '---',
    'version: 1.0.0',
    'permalink: /index',
    'title: Fixture',
    'nav_order: 1',
    '---',
    '# Fixture',
    '',
    'A broken link: [nope](/prestruct/guides/missing).',
    '',
    'Trailing whitespace here.   ',
    '',
    '### heading skip',
    '',
    '```sh',
    'npx prestruct frobnicate',
    '```',
    '',
    '这是中文文本用于测试语言门',
    '',
  ].join('\n'))
  return root
}

test('docs-audit gates: each gate trips on the fixture it owns', () => {
  const root = makeFixture()
  try {
    const expectTrip = (gate, pattern) => {
      const { findings } = RUNNER.runDocsAudit({ root, docsDir: 'docs', gates, names: [gate], log: () => {} })
      expect(findings.length, `${gate} produced no finding`).toBeGreaterThan(0)
      expect(findings.some((f) => pattern.test(f)), `${gate} finding did not match ${pattern}: ${findings.join(' | ')}`).toBe(true)
    }
    expectTrip('frontmatter', /missing frontmatter field "layout"/)
    expectTrip('links', /broken \/prestruct\/ link/)
    expectTrip('style', /trailing whitespace/)
    expectTrip('language', /Han/)
    expectTrip('truthfulness', /unknown prestruct verb in docs: frobnicate/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('docs-audit runner: the vendored module exposes the shared contract', () => {
  expect(typeof RUNNER.runDocsAudit).toBe('function')
  // Generic helpers the gates build on; a caller never re-implements these.
  for (const name of ['fmBlock', 'urlKey', 'pageUrl', 'discoverFiles']) {
    expect(typeof RUNNER[name], `${name} missing from the runner export`).toBe('function')
  }
})

test('docs-audit runner: gate selection runs one gate, all by default, throws on unknown', () => {
  const seen = []
  const gates = {
    a: () => {},
    b: (ctx) => ctx.collect([], 'x.md', 1, 'boom'),
  }
  const config = { root: process.cwd(), docsDir: 'docs', gates, log: () => {} }

  const onlyA = RUNNER.runDocsAudit({ ...config, names: ['a'] })
  expect(onlyA.findings, 'selecting gate a must not run gate b').toEqual([])

  const all = RUNNER.runDocsAudit({ ...config, names: [] })
  expect(all.findings.length, 'empty selection runs every gate').toBe(1)

  expect(() => RUNNER.runDocsAudit({ ...config, names: ['nope'] })).toThrow(/unknown gate/)
})

test('docs-audit runner: independence - builtins-only, no sibling dependency (prestruct#75)', () => {
  // The runner requires node builtins only (no prestruct import, no freestruct
  // import), which is what lets it be vendored into either repo standalone.
  const src = readFileSync(new URL('../scripts/lib/docs-audit.cjs', import.meta.url), 'utf8')
  const requires = [...src.matchAll(/require\((['"])([^'"]+)\1\)/g)].map((m) => m[2])
  expect(requires.length, 'the runner must require something (sanity)').toBeGreaterThan(0)
  for (const req of requires) {
    expect(req.startsWith('.'), `runner must not require a package: ${req}`).toBe(false)
  }

  // package.json must carry no freestruct dependency in ANY field.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'bundledDependencies', 'bundleDependencies']) {
    const deps = pkg[field]
    if (!deps) continue
    const names = Array.isArray(deps) ? deps : Object.keys(deps)
    expect(names.some((n) => /freestruct/.test(n)), `package.json ${field} must not name freestruct`).toBe(false)
  }
})
