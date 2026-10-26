import { test, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SYNCED_FILES = [
  'scripts/inject-brand.js',
  'scripts/prerender.js',
  'scripts/validate-config.js',
  'src/hooks/usePageMeta.js',
  'src/islands.js',
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
  ['engine/scripts/validate-config.js', 'init/scripts/validate-config.js'],
  ['engine/src/hooks/usePageMeta.js', 'init/src/hooks/usePageMeta.js'],
  ['engine/src/islands.js', 'init/src/islands.js'],
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

test('release workflow packages only init starter files', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8')

  expect(workflow).toMatch(/cp -R init\/. "\$\{PACKAGE_DIR\}\//)
  expect(workflow).toMatch(/if unzip -l "\$\{ARCHIVE\}" \| grep -q "example\//)
  expect(workflow).not.toMatch(/zip -r "\$\{ARCHIVE\}" init\//)
})
