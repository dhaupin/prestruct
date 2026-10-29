import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ship, tokenProblems, expandHome, TOKEN_ENV, TOKEN_ENV_ALIAS } from '../scripts/ship-from-download.cjs'

/**
 * Behavior tests for scripts/ship-from-download.cjs (the generic phone
 * publish lane). Temp dirs only, fake npm runner (the runner seam), no
 * network. The lane is family-reusable - it stages ANY npm package tree, so
 * these fixtures use an invented package name deliberately (`lib-x` /
 * `crashtest`), never prestruct, to prove the product-agnostic contract. The
 * gate itself (whatever prepublishOnly the target repo carries) is proven on
 * its own; what is under test here is that the lane assembles and refuses
 * correctly and that the token never lands in a file or the log.
 *
 * Ported from eyestruct@9744c76 tests/ship-from-download.test.js
 * (node:test -> vitest); the script itself is copied as-is.
 */

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ship-lane-'))
}

function mktree(root, name = 'lib-x', version = '1.0.0', withLock = true) {
  fs.mkdirSync(root, { recursive: true })
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name, version }))
  if (withLock) fs.writeFileSync(path.join(root, 'package-lock.json'), '{}')
}

/** fake runner: records {cmd,args,o} per call; optional per-command statuses {install,publish} */
function fakeRunner(status = 0, statuses = null) {
  const calls = []
  const run = (cmd, args, o) => {
    calls.push({ cmd, args: [...args], o })
    const key = args[0] === 'publish' ? 'publish' : 'install'
    return { status: statuses && key in statuses ? statuses[key] : status }
  }
  run.calls = calls
  return run
}

const GOOD_ENV = { [TOKEN_ENV]: 'npm_LIVE-AMPLE-HELLO-WORLD-0123456789abcdef' }

