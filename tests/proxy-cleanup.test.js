import { describe, it, expect, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, utimesSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createHash } from 'crypto'

/**
 * VPS cleanupCache eviction contract (walk 2026-10).
 *
 * Module-level CACHE_DIR resolves at import time, so this file imports the
 * proxy lazily with PRESTRUCT_CACHE_DIR + PRESTRUCT_CACHE_MAX_MB already
 * pointed at a temp dir + 1MB cap -- small enough to exercise REAL eviction
 * without a 500MB fixture.
 *
 * Pinned: eviction touches ONLY cache-shaped files (64-hex .html written by
 * cacheWrite). Decoy files (the sharing-a-dir operator case) survive even
 * when the directory crosses the size cap.
 */

const tmp = mkdtempSync(join(tmpdir(), 'prestruct-cleanup-'))
process.env.PRESTRUCT_CACHE_DIR = tmp
process.env.PRESTRUCT_CACHE_MAX_MB = '1'

const { cleanupCache } = await import('../init/scripts/proxy.js')

const cacheName = (n) => createHash('sha256').update('route' + n).digest('hex') + '.html'

describe('cleanupCache eviction contract', () => {
  afterAll(() => rmSync(tmp, { recursive: true, force: true }))

  it('leaves non-cache files alone (the PRESTRUCT_CACHE_DIR override case)', () => {
    const decoy = join(tmp, 'operator-data.bin')
    writeFileSync(decoy, Buffer.alloc(0))
    writeFileSync(join(tmp, 'important.csv'), Buffer.alloc(0))

    // force bypasses the 1/min throttle
    cleanupCache({ force: true })

    expect(existsSync(decoy)).toBe(true)
    expect(existsSync(join(tmp, 'important.csv'))).toBe(true)
  })

  it('evicts the oldest cache-shaped files when the dir exceeds the cap', () => {    // Fresh cache files with distinct, incrementing mtimes. Sizes tuned so
    // eviction is a real partial trim: the CACHE FILES THEMSELVES must cross
    // the 1MB cap (decoy sizes do NOT count toward the cache total once the
    // name filter is adopted) -- 8 x 200KB crosses, and trimming the OLDEST
    // reaches the 80% target before the newest is touched.
    for (let i = 0; i < 8; i++) {
      const f = join(tmp, cacheName(i))
      mkdirSync(tmp, { recursive: true })
      writeFileSync(f, 'x'.repeat(200 * 1024))
      const stamp = new Date(Date.now() - (100 - i) * 1000)
      utimesSync(f, stamp, stamp)
    }
    const big = join(tmp, 'bulge.bin')
    writeFileSync(big, Buffer.alloc(300 * 1024))

    cleanupCache({ force: true })

    // oldest cache files gone
    expect(existsSync(join(tmp, cacheName(0)))).toBe(false)
    expect(existsSync(join(tmp, cacheName(1)))).toBe(false)
    // newest cache file survives (eviction stops at the 80% target)
    expect(existsSync(join(tmp, cacheName(7)))).toBe(true)
    // decoys still alive after eviction (the name filter held)
    expect(existsSync(big)).toBe(true)
    rmSync(big)
  })
})
