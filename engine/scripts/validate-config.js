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
/**
 * Identity helper: `import { defineConfig } from 'prestruct'` for type-aware
 * ssr.config.js files. Passes the config straight through.
 *
 * @template T
 * @param {T} config - the config object
 * @returns {T} the same config object
 */
export function defineConfig(config) {
  return config
}

// Known config keys (#52): the load-time diagnostics list. A key that is
// neither known nor retired does NOTHING in the engine -- a typo'd seam
// (`ogimg` instead of `ogImage`) must say so loudly instead of passing a
// green build that silently loses SEO surface.
export const KNOWN_CONFIG_KEYS = [
  'siteUrl', 'siteName', 'author', 'tagline', 'ogImage', 'keywords',
  'appLayoutPath', 'routes', 'notFound', 'robots', 'proxy', 'faqs',
  'deployId', 'deployIdFooter', 'buildJsonLd', 'fetchRoutes', 'platform',
]

// Retired keys: each entry names what owns the behavior now. Empty today --
// no shipped key has ever been removed without a replacement seam. Entries:
// { key: string, note: string }
export const RETIRED_CONFIG_KEYS = []

/**
 * Collect unknown/retired ssr.config.js keys as warning strings (#52).
 * Diagnostics, not gates: warnings never fail validation.
 *
 * @param {object} config - full ssr.config.js export
 * @returns {string[]} one warning per unknown/retired key
 */
export function configKeyWarnings(config) {
  if (!config || typeof config !== 'object') return []
  const warnings = []
  for (const key of Object.keys(config)) {
    if (KNOWN_CONFIG_KEYS.includes(key)) continue
    const retired = RETIRED_CONFIG_KEYS.find(r => r.key === key)
    if (retired) {
      warnings.push(`retired config key "${key}" has no effect: ${retired.note} - remove this key`)
    } else {
      warnings.push(`unknown config key "${key}" (typo? see the config reference)`)
    }
  }
  return warnings
}

/**
 * Format key warnings as printed one-liners (`[prestruct] config warning: ..`).
 *
 * @param {string[]} warnings - raw warning strings from configKeyWarnings()
 * @returns {string[]} prefixed one-liner strings
 */
export function formatConfigWarnings(warnings) {
  return warnings.map(w => `[prestruct] config warning: ${w}`)
}

/**
 * Validate the ssr.config.js shape and emit structured diagnostics.
 * Shape checks: siteUrl form, route paths (leading slash, traversal guard),
 * priority/changefreq values, meta objects, duplicate paths, empty lists,
 * platform and appLayoutPath know-values. Never throws, never exits.
 *
 * @param {object} config - full ssr.config.js export
 * @returns {{ok: boolean, errors: string[]}} diagnostics consumable by callers
 */
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

  // ogImage: legacy string shorthand AND the structured object form
  // (freestruct proposal #38 commentary): { url, width, height, alt, type }.
  // The object form is what lets og:image carry its width/height/alt
  // companions -- the properties social crawlers use to size previews.
  // Never throws. Bad shapes surface as errors, not as silently-dropped
  // metadata. Companion content validation lives at the injection seam
  // (non-numeric width/height / non-string alt or type are simply not
  // emitted, so a typo'd field can never corrupt the head)
  if (config.ogImage !== undefined && config.ogImage !== null) {
    const isObj = typeof config.ogImage === 'object' && !Array.isArray(config.ogImage)
    if (isObj) {
      if (typeof config.ogImage.url !== 'string') {
        errors.push('ogImage: object form requires a string "url" field')
      }
      for (const k of ['width', 'height']) {
        const v = config.ogImage[k]
        if (v !== undefined && !/^[0-9]+$/.test(String(v))) {
          errors.push(`ogImage: "${k}" should be a number (pixels), got ${JSON.stringify(v)}`)
        }
      }
      for (const k of ['alt', 'type']) {
        const v = config.ogImage[k]
        if (v !== undefined && typeof v !== 'string') {
          errors.push(`ogImage: "${k}" must be a string, got ${JSON.stringify(v)}`)
        }
      }
    } else if (typeof config.ogImage !== 'string') {
      errors.push('ogImage: must be a string URL or an object { url, width, height, alt, type }')
    }
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
/**
 * Format diagnostics as the printed one-liners (`[prestruct] config: <msg>`).
 *
 * @param {string[]} errors - raw diagnostic messages
 * @returns {string[]} prefixed one-liner strings
 */
export function formatDiagnostics(errors) {
  return errors.map(e => `[prestruct] config: ${e}`)
}
