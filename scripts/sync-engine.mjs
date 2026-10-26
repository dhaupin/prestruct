/**
 * scripts/sync-engine.mjs
 * =======================
 * Generator: the repo carries ONE engine; init/ and example/ get generated
 * copies. Edit engine/, run this script, commit.
 *
 *   node scripts/sync-engine.mjs        # generate init/ + example/ from engine/
 *   node scripts/sync-engine.mjs check  # verify only, exit 1 on drift
 *
 * CI (.github/workflows/engine-sync-check.yml + tests/qc.test.mjs) verifies
 * engine == init == example byte-identically for every contract file.
 * init/ + example/ copies must never be hand-edited: fix engine/, regenerate.
 *
 * Files intentionally NOT synced (example-owned: branding, routes):
 *   example/ssr.config.js, example/ssr.config.example.js,
 *   example/src/AppLayout.jsx, example/src/App.jsx, example/src/main.jsx
 */

import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Contract files: engine path -> deployed path (same in init/ and example/)
// Keep in sync with:
//   .github/workflows/engine-sync-check.yml  (init-vs-example check)
//   tests/qc.test.mjs                        (same files + react-router ext pin)
const CONTRACT = [
  ['engine/scripts/inject-brand.js', 'scripts/inject-brand.js'],
  ['engine/scripts/prerender.js', 'scripts/prerender.js'],
  ['engine/scripts/audit.js', 'scripts/audit.js'],
  ['engine/scripts/indexnow.js', 'scripts/indexnow.js'],
  ['engine/scripts/hooks.js', 'scripts/hooks.js'],
  ['engine/scripts/ogimage.js', 'scripts/ogimage.js'],
  ['engine/scripts/validate-config.js', 'scripts/validate-config.js'],
  ['engine/src/hooks/usePageMeta.js', 'src/hooks/usePageMeta.js'],
  ['engine/src/islands.js', 'src/islands.js'],
]

// INIT_ONLY: generated into init/ but example-owned in the live site
// (example customizes these). Do not overwrite example's copies.
const INIT_ONLY = [
  ['engine/vite.config.js', 'vite.config.js'],
]

function destPath(base, deployedPath) {
  return join(ROOT, base, deployedPath)
}

function ensureDir(dest) {
  mkdirSync(dirname(dest), { recursive: true })
}

if (process.argv.slice(2).includes('check')) {
  let mismatch = 0
  for (const [enginePath, deployedPath] of CONTRACT) {
    const engine = readFileSync(join(ROOT, enginePath), 'utf8')
    for (const base of ['init', 'example']) {
      let deployed
      try {
        deployed = readFileSync(destPath(base, deployedPath), 'utf8')
      } catch {
        console.error(`  MISSING ${base}/${deployedPath}`)
        mismatch++
        continue
      }
      if (engine === deployed) {
        console.log(`  ok  ${base}/${deployedPath}`)
      } else {
        console.error(`  DRIFT ${base}/${deployedPath}`)
        mismatch++
      }
    }
  }
  if (mismatch > 0) {
    console.error(`\n${mismatch} drift(s). Fix engine/ then run: node scripts/sync-engine.mjs`)
    process.exit(1)
  }
  console.log(`All ${CONTRACT.length} contract file(s) match engine -> init + example.`)
  process.exit(0)
}

const GROUPS = [
  { targets: ['init', 'example'], files: CONTRACT },
  { targets: ['init'], files: INIT_ONLY },
]

let generated = 0
for (const { targets, files } of GROUPS) {
  for (const [enginePath, deployedPath] of files) {
    const src = join(ROOT, enginePath)
    const srcContent = readFileSync(src, 'utf8')
    for (const base of targets) {
      const dest = destPath(base, deployedPath)
      ensureDir(dest)
      const existing = (() => {
        try {
          return readFileSync(dest, 'utf8')
        } catch {
          return null
        }
      })()
      copyFileSync(src, dest)
      generated++
      if (existing !== srcContent) console.log(`  updated ${base}/${deployedPath}`)
      else console.log(`  same    ${base}/${deployedPath}`)
    }
  }
}
console.log(`\nGenerated ${generated} file(s) engine -> deploy targets. Run tests to verify.`)
