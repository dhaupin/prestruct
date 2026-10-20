/**
 * scripts/sync-engine.mjs
 * =======================
 * Copies engine + synced-template files from init/ into example/.
 * init/ is the single source of truth (see .github/workflows/sync-example.yml).
 * CI (engine-sync-check.yml + tests/qc.test.mjs) verifies the copies are
 * byte-identical -- if the check fails, fix init/ and run this script.
 *
 * Usage:
 *   node scripts/sync-engine.mjs        # copy init -> example
 *   node scripts/sync-engine.mjs check  # verify only, exit 1 on drift
 */

import { copyFileSync, mkdirSync, readFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Keep the check list in sync with:
//   .github/workflows/engine-sync-check.yml  (engine files)
//   .github/workflows/sync-example.yml       (template files)
// Files intentionally NOT synced (example-owned: branding, routes):
//   example/ssr.config.js, example/src/AppLayout.jsx, example/src/App.jsx,
//   example/src/main.jsx, example/ssr.config.example.js
const SYNCED_FILES = [
  'scripts/inject-brand.js',
  'scripts/prerender.js',
  'src/hooks/usePageMeta.js',
  'src/islands.js',
  'src/AppIslands.jsx',
]

const CHECK_ONLY = process.argv.slice(2).includes('check')

if (CHECK_ONLY) {
  let mismatch = 0
  for (const rel of SYNCED_FILES) {
    const init = readFileSync(join(ROOT, 'init', rel), 'utf8')
    const example = readFileSync(join(ROOT, 'example', rel), 'utf8')
    if (init === example) {
      console.log(`  ok  ${rel}`)
    } else {
      console.error(`  DRIFT ${rel}`)
      mismatch++
    }
  }
  if (mismatch > 0) {
    console.error(`\n${mismatch} file(s) drifted. Fix init/ then run: node scripts/sync-engine.mjs`)
    process.exit(1)
  }
  console.log(`All ${SYNCED_FILES.length} synced files match.`)
} else {
  let copied = 0
  for (const rel of SYNCED_FILES) {
    const src = join(ROOT, 'init', rel)
    const dest = join(ROOT, 'example', rel)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(src, dest)
    console.log(`  copied ${rel}`)
    copied++
  }
  console.log(`\nSynced ${copied} file(s) init -> example. Run tests to verify.`)
}
