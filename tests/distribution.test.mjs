// Distribution contract (poststruct#79). The prestruct-proxy pack is only as
// useful as its DELIVERY: a consumer arms it by an exact npm pin, so it must
// ride the published tarball. npm honours package.json `files`, so a pack tree
// excluded there is invisible to `npm i prestruct` even though it is committed
// and green. This leg pins the two halves of that contract against the real
// tree - the `files` whitelist carries `packs/`, and every committed pack dir
// is one the whitelist would ship - so a refactor that drops `packs/` from
// `files` (silently un-delivering the pack) fails here instead of in a
// consumer's CI.
//
// Named .test.mjs (not .test.js): the root battery runs it, while the release
// artifact battery (init/vitest.config.js include: tests/**/*.test.js) skips
// it -- the same mechanism census.test.mjs uses, because `packs/` is not part
// of the init/ artifact.

import { test, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const REPO = process.cwd()
const files = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).files
const packsRoot = join(REPO, 'packs', 'public')

test('package.json `files` carries `packs/` (npm i prestruct must deliver the pack)', () => {
  expect(
    files.some((f) => f === 'packs' || f === 'packs/' || f.startsWith('packs/')),
    'package.json `files` must carry `packs/` - otherwise npm i prestruct delivers no packs (poststruct#79)',
  ).toBe(true)
})

test('every committed pack dir rides the whitelist', () => {
  const packDirs = readdirSync(packsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
  expect(packDirs.length, `packs/public/ must carry at least one pack dir`).toBeGreaterThan(0)
  for (const name of packDirs) {
    expect(existsSync(join(packsRoot, name, 'pack.json')), `pack dir packs/public/${name} must carry a pack.json`).toBe(true)
  }
  // A bare `packs/` ships the whole subtree; a pack-by-pack list must name
  // every committed pack, or a newly added pack silently does not ship.
  const barePacks = files.some((f) => f === 'packs' || f === 'packs/')
  const namedAll = packDirs.every((n) => files.includes(`packs/public/${n}`) || files.includes(`packs/public/${n}/`))
  expect(barePacks || namedAll, `every pack dir must be delivered: ${packDirs.join(', ')} (files=${JSON.stringify(files)})`).toBe(true)
})
