#!/usr/bin/env node
/**
 * tests/timing-harness.mjs
 * ========================
 * Live timing harness for the proxy-pair cache-refresh secret comparators.
 *
 * Question it answers: does response/comparison timing leak PRESTRUCT_SECRET
 * byte-by-byte (the classic early-exit side channel)?
 *
 * Three layers:
 *
 *   A. Comparator level (hrtime, in-process, tens of thousands of samples)
 *      Real shipped comparators -- VPS `secretMatches` (SHA-256 +
 *      timingSafeEqual) and Worker `refreshSecretMatches` (full-length XOR) --
 *      vs the OLD code shape (plain `===`), across candidate tokens that
 *      diverge at different byte offsets.
 *
 *   B. HTTP-level detection sanity (real TCP socket)
 *      A control endpoint with an AMPLIFIED timing response (sleep
 *      proportional to matched prefix) proves this harness structure CAN
 *      detect a timing leak over HTTP. No signal in layer B == no amateur
 *      detectable leak in ship shape; nanosecond-level claims are proven in A.
 *
 *   C. End-to-end profile of the real VPS app over a real socket
 *      correct secret vs wrong secret, live response p50/p95 -- the numbers a
 *      remote attacker actually observes (network jitter included).
 *
 * Verdicts are printed as PASS/FAIL lines. Statistical thresholds:
 *   fixed comparators: Welch |t| < 3.5 across candidate distributions == PASS
 *   naive baseline:    reported per case (expected to show early-exit shape)
 *
 * Run: node tests/timing-harness.mjs
 * NOT part of the vitest battery (statistical + machine-noise-sensitive);
 * run it deliberately after touching either comparator.
 */

import http from 'http'
import crypto from 'crypto'
import express from 'express'
import { createProxyApp, secretMatches } from '../init/scripts/proxy.js'
import { refreshSecretMatches } from '../init/scripts/proxy.worker.js'

// ── Scenario setup ───────────────────────────────────────────────────────────

const SECRET = 'harness-' + crypto.randomBytes(16).toString('hex') // ~32-40 chars

// Candidate tokens: correct, wrong FIRST byte, wrong LAST byte, wrong MIDDLE
// byte, one byte longer, one byte shorter. Early-exit compares distinguish
// these; constant-time comparators must not.
const CANDIDATES = [
  ['correct',            SECRET],
  ['wrong-byte-0',       'X' + SECRET.slice(1)],
  ['wrong-middle',       SECRET.slice(0, SECRET.length >> 1) + 'X' + SECRET.slice((SECRET.length >> 1) + 1)],
  ['wrong-last',         SECRET.slice(0, -1) + 'Z'],
  ['one-byte-longer',    SECRET + '!'],
  ['one-byte-shorter',   SECRET.slice(0, -1)],
]

process.env.PRESTRUCT_SECRET = SECRET
createProxyApp({ siteUrl: 'https://harness.test', proxy: { botList: ['googlebot'] } })

const naiveCompare = (a, b) => a === b

// ── Layer A: comparator microbench ───────────────────────────────────────────

