import { describe, it, expect } from 'vitest'
import { spawnSync, spawn } from 'node:child_process'
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
    cwd: root, encoding: 'utf8', timeout: 120000, env: packEnv(),
  })
  expect(r.status, `npm pack failed: ${r.stderr}`).toBe(0)
  const tgz = path.join(dest, `prestruct-${pkg.version}.tgz`)
  expect(fs.existsSync(tgz), `npm pack produced nothing at ${tgz}`).toBe(true)
  return tgz
}

// `npm publish --dry-run` exports npm_config_dry_run=true into the lifecycle
// env; a nested `npm pack` would then write no tarball. Strip it so a
// rehearsal verdict equals a real-publish verdict.
function packEnv() {
  const env = { ...process.env }
  delete env.npm_config_dry_run
  return env
}

function run(args) {
  return spawnSync('node', [script, ...args], { cwd: root, encoding: 'utf8', timeout: 300000 })
}

// Async sibling: the propagation-retry tests run a local registry server in
// THIS process, so the child must not block the event loop (spawnSync would
// deadlock - the server could never answer a poll).
function runAsync(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [script, ...args], { cwd: root, ...opts })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', reject)
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
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
    const r = spawnSync('npm', ['pack', '--pack-destination', toy], { cwd: toy, encoding: 'utf8', timeout: 120000, env: packEnv() })
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
  }, 120000)

  it('a caller-stated --forbidden prefix refuses a smuggle the defaults miss', () => {
    const toy = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-release-toy2-'))
    fs.writeFileSync(path.join(toy, 'package.json'), JSON.stringify({
      name: 'toy-verify',
      version: '4.2.0',
      main: 'index.js',
      files: ['index.js'],
    }, null, 2))
    fs.writeFileSync(path.join(toy, 'index.js'), "module.exports = 1\n")
    const r = spawnSync('npm', ['pack', '--pack-destination', toy], { cwd: toy, encoding: 'utf8', timeout: 120000, env: packEnv() })
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
  }, 120000)

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
  }, 120000)

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
  }, 120000)

  it('the npm ladder polls through the post-publish propagation window', async () => {
    // The first v1.2.0 verify run read `latest 1.1.0` seconds after
    // `+ prestruct@1.2.0`: npm serves a fresh publish before its packument
    // indexes it. A local registry that lags for two polls then settles must
    // produce a PASS, not a red release. The lag is the bug; the retry is
    // the fix; this pins it.
    const http = await import('node:http')
    const crypto = await import('node:crypto')
    const toy = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-release-lag-'))
    fs.writeFileSync(path.join(toy, 'package.json'), JSON.stringify({
      name: 'toy-verify',
      version: '1.2.0',
      main: 'index.js',
      files: ['index.js'],
    }, null, 2))
    fs.writeFileSync(path.join(toy, 'index.js'), "module.exports = { marker: 'toy-verify@1' }\n")
    const pk = spawnSync('npm', ['pack', '--pack-destination', toy], { cwd: toy, encoding: 'utf8', timeout: 120000, env: packEnv() })
    expect(pk.status, `toy npm pack failed: ${pk.stderr}`).toBe(0)
    const tarball = fs.readFileSync(path.join(toy, 'toy-verify-1.2.0.tgz'))
    const integrity = 'sha512-' + crypto.createHash('sha512').update(tarball).digest('base64')

    let polls = 0
    const settledAfter = 2
    let base
    const server = http.createServer((req, res) => {
      if (req.url.endsWith('.tgz')) {
        res.writeHead(200, { 'content-type': 'application/octet-stream' })
        return res.end(tarball)
      }
      polls += 1
      const settled = polls > settledAfter
      const body = settled
        ? {
            'dist-tags': { latest: '1.2.0' },
            versions: { '1.2.0': { dist: { tarball: `${base}/toy-verify.tgz`, integrity, attestations: { url: 'x' } } } },
          }
        : { 'dist-tags': { latest: '1.1.0' }, versions: { '1.1.0': {} } }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    })
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${server.address().port}`
    try {
      const rv = await runAsync(['--npm', '--version', '1.2.0'], {
        cwd: toy,
        env: { ...process.env, VERIFY_RELEASE_REGISTRY: base, VERIFY_RELEASE_ATTEMPTS: '6', VERIFY_RELEASE_DELAY_MS: '25' },
      })
      const out = `${rv.stdout}\n${rv.stderr}`
      expect(rv.status, `lagging-registry ladder failed (${rv.status}):\n${out}`).toBe(0)
      expect(out, `no retry happened; the propagation window was not polled:\n${out}`).toContain('propagation')
      expect(out).toContain('PASS registry latest == 1.2.0')
      expect(polls).toBeGreaterThan(settledAfter)
    } finally {
      server.close()
      fs.rmSync(toy, { recursive: true, force: true })
    }
  }, 120000)

  it('the npm ladder still fails fast when the version truly never lands', async () => {
    // The retry must not soften the real refusal: a registry that never
    // indexes the version exhausts the poll budget and fails BY NAME.
    const http = await import('node:http')
    const toy = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-release-never-'))
    fs.writeFileSync(path.join(toy, 'package.json'), JSON.stringify({ name: 'toy-verify', version: '9.9.9', main: 'index.js', files: ['index.js'] }, null, 2))
    fs.writeFileSync(path.join(toy, 'index.js'), 'module.exports = 1\n')
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ 'dist-tags': { latest: '1.1.0' }, versions: { '1.1.0': {} } }))
    })
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${server.address().port}`
    try {
      const rv = await runAsync(['--npm', '--version', '9.9.9'], {
        cwd: toy,
        env: { ...process.env, VERIFY_RELEASE_REGISTRY: base, VERIFY_RELEASE_ATTEMPTS: '3', VERIFY_RELEASE_DELAY_MS: '10' },
      })
      const out = `${rv.stdout}\n${rv.stderr}`
      expect(rv.status, `a version that never landed must fail (${rv.status}):\n${out}`).toBe(1)
      expect(out).toContain('never indexed 9.9.9')
    } finally {
      server.close()
      fs.rmSync(toy, { recursive: true, force: true })
    }
  }, 120000)

  it('--asset is a --gh modifier: refused without --gh, and needs a name', () => {
    // The release asset is the SAME bytes as the npm artifact (asserted in
    // the verify job against the registry integrity). The flag only means
    // something alongside the release ladder, so the script names the
    // misuse instead of silently ignoring it.
    const bare = run(['--pack', '/nonexistent.tgz', '--asset', 'x.tgz'])
    const bareOut = `${bare.stdout}\n${bare.stderr}`
    expect(bare.status, `--asset without --gh must be refused (${bare.status}):\n${bareOut}`).toBe(2)
    expect(bareOut).toContain('--asset is a --gh modifier')

    const nameless = run(['--gh', '--tag', 'v1.2.3', '--asset'])
    const namelessOut = `${nameless.stdout}\n${nameless.stderr}`
    expect(nameless.status, `--asset with no name must be refused (${nameless.status}):\n${namelessOut}`).toBe(2)
    expect(namelessOut).toContain('--asset needs an asset file name')
  }, 60000)
  it('--allowed de-asserts a default-forbidden prefix for this invocation', () => {
    // The family flag (vant ships web/ as product): a repo whose runtime
    // tarball legitimately carries a default-forbidden tree dir states it as
    // --allowed instead of forking the script. Exemption only, prefix-scoped.
    const toy = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-release-allowed-'))
    fs.writeFileSync(path.join(toy, 'package.json'), JSON.stringify({
      name: 'toy-verify', version: '4.2.0', main: 'index.js', files: ['index.js'],
    }, null, 2))
    fs.writeFileSync(path.join(toy, 'index.js'), 'module.exports = 1\n')
    const r = spawnSync('npm', ['pack', '--pack-destination', toy], { cwd: toy, encoding: 'utf8', timeout: 120000, env: packEnv() })
    expect(r.status, `toy npm pack failed: ${r.stderr}`).toBe(0)
    const ex = path.join(toy, 'extracted')
    fs.mkdirSync(ex, { recursive: true })
    expect(spawnSync('tar', ['-xzf', path.join(toy, 'toy-verify-4.2.0.tgz'), '-C', ex], { encoding: 'utf8' }).status).toBe(0)
    fs.mkdirSync(path.join(ex, 'package', 'web'), { recursive: true })
    fs.writeFileSync(path.join(ex, 'package', 'web', 'app.js'), '// ships as product\n')
    const doctored = path.join(toy, 'doctored.tgz')
    expect(spawnSync('tar', ['-czf', doctored, '-C', path.join(ex, 'package'), '.'], { encoding: 'utf8' }).status).toBe(0)
    const without = spawnSync('node', [script, '--pack', doctored, '--version', '4.2.0'], { cwd: toy, encoding: 'utf8', timeout: 300000 })
    expect(without.status, 'web/ must be refused without the flag').toBe(1)
    expect(`${without.stdout}\n${without.stderr}`).toContain('forbidden path prefix web/')
    const withFlag = spawnSync('node', [script, '--pack', doctored, '--version', '4.2.0', '--allowed', 'web/'], { cwd: toy, encoding: 'utf8', timeout: 300000 })
    const out = `${withFlag.stdout}\n${withFlag.stderr}`
    expect(out, `--allowed did not clear the forbidden scan:\n${out}`).toContain('PASS forbidden scan')
    expect(out).not.toContain('forbidden path prefix web/')
    fs.rmSync(toy, { recursive: true, force: true })
  }, 120000)
})

  // Some npm builds (the phone's) answer `npm pack --dry-run --json` with an
  // empty stdout - no JSON at all - and print a config warning besides. The
  // ladder must not read that as a capability failure: it derives the expected
  // set from a REAL `npm pack` (which the served-tarball forbidden scan already
  // proved works on this build) instead of parsing the --json probe.
  it('survives a phone npm whose --dry-run --json probe is empty', () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'release-verify-noisy-'))
    const tgz = packTree(work)
    const bin = path.join(work, 'bin')
    fs.mkdirSync(bin)
    const realNpm = spawnSync('which', ['npm'], { encoding: 'utf8' }).stdout.trim()
    const shim = path.join(bin, 'npm')
    fs.writeFileSync(shim, [
      '#!/bin/sh',
      'case " $* " in',
      '  *" --dry-run "*)',
      '    echo "npm warn Unknown project config \\"always-auth\\". This will stop working in the next major version of npm."',
      '    exit 0 ;;',
      'esac',
      `exec ${realNpm} "$@"`,
      '',
    ].join('\n'))
    fs.chmodSync(shim, 0o755)
    const r = spawnSync('node', [script, '--pack', tgz, '--version', pkg.version, '--exports', exportsKeys], {
      cwd: root, encoding: 'utf8', timeout: 300000,
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    })
    const out = `${r.stdout}\n${r.stderr}`
    expect(out).toContain('PASS served set == npm pack of this tree')
    expect(out).not.toContain('npm pack --dry-run --json failed')
    fs.rmSync(work, { recursive: true, force: true })
  }, 120000)
