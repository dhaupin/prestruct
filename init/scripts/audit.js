// scripts/audit.js - the `prestruct audit` post-build verifier
//
// Ported and remapped from freestruct's `audit` subcommand (their audit.js is
// itself a port of the prestruct#34 donated script -- the family keeps ONE
// audit contract). Remaps onto OUR contract, which is not freestruct's:
//   - config is ssr.config.js: siteUrl (not site.url), ogImage (string OR
//     the structured { url, width, height, alt, type } object form)
//   - prestruct ships no twitter handle config, so twitter:site/creator are
//     never graded at all (the engine never emits them; grading their
//     absence would fail contract-abiding output)
//   - robots.txt grading only when config.robots is truthy: without it the
//     author's own public/robots.txt is engine-untouchable (opt-in preset
//     contract), so a missing pointer there is the author's call, not a FAIL
//   - sitemap.xml is engine-authored on every prerender (missing = a FAIL)
//
// FAIL class (exit 1): the contract core -- missing title/description,
// relative canonical, duplicate head tags, missing og/twitter core, the SVG
// og:image trap, unparseable JSON-LD, the 404 noindex contract, missing
// sitemap, robots missing its pointer (when engine-authored).
// WARN class (report-grade): length bands, extended og/twitter set, missing
// og:image companions (the object form supplies them), disk-missing
// og:image/JSON-LD refs, h1 hygiene, no JSON-LD, absent sitemap lastmod.
//
// Exit decisions belong to the caller (bin/cli.mjs): auditOutput NEVER exits.
// The shared audit shape (fails/warns/pages/sitemapLocs result, --json
// digest, capture mode) stays freestruct-compatible so shared family
// tooling keeps working against either engine.

import { readFileSync, existsSync, readdirSync, statSync, realpathSync } from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

// FAIL class = the tags prestruct's own contract writes into every prerendered
// head (shell injection + per-route meta). The extended sets ride WARN.
const OG_CORE = ['og:title', 'og:description']
const OG_SET = ['og:url', 'og:type', 'og:site_name', 'og:locale']
const TW_CORE = ['twitter:card', 'twitter:title']
const TW_SET = ['twitter:description', 'twitter:image']
// LocalBusiness recommended fields per the schema.org contract.
const LB_RECOMMENDED = ['name', 'url', 'image', 'logo', 'telephone', 'priceRange', 'openingHoursSpecification', 'geo', 'sameAs']

// ---------- scans ----------

/** Attribute-order/whitespace tolerant meta extraction: the key attr may sit
 * after other attributes and any amount of whitespace. The old `[^>]`
 * (exactly one char) matched only the engine's own single-space output, so a
 * hand-formatted shell (`<meta  property=`, or an attribute before the key)
 * graded as a MISSING tag -- a false FAIL that fails the build. */
function grabMeta(head, attrHasKey, name) {
  // `\s` (not `\b`) before the key: an attribute is whitespace-delimited, so
  // this matches `<meta property=` and `<meta  property=` but never a
  // hyphenated sibling like `data-name=` (where `\b` would falsely match).
  const keyRe = new RegExp(`<meta\\b[^>]*\\s${attrHasKey}\\s*=\\s*["']${name}["'][^>]*>`, 'i')
  const tag = head.match(keyRe)
  if (!tag) return null
  const content = tag[0].match(/content\s*=\s*["']([^"']*)["']/i)
  return content ? content[1] : null
}

function grabCanonical(head) {
  const link = head.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)
    || head.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i)
  if (!link) return null
  const href = link[0].match(/href=["']([^"']+)["']/i)
  return href ? href[1] : null
}

/** Count every occurrence of a head shape - the duplicate-class probe. */
function countHead(head, re) {
  return (head.match(re) || []).length
}

function walkHtml(dir) {
  let out = []
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) out = out.concat(walkHtml(p))
    else if (/\.html?$/i.test(name)) out.push(p)
  }
  return out
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()
}

