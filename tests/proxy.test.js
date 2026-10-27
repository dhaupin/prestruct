import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createProxyApp,
  secretMatches,
  isBot,
  withRenderLimit,
  MAX_CONCURRENT,
  normalizePort,
  renderOnce,
} from '../init/scripts/proxy.js'
import {
  default as workerProxy,
  refreshSecretMatches,
  isBot as workerIsBot,
  cacheKey as workerCacheKey,
  cacheKeyFor as workerCacheKeyFor,
  ttlFromEnv,
} from '../init/scripts/proxy.worker.js'

/**
 * Proxy-pair unit battery.
 *
 * Both proxy modules are import-safe (gated execution, lazy puppeteer
 * imports), so these tests drive the real exported functions in-process.
 * The VPS proxy is init-owned (not an engine contract file), so tests
 * import the init/ copy directly.
 *
 * Module-state caveat: createProxyApp binds module-level config. Each
 * describe block re-binds it before use; blocks must not run concurrently
 * (vitest runs tests in a file sequentially by default).
 */

const SECRET = 'timing-test-secret-32-chars-aaaaaaaaa'

// -- VPS: secret compare (hash + timingSafeEqual) -----------------------------

describe('VPS secretMatches', () => {
  beforeEach(() => {
    process.env.PRESTRUCT_SECRET = SECRET
    createProxyApp({ siteUrl: 'https://vps-harness.test', proxy: { botList: ['googlebot'] } })
  })

  it('accepts the exact secret', () => {
    expect(secretMatches(SECRET)).toBe(true)
  })

  it('rejects a wrong first byte', () => {
    expect(secretMatches('X' + SECRET.slice(1))).toBe(false)
  })

  it('rejects a wrong last byte', () => {
    expect(secretMatches(SECRET.slice(0, -1) + 'Z')).toBe(false)
  })

  it('rejects the secret with a first-byte prefix added (wrong length)', () => {
    expect(secretMatches(SECRET + '!')).toBe(false)
  })

  it('rejects missing/malformed header values', () => {
    expect(secretMatches(undefined)).toBe(false)
    expect(secretMatches(null)).toBe(false)
    expect(secretMatches('')).toBe(false)
  })

  it('rejects everything when no secret is configured (feature off, not allow-all)', () => {
    delete process.env.PRESTRUCT_SECRET
    createProxyApp({ siteUrl: 'https://vps-harness.test', proxy: { botList: ['googlebot'] } })
    expect(secretMatches(SECRET)).toBe(false)
  })
})

// -- VPS: isBot driven by config.proxy.botList --------------------------------

describe('VPS isBot', () => {
  beforeEach(() => {
    createProxyApp({ siteUrl: 'https://vps-harness.test', proxy: { botList: ['googlebot', 'bingbot'] } })
  })

  it('matches configured tokens case-insensitively', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isBot('bingbot crawler')).toBe(true)
  })

  it('rejects humans and unlisted bots', () => {
    expect(isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome')).toBe(false)
    expect(isBot('yandexbot')).toBe(false)
  })

  it('rejects absent UA', () => {
    expect(isBot(undefined)).toBe(false)
  })
})

// -- VPS: render concurrency limit --------------------------------------------
// The pass-10 bug: overflow callers ran WITHOUT slot acquisition (concurrency
// unbounded again under exactly the load the limit exists for) and queued
// rejections were swallowed (hung callers). These tests pin both.

function settled(p) {
  return p.then(v => ({ ok: true, v }), e => ({ ok: false, e }))
}

