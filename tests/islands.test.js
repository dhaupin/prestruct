// tests/islands.test.js -- REAL engine tests for engine/src/islands.js.
//
// History, pinned by the 2026-10-21 islands audit: this file used to hold
// 11 "tests" that never touched the engine -- they tested local helper
// functions invented inside the test itself (parseIslandSelector,
// validateIslandConfig) and asserted the test's own constants. Fiction that
// passed while BOTH example islands shipped unregistered and the contact
// email never mounted for humans. This battery now exercises the real
// mountIslands() against a happy-dom DOM: registry wiring, the WeakSet
// double-mount guard, and all three load strategies.
//
// The engine imports react-dom/client and reads document/window, so the DOM
// must exist before the import. Each test gets a fresh registry of elements
// via mountIslands being called on a re-built DOM (document.body.innerHTML).
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Window } from 'happy-dom'

function bootDom() {
  const window = new Window({ url: 'https://islands.test/' })
  globalThis.window = window
  globalThis.document = window.document
  globalThis.IntersectionObserver = window.IntersectionObserver
  globalThis.requestIdleCallback = window.requestIdleCallback?.bind(window)
    ?? ((cb) => setTimeout(cb, 0))
  // react-dom touches `navigator.userAgent` at module eval. Node 22 defines
  // navigator globally; Node 20 (CI, test.yml) does not, so this previously
  // failed there as "navigator is not defined" while passing locally.
  if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = window.navigator
  }
}

// Always boot the DOM before the engine module evaluates; islands.js reads
// `window`/`document` at call time (not import time), so re-booting per test
// is safe. The dynamic import gives each file-scoped import a live reference.
bootDom()
const { mountIslands } = await import('../engine/src/islands.js')

const el = (html) => {
  document.body.innerHTML = html
  return [...document.querySelectorAll('pre-island[data-pre-island]')]
}

const Comp = () => null

describe('mountIslands -- registry wiring', () => {
  beforeEach(() => bootDom())

  it('mounts an eager island by clearing the element and rendering into it', () => {
    const [island] = el('<pre-island data-pre-island="a"><span>fallback</span></pre-island>')
    mountIslands({ a: Comp })
    expect(island.dataset['preIsland']).toBe('a')
    // Fallback content is replaced: no leftover children before React commits
    expect(island.innerHTML).not.toContain('fallback')
  })

  it('skips unregistered islands with a console warning and mounts the rest', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const [unknown, known] = el(
      '<pre-island data-pre-island="ghost"></pre-island>' +
      '<pre-island data-pre-island="real"></pre-island>'
    )
    mountIslands({ real: Comp })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no component registered for "ghost"')
    )
    // known island still mounted (fallback cleared)
    expect(known.innerHTML).not.toContain('fallback')
    warn.mockRestore()
  })

  it('is a no-op on an empty registry and outside a DOM', () => {
    el('<pre-island data-pre-island="a"></pre-island>')
    expect(() => mountIslands({})).not.toThrow()
  })
})

describe('mountIslands -- double-mount guard (WeakSet)', () => {
  beforeEach(() => bootDom())

  it('does not clear/mount the same element twice across repeated scans', () => {
    const [island] = el('<pre-island data-pre-island="a"><span>fallback</span></pre-island>')
    mountIslands({ a: Comp })
    const afterFirst = island.innerHTML
    // SPA route change calls mountIslands again over the same DOM
    mountIslands({ a: Comp })
    expect(island.innerHTML).toBe(afterFirst)
  })
})

