// Version-truth census leg (prestruct#70, ported from the eyestruct worked
// example). The stale-version class: a living surface hand-copies the CURRENT
// version, a release moves package.json, and the copy keeps lagging until a
// human-eye walk catches it on release day. This leg makes that class die by
// construction: the root package.json is THE single version source, and every
// living surface that names the current version is refused when it drifts.
//
// LAWFUL, deliberately out of scope: dated era rows (changelog dated sections,
// the announcing-v1.1.0 discussion) keep their era wording by design; range
// pins like `^1.0.0` bind 1.x COMPATIBILITY, not the current version; dep
// specs and workflow comments naming OTHER packages' versions are not ours.
//
// Named .test.mjs (not .test.js): the root battery runs it, while the release
// artifact battery (init/vitest.config.js include: tests/**/*.test.js) skips
// it -- the same mechanism qc.test.mjs uses, because the surfaces it audits
// (README.md, example/) are not part of the init/ artifact.

import { test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = process.cwd()

function readVersion(relPath) {
  return JSON.parse(readFileSync(join(REPO, relPath), 'utf8')).version
}

test('version truth: package.json is the single version source', () => {
  const root = readVersion('package.json')
  expect(root).toMatch(/^\d+\.\d+\.\d+/)

  // Side package.jsons ride the root version (a release moves them together).
  expect(readVersion('init/package.json'), 'init/package.json version drifted from root package.json - the release commit moves them together, and this leg holds the moving').toBe(root)
  expect(readVersion('example/package.json'), 'example/package.json version drifted from root package.json - the release commit moves them together, and this leg holds the moving').toBe(root)

  // The template's version stamp (stamped by release.yml from the tag).
  const stamp = readFileSync(join(REPO, 'init/VERSION'), 'utf8').trim()
  expect(stamp, 'init/VERSION drifted from root package.json - move it in the same commit').toBe(root)

  // The committed lockfiles carry the same version (npm keeps them in step).
  expect(JSON.parse(readFileSync(join(REPO, 'init/package-lock.json'), 'utf8')).version).toBe(root)
  expect(JSON.parse(readFileSync(join(REPO, 'example/package-lock.json'), 'utf8')).version).toBe(root)
})

test('version truth: the README current-version line cannot drift from root', () => {
  const root = readVersion('package.json')
  const readme = readFileSync(join(REPO, 'README.md'), 'utf8')
  const status = readme.match(/Status: \*\*(\d+\.\d+\.\d+)/)
  expect(status, 'README must carry a "Status: **X.Y.Z, ..." line for the version pin (the pin relocates WITH the claim if the copy moves)').toBeTruthy()
  expect(status[1], 'README status line carries a stale version - move it in the same commit as root package.json, or drop the number').toBe(root)
})
