/**
 * tests/prerender-seam.test.js
 * Battery for prestruct#68: the react-router ESM seam in the prerender pass.
 *
 * The seam: the engine's StaticRouter import and the host AppLayout's router
 * load must resolve to ONE module instance (one set of React contexts) or every
 * route dies with "useLocation() may be used only in the context of a <Router>".
 * react-router 7 (real ESM) plus a host `ssr.noExternal` (the old consumer-shim
 * requirement) split them, and Vite's SSR transform of the inlined CJS entry
 * additionally dies with "module is not defined". Two layers of proof:
 *
 *   - esmTwinSource / loadStaticRouter: offline unit pins on the redirect rule
 *     and the named/default interop fallback.
 *   - the integration leg: a real createServer + ssrLoadModule render of a
 *     fixture host that pins react-router-dom ^7 WITH ssr.noExternal, asserting
 *     n/n pages and per-route content. This is the leg the engine battery
 *     lacked; without it the seam can silently regress.
 */
import { describe, it, expect, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { prerender, esmTwinSource, loadStaticRouter } from '../engine/scripts/prerender.js'

// Locate a real react-router(-dom) CJS dist entry that has a sibling .mjs twin,
// so the twin-redirect pins assert against an installed pair (v7: index.js/
// index.mjs; v6: server.js/server.mjs). Returns null when the peer is absent.
function findRouterTwin() {
  const candidates = [
    ['react-router-dom', 'dist/index.js'],
    ['react-router-dom', 'dist/server.js'],
    ['react-router', 'dist/development/index.js'],
  ]
  for (const [pkg, rel] of candidates) {
    const cjs = path.join(process.cwd(), 'node_modules', pkg, rel)
    const mjs = cjs.replace(/\.js$/, '.mjs')
    if (fs.existsSync(cjs) && fs.existsSync(mjs)) return { cjs, mjs }
  }
  return null
}

// -- Offline pins ---------------------------------------------------------------

describe('esmTwinSource (react-router CJS -> ESM twin redirect, #68)', () => {
  it('is a no-op outside the SSR pass', () => {
    expect(esmTwinSource('/x/node_modules/react-router-dom/dist/index.js', undefined)).toBe(null)
    expect(esmTwinSource('/x/node_modules/react-router-dom/dist/index.js', { ssr: false })).toBe(null)
  })

  it('is a no-op for non-router modules and non-.js ids', () => {
    expect(esmTwinSource('/x/node_modules/react/dist/index.js', { ssr: true })).toBe(null)
    expect(esmTwinSource('/x/node_modules/react-router-dom/dist/index.mjs', { ssr: true })).toBe(null)
  })

  it('is a no-op (honest pass-through) when no sibling .mjs twin exists', () => {
    expect(esmTwinSource('/nonexistent/node_modules/react-router-dom/dist/index.js', { ssr: true })).toBe(null)
  })

  it('serves the sibling .mjs twin for a real CJS dist entry', () => {
    const twin = findRouterTwin()
    if (!twin) return // peer absent or no CJS/mjs pair: skip honestly
    expect(esmTwinSource(twin.cjs, { ssr: true })).toBe(fs.readFileSync(twin.mjs, 'utf8'))
  })

  it('strips a query suffix before resolving the twin', () => {
    const twin = findRouterTwin()
    if (!twin) return
    expect(esmTwinSource(twin.cjs + '?v=1', { ssr: true })).toBe(fs.readFileSync(twin.mjs, 'utf8'))
  })
})

describe('loadStaticRouter interop fallback (#68)', () => {
  it('prefers the named StaticRouter export', async () => {
    const mod = await loadStaticRouter(async () => ({ StaticRouter: 'named' }))
    expect(mod).toBe('named')
  })

  it('falls back to default.StaticRouter (CJS namespace interop)', async () => {
    const mod = await loadStaticRouter(async () => ({ default: { StaticRouter: 'via-default' } }))
    expect(mod).toBe('via-default')
  })

  it('errors loudly when neither shape provides StaticRouter', async () => {
    await expect(loadStaticRouter(async () => ({ default: {} }))).rejects.toThrow(/Could not load StaticRouter/)
  })
})

// -- Integration leg: a real v7 + ssr.noExternal host ---------------------------

const REPO_ROOT = path.resolve(import.meta.dirname, '..')
const host = fs.mkdtempSync(path.join(os.tmpdir(), 'prestruct-seam-'))

// The v7 peer is installed under an alias (`react-router-dom-v7`) so the repo's
// own battery can exercise the ESM-only shape while root keeps the v6 rail. The
// fixture host exposes it under the canonical `react-router-dom` name via a
// symlink farm of the repo's node_modules, plus a real copy under that name so
// the engine's ESM-twin plugin (which keys on the resolved path) can match it.
function seedHost() {
  fs.rmSync(path.join(host, 'node_modules'), { recursive: true, force: true })
  fs.writeFileSync(path.join(host, 'package.json'), JSON.stringify({ name: 'seam-host', private: true, type: 'module' }, null, 2))
  const nm = path.join(host, 'node_modules')
  fs.mkdirSync(nm)
  const rootNM = path.join(REPO_ROOT, 'node_modules')
  for (const entry of fs.readdirSync(rootNM)) {
    if (entry.startsWith('.')) continue
    if (entry === 'react-router-dom' || entry === 'react-router') continue // v6 rail stays out
    try { fs.symlinkSync(path.join(rootNM, entry), path.join(nm, entry), 'dir') } catch {}
  }
  fs.cpSync(path.join(rootNM, 'react-router-dom-v7'), path.join(nm, 'react-router-dom'), { recursive: true })

  // The condition that split the instances: noExternal forces Vite to INLINE
  // react-router into the SSR registry instead of externalizing it.
  fs.writeFileSync(path.join(host, 'vite.config.js'),
    "import { defineConfig } from 'vite'\nexport default defineConfig({ ssr: { noExternal: ['react-router-dom', 'react-router'] } })\n")
  fs.mkdirSync(path.join(host, 'src'), { recursive: true })
  fs.writeFileSync(path.join(host, 'src', 'AppLayout.jsx'), [
    "import React from 'react'",
    "import { Routes, Route, useLocation } from 'react-router-dom'",
    'export default function AppLayout() {',
    '  const loc = useLocation()',
    '  return <div data-path={loc.pathname}><Routes>',
    '    <Route path="/" element={<h1>home</h1>} />',
    '    <Route path="/about" element={<h1>about</h1>} />',
    '  </Routes></div>',
    '}',
  ].join('\n'))
  fs.mkdirSync(path.join(host, 'dist'), { recursive: true })
  fs.writeFileSync(path.join(host, 'dist', 'index.html'),
    '<!doctype html><html><head><title>x</title></head><body><div id="root"></div></body></html>')
}

function v7AliasAvailable() {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'node_modules', 'react-router-dom-v7', 'package.json'), 'utf8'))
    return Number(String(p.version).split('.')[0]) === 7
  } catch { return false }
}

describe('prerender seam integration (react-router 7 + ssr.noExternal, #68)', () => {
  it('renders n/n pages and per-route content across the seam', async () => {
    if (!v7AliasAvailable()) return // the v7 alias devDep is absent: skip honestly
    seedHost()
    const res = await prerender(
      { siteUrl: 'https://x.test', routes: [{ path: '/' }, { path: '/about' }] },
      { root: host },
    )
    expect(res.failed).toBe(0)
    expect(res.succeeded).toBe(2)
    const about = fs.readFileSync(path.join(host, 'dist', 'about', 'index.html'), 'utf8')
    const home = fs.readFileSync(path.join(host, 'dist', 'index.html'), 'utf8')
    // StaticRouter's location context reached useLocation() inside the tree.
    expect(about).toContain('data-path="/about"')
    expect(about).toContain('<h1>about</h1>')
    expect(home).toContain('data-path="/"')
  }, 60000)
})

afterAll(() => {
  try { fs.rmSync(host, { recursive: true, force: true }) } catch {}
})
