import { test, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SYNCED_FILES = [
  'scripts/inject-brand.js',
  'scripts/prerender.js',
  'scripts/audit.js',
  'scripts/indexnow.js',
  'scripts/hooks.js',
  'scripts/ogimage.js',
  'scripts/validate-config.js',
  'src/hooks/usePageMeta.js',
  'src/islands.js',
  'ssr.config.example.js',
]

test('engine files stay synced between init and example', () => {
  for (const relativePath of SYNCED_FILES) {
    const initFile = readFileSync(`init/${relativePath}`, 'utf8')
    const exampleFile = readFileSync(`example/${relativePath}`, 'utf8')
    expect(exampleFile).toBe(initFile)
  }
})

// Engine sources must equal their generated init/ copies byte-for-byte.
// scripts/sync-engine.mjs is the generator; an engine file edited after the
// last generation lands here instead of hiding inside the sync workflow.
const ENGINE_MAP = [
  ['engine/scripts/inject-brand.js', 'init/scripts/inject-brand.js'],
  ['engine/scripts/prerender.js', 'init/scripts/prerender.js'],
  ['engine/scripts/audit.js', 'init/scripts/audit.js'],
  ['engine/scripts/indexnow.js', 'init/scripts/indexnow.js'],
  ['engine/scripts/hooks.js', 'init/scripts/hooks.js'],
  ['engine/scripts/ogimage.js', 'init/scripts/ogimage.js'],
  ['engine/scripts/validate-config.js', 'init/scripts/validate-config.js'],
  ['engine/src/hooks/usePageMeta.js', 'init/src/hooks/usePageMeta.js'],
  ['engine/src/islands.js', 'init/src/islands.js'],
  ['engine/ssr.config.example.js', 'init/ssr.config.example.js'],
]

test('init copies match their engine sources byte-for-byte', () => {
  for (const [enginePath, initPath] of ENGINE_MAP) {
    expect(readFileSync(initPath, 'utf8')).toBe(readFileSync(enginePath, 'utf8'))
  }
})

test('crashtest devDep pin equals the committed ledger stamp (update-friendly contract)', () => {
  // The gate runs the DEVDEP, and the committed labs/ ledger is only
  // meaningful for the harness version that wrote it. The bump tool
  // (`npm run crashtest:bump <version>`) keeps them together; this test
  // fails any tree where they drift apart -- a hanging npx run, a devDep
  // bump without a ledger regen, or vice versa. Pass 26's lesson as a pin.
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const meta = JSON.parse(readFileSync('labs/run-meta.json', 'utf8'))
  expect(pkg.devDependencies.crashtest).toBe(meta.crashtestVersion)
})

test('code imports react-router-dom/server.js with explicit extension', () => {
  // Pure-JS scan (no external rg dependency, no PCRE2 availability games --
  // the previous rg --pcre2 version passed vacuously wherever rg was missing).
  // Mirrors the AGENTS.md gotcha: bare react-router-dom/server breaks CF
  // Pages' Node ESM resolver.
  const dirs = ['engine', 'init', 'example']
  const extensions = ['.js', '.jsx', '.mjs', '.cjs']
  const offenders = []

  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.prestruct') continue
      const full = join(dir, entry)
      const st = statSync(full)
      if (st.isDirectory()) {
        walk(full)
      } else if (st.isFile() && extensions.some(ext => entry.endsWith(ext))) {
        const text = readFileSync(full, 'utf8')
        for (const m of text.matchAll(/(['"])react-router-dom\/server(?!\.js)\1/g)) {
          offenders.push(`${full}: ${m[0]}`)
        }
      }
    }
  }

  for (const dir of dirs) walk(dir)

  expect(offenders).toEqual([])
})

test('version story is single-sourced (root pkg == init pkg == init/VERSION)', () => {
  // W3 lesson, permanently closed: version sprawl between the npm package and
  // the template drifted before. The release workflow stamps init/VERSION and
  // init/package.json from the tag; this pin fails loudly if anything else
  // moves one of the three files alone.
  const rootVersion   = JSON.parse(readFileSync('package.json', 'utf8')).version
  const initVersion   = JSON.parse(readFileSync('init/package.json', 'utf8')).version
  const stampVersion  = readFileSync('init/VERSION', 'utf8').trim()

  expect(initVersion).toBe(rootVersion)
  expect(stampVersion).toBe(rootVersion)
})

test('shipped build scripts run inject-brand BEFORE prerender (SEO contract)', () => {
  // SEO audit 2026-10-20: the engine's injectMeta() is replace-only -- it swaps
  // values into head tags that already exist but never ADDS missing ones. The
  // raw vite shell carries no OG/Twitter tags (inject-brand seeds them), so an
  // example-era "prerender && inject-brand" order left 7/7 sub-route pages
  // shipping with NO social head while the home page looked fine. Both
  // package.json build scripts are ordered brand-first; this pin keeps it.
  for (const pkg of ['example/package.json', 'init/package.json']) {
    const build = JSON.parse(readFileSync(pkg, 'utf8')).scripts.build
    const brand = build.indexOf('inject-brand')
    const prerender = build.indexOf('prerender.js')
    expect(brand).toBeGreaterThan(-1)
    expect(prerender).toBeGreaterThan(-1)
    expect(brand).toBeLessThan(prerender)
  }
})

test('release lane is publish.yml only (the tag drives npm + the GH release)', () => {
  // The old release.yml (starter-zip builder + a second GH release mint) was
  // retired: publish.yml is the single tag lane, matching the family shape
  // (eyestruct). Its release job cuts the GH release from the changelog.
  expect(() => readFileSync('.github/workflows/release.yml', 'utf8')).toThrow()

  const workflow = readFileSync('.github/workflows/publish.yml', 'utf8')
  expect(workflow).toMatch(/gh release create/)
  expect(workflow).toMatch(/release-notes\.cjs/)
  // No zip asset: the GH release carries the changelog notes, nothing else.
  expect(workflow).not.toMatch(/\.zip/)
  expect(workflow).not.toMatch(/softprops\/action-gh-release/)
})

test('staging flow: CI covers the integration branch, deploys are gated to main', () => {
  // The fleet staging flow (poststruct#32): staging is the permanent
  // integration branch, CI covers it, and every deploy job is gated to main.
  // Point 3 is the trap -- once staging is in a deploy workflow's trigger, the
  // trigger no longer keeps staging content out of production; the job must
  // carry the guard itself.
  for (const wf of ['test.yml', 'engine-sync-check.yml', 'crashtest.yml']) {
    const text = readFileSync(`.github/workflows/${wf}`, 'utf8')
    expect(text, `${wf} must verify the staging integration branch`).toMatch(/staging/)
  }

  const docs = readFileSync('.github/workflows/docs.yml', 'utf8')
  expect(docs, 'docs.yml must build staging docs').toMatch(/branches: \[main, staging\]/)
  // docs.yml is a THIN caller of the reusable lane (freestruct#31). The deploy
  // guard (if: github.ref == 'refs/heads/main') moved INTO the lane, so it no
  // longer lives in this file -- the caller must point at the lane instead.
  expect(docs, 'docs.yml must call the reusable docs lane').toMatch(/uses: dhaupin\/freestruct\/\.github\/workflows\/docs-lane\.yml@/)
  expect(docs, 'docs.yml caller must grant Pages permissions').toMatch(/pages: write/)
})

test('example is generated from engine, not synced by a release workflow', () => {
  // The old sync-example.yml fired on release:published and copied init -> example.
  // It was dead (GitHub does not run workflows from GITHUB_TOKEN-created events,
  // and publish.yml mints the release with github.token) AND wrong: four of its
  // six files were already generator CONTRACT files, and it cp'd init's template
  // AppIslands.jsx over the example's real island registry. The generator's
  // example target is the single source of truth now.
  expect(() => readFileSync('.github/workflows/sync-example.yml', 'utf8')).toThrow()

  // The generator owns the example target: engine/ssr.config.example.js is a
  // CONTRACT file, so engine == init == example for it (asserted above).
  expect(readFileSync('engine/ssr.config.example.js', 'utf8'))
    .toBe(readFileSync('example/ssr.config.example.js', 'utf8'))

  // AppIslands.jsx stays example-owned: the example registers real islands the
  // template skeleton does not carry. A sync must never overwrite it.
  const exampleIslands = readFileSync('example/src/AppIslands.jsx', 'utf8')
  expect(exampleIslands).toMatch(/EmailIsland/)
  expect(readFileSync('init/src/AppIslands.jsx', 'utf8')).not.toMatch(/EmailIsland/)
})
