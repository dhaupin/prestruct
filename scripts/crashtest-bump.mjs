#!/usr/bin/env node
/**
 * scripts/crashtest-bump.mjs -- one-command crashtest harness upgrade.
 *
 *   node scripts/crashtest-bump.mjs <version>     # e.g. 1.1.0
 *   node scripts/crashtest-bump.mjs <version> --force   # even when already pinned
 *
 * Why this exists: the crashtest CI gate is deliberately PINNED (a floating
 * `@1` re-scoped the gate when 1.1.0 shipped 19 skip-only rows -- pass 26),
 * and the committed labs/ ledger is bound to the harness version that wrote
 * it. A manual bump touches four files in two commits' worth of state and is
 * easy to half-do. This script does the whole bump in one command and FAILS
 * unless the pieces agree:
 *
 *   1. checks the target exists on the npm registry (fails fast offline)
 *   2. installs crashtest@<target> as an EXACT devDependency (pin + lockfile)
 *   3. runs `npx crashtest run` (regenerates labs/hardening.md +
 *      labs/crashledger.json + labs/run-meta.json; nonzero exit stops here)
 *   4. verifies labs/run-meta.json.crashtestVersion == <target>
 *   5. prints the tally + baseline-diff lines and the commit checklist
 *
 * The invariant `devDependency crashtest pin == labs/run-meta stamp` is
 * additionally enforced for every future tree by tests/qc.test.mjs, so a
 * half-bump can never quietly land on main.
 *
 * Exit codes: 0 success / already pinned, 1 stage failure, 2 usage.
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = join(root, 'package.json')

const target = process.argv[2]
const FORCE = process.argv.includes('--force')

if (!target || !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(target)) {
  console.error('usage: node scripts/crashtest-bump.mjs <version> [--force]')
  console.error('       e.g. node scripts/crashtest-bump.mjs 1.2.0')
  process.exit(2)
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const current = pkg.devDependencies?.crashtest

if (current === target && !FORCE) {
  console.log(`[crashtest-bump] already pinned at ${current} -- nothing to do (use --force to re-run anyway)`)
  process.exit(0)
}

const step = (label, fn) => {
  console.log(`[crashtest-bump] ${label}`)
  try {
    return fn()
  } catch (err) {
    console.error(`[crashtest-bump] FAILED at: ${label}`)
    if (err.stdout) console.error(err.stdout.toString().split('\n').slice(-20).join('\n'))
    if (err.stderr) console.error(err.stderr.toString().split('\n').slice(-20).join('\n'))
    process.exit(1)
  }
}

step(`registry check: crashtest@${target} exists`, () =>
  execFileSync('npm', ['view', `crashtest@${target}`, 'version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
)

const dirty = step('checking labs/ for uncommitted stubs', () =>
  execFileSync('git', ['status', '--porcelain', 'labs/'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
).trim()
if (dirty) {
  console.log('[crashtest-bump] note: labs/ has uncommitted changes -- step 3 regenerates them; commit the old trio first if you want it preserved')
}

step(`installing crashtest@${target} as an exact devDependency`, () =>
  execFileSync('npm', ['install', '--save-dev', '--save-exact', `crashtest@${target}`], { cwd: root, stdio: 'inherit' })
)

const runOut = step('running the harness (this is also the local gate run)', () =>
  execFileSync('npx', ['crashtest', 'run'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
)

// Shared output surface: tally + baseline lines are how the repo reads a run.
const lines = runOut.split('\n')
const tally = lines.find(l => l.includes('tally:')) || '(tally line not found)'
const baseline = lines.find(l => l.includes('baseline:')) || '(baseline line not found)'

const meta = step('verifying the regenerated ledger stamp', () =>
  JSON.parse(readFileSync(join(root, 'labs', 'run-meta.json'), 'utf8'))
)
if (meta.crashtestVersion !== target) {
  console.error(`[crashtest-bump] FAILED: the harness wrote crashtestVersion ${meta.crashtestVersion} -- expected ${target}. Did npx resolve the wrong tree?`)
  process.exit(1)
}

console.log('')
console.log(`[crashtest-bump] pin: crashtest ${current} -> ${target}`)
console.log(`[crashtest-bump] ${tally.trim()}`)
console.log(`[crashtest-bump] ${baseline.trim()}`)
console.log(`[crashtest-bump] devDep pin == labs/run-meta stamp == ${target} -- invariant holds`)
console.log('')
console.log('[crashtest-bump] next: review the labs/ diff, then commit IN ONE COMMIT:')
console.log('    git add package.json package-lock.json labs/')
console.log(`    git commit -m "crashtest harness ${target}: <what changed in the verdict set>"`)
console.log('[crashtest-bump] the qc battery fails if the pin and the ledger stamp drift apart later.')