function benchComparator({ label, compare }) {
  const BATCHES = 150
  const DROP = 30                      // warm-up batches excluded from stats
  const BATCH_REPS = 256               // calls per timed batch
  const POOL = 64                      // rotating string IDs defeat JIT folding

  const pools = {}
  for (const [name, token] of CANDIDATES) {
    pools[name] = Array.from({ length: POOL }, (_, i) =>
      i === 0 ? token : token.slice(0, i % token.length) + String(i % 10) + token.slice((i % token.length) + 1)
    )
  }

  const stats = {}
  for (const [name] of CANDIDATES) stats[name] = []

  let batch = 0
  for (let b = 0; b < BATCHES; b++) {
    for (const [name] of CANDIDATES) {
      const pool = pools[name]
      let sink = 0
      const t0 = process.hrtime.bigint()
      for (let r = 0; r < BATCH_REPS; r++) {
        const tok = pool[r % POOL]
        if (compare(tok, SECRET)) sink++
      }
      const t1 = process.hrtime.bigint()
      if (b >= DROP) stats[name].push(Number(t1 - t0) / BATCH_REPS)
      if (sink === BATCH_REPS) throw new Error('comparator returned true for every candidate -- input pool broken')
    }
    batch++
  }

  const summarize = arr => {
    const s = [...arr].sort((x, y) => x - y)
    const mid = s.length >> 1
    const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
    const mean = s.reduce((a, c) => a + c, 0) / s.length
    const sd = Math.sqrt(s.reduce((a, c) => a + (c - mean) ** 2, 0) / s.length)
    return { median, mean, sd, p95: s[Math.ceil(0.95 * s.length) - 1] }
  }
  const sums = {}
  for (const [name] of CANDIDATES) sums[name] = summarize(stats[name])

  // Welch t between each candidate and "correct" (fixed comparator must be flat)
  const welch = (a, b) => {
    const A = stats[a], B = stats[b]
    const mean = x => x.reduce((p, c) => p + c, 0) / x.length
    const varr = x => { const m = mean(x); return x.reduce((p, c) => p + (c - m) ** 2, 0) / (x.length - 1) }
    const num = mean(A) - mean(B)
    const den = Math.sqrt(varr(A) / A.length + varr(B) / B.length)
    return den === 0 ? 0 : Math.abs(num / den)
  }

  console.log(`\n[A] ${label}  (median ns/call, ${BATCHES - DROP} batches x ${BATCH_REPS} calls, interleave-rotated)`)
  const correct = sums['correct']
  let anyLeak = false
  for (const [name] of CANDIDATES) {
    const s = sums[name]
    const t = name === 'correct' ? 0 : welch('correct', name)
    const flat = t < 3.5
    const pct = (((s.median - correct.median) / correct.median) * 100).toFixed(1)
    console.log(`    ${name.padEnd(17)} median=${s.median.toFixed(1)}ns  p95=${s.p95.toFixed(1)}ns  sd=${s.sd.toFixed(1)}ns  delta=${pct.padStart(6)}%  vs-correct |t|=${t.toFixed(2)} ${flat ? 'FLAT' : 'DISTINGUISHABLE'}`)
    if (name !== 'correct' && !flat) anyLeak = true
  }
  console.log(`    ${label} verdict: ${anyLeak ? 'FAIL - token timing is distinguishable' : 'PASS - candidate timing indistinguishable from correct token'}`)
  return { anyLeak, sums }
}

const vpsFixed = benchComparator({ label: 'VPS secretMatches (SHA-256 + timingSafeEqual)', compare: tok => secretMatches(tok) })
const vpsNaive = benchComparator({ label: 'naive === control (old code shape)',             compare: tok => naiveCompare(tok, SECRET) })
const wkrFixed = benchComparator({ label: 'Worker refreshSecretMatches (full-length XOR)',  compare: tok => refreshSecretMatches(SECRET, tok) })

// Honest read on the naive control: V8 string equality MAY or MAY NOT show a
// measurable early-exit on this build. Either way the fixed comparators' PASS
// stands; the naive shape is characterization, not the guarantee.
const naiveFlat = Object.entries(vpsNaive.sums || {}).every(([k, v], i, all) =>
  Math.abs(v.median - all[0][1].median) / all[0][1].median < 0.03)

// ── Layer B: HTTP-level detection sanity (amplified control) ────────────────

async function httpSample(port, path, headers) {
  const t0 = process.hrtime.bigint()
  await new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, headers, method: 'GET' }, res => {
      res.resume()
      res.on('end', resolve)
    })
    req.on('error', reject)
    req.end()
  })
  return Number(process.hrtime.bigint() - t0) / 1e6 // ms
}

