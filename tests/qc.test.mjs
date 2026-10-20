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

test('release workflow packages only init starter files', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8')

  expect(workflow).toMatch(/cp -R init\/. "\$\{PACKAGE_DIR\}\//)
  expect(workflow).toMatch(/if unzip -l "\$\{ARCHIVE\}" \| grep -q "example\//)
  expect(workflow).not.toMatch(/zip -r "\$\{ARCHIVE\}" init\//)
})
