import { describe, it, expect } from 'vitest'
import { cacheSignature, cacheEntryValid } from '../engine/scripts/prerender.js'

/**
 * Stale-cache regression battery (2026-10 sweep).
 *
 * The old skip was `if (!force && cache[route.path])` — path-keyed only, so a
 * changed shell (new vite hashes, deploy-id), changed route meta, or a
 * changed siteUrl rewrote nothing and the build shipped PREVIOUS-BAKE HTML
 * with a fresh "Done." log. Found live during the example-site once-over:
 * eight source/config edits produced EIGHT "(cached)" lines and a dist/ that
 * contained none of them.
 *
 * These tests pin the signature contract: every rendered input — shell,
 * siteUrl, route meta, route ogImage — participates in the entry signature,
 * legacy entries (no sig) are stale-once, and matching signatures hold.
 */

const SHELL = '<html><head><title>t</title></head><div id="root"></div></html>'
const SHELL_B = SHELL.replace('<title>t</title>', '<title>t2</title>')
const ROUTE = { path: '/about/', meta: { title: 'A', description: 'B' } }
const SITE = 'https://example.com'

const entry = (sig) => ({ html: '<p>cached</p>', time: 1, sig })

describe('cacheSignature', () => {
  it('is deterministic across identical inputs', () => {
    expect(cacheSignature(ROUTE, SITE, SHELL)).toBe(cacheSignature({ ...ROUTE, meta: { ...ROUTE.meta } }, SITE, SHELL))
  })

  it('changes when the shell changes (vite hashes / meta / deploy-id)', () => {
    expect(cacheSignature(ROUTE, SITE, SHELL_B)).not.toBe(cacheSignature(ROUTE, SITE, SHELL))
  })

  it('changes when route meta or ogImage changes', () => {
    const metaEdit   = { ...ROUTE, meta: { ...ROUTE.meta, title: 'A2'   } }
    const ogEdit     = { ...ROUTE, ogImage: '/new.png' }
    expect(cacheSignature(metaEdit, SITE, SHELL)).not.toBe(cacheSignature(ROUTE, SITE, SHELL))
    expect(cacheSignature(ogEdit,   SITE, SHELL)).not.toBe(cacheSignature(ROUTE, SITE, SHELL))
  })

  it('changes when siteUrl changes', () => {
    expect(cacheSignature(ROUTE, 'https://staging.example.com', SHELL)).not.toBe(cacheSignature(ROUTE, SITE, SHELL))
  })
})

describe('cacheEntryValid', () => {
  it('accepts a matching entry', () => {
    expect(cacheEntryValid(entry(cacheSignature(ROUTE, SITE, SHELL)), ROUTE, SITE, SHELL)).toBe(true)
  })

  it('rejects an entry built against stale inputs', () => {
    const staleSig = cacheSignature(ROUTE, SITE, SHELL_B) // shell moved since
    expect(cacheEntryValid(entry(staleSig), ROUTE, SITE, SHELL)).toBe(false)
  })

  it('treats legacy entries (no sig) as stale — one fresh render upgrades them', () => {
    expect(cacheEntryValid({ html: '<p>old</p>', time: 1 }, ROUTE, SITE, SHELL)).toBe(false)
  })

  it('rejects malformed entries', () => {
    expect(cacheEntryValid(null, ROUTE, SITE, SHELL)).toBe(false)
    expect(cacheEntryValid({}, ROUTE, SITE, SHELL)).toBe(false)
    expect(cacheEntryValid(entry('nonsense'), ROUTE, SITE, SHELL)).toBe(false)
  })
})