describe('mountIslands -- load strategies', () => {
  // React 18 createRoot().render() commits asynchronously, so every assertion
  // flushes a macrotask first. The engine reads strategy globals through TWO
  // different surfaces that must both be faked in happy-dom:
  //   presence: 'requestIdleCallback' in window      (the Window INSTANCE)
  //   invocation: requestIdleCallback(...)           (the bare global)
  // In a real browser they are the same object; here they are not.
  const flush = (ms = 60) => new Promise((r) => setTimeout(r, ms))

  // Controllable IO fake: engine does new IntersectionObserver(cb).observe(el)
  class FakeIO {
    constructor(cb) { this.cb = cb; FakeIO.instances.push(this) }
    observe(el) { this.el = el }
    unobserve() {}
    disconnect() {}
    fire(isIntersecting = true) { this.cb([{ isIntersecting }], this) }
  }
  FakeIO.instances = []

  // Controllable idle fake, assigned to BOTH surfaces the engine touches.
  let idleCb = null
  const armIdleFake = () => {
    idleCb = null
    const fake = (cb) => { idleCb = cb; return 1 }
    window.requestIdleCallback = fake
    globalThis.requestIdleCallback = fake
  }
  const stripIdle = () => {
    delete window.requestIdleCallback
    delete globalThis.requestIdleCallback
  }

  beforeEach(() => {
    bootDom()
    FakeIO.instances = []
    idleCb = null
    globalThis.IntersectionObserver = FakeIO
    stripIdle()
  })

  it('eager (default) mounts without touching IO or idle machinery', async () => {
    const [island] = el('<pre-island data-pre-island="a"><span>x</span></pre-island>')
    mountIslands({ a: Comp })
    expect(FakeIO.instances).toHaveLength(0) // no observer created
    expect(idleCb).toBeNull() // no idle callback scheduled
    await flush()
    expect(island.innerHTML).not.toContain('x') // fallback replaced
  })

  it('visible does NOT mount synchronously; mounts when IO reports intersection', async () => {
    const [island] = el('<pre-island data-pre-island="a" data-pre-load="visible"><span>fallback</span></pre-island>')
    mountIslands({ a: Comp })
    expect(island.innerHTML).toContain('fallback') // still prerendered content
    expect(FakeIO.instances).toHaveLength(1) // engine observed the element
    expect(idleCb).toBeNull() // correct machinery for the strategy

    FakeIO.instances[0].fire(true)
    await flush()
    expect(island.innerHTML).not.toContain('fallback') // mounted via observer path
  })

  it('visible passes the real threshold config to the observer', () => {
    const [island] = el('<pre-island data-pre-island="a" data-pre-load="visible"></pre-island>')
    mountIslands({ a: Comp })
    const io = FakeIO.instances[0]
    expect(typeof io.el?.dataset?.preIsland).toBe('string') // observed the island
  })

  it('idle does NOT mount synchronously; mounts when requestIdleCallback fires', async () => {
    armIdleFake()
    const [island] = el('<pre-island data-pre-island="a" data-pre-load="idle"><span>fallback</span></pre-island>')
    mountIslands({ a: Comp })
    expect(island.innerHTML).toContain('fallback') // deferred
    expect(idleCb).toBeTypeOf('function')
    expect(FakeIO.instances).toHaveLength(0) // no observer for idle
    idleCb()
    await flush()
    expect(island.innerHTML).not.toContain('fallback')
  })

  it('idle falls back to setTimeout(200) when requestIdleCallback is unavailable', async () => {
    vi.useFakeTimers()
    try {
      const [island] = el('<pre-island data-pre-island="a" data-pre-load="idle"><span>fallback</span></pre-island>')
      mountIslands({ a: Comp })
      expect(island.innerHTML).toContain('fallback') // deferred
      await vi.advanceTimersByTimeAsync(199)
      expect(island.innerHTML).toContain('fallback') // not yet at 199ms
      await vi.advanceTimersByTimeAsync(10)
      await vi.advanceTimersByTimeAsync(60) // room for React's async commit
      expect(island.innerHTML).not.toContain('fallback') // 200ms fallback fired
    } finally {
      vi.useRealTimers()
    }
  })

  it('idle skips mounting when the element left the DOM before the callback', async () => {
    armIdleFake()
    const [island] = el('<pre-island data-pre-island="a" data-pre-load="idle"><span>fallback</span></pre-island>')
    mountIslands({ a: Comp })
    island.remove() // user navigated away within the idle window
    idleCb()
    await flush()
    expect(island.isConnected).toBe(false)
    expect(island.innerHTML).toContain('fallback') // untouched by the dead mount
  })

  it('unknown strategy string falls back to eager (mounts now)', async () => {
    const [island] = el('<pre-island data-pre-island="a" data-pre-load="whenever"><span>f</span></pre-island>')
    mountIslands({ a: Comp })
    expect(FakeIO.instances).toHaveLength(0)
    await flush()
    expect(island.innerHTML).not.toContain('f')
  })
})
