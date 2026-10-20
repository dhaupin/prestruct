/**
 * vite.config.js (template)
 * =========================
 * Canonical engine source. Generated into init/ only -- example/ owns its own
 * vite.config.js (vendor chunking etc.), so this is NOT in the example contract.
 *
 * Why it matters: without @vitejs/plugin-react, JSX compiles through esbuild's
 * classic runtime, which expects an in-scope `React` binding in every JSX file.
 * Under ssrLoadModule that surfaces as "React is not defined" per route and
 * prerender silently degrades to the SPA fallback. The automatic runtime fixes
 * ssrLoadModule JSX compilation for the whole template.
 */

import react from '@vitejs/plugin-react'

export default {
  plugins: [react()],
}