describe('withRenderLimit', () => {
  beforeEach(async () => {
    // Drain any queue residue from the previous test before rebinding counters.
    await new Promise(r => setTimeout(r, 10))
  })

  it(`caps concurrent fn execution at MAX_CONCURRENT=${MAX_CONCURRENT}`, async () => {
    let live = 0
    let observedMax = 0
    const job = async () => {
      live++
      observedMax = Math.max(observedMax, live)
      await new Promise(r => setTimeout(r, 20))
      live--
      return 'done'
    }

    const results = await Promise.all(Array.from({ length: 14 }, () => settled(withRenderLimit(job))))

    expect(observedMax).toBe(MAX_CONCURRENT) // saturates exactly, never exceeds
    expect(results.filter(r => r.ok)).toHaveLength(14)
  })

  it('runs overflow jobs (the old bug skipped acquisition for queued callers)', async () => {
    let live = 0
    let observedMax = 0
    let ran = 0
    const job = async () => {
      live++
      ran++
      observedMax = Math.max(observedMax, live)
      await new Promise(r => setTimeout(r, 5))
      live--
      return ran
    }

    // 40 jobs racing against 5 slots forces several queue-drain cycles; each
    // drained job MUST re-acquire a slot or `live` exceeds the cap.
    const results = await Promise.all(Array.from({ length: 40 }, () => settled(withRenderLimit(job))))

    expect(ran).toBe(40)
    expect(results.filter(r => r.ok)).toHaveLength(40)
    expect(results.every(r => r.ok && r.v <= ran)).toBe(true)
    expect(observedMax).toBe(MAX_CONCURRENT)
  })

  it('propagates rejections from queued (overflow) callers instead of hanging', async () => {
    let jobs = 0
    const boom = async () => {
      jobs++
      await new Promise(r => setTimeout(r, 5))
      throw new Error(`boom ${jobs}`)
    }
    const okJob = async () => {
      jobs++
      await new Promise(r => setTimeout(r, 5))
      return 'fine'
    }

    // 5 fillers hold every slot; the 6th (and 7th) must QUEUE, then reject.
    const results = await Promise.all([
      settled(withRenderLimit(okJob)),   // slot 1
      settled(withRenderLimit(okJob)),   // slot 2
      settled(withRenderLimit(okJob)),   // slot 3
      settled(withRenderLimit(okJob)),   // slot 4
      settled(withRenderLimit(okJob)),   // slot 5
      settled(withRenderLimit(boom)),    // queued -> rejected, not swallowed
      settled(withRenderLimit(boom)),    // queued -> rejected, not swallowed
    ])

    expect(results.filter(r => r.ok)).toHaveLength(5)
    expect(results[5].ok).toBe(false)
    expect(results[6].ok).toBe(false)
    expect(String(results[5].e.message)).toMatch(/boom \d/)
  })

  it('propagates rejections from immediately-run callers too', async () => {
    await expect(withRenderLimit(async () => { throw new Error('immediate boom') }))
      .rejects.toThrow(/immediate boom/)
  })
})

// -- Worker: helpers are pure and runtime-agnostic ----------------------------

describe('renderOnce (single-flight, pass 57 walk)', () => {
  beforeEach(async () => {
    // Let any flight from the previous test expire out of the shared map.
    await new Promise(r => setTimeout(r, 10))
  })

  function fakeRender(counter) {
    return async function (url) {
      counter.n += 1
      const n = counter.n
      await new Promise(r => setTimeout(r, 15))
      return `<html>${url}#${n}</html>`
    }
  }

  it('collapses a same-key burst into ONE render (the pass-57 walk finding)', async () => {
    const counter = { n: 0 }
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        settled(renderOnce('same-key', '/target', false, fakeRender(counter))))
    )

    expect(counter.n).toBe(1) // one render, not one per wave of MAX_CONCURRENT
    expect(results.filter(r => r.ok)).toHaveLength(12)
    const values = new Set(results.map(r => r.v))
    expect([...values]).toHaveLength(1) // every joiner served the same bytes
  })

  it('different keys render independently', async () => {
    const counter = { n: 0 }
    const [a, b] = await Promise.all([
      settled(renderOnce('key-a', '/a', false, fakeRender(counter))),
      settled(renderOnce('key-b', '/b', false, fakeRender(counter))),
    ])

    expect(counter.n).toBe(2)
    expect(a.v).toBe('<html>/a#1</html>' || '<html>/a#2</html>')
    expect(a.v).not.toBe(b.v)
  })

  it('forced refresh does not join an open flight and owns no map entry', async () => {
    const counter = { n: 0 }
    const render = fakeRender(counter)
    const flightCall = renderOnce('forced-key', '/f', false, render)

    // Force arrives while the normal flight is still rendering.
    const forced = await settled(renderOnce('forced-key', '/f', true, render))
    const joined = await settled(flightCall)

    expect(counter.n).toBe(2) // the forced render did NOT ride the flight
    expect(forced.ok).toBe(true)
    expect(joined.ok).toBe(true)
    expect(forced.v).not.toBe(joined.v) // fresh bytes vs flight bytes
  })
})

