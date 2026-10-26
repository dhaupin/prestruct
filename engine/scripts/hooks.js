// engine/scripts/hooks.js - general postBuild hook contract (prestruct#41,
// port of the freestruct tag reference; prestruct#21's shape). Replaces the
// npm-script chain ("prestruct build && node scripts/whatever.mjs") with a
// first-class seam:
//
//   // ssr.config.js
//   hooks: { postBuild: ['node scripts/inject-faq-schema.mjs'] }
//   runHooks: true,   // opt-in: nothing executes without it
//
// Security posture (why the gate): postBuild entries are shell commands
// sourced from the config file. A malicious or typo'd config must not gain
// a silent execution path, so nothing runs unless runHooks is explicitly
// true - logged loudly either way. The build pipeline runs the hooks
// itself, so `prestruct build` can no longer skip them the way it skipped
// the npm-script chain.
//
// Values ride FUNCTION replacers, never string-form replace strings: an
// output path carrying $& or $1..9 is replacement SYNTAX in string form
// and would corrupt the command about to run (the same never-corrupt rule
// the injection pipeline enforces on head values).
//
// This module NEVER exits: it returns the failure list; bin/cli.mjs turns
// the collection into the build exit.

import { execSync } from 'child_process'

/** Build a fresh env for hook children: same facts as the placeholders, so
 * a hook script does not do string surgery to learn where the build landed. */
function hookEnv({ siteUrl, outputDir }) {
  return {
    ...process.env,
    PRESTRUCT_SITE_URL: siteUrl,
    PRESTRUCT_OUTPUT_DIR: outputDir,
  }
}

function substitutePlaceholders(command, { siteUrl, outputDir }) {
  return command
    .replace(/\$\{?SITE_URL\}?/g, function () { return siteUrl })
    .replace(/\$\{?OUTPUT_DIR\}?/g, function () { return outputDir })
}

/**
 * Run config.hooks.postBuild (string | string[]): each entry spawned with
 * stdio inherited and a 30-minute timeout, PRESTRUCT_SITE_URL and
 * PRESTRUCT_OUTPUT_DIR in the env, SIMPLE placeholders substituted.
 * Returns the list of failed entries (empty = clean).
 */
export function runPostBuildHooks(config, { siteUrl, outputDir } = {}) {
  const raw = config?.hooks?.postBuild
  if (raw === undefined || raw === null) return []
  const commands = Array.isArray(raw) ? raw : [raw]
  if (commands.length === 0) return []

  const url = siteUrl ?? config.siteUrl ?? ''
  const out = outputDir ?? 'dist'
  const failures = []
  let gated = false

  for (const entry of commands) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      console.log('[prestruct] hooks.postBuild entry is not a non-empty string command - skipped')
      continue
    }
    const command = substitutePlaceholders(entry, { siteUrl: url, outputDir: out })

    if (config.runHooks !== true) {
      console.log('[prestruct] PostBuild hook (not run - set runHooks: true to enable): '
        + command.slice(0, 100))
      gated = true
      continue
    }

    console.log('[prestruct] PostBuild hook: running ' + command.slice(0, 76) + '...')
    try {
      execSync(command, { stdio: 'inherit', timeout: 30 * 60 * 1000, env: hookEnv({ siteUrl: url, outputDir: out }) })
      console.log('[prestruct] PostBuild hook: done')
    } catch (e) {
      console.log('[prestruct] PostBuild hook: FAILED (exit ' + (e.status ?? e.message) + ')')
      failures.push({ command: entry, status: e.status })
    }
  }

  if (gated && failures.length === 0) {
    console.log('[prestruct] hooks.postBuild is configured but no hook ran '
      + '(opt-in gate: set runHooks: true in ssr.config.js)')
  }
  return failures
}
