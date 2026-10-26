/**
 * CLI refusal contract (issue 54, ported from the freestruct 26.16 hardening)
 * ---
 * A dash-shaped arg that is not a known flag used to be silently ignored:
 * init skipped it, build/validate/clean walked past it. The run then
 * "succeeded" without the behavior the user asked for. These tests pin the
 * loud refusal (exit 1, names the flags) AND the known-flag green paths.
 * Spawns the real CLI in a scratch dir -- the module shape under test is a
 * process, not an export (same reason the tarball e2e exists).
 */
import { describe, it, expect } from 'vitest'
import { execFileSync, spawnSync } from 'child_process'
import { mkdtempSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const CLI = new URL('../bin/cli.mjs', import.meta.url).pathname

function run(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: mkdtempSync(join(tmpdir(), 'prestruct-cli-')),
    encoding: 'utf8',
    ...opts,
  })
}

describe('cli refusal contract (#54)', () => {
  it('refuses an unknown init flag loudly instead of scaffolding past it', () => {
    const r = run(['init', '--definitely-not-a-flag'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('unknown flag(s): --definitely-not-a-flag')
    expect(r.stderr).toContain('prestruct help')
  })

  it('refuses the typo\'d build flag class (--Force, -force) per command', () => {
    for (const bad of ['--Force', '-force', '--forcee']) {
      const r = run(['build', bad])
      expect(r.status).toBe(1)
      expect(r.stderr).toContain(`unknown flag(s): ${bad}`)
    }
  })

  it('refuses unknown flags on validate and clean', () => {
    expect(run(['validate', '--json']).status).toBe(1)
    expect(run(['clean', '--deep']).status).toBe(1)
  })

  it('--help is a first-class flag on every command (exit 0, help text)', () => {
    for (const argv of [['help'], ['init', '--help'], ['build', '--help'], ['validate', '--help'], ['clean', '--help']]) {
      const r = run(argv)
      expect(r.status).toBe(0)
      expect(r.stdout).toContain('prestruct init [dir]')
    }
  })

  it('known flags keep their green path (init scaffolds; init rerun skips)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prestruct-init-'))
    execFileSync(process.execPath, [CLI, 'init', dir], { encoding: 'utf8' })
    expect(existsSync(join(dir, 'ssr.config.example.js'))).toBe(true)

    // Second run: never-clobber, exit 0
    const r2 = spawnSync(process.execPath, [CLI, 'init', dir], { encoding: 'utf8' })
    expect(r2.status).toBe(0)
    expect(r2.stdout).toContain('0 created')
  })

  it('build still forwards --force/-f/--clean to the engine (pass-through intact)', () => {
    // No config in the scratch dir: build fails for the config reason only
    const r = run(['build', '--force', '--clean'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('ssr.config.js not found')
    expect(r.stderr).not.toContain('unknown flag')
  })

  it('findWorkdir reads the positional anywhere in argv, not just args[0]', () => {
    // The dir arg used to be read only from args[0], so `build --force dir`
    // saw the flag first and searched cwd upward for a config -- silently
    // building the wrong tree. A config in the positional dir must be found
    // with the flag on either side; the build then proceeds past validation
    // (and dies at vite, which is absent in the scratch env).
    const proj = mkdtempSync(join(tmpdir(), 'prestruct-pos-'))
    writeFileSync(join(proj, 'ssr.config.js'),
      "export default { siteUrl: 'https://x.com', routes: [{ path: '/' }] }\n")
    // Cold CI spawns (fresh npx resolution in a bare tmpdir) measured 30s+
    // and even crossed vitest's 5s default test timeout once: the default
    // killed the test mid-spawnSync, which is a harness artifact, not CLI
    // behavior. The spawn contract is not what's under test, so these two
    // invocations run with headroom. spawnSync is blocking -- there is no
    // in-test retry to catch an external timeout, only room to finish.
    for (const argv of [['build', '--force', proj], ['build', proj, '--force']]) {
      const r = run(argv, { cwd: mkdtempSync(join(tmpdir(), 'prestruct-pos-cwd-')) })
      expect(r.stderr).not.toContain('ssr.config.js not found')
      expect(r.stderr).not.toContain('unknown flag')
      expect(r.status).not.toBe(0) // vite build failure, which is expected here
    }
  }, 80000)
})
