#!/usr/bin/env node
/**
 * bin/cli.mjs - prestruct CLI
 * ============================
 * Commands (spec'd in labs/prd-prestruct.md Phase 2):
 *
 *   prestruct init [dir]    Scaffold the template into dir (default: cwd).
 *                           Never clobbers existing files.
 *   prestruct build         Validate config, run vite build, inject meta,
 *                           prerender routes -- full pipeline from ssr.config.js.
 *   prestruct validate      Load + validate ssr.config.js; exit 1 on bad config.
 *   prestruct audit         Verify the BAKED dist/ (head hygiene, sitemap,
 *                           robots, 404 noindex) without touching it; exit 1
 *                           on FAIL-class findings, warnings never fail.
 *   prestruct indexnow      Key file into dist/ + submit the baked sitemap
 *                           URLs to api.indexnow.org (--dry-run prints the
 *                           request body without touching the network); the
 *                           submission only counts once the output is DEPLOYED
 *                           (keyLocation must resolve).
 *   prestruct help          This text.
 *
 * The CLI runs inside the USER PROJECT: config comes from <workdir>/ssr.config.js,
 * vite/react/react-router-dom resolve from the project's own node_modules
 * (peerDependencies), and build output lands in <workdir>/dist.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'

process.on('unhandledRejection', (e) => console.error('[prestruct] unhandled rejection:', e && (e.stack || e)))

const cliDir = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(cliDir, '..')

const { validateConfig, formatDiagnostics, configKeyWarnings, formatConfigWarnings } = await import(
  pathToFileURL(path.join(packageRoot, 'engine/scripts/validate-config.js'))
)
const { injectBrand } = await import(
  pathToFileURL(path.join(packageRoot, 'engine/scripts/inject-brand.js'))
)
const { prerender, cleanCache, enginePaths, generateSitemap, assertXmlSafe } = await import(
  pathToFileURL(path.join(packageRoot, 'engine/scripts/prerender.js'))
)
const { auditOutput, auditExternalLinks, auditInternalLinks } = await import(
  pathToFileURL(path.join(packageRoot, 'engine/scripts/audit.js'))
)
const { runPostBuildHooks } = await import(
  pathToFileURL(path.join(packageRoot, 'engine/scripts/hooks.js'))
)
const { submitIndexNow, emitIndexNowKeyFile, resolveIndexNowKey, readSitemapUrls } = await import(
  pathToFileURL(path.join(packageRoot, 'engine/scripts/indexnow.js'))
)

const HELP = `
prestruct -- build-time SEO prerender for Vite + React

  prestruct init [dir]     Scaffold the template into dir (default: cwd).
                           Existing files are never clobbered.
  prestruct build [--force] [--clean]
                           Full pipeline: validate -> vite build -> inject
                           meta -> prerender routes -> hooks.postBuild.
                           --force rerenders all routes; --clean clears the
                           incremental cache first.
  prestruct validate       Validate ssr.config.js (exit 1 on bad config).
  prestruct audit [--json] [--external] [--internal] [dist]
                           Verify the BAKED output (per-page head hygiene,
                           duplicate-tag probes, og:image raster check,
                           JSON-LD parse, sitemap/robots/404-noindex) without
                           touching it. Exit 0 clean / 1 FAIL-class findings
                           (length bands and absent companions are report-
                           grade warnings and never fail). --external also
                           HEAD-checks up to 50 unique external hrefs
                           (warn-grade, needs live network); --internal lists
                           unresolved internal hrefs (warn-grade). A target
                           dir defaults to the config-owning project's dist/.
  prestruct indexnow [--dry-run] [dist]
                           Write the IndexNow key file into dist/ and POST
                           the baked sitemap URLs to api.indexnow.org.
                           --dry-run prints the request body untouched
                           (CI-safe). Runs against a DEPLOYED output only:
                           keyLocation must resolve for engines to accept.
  prestruct clean          Clear the prerender route cache.
  prestruct help           This text.

  Config lives in ssr.config.js -- copy ssr.config.example.js to start.
`

function findWorkdir(args) {
  // Explicit workdir wins; otherwise walk up from cwd until ssr.config.js is
  // found. Positional is position-independent (first non-flag), same contract
  // as cmdInit/cmdAudit -- `prestruct build --force dir` used to read only
  // args[0], see the flag, and silently build from cwd instead of dir.
  const positional = args.find(a => !a.startsWith('-'))
  if (positional) {
    return path.resolve(positional)
  }
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'ssr.config.js'))) return dir
    dir = path.dirname(dir)
  }
  return process.cwd()
}

async function loadConfig(workdir, { required = true } = {}) {
  const configPath = path.join(workdir, 'ssr.config.js')
  if (!fs.existsSync(configPath)) {
    if (required) {
      console.error(`[prestruct] ssr.config.js not found in ${workdir}`)
      console.error('[prestruct] Copy ssr.config.example.js to ssr.config.js and edit it.')
    }
    return null
  }
  try {
    return (await import(pathToFileURL(configPath))).default
  } catch (err) {
    console.error(`[prestruct] ssr.config.js failed to load: ${err.message}`)
    return null
  }
}

function report(config) {
  // Returns the ok BOOLEAN (not an object) -- callers must not destructure it.
  // Key warnings (#52) print alongside shape diagnostics but never fail: a
  // typo'd key that does nothing says so loudly, diagnostics stay gates-free.
  const { ok, errors } = validateConfig(config)
  if (!ok) formatDiagnostics(errors).forEach(line => console.error(line))
  formatConfigWarnings(configKeyWarnings(config)).forEach(line => console.warn(line))
  return ok
}

// -- quiet-mistake refusal (#54) --------------------------------------------
//
// A dash-shaped arg that is not a known flag was previously SILENTLY IGNORED
// (build/validate/clean walked past it; init skipped it). The user meant a
// flag and got, or lost, behavior they asked for with no signal -- the same
// class freestruct hardened (26.16). Refuse loudly, exit 1, name the flags.
// --help is a first-class flag on every command; print help and exit 0.

function checkFlags(command, args, knownFlags) {
  if (args.includes('--help')) {
    console.log(HELP)
    process.exit(0)
  }
  const unknown = args.filter(a => a.startsWith('-') && !knownFlags.includes(a))
  if (unknown.length) {
    console.error(`[prestruct] unknown flag(s): ${unknown.join(' ')} - the command takes no flags beyond: ${knownFlags.join(' ') || '(none)'}`)
    console.error('[prestruct] run prestruct help for the command list')
    process.exit(1)
  }
}

const INIT_FLAGS   = []
const BUILD_FLAGS  = ['--force', '-f', '--clean']
const AUDIT_FLAGS  = ['--json', '--external', '--internal']
const INDEXNOW_FLAGS = ['--dry-run']
const NO_FLAGS     = []

// -- init ----------------------------------------------------------------------

function cmdInit(args) {
  checkFlags('init', args, INIT_FLAGS)
  const target = path.resolve(args.find(a => !a.startsWith('-')) || '.')
  const templateRoot = path.join(packageRoot, 'init')
  if (!fs.existsSync(templateRoot)) {
    console.error('[prestruct] template missing from installed package')
    process.exit(1)
  }

  let created = 0, skipped = 0
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.prestruct') continue
      // .npmignore belongs to the PACKAGE tarball build (excludes init's local
      // node_modules/dist from npm pack), not to scaffolded apps. Shipping it
      // into a user project would silently prune THEIR files if they ever
      // npm-pack their own package.
      if (entry === '.npmignore') continue
      const src = path.join(dir, entry)
      const dest = path.join(target, path.relative(templateRoot, src))
      const st = fs.statSync(src)
      if (st.isDirectory()) {
        walk(src)
      } else if (fs.existsSync(dest)) {
        skipped++
        console.log(`  skip   ${path.relative(process.cwd(), dest)} (exists)`)
      } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.copyFileSync(src, dest)
        created++
        console.log(`  create ${path.relative(process.cwd(), dest)}`)
      }
    }
  }
  walk(templateRoot)

  console.log(`\n[prestruct] init done: ${created} created, ${skipped} skipped.`)
  console.log('[prestruct] Next: cp ssr.config.example.js ssr.config.js, edit routes/siteUrl,')
  console.log('[prestruct] add "prestruct build" (or npm run build) as your build step.')
}

// -- build ---------------------------------------------------------------------

async function cmdBuild(args) {
  checkFlags('build', args, BUILD_FLAGS)
  const workdir = findWorkdir(args)
  const config = await loadConfig(workdir)
  if (!config) process.exit(1)
  const configOk = report(config)
  if (!configOk && process.env.PRESTRUCT_STRICT === '1') {
    console.error('[prestruct] PRESTRUCT_STRICT=1 -- failing on config diagnostics')
    process.exit(1)
  }

  const run = (cmd) => {
    console.log(`[prestruct] $ ${cmd}`)
    execSync(cmd, { cwd: workdir, stdio: 'inherit' })
  }

  run('npx --no-install vite build')
  injectBrand(config, path.join(workdir, 'dist'))

  // Forward --force/--clean through to the engine's incremental prerender.
  // Found live by tarball e2e: without this pass-through, engine accepted the
  // force flag but CLI silently dropped it -- "cached / (route)" under --force,
  // which shipped stale static HTML and made users reach for rm -rf.
  const force = args.includes('--force') || args.includes('-f')
  if (args.includes('--clean')) {
    const p = enginePaths(path.resolve(workdir))
    cleanCache({ cacheFile: p.cacheFile })
    console.log('[prestruct] prerender cache cleared (--clean)')
  }
  const result = await prerender(config, { root: workdir, force })
  // Engine prerender() returns { total, succeeded, failed, failures }.
  // Live-fire (2026-10): a route that fails to render still exits 0 -- the
  // broken deploy rides through green. Match the engine's new contract:
  // failures are a failed build.
  if (result && result.failed > 0) {
    console.error(`[prestruct] prerender failed for ${result.failed}/${result.total} route(s) -- failing build`)
    process.exit(1)
  }

  // hooks.postBuild (#41): the pipeline owns these, so direct engine/CI
  // invocations can no longer silently skip them the way the old npm-script
  // chain could. Nothing executes without runHooks: true (surfaced loudly);
  // per-hook failures collect here and turn the build itself red.
  const hookFailures = runPostBuildHooks(config, {
    siteUrl: config.siteUrl || '',
    outputDir: path.join(workdir, 'dist'),
  })
  if (hookFailures.length > 0) {
    console.error(`[prestruct] ${hookFailures.length} postBuild hook(s) failed -- failing build`)
    process.exit(1)
  }
}

// -- indexnow ------------------------------------------------------------------
// Configless by design (mirrors audit): when a config is discoverable it
// supplies the key; without one, only --dry-run against a baked tree makes
// sense (the key comes from config; no config = nothing to submit).
async function cmdIndexNow(args) {
  checkFlags('indexnow', args, INDEXNOW_FLAGS)
  const dryRun = args.includes('--dry-run')
  const explicitDir = args.find(a => !a.startsWith('-'))

  let config = null
  let workdir = process.cwd()
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'ssr.config.js')
    if (fs.existsSync(candidate)) {
      workdir = dir
      config = await loadConfig(dir, { required: false })
      break
    }
    dir = path.dirname(dir)
  }
  const outputDir = explicitDir
    ? path.resolve(process.cwd(), explicitDir)
    : path.join(workdir, 'dist')

  // Key-file emission runs on the verb too (not only build): a host that
  // hand-curated dist/ still needs the keyLocation file to ship.
  const resolved = config ? resolveIndexNowKey(config, enginePaths(path.resolve(workdir)).cacheDir) : null
  if (resolved) emitIndexNowKeyFile(resolved.key, outputDir)

  const result = await submitIndexNow({ config: config || {}, configDir: enginePaths(path.resolve(workdir)).cacheDir, outputDir, dryRun })
  if (!result.ok) process.exit(1)
}

// -- audit ---------------------------------------------------------------------

// Configless by design: the audit verifies any baked tree. When ssr.config.js
// IS discoverable it feeds the site-local og:image/JSON-LD disk mapping and
// switches robots.txt grading on (the engine owns that file only under
// config.robots; the author's public/robots.txt is never engine-touched).
async function cmdAudit(args) {
  checkFlags('audit', args, AUDIT_FLAGS)
  const useJson = args.includes('--json')
  const explicitDir = args.find(a => !a.startsWith('-'))

  let config = null
  let workdir = process.cwd()
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'ssr.config.js')
    if (fs.existsSync(candidate)) {
      workdir = dir
      config = await loadConfig(dir, { required: false })
      break
    }
    dir = path.dirname(dir)
  }

  const outputDir = explicitDir
    ? path.resolve(process.cwd(), explicitDir)
    : path.join(workdir, 'dist')

  const result = auditOutput({ outputDir, config, json: useJson && !args.includes('--external'), capture: useJson && args.includes('--external') })

  const internal = args.includes('--internal') ? auditInternalLinks({ outputDir }) : []
  if (internal.length && !useJson) {
    console.log('[prestruct] internal link check: ' + internal.length + ' broken link(s)')
    for (const b of internal) console.log('  WARN ' + b.file + ' -> ' + b.link)
  }

  const external = args.includes('--external') ? await auditExternalLinks({ outputDir, json: useJson }) : { warns: [] }

  if (useJson) {
    console.log(JSON.stringify({
      ok: result.fails.length === 0,
      pages: result.pages,
      fails: result.fails,
      warns: [
        ...result.warns,
        ...internal.map(b => ({ page: b.file, msg: 'broken internal link: ' + b.link })),
        ...external.warns,
      ],
    }))
  } else if (internal.length || external.warns.length) {
    // Aux probes appended rows the base report never saw; pure-local audits
    // keep auditOutput's single verdict (one verdict, not two).
    const totalWarns = result.warns.length + internal.length + external.warns.length
    console.log(result.fails.length === 0
      ? '[prestruct] audit: 0 failures, ' + totalWarns + ' warning(s) - clean'
      : '[prestruct] audit: ' + result.fails.length + ' failure(s), ' + totalWarns + ' warning(s)')
  }
  process.exit(result.fails.length > 0 ? 1 : 0)
}

// -- validate / clean ----------------------------------------------------------

async function cmdValidate(args) {
  checkFlags('validate', args, NO_FLAGS)
  const workdir = findWorkdir(args)
  const config = await loadConfig(workdir)
  if (!config) process.exit(1)
  const ok = report(config)
  if (ok) console.log(`[prestruct] ssr.config.js is valid (${(config.routes || []).length} routes)`)
  else process.exit(1)
}

function cmdClean(args) {
  checkFlags('clean', args, NO_FLAGS)
  const workdir = findWorkdir(args)
  const p = enginePaths(path.resolve(workdir))
  cleanCache({ cacheFile: p.cacheFile })
}

// -- dispatch ------------------------------------------------------------------

const [command, ...args] = process.argv.slice(2)

try {
  switch (command || 'help') {
    case 'init':     cmdInit(args); break
    case 'build':    await cmdBuild(args); break
    case 'validate': await cmdValidate(args); break
    case 'audit':    await cmdAudit(args); break
    case 'indexnow': await cmdIndexNow(args); break
    case 'clean':    cmdClean(args); break
    case 'help':
    case '--help':
    case '-h':       console.log(HELP); break
    default:
      console.error(`[prestruct] unknown command: ${command}`)
      console.log(HELP)
      process.exit(1)
  }
} catch (err) {
  console.error(`[prestruct] ${err.message}`)
  process.exit(1)
}
