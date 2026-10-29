import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The release-verify leg (tests/release-verify.test.js): the pack ladder of
 * scripts/verify-release.cjs exercised EVERY push - the same script the
 * publish lane's verify job runs on the served tarball. Ported from
 * eyestruct's node:test leg to vitest; the script itself is copied as-is
 * (the generic core).
 *
 * Case 1 (positive): npm pack of THIS tree -> the pack ladder -> everything
 *   PASS. The consumer-install half depends on the npm registry (the packed
 *   runtime deps); when offline, the script prints a named SKIP - the leg
 *   asserts "no silent skip", not "always network".
 * Case 2 (negative, fully offline): a doctored tarball carrying a file under
 *   a forbidden prefix (labs/) is refused BY NAME, before any install.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = path.join(root, 'scripts', 'verify-release.cjs')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

// prestruct's own rules arrive as flags, derived from source - the script
// carries none of them: the exports keys pin comes from the checkout's
// package.json, and the probe is the frozen consumer marker this repo's
// install must answer (the engine surface every consumer imports).
const exportsKeys = Object.keys(pkg.exports).join(',')
const engineProbe = "const p=require('prestruct');if(typeof p.prerender!=='function')process.exit(1);if(typeof p.defineConfig!=='function')process.exit(1)"

function packTree(dest) {
  // npm pack of the repo root: the same files npm publish will include
  // (prepublishOnly is NOT a pack hook - the pack list is judged as one).
  const r = spawnSync('npm', ['pack', '--pack-destination', dest], {
    cwd: root, encoding: 'utf8', timeout: 120000,
  })
  expect(r.status, `npm pack failed: ${r.stderr}`).toBe(0)
  const tgz = path.join(dest, `prestruct-${pkg.version}.tgz`)
  expect(fs.existsSync(tgz), `npm pack produced nothing at ${tgz}`).toBe(true)
  return tgz
}

function run(args) {
  return spawnSync('node', [script, ...args], { cwd: root, encoding: 'utf8', timeout: 300000 })
}