/** Head-referenced URL -> on-disk path under the output dir, or null. */
function urlToDisk(urlValue, { outputDir, config }) {
  if (!urlValue) return null
  let pathName = urlValue.split(/[?#]/)[0]
  if (/^https?:\/\//i.test(pathName)) {
    try {
      const u = new URL(pathName)
      const site = config?.siteUrl ? new URL(config.siteUrl) : null
      // Only site-local files can exist in the output tree.
      if (site && u.host !== site.host) return null
      pathName = u.pathname + u.search
    } catch (e) { return null }
  } else if (/^\/\//.test(pathName)) {
    return null
  }
  if (pathName.startsWith('/')) {
    const root = path.resolve(outputDir)
    const target = path.resolve(root, pathName.replace(/^\//, ''))
    // Containment guard: a crafted og:image/JSON-LD URL with `../../`
    // segments (`/../../../etc/passwd`) resolved OUTSIDE the output tree, so
    // the exists-on-disk probe read arbitrary host-path existence. Confine
    // every resolved path to the output root; anything that escapes is not a
    // site-local file.
    if (target !== root && !target.startsWith(root + path.sep)) return null
    return target
  }
  return null
}

// ---------- the audit ----------

/**
 * Audit a baked output directory. Returns { fails, warns, pages, sitemapLocs }.
 * Prints a human report by default, or a JSON digest with `json: true`;
 * `capture: true` skips printing and hands the caller the raw result.
 * NEVER exits: the caller owns the exit code (0 clean / 1 findings).
 */
export function auditOutput({ outputDir, config, json = false, capture = false }) {
  const fails = []
  const warns = []
  const fail = (page, msg) => fails.push({ page, msg })
  const warn = (page, msg) => warns.push({ page, msg })

  // File-at-path hardening (freestruct Pass 26.13 shape): a file at the
  // outputDir path passes existsSync, and walkHtml's readdirSync would
  // arrive here uncaught.
  if (!existsSync(outputDir) || !statSync(outputDir).isDirectory()) {
    if (json) console.log(JSON.stringify({ ok: false, error: 'output dir not found: ' + outputDir }))
    else console.error('[prestruct] audit: no "' + outputDir + '" directory - run the build first.')
    return { fails: [{ page: 'outputDir', msg: 'missing' }], warns, pages: 0, sitemapLocs: 0 }
  }

  const pages = walkHtml(outputDir)
  let sitemapLocs = 0

  for (const filePath of pages) {
    let rel
    try { rel = path.relative(outputDir, filePath) } catch (e) { rel = filePath }
    const html = readFileSync(filePath, 'utf8')
    const head = html.split('</head>')[0]
    const label = rel.replace(/\\/g, '/')

    // 404 contract: noindex (and it must not be rescued by JS: our 404 is
    // pure static HTML, but the noindex meta is what the audit pins).
    if (/(^|\/)404\.html?$/i.test(label)) {
      const robots = grabMeta(head, 'name', 'robots') || ''
      if (!/noindex/i.test(robots)) fail(label, '404 page missing its noindex robots directive')
      continue
    }

    const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (!titleMatch || !titleMatch[1].trim()) fail(label, 'missing <title>')
    else {
      const t = stripTags(titleMatch[1]).length
      if (t > 65) warn(label, 'title ' + t + ' chars (> 65, may truncate)')
      if (t < 10) warn(label, 'title ' + t + ' chars (suspiciously short)')
    }

    const desc = grabMeta(head, 'name', 'description')
    if (!desc) fail(label, 'missing meta description')
    else if (desc.length < 70 || desc.length > 165) {
      warn(label, 'description ' + desc.length + ' chars (outside 70-165, may truncate)')
    }

    const canonical = grabCanonical(head)
    if (!canonical || canonical === '') fail(label, 'missing canonical link')
    else if (!/^https?:\/\//i.test(canonical)) fail(label, 'canonical not absolute: ' + canonical)

    // Duplicate tags ride the FAIL class: missing-only injection never adds
    // a tag the page already carries, so any duplicate in a baked head is a
    // page/edit gone wrong (attribute-order tolerant, same as the missing
    // checks). Guards the rebuild path: inject-brand strips its previous
    // block, so a surviving duplicate is exactly what the guard exists for.
    for (const dup of [
      ['duplicate canonical link (a page ships exactly one)', /<link[^>]+rel=["']canonical["']/gi],
      ['duplicate meta description', /<meta[^>]+name=["']description["']/gi],
      ['multiple <title> elements', /<title[^>]*>/gi],
      ['duplicate og:title', /<meta[^>]+property=["']og:title["']/gi],
    ]) {
      if (countHead(head, dup[1]) > 1) fail(label, dup[0])
    }

    for (const prop of OG_CORE) {
      if (!grabMeta(head, 'property', prop)) fail(label, 'missing ' + prop)
    }
    for (const prop of OG_SET) {
      if (!grabMeta(head, 'property', prop)) {
        warn(label, prop + ' absent (the engine ships the full set; partial sets are a hand-edited shell?)')
      }
    }
    const ogImage = grabMeta(head, 'property', 'og:image')
    if (ogImage && /\.svg(\?|#|$)/i.test(ogImage)) {
      fail(label, 'og:image is SVG (' + ogImage + ') - most social scrapers cannot render it; ship a raster PNG/JPG (tools/render-og.mjs style)')
    }
    if (ogImage && !grabMeta(head, 'property', 'og:image:width')) {
      warn(label, 'og:image:width/height/alt absent (the ogImage object form supplies them)')
    }
    if (ogImage && urlToDisk(ogImage, { outputDir, config }) && !existsSync(urlToDisk(ogImage, { outputDir, config }))) {
      // Report-grade on purpose: an og image can live on a same-host CDN or
      // be emitted by a later step, so a hard FAIL would punish valid setups;
      // the JSON digest carries it for teams who harden it in CI.
      warn(label, 'og:image points at ' + ogImage + ' which does not exist on disk')
    }
    if (ogImage && !grabMeta(head, 'name', 'twitter:image')) {
      warn(label, 'og:image present but twitter:image absent (the shell injects both together) - hand-edited?')
    }

    for (const name of TW_CORE) {
      if (!grabMeta(head, 'name', name)) fail(label, 'missing ' + name)
    }
    for (const name of TW_SET) {
      if (!grabMeta(head, 'name', name)) {
        warn(label, name + ' absent (twitter:image rides og:image; twitter:description rides the description)')
      }
    }

    const ldBlocks = [...html.matchAll(/<script type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    if (!ldBlocks.length) warn(label, 'no JSON-LD structured data (faqs or buildJsonLd supply it)')
    for (const block of ldBlocks) {
      let parsed
      try { parsed = JSON.parse(block[1]) } catch (e) {
        fail(label, 'invalid JSON-LD: ' + e.message)
        continue
      }
      const nodes = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed])
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue
        if (!node['@type']) { warn(label, 'JSON-LD node without @type'); continue }
        const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
        if (types.includes('LocalBusiness')) {
          const missing = LB_RECOMMENDED.filter(f => !(f in node))
          if (missing.length) warn(label, 'LocalBusiness missing recommended: ' + missing.join(', '))
        }
        // schema-carried logo/image files: same exists-on-disk check as og:image
        for (const key of ['logo', 'image']) {
          const v = node[key]
          const target = urlToDisk(typeof v === 'string' ? v : null, { outputDir, config })
          if (target && !existsSync(target)) {
            warn(label, 'JSON-LD ' + key + ' points at ' + v + ' which does not exist on disk')
          }
        }
      }
    }

    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    const h1Texts = h1s.map(m => stripTags(m[1])).filter(Boolean)
    if (!h1Texts.length) warn(label, 'no non-empty <h1>')
    else if (h1Texts.length > 1) warn(label, h1Texts.length + ' <h1> elements (prefer one)')
  }

  // ---------- site-level artifacts ----------

  const sitemapPath = path.join(outputDir, 'sitemap.xml')
  if (!existsSync(sitemapPath)) {
    fail('sitemap.xml', 'missing (prerender writes it on every run)')
  } else {
    const s = readFileSync(sitemapPath, 'utf8')
    sitemapLocs = (s.match(/<loc>/g) || []).length
    if (sitemapLocs === 0) fail('sitemap.xml', 'no <loc> entries')
    if (!s.includes('<lastmod>')) warn('sitemap.xml', 'no <lastmod> dates (engine runs always add them; hand-stripped?)')
  }

  // robots.txt ships only when config.robots is opted in -- the author's own
  // public/robots.txt is never engine-touched, so its shape stays the
  // author's call. Graded only when the engine contract owns the file.
  const robotsPath = path.join(outputDir, 'robots.txt')
  if (config?.robots) {
    if (!existsSync(robotsPath)) {
      fail('robots.txt', 'missing (config.robots is set -- prerender writes it)')
    } else {
      const r = readFileSync(robotsPath, 'utf8')
      if (!/Sitemap:/i.test(r)) fail('robots.txt', 'no Sitemap: pointer')
    }
  }

  // ---------- report ----------

  if (capture) {
    return { fails, warns, pages: pages.length, sitemapLocs }
  }
  if (json) {
    console.log(JSON.stringify({ ok: fails.length === 0, pages: pages.length, fails, warns }))
  } else {
    console.log('[prestruct] SEO audit: ' + pages.length + ' baked page(s) checked, sitemap.xml has ' + sitemapLocs + ' <loc> entries')
    for (const f of fails) console.log('  FAIL ' + f.page + ': ' + f.msg)
    for (const w of warns) console.log('  WARN ' + w.page + ': ' + w.msg)
    if (fails.length === 0) {
      console.log('[prestruct] audit: 0 failures, ' + warns.length + ' warning(s) - clean')
    } else {
      console.log('[prestruct] audit: ' + fails.length + ' failure(s), ' + warns.length + ' warning(s) - exiting 1')
    }
  }
  return { fails, warns, pages: pages.length, sitemapLocs }
}

// ---------- external links (opt-in, --external) ----------

const EXTERNAL_LIMIT = 50

// ---------- the SSRF host policy ----------
// `audit --external` fetches the URLs a BAKED tree names, and a baked tree can
// be attacker-influenced (a CMS field, a scraped page, a dependency's demo
// HTML). Without a host policy the pass is a server-side request forgery
// primitive: a link to http://169.254.169.254/... (cloud metadata),
// http://127.0.0.1:<port>/ (a co-located service), or an internal
// http://10.0.0.5/ makes the run probe a host the tree's author cannot reach
// directly and report the status in the findings. The classifier below checks
// the host LITERAL in every spelling a parser accepts and the caller refuses
// BEFORE any socket opens (network-free, deterministic). A public name that
// DNS-rebinds to a private address is a separate class (TOCTOU at resolution
// time) a literal check cannot see - noted, not claimed.
//
// This is the family shape poststruct's external lane carries (dhaupin/
// poststruct src/checks/external.mjs), ported here because prestruct's
// external pass is the same primitive on the same kind of input.

// CIDR blocks (v4) refused by default: this-network, private, CGNAT,
// link-local (includes the 169.254.169.254 metadata IP), IETF protocol
// assignments, benchmarking, reserved, and broadcast.
const V4_BLOCKS = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4], ['255.255.255.255', 32],
]

function v4ToInt(ip) {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const b = Number(p)
    if (b > 255) return null
    n = (n * 256) + b
  }
  return n
}

// A host literal that names a non-public v4 address, in every spelling the C
// `inet_aton` rules (which Node's URL parser follows) accept: a dotted quad, a
// bare 32-bit integer (2130706433 = 127.0.0.1), octal (0177.0.0.1), hex
// (0x7f.0.0.1), and short dotted forms (127.1, 0x7f.1).
function isPrivateV4Literal(host) {
  const groups = host.split('.')
  if (groups.length > 4) return false
  const nums = []
  for (const g of groups) {
    let n
    if (/^0x[0-9a-f]+$/i.test(g)) n = parseInt(g, 16)
    else if (/^0[0-7]+$/.test(g)) n = parseInt(g, 8)
    else if (/^\d+$/.test(g)) n = Number(g)
    else return false
    if (!Number.isInteger(n) || n < 0) return false
    nums.push(n)
  }
  if (!nums.length) return false
  const maxLast = 256 ** (5 - nums.length)
  if (nums[nums.length - 1] >= maxLast) return false
  for (let i = 0; i < nums.length - 1; i++) if (nums[i] > 255) return false
  let value = 0
  for (let i = 0; i < nums.length - 1; i++) value = (value * 256) + nums[i]
  value = (value * maxLast) + nums[nums.length - 1]
  return V4_BLOCKS.some(([base, bits]) => (value >>> (32 - bits)) === (v4ToInt(base) >>> (32 - bits)))
}

// Parse an IPv6 literal into its eight 16-bit groups, or null when the string
// is not a well-formed v6 address. Handles `::` compression and an embedded
// dotted-quad tail (`::ffff:127.0.0.1`), which the URL parser normalizes to hex
// (`::ffff:7f00:1`) before we ever see it, so both spellings must parse.
function v6Groups(host) {
  let h = String(host).toLowerCase()
  if (!h.includes(':')) return null
  const dotted = h.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (dotted) {
    const n = v4ToInt(dotted[1])
    if (n === null) return null
    h = h.slice(0, dotted.index) + ((n >>> 16).toString(16)) + ':' + ((n & 0xffff).toString(16))
  }
  const halves = h.split('::')
  if (halves.length > 2) return null
  const toGroups = (s) => (s === '' ? [] : s.split(':').map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : null)))
  const head = toGroups(halves[0])
  const tail = halves.length === 2 ? toGroups(halves[1]) : []
  if (head.includes(null) || tail.includes(null)) return null
  if (halves.length === 1) return head.length === 8 ? head : null
  const fill = 8 - head.length - tail.length
  if (fill < 0) return null
  return [...head, ...Array(fill).fill(0), ...tail]
}

const v4FromGroups = (hi, lo) => `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`

// IPv6 loopback/unspecified, IPv4-mapped/translated/compatible, NAT64, 6to4,
// and the unique-local (fc00::/7) + link-local (fe80::/10) ranges. The
// embedded-IPv4 forms are the ones a dotted-suffix check misses: Node's URL
// parser rewrites `::ffff:127.0.0.1` to `::ffff:7f00:1`, so the loopback is
// only visible once the low 32 bits are reassembled from the hex groups.
function isPrivateV6Literal(host) {
  const g = v6Groups(host)
  if (!g) return false
  if (g.every((x) => x === 0)) return true // `::`
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true // `::1`
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return isPrivateV4Literal(v4FromGroups(g[6], g[7])) // ::ffff:a.b.c.d
  if (g.slice(0, 4).every((x) => x === 0) && g[4] === 0xffff && g[5] === 0) return isPrivateV4Literal(v4FromGroups(g[6], g[7])) // ::ffff:0:a.b.c.d
  if (g.slice(0, 6).every((x) => x === 0) && (g[6] || g[7])) return isPrivateV4Literal(v4FromGroups(g[6], g[7])) // ::a.b.c.d
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return isPrivateV4Literal(v4FromGroups(g[6], g[7])) // 64:ff9b::/96
  if (g[0] === 0x2002) return isPrivateV4Literal(v4FromGroups(g[1], g[2])) // 2002::/16
  if ((g[0] & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
  if ((g[0] & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  return false
}

/**
 * True when the host names a private, loopback, link-local, unique-local, or
 * otherwise non-public address. `host` is the URL parser's `hostname` (brackets
 * stripped) or any bare host string.
 */
function isPrivateHostLiteral(host) {
  // A trailing dot is the explicit-root FQDN spelling of the SAME host
  // (localhost. == localhost); the URL parser keeps it, so normalize it away
  // or every rule below is bypassable with one appended dot.
  const h = (host || '').replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase()
  if (!h) return false
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h === 'metadata.google.internal') return true
  // A hostname (letters outside the numeric/hex alphabet) is not a private
  // literal; DNS-based rebinding is out of scope for a literal check.
  if (/^[0-9a-fx.]+$/.test(h)) {
    if (isPrivateV4Literal(h)) return true
  }
  return isPrivateV6Literal(h)
}

const PRIVATE_HOST_REASON = 'names a private, loopback, link-local, or otherwise non-public address (SSRF guard)'

/** Collect external http(s) href URLs from the baked pages, deduped, with referencing pages. */
function collectExternalLinks({ outputDir, pages }) {
  const byUrl = new Map()
  for (const filePath of pages) {
    let rel
    try { rel = path.relative(outputDir, filePath).replace(/\\/g, '/') } catch (e) { rel = filePath }
    const html = readFileSync(filePath, 'utf8')
    for (const m of html.matchAll(/href\s*=\s*["'](https?:\/\/[^"'\s]+)["']/gi)) {
      const url = m[1].replace(/&amp;/g, '&')
      if (!byUrl.has(url)) byUrl.set(url, [])
      byUrl.get(url).push(rel)
    }
  }
  return byUrl
}

/** HEAD with a GET retry (some CDNs refuse HEAD); returns the problem string or null. */
async function headCheck(url) {
  const tryOnce = async (method) => {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': 'prestruct-audit (+https://github.com/dhaupin/prestruct)' },
    })
    return res.status >= 400 ? 'HTTP ' + res.status + (res.statusText ? ' ' + res.statusText : '') : null
  }
  try {
    return await tryOnce('HEAD')
  } catch (headErr) {
    try {
      return await tryOnce('GET')
    } catch (getErr) {
      const cause = (getErr && getErr.cause && getErr.cause.code) ? getErr.cause.code : getErr.message
      return 'unreachable (' + cause + ')'
    }
  }
}

/**
 * External-link audit (opt-in): dedupe the tree's external hrefs, HEAD-check
 * up to EXTERNAL_LIMIT unique URLs, report every failure as a WARN row
 * (report-grade by design: bots get 403/429 legitimately). NEVER exits.
 */
export async function auditExternalLinks({ outputDir, json = false }) {
  const empty = { warns: [], checked: 0, blocked: 0 }
  if (!existsSync(outputDir)) return empty
  const pages = walkHtml(outputDir)
  const byUrl = collectExternalLinks({ outputDir, pages })
  if (byUrl.size === 0) return empty
  const capped = [...byUrl.keys()].slice(0, EXTERNAL_LIMIT)

  // The SSRF guard runs BEFORE any socket: a host that names a private address
  // is refused here (network-free, deterministic) and never handed to a probe.
  // A refused URL is a WARN finding, not a silent skip.
  const blocked = new Set()
  for (const url of capped) {
    let host = null
    try { host = new URL(url).hostname } catch (e) { /* an unparsable absolute URL still probes and fails honestly */ }
    if (host && isPrivateHostLiteral(host)) blocked.add(url)
  }

  const allowed = capped.filter((u) => !blocked.has(u))
  const results = await Promise.all(allowed.map(async (url) => [url, await headCheck(url)]))
  const warns = []
  for (const url of capped) {
    if (!blocked.has(url)) continue
    const referencing = byUrl.get(url)
    const label = referencing.length > 1
      ? referencing[0] + ' (+' + (referencing.length - 1) + ' more page(s))'
      : referencing[0]
    warns.push({ page: label, msg: 'external link ' + url + ': refused: ' + PRIVATE_HOST_REASON })
  }
  for (const [url, problem] of results) {
    if (!problem) continue
    const referencing = byUrl.get(url)
    const label = referencing.length > 1
      ? referencing[0] + ' (+' + (referencing.length - 1) + ' more page(s))'
      : referencing[0]
    warns.push({ page: label, msg: 'external link ' + url + ': ' + problem })
  }
  if (byUrl.size > EXTERNAL_LIMIT) {
    warns.push({ page: 'external', msg: 'checked only the first ' + EXTERNAL_LIMIT + ' unique external urls of ' + byUrl.size })
  }
  if (!json && warns.length > 0) {
    console.log('[prestruct] external link check: ' + allowed.length + ' unique url(s) probed' + (blocked.size ? ', ' + blocked.size + ' refused (SSRF guard)' : ''))
    for (const w of warns) console.log('  WARN ' + w.page + ': ' + w.msg)
  }
  return { warns, checked: allowed.length, blocked: blocked.size }
}

// ---------- internal links (opt-in, --internal) ----------

/**
 * Check internal links across every page. Returns [{file, link}] for broken
 * targets; warns -- internal links to routes that were never prerendered
 * (dynamic routes, islands territory) are a legitimate gap prestruct does
 * not punish hard: report-grade always. Ported from freestruct's linkcheck
 * including their payloads lesson: inline JS template strings
 * ("<a href=" + url + ">") and rouge-fenced / code-payload pseudo-links are
 * NOT routes -- script, style, pre and code payloads are stripped before
 * the href scan (our example is code-heavy: the naive scan lit up).
 */
export function auditInternalLinks({ outputDir }) {
  const broken = []
  if (!existsSync(outputDir) || !statSync(outputDir).isDirectory()) return broken
  const files = walkHtml(outputDir)

  for (const file of files) {
    const html = readFileSync(file, 'utf8')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<pre[\s\S]*?<\/pre>/gi, '')
      .replace(/<code[\s\S]*?<\/code>/gi, '')
    const baseDir = path.dirname(file)

    const linkRegex = /href="([^"#]+)(?:#[^"]*)?"/g
    let match
    while ((match = linkRegex.exec(html)) !== null) {
      const link = match[1]

      // Skip external, absolute-protocol, and ANY scheme-shaped target
      // (data:, javascript:, tel:, mailto:, ...): schemes are not routes.
      if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('//')) continue

      // Root-relative hrefs resolve against the OUTPUT ROOT (path.join
      // APPENDS, never resets -- the whole nav menu would miss otherwise);
      // relative hrefs stay page-relative.
      const absPath = link.startsWith('/')
        ? path.join(outputDir, link)
        : path.join(baseDir, link)
      const normalized = path.normalize(absPath)

      // Targeted file link: the extension decides the check shape
      // (case-insensitive .html/.htm).
      if (/\.html?$/i.test(normalized)) {
        if (!existsSync(normalized)) {
          broken.push({ file: path.relative(outputDir, file), link })
        }
        continue
      }

      // Pretty-URL link: resolve like the route model -- directory index
      // first, then the .html/.htm sibling. Asset-like targets (their last
      // segment carries an extension that is not a page route: .css, .js,
      // .png, .json, ...) are the host's business and stay out.
      const lastSegment = normalized.split(path.sep).pop() || ''
      if (lastSegment.includes('.')) continue

      const dirIndex = existsSync(path.join(normalized, 'index.html'))
        || existsSync(path.join(normalized, 'index.htm'))
      const prettySibling = existsSync(path.join(normalized + '.html'))
        || existsSync(path.join(normalized + '.htm'))
      if (!dirIndex && !prettySibling) {
        broken.push({ file: path.relative(outputDir, file), link })
      }
    }
  }
  return broken
}

// ---------- main-module runner ----------

// Scaffolded copies run as `node scripts/audit.js` straight after the build
// (example/init build scripts; the family audit shape). Module importers skip
// all of this -- the freestruct bin shim lesson: import.meta.url resolves the
// symlink's REAL path, so compare realpaths, never raw argv[1] (a naive match
// made real installs run silently with exit 0 and no work).
async function runAuditMain() {
  const argv = process.argv.slice(2)
  const knownFlags = new Set(['--json', '--external', '--internal'])
  const dashArgs = argv.filter(a => a.startsWith('--'))
  const unknown = dashArgs.filter(a => !knownFlags.has(a))
  if (unknown.length) {
    console.error(`[prestruct] audit: unknown flag(s): ${unknown.join(' ')} - supported: --json --external --internal`)
    process.exit(1)
  }
  const explicitDir = argv.find(a => !a.startsWith('--'))

  // Config discovery: walk up from cwd for ssr.config.js. Audit runs
  // configless against any tree (explicitDir positional wins; the config
  // exists check lands in auditOutput).
  let config = null
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    const cfgPath = path.join(dir, 'ssr.config.js')
    if (existsSync(cfgPath)) {
      try { config = (await import(pathToFileURL(cfgPath))).default } catch (e) {
        console.error('[prestruct] audit: ssr.config.js failed to load: ' + e.message)
      }
      break
    }
    dir = path.dirname(dir)
  }

  const outputDir = explicitDir
    ? path.resolve(process.cwd(), explicitDir)
    : path.join(path.dirname(process.argv[1] || '.'), '..', 'dist')

  // capture: the runner owns the single JSON line below (combined with the
  // aux probes), so auditOutput must not print its own -- the old json:true
  // emitted two concatenated digests for a plain `audit --json`.
  const result = auditOutput({ outputDir, config, capture: argv.includes('--json') })

  // --internal: broken internal href rows (report-grade always: routes that
  // were never prerendered are a legitimate dynamic-route gap).
  const internal = argv.includes('--internal') ? auditInternalLinks({ outputDir }) : []
  if (internal.length && !argv.includes('--json')) {
    console.log('[prestruct] internal link check: ' + internal.length + ' broken link(s)')
    for (const b of internal) console.log('  WARN ' + b.file + ' -> ' + b.link)
  }

  // --external: HEAD->GET probe of up to 50 unique external hrefs (network).
  let external = { warns: [] }
  if (argv.includes('--external')) external = await auditExternalLinks({ outputDir })

  if (argv.includes('--json')) {
    console.log(JSON.stringify({
      ok: result.fails.length === 0,
      pages: result.pages,
      fails: result.fails,
      warns: [...result.warns, ...internal.map(b => ({ page: b.file, msg: 'broken internal link: ' + b.link })), ...external.warns],
    }))
  } else if (internal.length || external.warns.length) {
    // Aux probes append rows the base report never saw -- the combined
    // summary is worth a line. Pure-local audits skip it: auditOutput's own
    // report already ended in the verdict (one verdict, not two).
    const totalWarns = result.warns.length + internal.length + external.warns.length
    console.log(result.fails.length === 0
      ? '[prestruct] audit: 0 failures, ' + totalWarns + ' warning(s) - clean'
      : '[prestruct] audit: ' + result.fails.length + ' failure(s), ' + totalWarns + ' warning(s) - exiting 1')
  }
  process.exit(result.fails.length > 0 ? 1 : 0)
}

const argvReal = process.argv[1]
  ? (() => { try { return realpathSync(process.argv[1]) } catch (e) { return process.argv[1] } })()
  : ''
const moduleReal = fileURLToPath(import.meta.url)
if (argvReal === moduleReal || import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  runAuditMain().catch((e) => {
    console.error('[prestruct] audit: ' + (e && e.message ? e.message : e))
    process.exit(1)
  })
}
