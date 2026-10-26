#!/usr/bin/env node
// audit-if-configured.cjs - init-owned build wiring (NOT engine-synced).
//
// The template's build script chains the audit so a scaffolded, CONFIGURED
// project fails its own build on head regressions (docs/guides/cli.md).
// But the tracked init/ tree itself carries no ssr.config.js (it is
// gitignored on purpose): inject-brand skips, the shell ships placeholder
// meta, and the audit CORRECTLY grades that red (6 fails / 9 warns on the
// bare shell). CI and the template's own self-build must not ride that
// red. Guard: run the audit only when ssr.config.js exists; otherwise
// refuse silently-in-the-good-sense - named reason, exit 0.
//
// Configured hosts never see this message differ: audit exits carry
// straight through (stdio inherited, nonzero exit fails the build).
'use strict'
const fs = require('fs')
const { execFileSync } = require('child_process')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
if (fs.existsSync(path.join(ROOT, 'ssr.config.js'))) {
  execFileSync('node', [path.join(__dirname, 'audit.js')], { stdio: 'inherit' })
} else {
  console.log('[audit] skipped: ssr.config.js absent (unconfigured scaffold) --')
  console.log('[audit] after prestruct init / your first config, the build audit gates itself.')
}
