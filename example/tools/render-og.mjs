// Rasterize public/og-image.svg to public/og-image.png (1200x630).
// SVG is the design source of truth (issue #31); this script is the ONCE-per-
// design-change renderer. Output PNG is committed so the deployed og:image URL
// is a social-crawler-raster without any build-time raster dependency.
//
// Fonts: Geist + Geist Mono TTF buffers (Google Fonts, OFL -- redistribution-
// safe). The VM has no system fonts, so loadSystemFonts is false; the TTFs are
// the only glyph source. Rerun after any og-image.svg edit:
//   node tools/render-og.mjs
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(join(here, '..', 'public', 'og-image.svg'), 'utf8')

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  background: '#080808',
  font: {
    fontFiles: [
      join(here, 'fonts', 'Geist-400.ttf'),
      join(here, 'fonts', 'Geist-600.ttf'),
      join(here, 'fonts', 'Geist-800.ttf'),
      join(here, 'fonts', 'GeistMono-400.ttf'),
      join(here, 'fonts', 'GeistMono-600.ttf'),
    ],
    loadSystemFonts: false,
    defaultFontFamily: 'Geist Mono',
  },
})

const png = resvg.render().asPng()
writeFileSync(join(here, '..', 'public', 'og-image.png'), png)
console.log('og-image.png written,', png.length, 'bytes')
