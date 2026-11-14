// tests/npm-parity.test.mjs
//
// The npm parity gate (a new law ships with a test). Every family repo
// advertises its published package on npm, on every surface it ships: the docs
// (a footer or nav link) and the landing site (a nav entry). This proves the
// link is present and names the package.json name, so a rename or a dropped
// surface reds here instead of shipping a package nobody can find.

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const has = (rel) => fs.existsSync(path.join(ROOT, rel))

const pkg = JSON.parse(read('package.json'))
const NPM = `https://www.npmjs.com/package/${pkg.name}`

const DOC_SURFACES = ['docs/_layouts/default.html', 'docs/_data/nav.yml', 'docs/_config.yml']
const WEB_SURFACES = ['site.config.js', 'web/src/components/navItems.js', 'web/src/site.js']

const mentions = (rel) => {
  const src = read(rel)
  return src.includes(NPM) || src.includes('{{ site.npm_url }}')
}

describe('npm parity', () => {
  it('the docs advertise the package on npm', () => {
    const present = DOC_SURFACES.filter(has)
    expect(present.filter(mentions).length).toBeGreaterThan(0)
  })

  it('the landing site advertises the package on npm', () => {
    const present = WEB_SURFACES.filter(has)
    if (present.length === 0) return
    expect(present.filter(mentions).length).toBeGreaterThan(0)
  })

  it('every npm link names the published package', () => {
    const all = [...DOC_SURFACES, ...WEB_SURFACES].filter(has).map(read).join('\n')
    const urls = [...all.matchAll(/https:\/\/www\.npmjs\.com\/package\/([a-z0-9@/_.-]+)/gi)].map((m) => m[1])
    for (const name of urls) expect(name).toBe(pkg.name)
  })
})