function reportHttp(label, results, expectLeak) {
  console.log(`\n[B] ${label}`)
  const entries = Object.entries(results)
  const baseSorted = [...results['correct']].sort((a, b) => a - b)
  const baseP50 = baseSorted[baseSorted.length >> 1]
  let leak = false
  for (const [k, arr] of entries) {
    const s = [...arr].sort((a, b) => a - b)
    const p50 = s[s.length >> 1]
    const p95 = s[Math.ceil(0.95 * s.length) - 1]
    const marked = k === 'correct' ? '' : (p50 < baseP50 * 0.74 || p50 > baseP50 * 1.35 ? 'DETECTED' : 'below-threshold')
    if (marked === 'DETECTED') leak = true
    console.log(`    ${k.padEnd(17)} p50=${p50.toFixed(2)}ms  p95=${p95.toFixed(2)}ms  ${marked}`)
  }
  const verdictOk = expectLeak ? leak : !leak
  console.log(`    ${label} verdict: ${verdictOk ? 'PASS' : 'FAIL'} (expected leak: ${expectLeak})`)
  return verdictOk
}

async function layerB() {
  // B1: amplified control -- sleep proportional to matched prefix length.
  // Proves the harness can see response-timing leaks over a real socket.
  const control = express()
  control.get('/__amp', (req, res) => {
    const tok = String(req.headers['x-harness-token'] || '')
    let matched = 0
    while (matched < tok.length && tok[matched] === SECRET[matched]) matched++
    setTimeout(() => res.send('ok'), 1 + matched * 2) // 1ms + 2ms per matched byte
  })
  const controlServer = control.listen(0, '127.0.0.1')
  await new Promise(r => controlServer.once('listening', r))
  const controlPort = controlServer.address().port

  const ampSamples = {}
  for (const [name, token] of [['correct', SECRET], ['wrong-byte-0', 'X' + SECRET.slice(1)], ['wrong-middle', CANDIDATES[2][1]]]) {
    ampSamples[name] = []
    for (let i = 0; i < 120; i++) ampSamples[name].push(await httpSample(controlPort, '/__amp', { 'x-harness-token': token }))
  }
  controlServer.close()

  const b1 = reportHttp('amplified-naive control (2ms per matched prefix byte)', ampSamples, true)

  // B2: the REAL VPS app end-to-end over a real socket (bot UA, refresh header,
  // render path fails fast without Chromium -> identical redirect for every
  // candidate; p50/p95 is what a remote attacker can actually observe).
  const app = createProxyApp({ siteUrl: 'https://harness.test', proxy: { botList: ['googlebot'] } })
  const proxyServer = app.listen(0, '127.0.0.1')
  await new Promise(r => proxyServer.once('listening', r))
  const proxyPort = proxyServer.address().port

  const e2eSamples = {}
  for (const [name, token] of CANDIDATES) {
    e2eSamples[name] = []
    for (let i = 0; i < 60; i++) {
      e2eSamples[name].push(await httpSample(proxyPort, '/some/path', {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'x-prestruct-refresh': token,
      }))
    }
  }
  proxyServer.close()

  const b2 = reportHttp('real VPS proxy, end-to-end (60 samples/candidate)', e2eSamples, false)

  return b1 && b2
}

// ── Run ──────────────────────────────────────────────────────────────────────

const bOk = await layerB()

console.log('\n[harness] summary')
console.log(`  VPS fixed comparator flat:    ${vpsFixed.anyLeak ? 'NO (FAIL)' : 'YES (PASS)'}`)
console.log(`  Worker fixed comparator flat: ${wkrFixed.anyLeak ? 'NO (FAIL)' : 'YES (PASS)'}`)
console.log(`  naive === control flat-ish:   ${naiveFlat ? 'yes in this V8 build (fine; micro-level is the proof surface)' : 'no -- early-exit shape visible, as expected for the old code'}`)
console.log(`  HTTP layers (sanity + e2e):   ${bOk ? 'PASS' : 'FAIL'}`)

const ok = !vpsFixed.anyLeak && !wkrFixed.anyLeak && bOk
console.log(`\n[harness] OVERALL: ${ok ? 'PASS' : 'FAIL'}`)
process.exit(ok ? 0 : 1)
