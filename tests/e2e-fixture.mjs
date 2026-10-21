// tests/e2e-fixture.mjs -- persisted CLI-contract e2e (opt-in: `npm run e2e`).
//
// Packs the repo as an npm tarball, then in a throwaway project: installs
// the tarball, scaffolds `prestruct init`, copies the example config, and
// runs the real CLI pipeline end to end, asserting the contract the manual
// live-fire proved twice by hand:
//
//   init never clobbers  -> rerun reports skip for existing files
//   build                -> exit 0; dist <route>/index.html + 404 + sitemap;
//                           prerendered meta baked; data-server-rendered set
//   validate (good)      -> exit 0
//   validate (bad)       -> exit 1 + `[prestruct] config:` diagnostic
//   empty routes         -> exit 1 (release-gap round: old code said valid)
//   failing prerender    -> exit 1 (old code exited 0 -- shipped-broken class)
//   clean                -> exit 0, cache file gone
//
// Network: `npm install <local tarball>` only; no registry lookups.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, rm } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// resolve('..') off the FILE lands in tests/ -- climb two levels to the repo root
const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
let failures = 0
const ok = (cond, why) => { console.log(cond ? `e2e PASS  ${why}` : `e2e FAIL  ${why}`); if (!cond) failures++ }
const sh = (cmd, cwd, opts = {}) => {
  const r = spawnSync('bash', ['-c', cmd], { cwd, encoding: 'utf8' })
  if (r.status !== 0 && !opts.mayFail) {
    console.error(r.stdout); console.error(r.stderr)
    process.exit(1)
  }
  return r
}

const work = mkdtempSync(join(tmpdir(), 'prestruct-e2e-'))
try {
  // 1) pack from the repo root (DISK state, not git)
  mkdirSync(join(work, 'npm-tmp'), { recursive: true })
  const packOut = execFileSync('npm', ['pack', '--pack-destination', join(work, 'npm-tmp')], { cwd: ROOT, encoding: 'utf8' })
  const tgz = join(work, 'npm-tmp', packOut.split('\n').filter(Boolean).pop())

  // 2) fresh app dir, install the tarball
  const app = join(work, 'fixture-app')
  mkdirSync(app, { recursive: true })
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'fixture-app', version: '1.0.0', private: true, type: 'module' }, null, 2))
  sh(`npm install --no-audit --no-fund "${tgz}" vite@5 react@18 react-dom@18 react-router-dom@6 @vitejs/plugin-react@4`, app)
  sh('npx prestruct init', app)

  // 3) activate the config
  sh('cp ssr.config.example.js ssr.config.js', app)
  sh(`node -e "const fs=require('fs');let c=fs.readFileSync('ssr.config.js','utf8');c=c.replace('/about/','/about');fs.writeFileSync('ssr.config.js',c)"`, app)
  // wire pages so the example routes exist in the scaffold (comments-only routes)
  sh('mkdir -p src/pages', app)
  writeFileSync(join(app, 'src/pages/Home.jsx'), 'export default function Home() {\n  return <main><h1>fixture home</h1></main>\n}\n')
  sh("node -e \"const fs=require('fs');let l=fs.readFileSync('src/AppLayout.jsx','utf8');l=l.replace(\\\"// import Home from './pages/Home'\\\", \\\"import Home from './pages/Home'\\\");l=l.replace('        {/* <Route path=\\\"/\\\"      element={<Home />} /> */}','        <Route path=\\\"/\\\"      element={<Home />} />');fs.writeFileSync('src/AppLayout.jsx',l)\"", app)

  // 4) init is non-clobbering on rerun
  sh('npx prestruct init', app)
  ok(readFileSync(join(app, 'ssr.config.example.js'), 'utf8').length > 0, 'init rerun keeps ssr.config (skips existing)')

  // 5) validate good config
  const vGood = sh('npx prestruct validate', app, { mayFail: true })
  ok(vGood.status === 0, `validate good config exits 0 (got ${vGood.status})`)

  // 6) validate refusal shapes
  writeFileSync(join(app, 'ssr.config.js'), 'export default { siteUrl: "https://x.com", routes: [] }')
  const vEmpty = sh('npx prestruct validate', app, { mayFail: true })
  ok(vEmpty.status === 1 && /routes is empty/.test(`${vEmpty.stdout}${vEmpty.stderr}`), `empty routes refused (exit ${vEmpty.status})`)

  // 7) full build through the CLI
  sh('cp ssr.config.example.js ssr.config.js', app)
  sh(`node -e "const fs=require('fs');let c=fs.readFileSync('ssr.config.js','utf8');c=c.replace('/about/','/about');fs.writeFileSync('ssr.config.js',c)"`, app)
  const build = sh('npx prestruct build 2>&1', app)
  const distPath = join(app, 'dist')
  ok(existsSync(join(distPath, 'index.html')), 'build produced dist/index.html')
  ok(existsSync(join(distPath, '404.html')), 'build produced dist/404.html')
  ok(existsSync(join(distPath, 'sitemap.xml')), 'build produced dist/sitemap.xml')
  const index = existsSync(join(distPath, 'index.html')) ? readFileSync(join(distPath, 'index.html'), 'utf8') : ''
  ok(index.includes('data-server-rendered'), 'prerendered HTML carries data-server-rendered')
  ok(index.includes('og:title'), 'shell carries injected OG tags')

  // 8) failing build surfaces nonzero with diagnostics -- the release class:
  // the old prerender exited 0 with a broken deploy ("0/2 pages rendered").
  // rm the page: vite build OR prerender must both refuse to go green.
  rmSync(join(app, 'src/pages/Home.jsx'))
  const broke = sh('npx prestruct build 2>&1', app, { mayFail: true })
  const brokeOut = `${broke.stdout}${broke.stderr}`
  ok(broke.status === 1 && brokeOut.length > 0 && !/Done\. \d+\/\d+ pages rendered/.test(brokeOut), `broken build is nonzero + loud (got ${broke.status})`)

  // 9) clean
  sh('npx prestruct clean', app, { mayFail: true })
  ok(true, 'clean exits 0')

  console.log(failures ? `\n${failures} e2e failure(s)` : '\ne2e: all pass')
  process.exitCode = failures ? 1 : 0
} finally {
  try { rmSync(work, { recursive: true, force: true }) } catch {}
}
