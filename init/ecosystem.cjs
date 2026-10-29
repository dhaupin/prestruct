#!/usr/bin/env node
/**
 * ecosystem.cjs - pm2 starter config for the Prestruct render proxy
 * =================================================================
 * Ships with `prestruct init` (scripts/ + this file + proxy.package.json
 * make up the VPS proxy deployment). pm2 keeps `scripts/proxy.js` alive,
 * restarts it on crash, and caps memory: Puppeteer holds the cost of a
 * warm Chromium (~100MB+), so a runaway instance should be killed and
 * restarted, not OOM the box.
 *
 * Usage (from the proxy's own package root -- see proxy.package.json):
 *
 *   npm install                    # express + puppeteer (downloads Chromium)
 *   export PRESTRUCT_SECRET=...    # env-var secret the proxy reads (never a config key)
 *   pm2 start ecosystem.cjs
 *   pm2 save && pm2 startup        # survive reboots
 *
 * Logs / status / stop:
 *
 *   pm2 logs prestruct-proxy
 *   pm2 status
 *   pm2 stop prestruct-proxy
 *
 * Prefer systemd? See scripts/prestruct-proxy.service for the unit file.
 */

module.exports = {
  apps: [
    {
      name: 'prestruct-proxy',
      script: 'scripts/proxy.js',
      cwd: __dirname,
      exec_mode: 'fork',          // single browser pool -- never clusterify
      instances: 1,
      max_memory_restart: '700M', // warm Chromium headroom; tune per box
      restart_delay: 3000,        // back off crashes instead of hot-looping
      kill_timeout: 3000,         // let the browser drain on restart
      env: {
        NODE_ENV: 'production',
        // Set PRESTRUCT_SECRET in your shell (or an EnvironmentFile with
        // systemd) rather than committing it here.
      },
    },
  ],
}
