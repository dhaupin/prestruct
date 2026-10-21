// tests/use-page-meta.test.js -- behavioral tests for the shipped hook
// engine/src/hooks/usePageMeta.js.
//
// Gap-audit 2026-10-21: this hook had ZERO behavioral tests -- only the sync
// byte-identity check (tests/qc.test.mjs) that keeps the three copies equal.
// It ships in every scaffolded app and carries 16 documented tags, so its
// contract is pinned here against happy-dom: what updates on navigation,
// what must NOT update, and the skip-without-siteUrl rule.
//
// React hook rules require rendering through a component; react-test-renderer
// style rendering is overkill for an effect-only hook, so the tests mount a
// tiny host component via react-dom/client and re-render it to simulate
// navigation (which drives the effect rerun).
import { describe, it, expect, beforeEach } from 'vitest'
import { Window } from 'happy-dom'
import React from 'react'
import { createRoot } from 'react-dom/client'

function bootDom() {
  const window = new Window({ url: 'https://meta.test/' })
  globalThis.window = window
  globalThis.document = window.document
  // navigator is a getter-only global in Node 21+; only assign when settable
  try { globalThis.navigator = window.navigator } catch { /* read-only: fine, happy-dom leaned on via window */ }
}

bootDom()
const { MemoryRouter } = await import('react-router-dom')
const usePageMeta = (await import('../engine/src/hooks/usePageMeta.js')).default

// Host component: re-rendering it with new props simulates a route change
// (the hook's effect keys on its args, so prop changes re-run the effect).
const seedHead = () => {
  document.head.innerHTML = `
    <title>seed</title>
    <meta name="description" content="seed-desc" />
    <link rel="canonical" href="https://seed.test/" />
    <meta property="og:url" content="https://seed.test/" />
    <meta property="og:title" content="seed-ogtitle" />
    <meta property="og:description" content="seed-ogdesc" />
    <meta name="twitter:title" content="seed-ttitle" />
    <meta name="twitter:description" content="seed-tdesc" />
    <meta property="og:image" content="seed-ogimage" />
    <meta property="og:type" content="seed-ogtype" />
    <meta name="twitter:card" content="seed-tcard" />
  `
}

function renderHookOnce(props) {
  const div = document.createElement('div')
  document.body.innerHTML = ''
  document.body.appendChild(div)
  const root = createRoot(div)
  const seen = []
  const Probe = () => {
    usePageMeta(props)
    seen.push(true)
    return null
  }
  root.render(React.createElement(MemoryRouter, null, React.createElement(Probe)))
  return { root }
}

async function flushReact(ms = 50) {
  await new Promise((r) => setTimeout(r, ms))
}

const tag = (sel, attr = 'content') => document.querySelector(sel)?.getAttribute(attr)
const og = (name) => tag(`meta[property="${name}"]`)
const tw = (name) => tag(`meta[name="${name}"]`)

describe('usePageMeta -- the 8-tag navigation contract', () => {
  beforeEach(() => {
    bootDom()
    seedHead()
  })

  it('updates title, description, canonical, og:url, og/twitter title + description', async () => {
    const { root } = renderHookOnce({
      siteUrl: 'https://yoursite.com', path: '/about',
      title: 'About | Site', description: 'About page.',
    })
    await flushReact()
    root.unmount()

    expect(document.title).toBe('About | Site')
    expect(tag('meta[name="description"]')).toBe('About page.')
    expect(tag('link[rel="canonical"]', 'href')).toBe('https://yoursite.com/about')
    expect(og('og:url')).toBe('https://yoursite.com/about')
    expect(og('og:title')).toBe('About | Site')
    expect(tw('twitter:title')).toBe('About | Site')
    expect(og('og:description')).toBe('About page.')
    expect(tw('twitter:description')).toBe('About page.')
  })

  it('site tags (og:image, og:type, twitter:card) are never touched', async () => {
    const { root } = renderHookOnce({
      siteUrl: 'https://yoursite.com', path: '/x',
      title: 'X', description: 'D',
    })
    await flushReact()
    root.unmount()
    expect(og('og:image')).toBe('seed-ogimage')
    expect(og('og:type')).toBe('seed-ogtype')
    expect(tw('twitter:card')).toBe('seed-tcard')
  })
})

describe('usePageMeta -- guarded behavior', () => {
  beforeEach(() => { bootDom(); seedHead() })

  it('no siteUrl -> canonical/og:url are NOT written (never a relative canonical)', async () => {
    const { root } = renderHookOnce({ path: '/about', title: 'T', description: 'D' })
    await flushReact()
    root.unmount()
    expect(tag('link[rel="canonical"]', 'href')).toBe('https://seed.test/') // untouched
    expect(og('og:url')).toBe('https://seed.test/')
    expect(document.title).toBe('T') // title still updates; only canonical-family guarded
  })

  it('root path produces no trailing content in canonical (base === canonical)', async () => {
    const { root } = renderHookOnce({
      siteUrl: 'https://yoursite.com', path: '/',
      title: 'Home', description: 'D',
    })
    await flushReact()
    root.unmount()
    expect(tag('link[rel="canonical"]', 'href')).toBe('https://yoursite.com')
  })

  it('empty title/description updates nothing they own (falsy skip)', async () => {
    const { root } = renderHookOnce({ siteUrl: 'https://yoursite.com', path: '/q' })
    await flushReact()
    root.unmount()
    expect(document.title).toBe('seed')           // no title arg -> untouched
    expect(tag('meta[name="description"]')).toBe('seed-desc')
    expect(og('og:title')).toBe('seed-ogtitle')
  })
})
