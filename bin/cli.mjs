#!/usr/bin/env node
/**
 * bin/cli.mjs - prestruct CLI
 * ============================
 * Commands (spec'd in labs/prd.md Phase 2):
 *
 *   prestruct init [dir]    Scaffold the template into dir (default: cwd).
 *                           Never clobbers existing files.
 *   prestruct build         Validate config, run vite build, inject meta,
 *                           prerender routes -- full pipeline from ssr.config.js.
 *   prestruct validate      Load + validate ssr.config.js; exit 1 on bad config.
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

const { validateConfig, formatDiagnostics } = await import(
  pathToFileURL(path.join(packageRoot, 'engine/scripts/validate-config.js'))
)
const { injectBrand } = await import(
  pathToFileURL(path.join(packageRoot, 'engine/scripts/inject-brand.js'))
)
const { prerender, cleanCache, enginePaths } = await import(
  pathToFileURL(path.join(packageRoot, 'engine/scripts/prerender.js'))
)

const HELP = `
prestruct -- build-time SEO prerender for Vite + React

  prestruct init [dir]     Scaffold the template into dir (default: cwd).
                           Existing files are never clobbered.
  prestruct build          Full pipeline: validate -> vite build -> inject
                           meta -> prerender routes.
  prestruct validate       Validate ssr.config.js (exit 1 on bad config).
  prestruct clean          Clear the prerender route cache.
  prestruct help           This text.

  Config lives in ssr.config.js -- copy ssr.config.example.js to start.
`

function findWorkdir(args) {
  // Explicit workdir wins; otherwise walk up from cwd until ssr.config.js is found
  const [first] = args
  if (first && !first.startsWith('-')) {
    return path.resolve(first)
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
  const { ok, errors } = validateConfig(config)
  if (!ok) formatDiagnostics(errors).forEach(line => console.error(line))
  return ok
}

// ── init ──────────────────────────────────────────────────────────────────────

function cmdInit(args) {
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

// ── build ─────────────────────────────────────────────────────────────────────

async function cmdBuild(args) {
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
  await prerender(config, { root: workdir })
}

// ── validate / clean ──────────────────────────────────────────────────────────

async function cmdValidate(args) {
  const workdir = findWorkdir(args)
  const config = await loadConfig(workdir)
  if (!config) process.exit(1)
  const ok = report(config)
  if (ok) console.log(`[prestruct] ssr.config.js is valid (${(config.routes || []).length} routes)`)
  else process.exit(1)
}

function cmdClean(args) {
  const workdir = findWorkdir(args)
  const p = enginePaths(path.resolve(workdir))
  cleanCache({ cacheFile: p.cacheFile })
}

// ── dispatch ──────────────────────────────────────────────────────────────────

const [command, ...args] = process.argv.slice(2)

try {
  switch (command || 'help') {
    case 'init':     cmdInit(args); break
    case 'build':    await cmdBuild(args); break
    case 'validate': await cmdValidate(args); break
    case 'clean':    cmdClean(args); break
    case 'help':     console.log(HELP); break
    default:
      console.error(`[prestruct] unknown command: ${command}`)
      console.log(HELP)
      process.exit(1)
  }
} catch (err) {
  console.error(`[prestruct] ${err.message}`)
  process.exit(1)
}