describe('Worker refreshSecretMatches (full-length XOR compare)', () => {
  it('accepts the exact secret', () => {
    expect(refreshSecretMatches(SECRET, SECRET)).toBe(true)
  })

  it('matches the VPS comparator results on identical inputs (parity)', () => {
    process.env.PRESTRUCT_SECRET = SECRET
    createProxyApp({ siteUrl: 'https://vps-harness.test', proxy: { botList: ['googlebot'] } })
    const candidates = [
      SECRET,
      'X' + SECRET.slice(1),
      SECRET.slice(0, -1) + 'Z',
      SECRET + '!',
      SECRET.slice(0, SECRET.length - 1),
      '',
      'totally-wrong',
      'unrelated',
    ]
    for (const c of candidates) {
      expect(refreshSecretMatches(SECRET, c)).toBe(secretMatches(c))
    }
  })

  it('rejects length-mismatched tokens', () => {
    expect(refreshSecretMatches(SECRET, SECRET + 'extra')).toBe(false)
    expect(refreshSecretMatches(SECRET, SECRET.slice(0, 5))).toBe(false)
  })

  it('rejects missing secret or token (feature off when unset)', () => {
    expect(refreshSecretMatches(null, SECRET)).toBe(false)
    expect(refreshSecretMatches('', SECRET)).toBe(false)
    expect(refreshSecretMatches(SECRET, null)).toBe(false)
    expect(refreshSecretMatches(SECRET, undefined)).toBe(false)
    expect(refreshSecretMatches(null, null)).toBe(false)
  })
})

describe('Worker helper surface', () => {
  it('cacheKey is deterministic and URL-safe-encoded', () => {
    expect(workerCacheKey('/blog/post-1?ref=twitter')).toBe(workerCacheKey('/blog/post-1?ref=twitter'))
    expect(workerCacheKey('/blog/post-1?ref=twitter')).not.toBe(workerCacheKey('/blog/post-1?ref=facebook'))
    // no raw slash/+/= survives into the key
    const k = workerCacheKey('/a/b?x=1&y=2')
    expect(k.startsWith('prestruct:')).toBe(true)
    expect(k).not.toMatch(/[+/=](?!\w)/)
  })

  it('isBot uses the inline BOT_LIST', () => {
    expect(workerIsBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(workerIsBot('Chrome human')).toBe(false)
    expect(workerIsBot('')).toBe(false)
  })

  it('default export is a fetch handler (no puppeteer at import time)', () => {
    expect(typeof workerProxy).toBe('object')
    expect(typeof workerProxy.fetch).toBe('function')
  })

  it('cacheKeyFor keeps the legacy encoding (and existing cache entries) for normal URLs', async () => {
    expect(await workerCacheKeyFor('/blog/post-1?ref=twitter')).toBe(workerCacheKey('/blog/post-1?ref=twitter'))
  })

  it('cacheKeyFor hashes oversized keys instead of letting KV reject them (walk 2026-10)', async () => {
    // KV key cap is 512 bytes: a long query string used to make the
    // already-successful render 500 on the CACHE.put/cacheRead path.
    const long = '/x?' + 'q='.repeat(300)
    const k = await workerCacheKeyFor(long)
    expect(k.startsWith('prestruct:sha256:')).toBe(true)
    expect(k.length).toBeLessThan(100) // 64-hex + prefix
    expect(await workerCacheKeyFor(long)).toBe(k) // deterministic across probes
  })
})

// -- Walk pass (2026-10 second round): operator-env edges at hard seams ---------

describe('VPS normalizePort', () => {
  it('passes integers through, bounded to the port range', () => {
    expect(normalizePort('3000')).toBe(3000)
    expect(normalizePort(undefined)).toBe(3000)
    expect(normalizePort('65535')).toBe(65535)
  })

  it('falls back loudly instead of server.listen(NaN) on junk env values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const junk of ['', '3000x', 'port', 'NaN', '-1', '99999', '0']) {
      expect(normalizePort(junk)).toBe(3000)
    }
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('VPS createProxyApp -- empty bot list diagnostic (#52 form)', () => {
  it('warns when botList is missing/empty (the proxy would render nothing)', () => {
    process.env.PRESTRUCT_SECRET = SECRET
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    createProxyApp({ siteUrl: 'https://vps-harness.test' })
    expect(warn.mock.calls.some(c => String(c[0]).includes('botList is empty or missing'))).toBe(true)
    warn.mockRestore()
  })
})

describe('Worker ttlFromEnv', () => {
  it('defaults to 86400 without an env value', () => {
    expect(ttlFromEnv(undefined)).toBe(86400)
    expect(ttlFromEnv('86400')).toBe(86400)
  })

  it('refuses junk loudly and clamps below the KV 60s minimum instead of 500ing a paid render', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(ttlFromEnv('second-hour')).toBe(86400) // junk -> default
    expect(ttlFromEnv('30')).toBe(60)             // KV minimum, not the wish
    expect(ttlFromEnv('1')).toBe(60)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
