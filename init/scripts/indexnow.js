// engine/scripts/indexnow.js - IndexNow key-file emission + submission
// (prestruct#36 port of the freestruct tag reference; prestruct owns the
// sitemap in prerender.js, so the fit is the same: key file into dist/ =
// the keyLocation contract, a `prestruct indexnow` verb that reads the
// BAKED sitemap.xml (the source of truth for what is actually live, not
// config) and POSTs the URL list. Honesty contract: submission only makes
// sense AFTER the output is deployed live (keyLocation must resolve at
// host/key.txt) - docs say so; the verb surfaces HTTP status codes; the
// --dry-run flag prints the request body without touching the network.
// This module NEVER exits: exit codes belong to bin/cli.mjs, same as audit.

import fs from 'fs'
import crypto from 'crypto'
import path from 'path'

export const INDEXNOW_API = 'https://api.indexnow.org/indexnow'

/** 32 lowercase hex chars is the documented IndexNow key shape. */
export function isValidIndexNowKey(key) {
  return typeof key === 'string' && /^[a-f0-9]{32}$/.test(key)
}

/**
 * Resolve the IndexNow key for a run.
 *   indexNow.key (config, 32-hex)   wins
 *   indexNow: true                  reads configDir/indexnow-key.txt, or
 *                                   generates one and PERSISTS it
 *                                   (generate-once: the same key across
 *                                   runs keeps the keyLocation stable at
 *                                   the search engines)
 * Rotating? Change the config key or delete indexnow-key.txt - loudly
 * logged. Returns { key, source } or null when IndexNow is not configured.
 */
export function resolveIndexNowKey(config, configDir) {
  const cfg = config.indexNow
  if (cfg === undefined || cfg === null || cfg === false) return null
  if (typeof cfg === 'string' || typeof cfg === 'object') {
    const key = typeof cfg === 'string' ? cfg : cfg.key
    if (key !== undefined && key !== null) {
      if (!isValidIndexNowKey(key)) return null // config diagnostics already warned
      return { key, source: 'config' }
    }
  }
  const persistPath = path.join(configDir, 'indexnow-key.txt')
  if (fs.existsSync(persistPath)) {
    const key = fs.readFileSync(persistPath, 'utf8').trim()
    if (isValidIndexNowKey(key)) return { key, source: 'persisted (indexnow-key.txt)' }
  }
  const key = crypto.randomBytes(16).toString('hex')
  fs.mkdirSync(configDir, { recursive: true })
  fs.writeFileSync(persistPath, key + '\n', 'utf8')
  console.log('[prestruct] indexnow: generated a new key and persisted it to '
    + persistPath
    + ' (generate-once: commit this file so the keyLocation stays stable across runs)')
  return { key, source: 'generated' }
}

/** Emit <key>.txt into the output dir (the keyLocation file engines probe). */
export function emitIndexNowKeyFile(key, outputDir) {
  const keyFile = path.join(outputDir, key + '.txt')
  fs.writeFileSync(keyFile, key + '\n', 'utf8')
  console.log('[prestruct] indexnow: key file written: ' + key
    + '.txt (deploy it live - keyLocation must resolve)')
  return keyFile
}

/** Read the baked sitemap.xml and return its URL list (null when absent/empty). */
export function readSitemapUrls(outputDir) {
  const sitemapPath = path.join(outputDir, 'sitemap.xml')
  if (!fs.existsSync(sitemapPath)) return null
  const sitemap = fs.readFileSync(sitemapPath, 'utf8')
  const urls = (sitemap.match(/<loc>([\s\S]*?)<\/loc>/g) || [])
    .map(function (e) { return e.replace(/<\/?loc>/g, '').trim() })
    .filter(Boolean)
  return urls.length > 0 ? urls : null
}

/**
 * POST the sitemap URL list to api.indexnow.org. Returns the HTTP status so
 * the caller can surface it (202 = accepted). dryRun skips the network and
 * prints the request body instead - the CI-safe shape.
 */
export async function submitIndexNow({ config, configDir, outputDir, dryRun }) {
  const resolved = resolveIndexNowKey(config, configDir)
  if (!resolved) {
    console.log('[prestruct] indexnow: not configured (set indexNow in ssr.config.js)')
    return { ok: false, status: null, reason: 'not-configured' }
  }

  const urls = readSitemapUrls(outputDir)
  if (!urls) {
    console.log('[prestruct] indexnow: no sitemap.xml with <loc> entries in '
      + outputDir + ' - run prestruct build first (indexnow reads the baked sitemap)')
    return { ok: false, status: null, reason: 'no-sitemap' }
  }

  let host
  try { host = new URL(config.siteUrl).host } catch {
    console.log('[prestruct] indexnow: siteUrl is not parseable - cannot derive host')
    return { ok: false, status: null, reason: 'bad-site-url' }
  }

  const payload = {
    host,
    key: resolved.key,
    urlList: urls,
    keyLocation: config.siteUrl.replace(/\/$/, '') + '/' + resolved.key + '.txt',
  }

  console.log('[prestruct] indexnow: submitting ' + urls.length + ' URL(s) to '
    + INDEXNOW_API + ' (key source: ' + resolved.source + ')')
  if (dryRun) {
    console.log('[prestruct] indexnow: --dry-run, request body:')
    console.log(JSON.stringify(payload, null, 2))
    return { ok: true, status: 'dry-run', reason: 'dry-run' }
  }

  let res
  try {
    res = await fetch(INDEXNOW_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.log('[prestruct] indexnow: request failed: ' + e.message)
    return { ok: false, status: null, reason: 'network-error' }
  }

  console.log('[prestruct] indexnow: HTTP ' + res.status
    + (res.status === 200 || res.status === 202
      ? ' (accepted)'
      : ' (NOT accepted - the engines surface failures; check the key file is deployed live)'))
  if (res.status !== 200 && res.status !== 202) {
    const body = await res.text().catch(function () { return '' })
    if (body) console.log('[prestruct] indexnow: response: ' + body.slice(0, 300))
  }
  return { ok: res.status === 200 || res.status === 202, status: res.status, reason: 'http' }
}
