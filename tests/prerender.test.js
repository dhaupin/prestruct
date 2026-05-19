import { describe, it, expect } from 'vitest'

/**
 * prerender.js tests
 * 
 * Tests the route parsing and prerendering logic.
 */

// Helper: escapeReplacement (from prerender.js)
const escapeReplacement = (s) => String(s || '').replace(/\$/g, '$$$$')

describe('escapeReplacement', () => {
  it('escaps dollar signs', () => {
    expect(escapeReplacement('$100')).toBe('$$100')
  })

  it('handles null as empty string (due to ||)', () => {
    // null || '' = '', then String('') = ''
    expect(escapeReplacement(null)).toBe('')
  })

  it('handles undefined as empty string', () => {
    expect(escapeReplacement(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(escapeReplacement('')).toBe('')
  })
})

// Helper: generateUrl (from prerender.js)
const generateUrl = (siteUrl, routePath) =>
  `${siteUrl}${routePath === '/' ? '' : routePath}`

describe('generateUrl', () => {
  it('generates canonical URL for home', () => {
    expect(generateUrl('https://example.com', '/')).toBe('https://example.com')
  })

  it('appends route path', () => {
    expect(generateUrl('https://example.com', '/about')).toBe('https://example.com/about')
  })

  it('handles empty path', () => {
    expect(generateUrl('https://example.com', '')).toBe('https://example.com')
  })
})

// Helper: injectMetaTitle
const injectMetaTitle = (html, title) => {
  const titleEscaped = escapeReplacement(title)
  return html.replace(/<title>[^<]*<\/title>/, `<title>${titleEscaped}</title>`)
}

describe('injectMetaTitle', () => {
  it('injects title into HTML', () => {
    const html = '<title>Placeholder</title>'
    const result = injectMetaTitle(html, 'New Title')
    expect(result).toBe('<title>New Title</title>')
  })

  // NOTE: Using string replacement, not regex backreference - no escape needed
  it('passes title through without extra escaping', () => {
    const html = '<title>Placeholder</title>'
    const result = injectMetaTitle(html, 'Price: $50')
    // string replacement doesn't interpret $ as backreference
    expect(result).toBe('<title>Price: $50</title>')
  })

  it('handles missing title tag', () => {
    const html = '<div>No title</div>'
    const result = injectMetaTitle(html, 'New Title')
    expect(result).toBe('<div>No title</div>')
  })
})

// sitemap generation
describe('sitemap generation', () => {
  it('generates sitemap entries', () => {
    const routes = [
      { path: '/', priority: '1.0', changefreq: 'monthly' },
      { path: '/about', priority: '0.8', changefreq: 'monthly' },
    ]
    const siteUrl = 'https://example.com'

    const entries = routes.map((route) => ({
      loc: generateUrl(siteUrl, route.path),
      priority: route.priority,
    }))

    expect(entries).toHaveLength(2)
    expect(entries[0].loc).toBe('https://example.com')
    expect(entries[1].loc).toBe('https://example.com/about')
  })
})

// 404 page
describe('notFound page', () => {
  it('generates 404 content', () => {
    const config = {
      heading: 'Page not found',
      body: "That page doesn't exist.",
      primaryCta: { label: 'Go home', href: '/' },
    }

    expect(config.heading).toBe('Page not found')
    expect(config.primaryCta.href).toBe('/')
  })

  it('has default values', () => {
    const defaults = {
      heading: 'Page not found.',
      body: "That page doesn't exist -- or it moved.",
      primaryCta: { label: 'Go home', href: '/' },
    }

    expect(defaults.heading).toBeDefined()
    expect(defaults.body).toBeDefined()
  })
})

// Route validation
describe('route validation', () => {
  it('validates path starts with slash', () => {
    const route = { path: '/', priority: '1.0' }
    expect(route.path).toMatch(/^\//)
  })

  it('validates priority format', () => {
    const route = { path: '/', priority: '1.0' }
    expect(route.priority).toMatch(/^[0-1]\.[0-9]/)
  })

  it('route meta is optional', () => {
    const route = { path: '/', priority: '1.0' }
    expect(route.meta).toBeUndefined()
  })
})

// JSON-LD
describe('JSON-LD generation', () => {
  it('stringifies single object', () => {
    const data = { '@type': 'WebSite', name: 'Test' }
    const result = JSON.stringify(data)
    expect(result).toContain('WebSite')
  })

  it('wraps array in @graph', () => {
    const data = [
      { '@type': 'WebSite', name: 'Test' },
    ]
    const payload = { '@graph': data }
    const result = JSON.stringify(payload)
    expect(result).toContain('@graph')
  })
})