describe('ship-from-download (phone publish lane)', () => {
  it('missing --target and --root are named refusals (exit 2)', () => {
    for (const opts of [
      { run: fakeRunner() },
      { target: '/no/where', run: fakeRunner() },
      { root: '/tmp/x', run: fakeRunner() },
    ]) {
      const r = ship(opts)
      expect(r.code).toBe(2)
      expect(r.out.join('\n')).toContain('ship[')
    }
  })

  it('is product-agnostic: any named npm tree ships (foreign name fixture)', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'), 'crashtest', '1.2.0')
    const run = fakeRunner(0)
    const r = ship({ target: path.join(base, 'src-tree'), root: path.join(base, 'dest'), token: GOOD_ENV[TOKEN_ENV], run })
    expect(r.code).toBe(0)
    expect(r.out.join('\n')).toContain('crashtest@1.2.0')
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('a package.json without a name refuses BAD_PACKAGE_NAME before anything copies', () => {
    const base = tmp()
    fs.mkdirSync(path.join(base, 'src-tree'))
    fs.writeFileSync(path.join(base, 'src-tree', 'package.json'), JSON.stringify({ version: '1.0.0' }))
    const r = ship({ target: path.join(base, 'src-tree'), root: path.join(base, 'dest'), token: GOOD_ENV[TOKEN_ENV], run: fakeRunner() })
    expect(r.code).toBe(2)
    expect(r.out.join('\n')).toContain('BAD_PACKAGE_NAME')
    expect(fs.existsSync(path.join(base, 'dest'))).toBe(false)
  })

  it('a tree with no package.json refuses NOT_A_PACKAGE_TREE (the wrong-folder zip classic)', () => {
    const base = tmp()
    fs.mkdirSync(path.join(base, 'parent', 'real-tree'), { recursive: true })
    fs.writeFileSync(path.join(base, 'parent', 'real-tree', 'package.json'), JSON.stringify({ name: 'lib-x', version: '1.0.0' }))
    const r = ship({ target: path.join(base, 'parent'), root: path.join(base, 'dest'), token: GOOD_ENV[TOKEN_ENV], run: fakeRunner() })
    expect(r.code).toBe(2)
    expect(r.out.join('\n')).toContain('NOT_A_PACKAGE_TREE')
  })

  it('staged copy: target -> root, ci chosen with a lockfile, install + publish in order', () => {
    const base = tmp()
    const home = path.join(base, 'home')
    fs.mkdirSync(path.join(home, 'web'), { recursive: true })
    mktree(path.join(base, 'src-tree'))
    const run = fakeRunner(0)
    const r = ship({
      target: path.join(base, 'src-tree'),
      root: path.join(home, 'web/lib-x-main'),
      token: GOOD_ENV[TOKEN_ENV],
      run,
    })
    expect(r.code).toBe(0)
    const cmds = run.calls.map((c) => `${c.cmd} ${c.args.join(' ')}`)
    expect(cmds).toEqual(['npm ci', 'npm publish'])
    expect(run.calls[0].o.cwd).toBe(path.join(home, 'web/lib-x-main'))
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('npm install is used when the target carries no lockfile', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'), 'lib-x', '1.0.0', false)
    const run = fakeRunner(0)
    const r = ship({ target: path.join(base, 'src-tree'), root: path.join(base, 'dest'), token: GOOD_ENV[TOKEN_ENV], run })
    expect(r.code).toBe(0)
    expect(run.calls[0].args.join(' ')).toBe('install')
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('--dry-run rides the publish call', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'))
    const run = fakeRunner(0)
    const r = ship({ target: path.join(base, 'src-tree'), root: path.join(base, 'dest'), token: GOOD_ENV[TOKEN_ENV], run, dryRun: true })
    expect(r.code).toBe(0)
    expect(run.calls[1].args).toContain('--dry-run')
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('the staged .npmrc holds the ENV expansion, never the token; unlinked in finally even when publish fails', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'))
    const npmrc = path.join(base, 'dest', '.npmrc')
    const run = fakeRunner(0, { install: 0, publish: 1 }) // install ok, publish fails
    const r = ship({ target: path.join(base, 'src-tree'), root: path.join(base, 'dest'), token: GOOD_ENV[TOKEN_ENV], run })
    expect(r.code).toBe(1)
    expect(fs.existsSync(npmrc)).toBe(false)
    expect(run.calls.length).toBe(2)
    const publishEnv = run.calls[1].o.env[TOKEN_ENV]
    expect(publishEnv).toBe(GOOD_ENV[TOKEN_ENV])
    expect(JSON.stringify(run.calls[1].args)).not.toContain(GOOD_ENV[TOKEN_ENV])
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('.npmrc content pattern: ${NPM_TOKEN} placeholder, not secret', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'))
    let captured = null
    const origWrite = fs.writeFileSync
    fs.writeFileSync = (p, c, ...rest) => {
      if (String(p).endsWith('.npmrc')) captured = c
      return origWrite(p, c, ...rest)
    }
    try {
      const r = ship({ target: path.join(base, 'src-tree'), root: path.join(base, 'dest'), token: GOOD_ENV[TOKEN_ENV], run: fakeRunner(0) })
      expect(r.code).toBe(0)
    } finally {
      fs.writeFileSync = origWrite
    }
    expect(captured).toContain(`\${${TOKEN_ENV}}`)
    expect(captured).not.toContain(GOOD_ENV[TOKEN_ENV])
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('a token-value leak anywhere in the log is a failing assertion', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'))
    const r = ship({ target: path.join(base, 'src-tree'), root: path.join(base, 'dest'), token: GOOD_ENV[TOKEN_ENV], run: fakeRunner(0) })
    expect(r.code).toBe(0)
    expect(r.out.join('\n')).not.toContain(GOOD_ENV[TOKEN_ENV])
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('a non-empty root refuses and never deletes (ROOT_OCCUPIED, the rm line is advice)', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'))
    const root = path.join(base, 'dest')
    fs.mkdirSync(root)
    fs.writeFileSync(path.join(root, 'sentinel.txt'), 'do not touch')
    const r = ship({ target: path.join(base, 'src-tree'), root, token: GOOD_ENV[TOKEN_ENV], run: fakeRunner() })
    expect(r.code).toBe(2)
    expect(r.out.join('\n')).toContain('ROOT_OCCUPIED')
    expect(r.out.join('\n')).toContain('rm -rf')
    expect(fs.existsSync(path.join(root, 'sentinel.txt'))).toBe(true)
  })

  it('shared-storage roots refuse SHARED_STORAGE_ROOT (the EACCES-symlink class)', () => {
    const base = tmp()
    const target = path.join(base, 'Download/repo-main')
    mktree(target)
    for (const root of ['/storage/emulated/0/Download/dest', '/sdcard/dest']) {
      const r = ship({ target, root, token: GOOD_ENV[TOKEN_ENV], run: fakeRunner() })
      expect(r.code).toBe(2)
      expect(r.out.join('\n')).toContain('SHARED_STORAGE_ROOT')
    }
  })

  it('copying the home itself, or over the target, refuses', () => {
    const base = tmp()
    const home = path.join(base, 'home')
    fs.mkdirSync(home)
    mktree(path.join(home, 'src-tree'))
    const opts = (root) => ({ target: path.join(home, 'src-tree'), root, token: GOOD_ENV[TOKEN_ENV], run: fakeRunner() })
    const overSelf = ship(opts(path.join(home, 'src-tree')))
    expect(overSelf.code).toBe(2)
  })

  it('publish token provenance: a bad token refuses BAD_TOKEN before publish, with a FRESH root per probe', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'))
    const probes = ['', 'short', 'hunter2 password line with spaces', 'id-most-definitely-not']
    for (const [i, t] of probes.entries()) {
      const run = fakeRunner(0, { install: 0, publish: 0 })
      const r = ship({ target: path.join(base, 'src-tree'), root: path.join(base, `dest-${i}`), token: t, run })
      expect(r.code).toBe(2)
      expect(r.out.join('\n')).toContain('BAD_TOKEN')
      expect(run.calls.length).toBe(1)
    }
  })

  it('tokenProblems never echoes the token value', () => {
    const good = 'npm_live-ok-hello-0123456789abcdef'
    expect(tokenProblems(good)).toBe(null)
    const gib = 'Zq7kxWmPv9hRt2LqBnJ4f'
    const control = 'Zq7kX\tWmPv9hRt2LqBnJ'
    for (const bad of [null, '', gib, control, gib.slice(0, 12)]) {
      const msg = tokenProblems(bad) || ''
      expect(msg.length).toBeGreaterThan(0)
      if (bad != null && String(bad).length > 4) {
        expect(msg).not.toContain(String(bad))
      }
    }
  })

  it('expandHome resolves a leading ~ and leaves absolute paths alone', () => {
    expect(expandHome('~')).toBe(os.homedir())
    expect(expandHome('~/web/x')).toBe(path.join(os.homedir(), 'web/x'))
    expect(expandHome('/abs/x')).toBe('/abs/x')
  })

  it('--clean removes the staged root on success; default never deletes', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'))
    for (const clean of [false, true]) {
      const root = path.join(base, `dest-${clean ? 'clean' : 'keep'}`)
      const r = ship({ target: path.join(base, 'src-tree'), root, token: GOOD_ENV[TOKEN_ENV], run: fakeRunner(0), clean })
      expect(r.code).toBe(0)
      expect(fs.existsSync(root)).toBe(!clean)
      if (clean) expect(r.out.join('\n')).toContain('--clean removed')
    }
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('--clean fires on a publish failure too (the retry must not hit ROOT_OCCUPIED)', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'))
    const root = path.join(base, 'dest')
    const run = fakeRunner(0, { install: 0, publish: 1 })
    const r = ship({ target: path.join(base, 'src-tree'), root, token: GOOD_ENV[TOKEN_ENV], run, clean: true })
    expect(r.code).toBe(1)
    expect(fs.existsSync(root)).toBe(false)
    expect(r.out.join('\n')).toContain('--clean removed')
    const run2 = fakeRunner(0)
    const r2 = ship({ target: path.join(base, 'src-tree'), root, token: GOOD_ENV[TOKEN_ENV], run: run2 })
    expect(r2.code).toBe(0)
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('--clean fires on refusals after staging too (BAD_TOKEN leaves nothing behind)', () => {
    const base = tmp()
    mktree(path.join(base, 'src-tree'))
    const root = path.join(base, 'dest')
    const r = ship({ target: path.join(base, 'src-tree'), root, token: '', run: fakeRunner(0), clean: true })
    expect(r.code).toBe(2)
    expect(fs.existsSync(root)).toBe(false)
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('--clean NEVER touches the --target (only the root it staged in this run)', () => {
    const base = tmp()
    const target = path.join(base, 'src-tree')
    mktree(target)
    const r = ship({ target, root: path.join(base, 'dest'), token: GOOD_ENV[TOKEN_ENV], run: fakeRunner(0), clean: true })
    expect(r.code).toBe(0)
    expect(fs.existsSync(target)).toBe(true)
    expect(fs.existsSync(path.join(target, 'package.json'))).toBe(true)
    fs.rmSync(base, { recursive: true, force: true })
  })

  it('the export names are the standard: NPM_TOKEN primary, NPM_SHIP_TOKEN fallback', () => {
    expect(TOKEN_ENV).toBe('NPM_TOKEN')
    expect(TOKEN_ENV_ALIAS).toBe('NPM_SHIP_TOKEN')
  })
})
