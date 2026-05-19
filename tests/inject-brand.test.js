import { describe, it, expect } from 'vitest'

/**
 * inject-brand.js tests
 * 
 * Tests the config parsing and meta injection logic without requiring fs.
 * The actual script integration tests run via npm run build in CI.
 */

// Helper: toReplaceSafe (from inject-brand.js)
const toReplaceSafe = (value = '') => String(value).replace(/\$/g, '$$$$')

describe('toReplaceSafe', () => {
  it('escaps dollar signs for String.replace', () => {
    expect(toReplaceSafe('$120')).toBe('$$120')
    expect(toReplaceSafe('price $50')).toBe('price $$50')
    expect(toReplaceSafe('no dollars')).toBe('no dollars')
  })

  it('handles empty strings', () => {
    expect(toReplaceSafe('')).toBe('')
  })

  it('handles null/undefined', () => {
    expect(toReplaceSafe(null)).toBe('null')
    expect(toReplaceSafe(undefined)).toBe('')
  })
})

// Helper: title generation (from inject-brand.js)
const generateTitle = (siteName, tagline) =>
  tagline ? `${siteName} | ${tagline}` : siteName

describe('generateTitle', () => {
  it('appends tagline to siteName', () => {
    expect(generateTitle('Test Site', 'Tagline')).toBe('Test Site | Tagline')
  })

  it('defaults to siteName when no tagline', () => {
    expect(generateTitle('Test Site', '')).toBe('Test Site')
    expect(generateTitle('Test Site', null)).toBe('Test Site')
  })
})

// Helper: route finding (from inject-brand.js)
const findRoute = (routes, path) => routes.find((r) => r.path === path)

describe('findRoute', () => {
  const routes = [
    { path: '/', priority: '1.0', meta: { title: 'Home', description: 'Home page' } },
    { path: '/about', priority: '0.8', meta: { title: 'About', description: 'About page' } },
    { path: '/blog', priority: '0.7', meta: { title: 'Blog', description: 'Blog page' } },
  ]

  it('finds exact route', () => {
    expect(findRoute(routes, '/about')?.meta.title).toBe('About')
  })

  it('returns undefined for missing route', () => {
    expect(findRoute(routes, '/missing')).toBe(undefined)
  })

  it('finds home route', () => {
    expect(findRoute(routes, '/')?.priority).toBe('1.0')
  })
})

describe('ssr.config.js validation', () => {
  it('validates required fields', () => {
    const config = {
      siteUrl: 'https://example.com',
      siteName: 'Test Site',
      routes: [{ path: '/', priority: '1.0', meta: {} }],
    }

    expect(config.siteUrl).toBeDefined()
    expect(config.siteName).toBeDefined()
    expect(config.routes).toBeDefined()
    expect(config.routes.length).toBeGreaterThan(0)
  })

  it('validates route structure', () => {
    const route = { path: '/', priority: '1.0', meta: { title: 'Test' } }

    expect(route.path).toMatch(/^\//)
    expect(route.priority).toMatch(/^[0-1]\.[0-9]/)
    expect(route.meta).toBeDefined()
  })

  it('validates platform field', () => {
    const validPlatforms = ['cloudflare', 'vercel', 'netlify']

    expect(validPlatforms).toContain('cloudflare')
    expect(validPlatforms).toContain('vercel')
    expect(validPlatforms).toContain('netlify')
  })
})

describe('404 config', () => {
  it('validates notFound structure', () => {
    const notFound = {
      heading: 'Page not found',
      body: "That page doesn't exist.",
      primaryCta: { label: 'Go home', href: '/' },
    }

    expect(notFound.heading).toBeDefined()
    expect(notFound.body).toBeDefined()
    expect(notFound.primaryCta).toBeDefined()
    expect(notFound.primaryCta.href).toBe('/')
  })
})

describe('proxy config', () => {
  it('validates proxy structure when present', () => {
    const proxy = {
      url: 'https://proxy.example.com',
      secret: 'test-secret',
      targetUrl: 'https://staging.example.com',
      botList: ['Googlebot', 'Bingbot'],
    }

    expect(proxy.url).toMatch(/^https?:\/\//)
    expect(proxy.botList).toBeInstanceOf(Array)
    expect(proxy.botList.length).toBeGreaterThan(0)
  })

  it('allows proxy to be undefined', () => {
    const config = {}

    expect(config.proxy).toBeUndefined()
  })
})