describe('release-verify (trust ladder)', () => {
  it('the generic core verifies a foreign repo with zero edits to the script', () => {
    const toy = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-release-toy-'))
    fs.writeFileSync(path.join(toy, 'package.json'), JSON.stringify({
      name: 'toy-verify',
      version: '4.2.0',
      main: 'index.js',
      bin: { 'toy-verify': 'bin.js' },
      files: ['index.js', 'bin.js'],
    }, null, 2))
    fs.writeFileSync(path.join(toy, 'index.js'), "module.exports = { marker: 'toy-verify@1' }\n")
    fs.writeFileSync(path.join(toy, 'bin.js'), "#!/usr/bin/env node\nconsole.log('4.2.0')\n")
    const r = spawnSync('npm', ['pack', '--pack-destination', toy], { cwd: toy, encoding: 'utf8', timeout: 120000 })
    expect(r.status, `toy npm pack failed: ${r.stderr}`).toBe(0)
    const tgz = path.join(toy, 'toy-verify-4.2.0.tgz')
    // cwd is the TOY repo: the caller's tree is the one judged.
    const rv = spawnSync('node', [script, '--pack', tgz, '--version', '4.2.0'], { cwd: toy, encoding: 'utf8', timeout: 300000 })
    const out = `${rv.stdout}\n${rv.stderr}`
    expect(rv.status, `generic ladder failed on the toy repo (${rv.status}):\n${out}`).toBe(0)
    expect(out).toContain('PASS identity: toy-verify@4.2.0')
    expect(out).toContain('PASS consumer probes (1)')
    expect(out).toContain('PASS installed bin toy-verify --version -> 4.2.0')
    fs.rmSync(toy, { recursive: true, force: true })
  })

  it('a caller-stated --forbidden prefix refuses a smuggle the defaults miss', () => {
    const toy = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-release-toy2-'))
    fs.writeFileSync(path.join(toy, 'package.json'), JSON.stringify({
      name: 'toy-verify',
      version: '4.2.0',
      main: 'index.js',
      files: ['index.js'],
    }, null, 2))
    fs.writeFileSync(path.join(toy, 'index.js'), "module.exports = 1\n")
    const r = spawnSync('npm', ['pack', '--pack-destination', toy], { cwd: toy, encoding: 'utf8', timeout: 120000 })
    expect(r.status, `toy npm pack failed: ${r.stderr}`).toBe(0)
    fs.mkdirSync(path.join(toy, 'secrets'), { recursive: true })
    fs.writeFileSync(path.join(toy, 'secrets', 'private.txt'), 'must never ship\n')
    const ex = path.join(toy, 'extracted')
    fs.mkdirSync(ex, { recursive: true })
    const unt = spawnSync('tar', ['-xzf', path.join(toy, 'toy-verify-4.2.0.tgz'), '-C', ex], { encoding: 'utf8' })
    expect(unt.status, `unpack failed: ${unt.stderr}`).toBe(0)
    fs.mkdirSync(path.join(ex, 'package', 'secrets'), { recursive: true })
    fs.writeFileSync(path.join(ex, 'package', 'secrets', 'private.txt'), 'must never ship\n')
    const doctored = path.join(toy, 'doctored.tgz')
    const repack = spawnSync('tar', ['-czf', doctored, '-C', path.join(ex, 'package'), '.'], { encoding: 'utf8' })
    expect(repack.status, `repack failed: ${repack.stderr}`).toBe(0)
    const withFlag = spawnSync('node', [script, '--pack', doctored, '--version', '4.2.0', '--forbidden', 'secrets/'], { cwd: toy, encoding: 'utf8', timeout: 300000 })
    const flaggedOut = `${withFlag.stdout}\n${withFlag.stderr}`
    expect(withFlag.status, `the caller's forbidden flag did not bite (${withFlag.status}):\n${flaggedOut}`).toBe(1)
    expect(flaggedOut).toContain('secrets/private.txt')
    fs.rmSync(toy, { recursive: true, force: true })
  })

  it('the pack ladder verifies real npm pack output (contents + identity + consumer install)', () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'release-verify-'))
    const tgz = packTree(work)
    const r = run(['--pack', tgz, '--version', pkg.version, '--exports', exportsKeys, '--probe', engineProbe])
    const out = `${r.stdout}\n${r.stderr}`
    expect(r.status, `pack ladder failed (${r.status}):\n${out}`).toBe(0)
    expect(out).toContain('PASS forbidden scan')
    expect(out).toContain('PASS served set == npm pack of this tree')
    expect(out).toContain('PASS identity: prestruct@')
    expect(out).toContain('PASS exports map held')
    if (out.includes('PASS consumer probes')) {
      expect(out).toContain('PASS installed bin')
    } else {
      expect(out, `no PASS and no named SKIP for the consumer install:\n${out}`).toContain('SKIP consumer install')
    }
    fs.rmSync(work, { recursive: true, force: true })
  })

  it('a forbidden file smuggled into the tarball is refused BY NAME before any install', () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'release-verify-bad-'))
    const tgz = packTree(work)
    const ex = path.join(work, 'extracted')
    fs.mkdirSync(ex, { recursive: true })
    const unt = spawnSync('tar', ['-xzf', tgz, '-C', ex], { encoding: 'utf8' })
    expect(unt.status, `unpack failed: ${unt.stderr}`).toBe(0)
    fs.mkdirSync(path.join(ex, 'package', 'labs'), { recursive: true })
    fs.writeFileSync(path.join(ex, 'package', 'labs', 'evil.txt'), 'DO NOT SHIP: smuggled\n')
    const doctored = path.join(work, 'doctored.tgz')
    const repack = spawnSync('tar', ['-czf', doctored, '-C', path.join(ex, 'package'), '.'], { encoding: 'utf8' })
    expect(repack.status, `repack failed: ${repack.stderr}`).toBe(0)
    const r = run(['--pack', doctored, '--version', pkg.version])
    const out = `${r.stdout}\n${r.stderr}`
    expect(r.status, `doctored tar PASSED the ladder (${r.status}) - the forbidden scan did not bite:\n${out}`).toBe(1)
    expect(out).toContain('labs/evil.txt')
    expect(out).toContain('FORBIDDEN')
    fs.rmSync(work, { recursive: true, force: true })
  })
})
