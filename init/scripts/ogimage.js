// engine/scripts/ogimage.js - per-route OG image generation (prestruct#43,
// port of the freestruct tag reference; the prestruct route set + per-route
// meta titles/descriptions already live in prerender.js, so this reads the
// same facts). Read each route's title/description, render a branded
// 1200x630 PNG per route from a consumer-authored SVG template, write the
// file into dist/og/, and wire the og/twitter tags to it (missing-only:
// a route with its own og:image override keeps theirs).
//
// Rasterization honesty (the pitch's own hard part): PNG cannot be made in
// pure Node. The rasterizer is the OPTIONAL npm package @resvg/resvg-js -
// loaded lazily with createRequire and skipped loudly when it is not
// installed (the run never breaks, never ships a half feature). Pure-Node
// output shape: SVG rendering is deterministic (same route meta ->
// same bytes). Fonts: system fonts are unreliable in build sandboxes, so
// ogImageGeneration.font loads a TTF/OTF buffer straight into the raster.
//
// Config shape (configDir-relative paths):
//   ogImageGeneration:
//     template: og-template.svg   # 1200x630 SVG with {{ogTitle}} /
//                                 # {{ogDescription}} / {{ogUrl}}
//     font: ./brand/brand-bold.ttf  # optional
//     width: 1200                  # optional
//     height: 630                  # optional
//
// This module NEVER exits: callers own failure semantics (prerender skips
// loudly, the audit still grades the head).

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const _require = createRequire(import.meta.url)

/**
 * Local XML escape for template substitution values: same replacement set
 * as prerender's escapeXml, kept local so this module stays dependency-free
 * (prerender owns no ogimage concerns and importing it back would be a cycle).
 */
function escXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Directory slug for the image filename: '/' and nested paths flatten. */
function imageSlug(routePath) {
  return String(routePath).replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'index'
}

/** Lazily resolve the optional rasterizer CLASS; null when not installed. */
function resolveRasterizer() {
  try {
    const mod = _require('@resvg/resvg-js')
    // CJS shape: { default?: Resvg, Resvg } ; ESM default handled too.
    const ctor = mod.Resvg || mod.default || mod
    return (typeof ctor === 'function') ? ctor : null
  } catch {
    return null
  }
}

/**
 * Validate + resolve the generation block. Returns null when it is not
 * configured; every disqualifying shape logs a loud single warning (config
 * diagnostics already handled key-name mistakes).
 */
export function resolveOgImageGeneration(config, configDir) {
  const gen = config && config.ogImageGeneration
  if (gen === undefined || gen === null || gen === false) return null
  if (typeof gen !== 'object' || Array.isArray(gen)) {
    console.log('[ogimage] config warning: ogImageGeneration must be a { template, font?, width?, height? } object')
    return null
  }
  if (typeof gen.template !== 'string' || gen.template === '') {
    console.log('[ogimage] config warning: ogImageGeneration.template missing - no og image generation')
    return null
  }
  const templatePath = path.resolve(configDir, gen.template)
  if (!fs.existsSync(templatePath)) {
    console.log('[ogimage] config warning: ogImageGeneration.template "'
      + gen.template + '" not found at ' + templatePath + ' - no og image generation')
    return null
  }
  const width = Number(gen.width ?? 1200)
  const height = Number(gen.height ?? 630)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    console.log('[ogimage] config warning: ogImageGeneration width/height must be positive numbers - no og image generation')
    return null
  }
  const fontPath = gen.font ? path.resolve(configDir, gen.font) : null
  if (gen.font && (!fontPath || !fs.existsSync(fontPath))) {
    console.log('[ogimage] config warning: ogImageGeneration.font "'
      + gen.font + '" not found at ' + fontPath + ' - the rasterizer will fall back to system fonts (unreliable in build sandboxes)')
    return null
  }
  const template = fs.readFileSync(templatePath, 'utf8')
  const fontBytes = fontPath ? fs.readFileSync(fontPath) : null
  if (/<text/i.test(template) && !fontBytes) {
    console.log('[ogimage] warning: template carries <text> but no font is configured - add ogImageGeneration.font so build sandboxes without system fonts do not drop titles')
  }
  return { template, templatePath, fontPath, fontBytes, width, height }
}

/**
 * Render one per-route image into dist/og/ and hand back the tag-ready
 * facts. Returns null when the rasterizer is not installed (loud skip,
 * surfaced once per run) or the SVG fails to rasterize. The og:url is
 * template-fillable via {{ogUrl}}; the caller derives the absolute
 * base from config.siteUrl.
 *
 * @param {object} generation - resolved block from resolveOgImageGeneration
 * @param {{path: string, meta?: {title?: string, description?: string}}} route
 * @param {string} siteUrl - configured site origin
 * @param {string} outputDir - dist/
 * @returns {{src: string, width: number, height: number, alt: string}|null}
 */
export function renderRouteOgImage(generation, route, siteUrl, outputDir) {
  const Resvg = resolveRasterizer()
  if (!Resvg) {
    if (!renderRouteOgImage._skippedLoudly) {
      renderRouteOgImage._skippedLoudly = true
      console.log('[ogimage] @resvg/resvg-js is not installed - generation skips loudly'
        + ' (pure-Node cannot rasterize; install it with: npm install --save-dev @resvg/resvg-js)')
    }
    return null
  }

  const routePath = route && typeof route.path === 'string' ? route.path : '/'
  const routeUrl = ((siteUrl || '').replace(/\/$/, '')) + (routePath === '/' ? '/' : routePath)
  const displayTitle = (route.meta && route.meta.title) || routePath || 'Preview'
  const svg = generation.template
    .split('{{ogTitle}}').join(escXml(displayTitle))
    .split('{{ogDescription}}').join(escXml((route.meta && route.meta.description) || ''))
    .split('{{ogUrl}}').join(escXml(routeUrl))

  const fontBuffers = generation.fontBytes ? [generation.fontBytes] : undefined
  let png
  try {
    const rendered = new Resvg(svg, {
      fitTo: { mode: 'width', value: generation.width },
      font: fontBuffers ? { fontBuffers, loadSystemFonts: false } : { loadSystemFonts: false },
    })
    png = rendered.render().asPng()
  } catch (e) {
    console.log('[ogimage] route ' + routePath + ' failed to rasterize: ' + e.message)
    return null
  }

  const name = imageSlug(routePath)
  const genDir = path.join(outputDir, 'og')
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true })
  const file = path.join(genDir, name + '.png')
  fs.writeFileSync(file, png)

  return {
    src: '/og/' + name + '.png',
    width: generation.width,
    height: generation.height,
    alt: displayTitle + ' - page preview image',
  }
}
