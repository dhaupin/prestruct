// tests/check-action-pins.test.js - the pin guard's own battery (packstruct#69).
//
// Both ways, per the house rule: a floating ref must fail, a pinned ref must
// pass. Temp dirs, no network - the guard is spawned as a subprocess over a
// fixture workflows dir so the exit code is what CI sees.
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GUARD = path.join(REPO_ROOT, 'scripts', 'check-action-pins.cjs')
const SHA = '11d5960a326750d5838078e36cf38b85af677262'

function runGuard(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pins-'))
  const wf = path.join(dir, 'workflows')
  fs.mkdirSync(wf, { recursive: true })
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(wf, name), body)
  const res = spawnSync(process.execPath, [GUARD, wf], { encoding: 'utf8' })
  fs.rmSync(dir, { recursive: true, force: true })
  return res
}

describe('check-action-pins (pins, never floats)', () => {
  it('passes a SHA-pinned ref with a tag comment', () => {
    const res = runGuard({ 'ci.yml': `jobs:\n  a:\n    steps:\n      - uses: actions/checkout@${SHA} # v4\n` })
    expect(res.status).toBe(0)
    expect(res.stdout).toMatch(/PASS/)
  })

  it('fails a floating @vN ref', () => {
    const res = runGuard({ 'ci.yml': `jobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n` })
    expect(res.status).toBe(1)
    expect(res.stderr).toMatch(/floating ref/)
  })

  it('fails a floating branch ref (ruby/setup-ruby@v1)', () => {
    const res = runGuard({ 'ci.yml': `jobs:\n  a:\n    steps:\n      - uses: ruby/setup-ruby@v1\n` })
    expect(res.status).toBe(1)
    expect(res.stderr).toMatch(/floating ref/)
  })

  it('fails a docker:// image ref (an unpinned image is the same float)', () => {
    const res = runGuard({ 'ci.yml': `jobs:\n  a:\n    steps:\n      - uses: docker://alpine:3\n` })
    expect(res.status).toBe(1)
  })

  it('does not require a local action (./path) to be pinned', () => {
    const res = runGuard({ 'ci.yml': `jobs:\n  a:\n    steps:\n      - uses: ./.github/actions/setup\n` })
    expect(res.status).toBe(0)
  })

  it('passes a pinned ref with no tag comment but flags a note', () => {
    const res = runGuard({ 'ci.yml': `jobs:\n  a:\n    steps:\n      - uses: actions/checkout@${SHA}\n` })
    expect(res.status).toBe(0)
    expect(res.stdout).toMatch(/note:/)
  })

  it('unwraps a quoted uses value before the shape check', () => {
    const res = runGuard({ 'ci.yml': `jobs:\n  a:\n    steps:\n      - uses: "actions/checkout@v4"\n` })
    expect(res.status).toBe(1)
  })

  it('the repo itself is fully SHA-pinned', () => {
    const res = spawnSync(process.execPath, [GUARD], { encoding: 'utf8', cwd: REPO_ROOT })
    expect(res.status).toBe(0)
    expect(res.stdout).toMatch(/all SHA-pinned/)
  })
})
