# Hardening report

> crashtest v0.1.1 · 2026-10-20T22:01:46.564Z · seed 12648430
> CI rule: fail on a NEW EXPLOITED finding, or a REGRESSION of anything previously REFUSED.

## Findings

### 🛡 REFUSED (17)
- auth/identity-spoof-headers: route "admin" not declared on this target — spoof matrix skipped (declare it for coverage)
- auth/secret-watermark: no fake secrets planted in env — declare CRASHTEST_SECRET to arm this probe
- auth/privilege-escalation: route "device" not declared on this target — escalation skipped (declare it for coverage)
- guards/hygiene-no-store: route "enroll" not declared on this target — attack skipped (declare it for coverage)
- guards/burst-wall: route "burst" not declared on this target — attack skipped (declare it for coverage)
- input/proto-pollution-body: route "enroll" not declared on this target — attack skipped (declare it for coverage)
- input/never-fail-mutations: route "enroll" not declared on this target — attack skipped (declare it for coverage)
- input/oversized-field: route "enroll" not declared on this target — attack skipped (declare it for coverage)
- prestruct-proxy/method-contract-walk: 2 surface(s) × 5 methods: every non-GET was a clean 405
- prestruct-proxy/malformed-target-fuzz: 8 hostile shapes × 2 surface arms: all clean (4xx/3xx)
- prestruct-proxy/bot-render-fallback: bot render failure fell through to the live-site 302 on every surface (render never reached Chromium)
- prestruct-proxy/refresh-strict-parity: refresh probes (no-header control + 5 hostile tokens) never crashed or reshaped the response
- state/enumeration-oracle: route "device" not declared on this target — enumeration skipped (declare it for coverage)
- state/id-collision-alias: route "enroll" not declared on this target — alias check skipped
- volume/credential-stuffing: route "enroll" not declared on this target — stuffing skipped (declare it for coverage)
- volume/storage-fill: route "kvwrite" not declared on this target — fill check skipped (declare a KV-writing route)
- volume/cost-amplification: route "enroll" not declared on this target — amplification skipped (declare it for coverage)

### ⚡ EXPLOITED (0)

### 🔒 BOUNDED (0)

## Cost economics
- total: 47 backend ops across 112 in-process requests from 17 attacks
  - auth/identity-spoof-headers: 0 ops · 0 requests
  - auth/secret-watermark: 0 ops · 0 requests
  - auth/privilege-escalation: 0 ops · 0 requests
  - guards/hygiene-no-store: 0 ops · 0 requests
  - guards/burst-wall: 0 ops · 0 requests
  - input/proto-pollution-body: 0 ops · 0 requests
  - input/never-fail-mutations: 0 ops · 0 requests
  - input/oversized-field: 0 ops · 0 requests
  - prestruct-proxy/method-contract-walk: 10 ops · 10 requests
  - prestruct-proxy/malformed-target-fuzz: 16 ops · 26 requests
  - prestruct-proxy/bot-render-fallback: 9 ops · 32 requests
  - prestruct-proxy/refresh-strict-parity: 12 ops · 44 requests
  - state/enumeration-oracle: 0 ops · 0 requests
  - state/id-collision-alias: 0 ops · 0 requests
  - volume/credential-stuffing: 0 ops · 0 requests
  - volume/storage-fill: 0 ops · 0 requests
  - volume/cost-amplification: 0 ops · 0 requests

## Baseline diff
- NEW: none · REGRESSED: none
