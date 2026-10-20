/**
 * scripts/validate-config.js
 * ==========================
 * Validates ssr.config.js shape and emits structured diagnostics.
 *
 * Shared by prerender.js and inject-brand.js. The contract:
 *   - Returns { ok, errors } where errors are consumable strings, one line each
 *   - Never throws, never exits -- callers decide policy (prerender exits 0
 *     on CF Pages unless PRESTRUCT_STRICT=1 is set; see prerender.js)
 */

const PLATFORMS = ['cloudflare', 'vercel', 'netlify']
const CHANGEFREQS = ['daily', 'weekly', 'monthly', 'yearly']

// Identity helper: `import { defineConfig } from 'prestruct'` for type-aware
// ssr.config.js files. No preprocessing -- config is passed through.
export function defineConfig(config) {
  return config
}

export function validateConfig(config) {
  const errors = []
  if (!config || typeof config !== 'object') {
    return { ok: false, errors: ['config must export a default object'] }
  }

  // Required: siteUrl (origin or full URL, no trailing slash enforced upstream)
  if (typeof config.siteUrl !== 'string' || !/^https?:\/\//.test(config.siteUrl.trim())) {
    errors.push('siteUrl is required and must start with http:// or https://')
  }

  // routes: array of route objects; duplicate paths are an error because two
  // routes with the same path would collide in the cache key AND write the
  // same dist file twice with different meta (silent SEO corruption).
  if (!Array.isArray(config.routes)) {
    errors.push('routes must be an array (or omitted entirely)')
  } else if (!config.routes.length) {
    // Hammer finding (2026-10): an explicitly EMPTY routes array validated as
    // "valid (0 routes)" -- the build would prerender nothing while reporting
    // a green configured site. Zero routes is a misconfiguration (route lists
    // WITHOUT the home route are fine: vite still ships index.html).
    errors.push('routes is empty -- configure at least one route to prerender')
  } else {
    config.routes.forEach((route, i) => {
      if (!route || typeof route !== 'object') {
        errors.push(`routes[${i}]: must be an object`)
        return
      }
      if (typeof route.path !== 'string' || !route.path.startsWith('/')) {
        errors.push(`routes[${i}].path: missing or does not start with "/"`)
      }
      // Path traversal guard: prerender writes dist/<path>/index.html. A
      // '..' or backslash segment escapes dist/ (and on POSIX could land
      // outside the project root entirely). Route paths are URL paths --
      // they never need either.
      if (typeof route.path === 'string' && (route.path.includes('..') || route.path.includes('\\'))) {
        errors.push(`routes[${i}].path: "${route.path}" contains ".." or backslash -- route paths cannot escape dist/`)
      }
      if (route.priority !== undefined && !/^(0?\.\d+|1(\.0+)?)$/.test(String(route.priority))) {
        errors.push(`routes[${i}].priority: "${route.priority}" is not a number between 0 and 1`)
      }
      if (route.changefreq !== undefined && !CHANGEFREQS.includes(route.changefreq)) {
        errors.push(`routes[${i}].changefreq: "${route.changefreq}" not in ${CHANGEFREQS.join(', ')}`)
      }
      if (route.meta !== undefined && (typeof route.meta !== 'object' || route.meta === null)) {
        errors.push(`routes[${i}].meta: must be an object like { title, description }`)
      }
    })
    const seen = new Set()
    config.routes.forEach((route, i) => {
      if (route && typeof route === 'object' && typeof route.path === 'string') {
        if (seen.has(route.path)) {
          errors.push(`routes[${i}].path: duplicate path "${route.path}" (first seen earlier) -- every path must be unique`)
        }
        seen.add(route.path)
      }
    })
  }

  // Optional known-value fields
  if (config.platform !== undefined && !PLATFORMS.includes(config.platform)) {
    errors.push(`platform: "${config.platform}" not in ${PLATFORMS.join(', ')}`)
  }
  if (config.appLayoutPath !== undefined && (typeof config.appLayoutPath !== 'string' || !config.appLayoutPath.startsWith('/'))) {
    errors.push('appLayoutPath: must be a Vite-rooted path starting with "/"')
  }

  return { ok: errors.length === 0, errors }
}

// Structured one-liner format callers print for each diagnostic
export function formatDiagnostics(errors) {
  return errors.map(e => `[prestruct] config: ${e}`)
}
