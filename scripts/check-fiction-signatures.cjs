#!/usr/bin/env node
/**
 * Fiction-signature gate for prestruct (pattern from dhaupin/vant's
 * scripts/check-fiction-signatures.cjs).
 *
 * The wrong-claims this project's audit passes actually caught, now gates
 * instead of memories:
 *
 *   1. `0.2.6`          - stale version. Current is 1.0.0 (root package.json
 *                         == init/package.json == init/VERSION, CI-pinned);
 *                         historical 0.2.6 values masquerading as current
 *                         state are fiction. History files are exempt.
 *   2. `npx degit ...`  - the pre-package install story. The shipped path is
 *                         `npm i -D prestruct` + `npx prestruct init`.
 *   3. `'react-router-dom/server'` bare subpath - dropped `.js` breaks Node's
 *                         ESM resolver on CF Pages (AGENTS.md hard rule);
 *                         only `react-router-dom/server.js` (v6) or the
 *                         package root fallback are legit.
 *   4. `/* /index.html 200` - the SPA fallback _redirects rule. Post-prerender
 *                         it is not just unnecessary, it loops with CF Pretty
 *                         URLs (AGENTS.md hard rule).
 *   5. `vite build --ssr` - the banned compiled-SSR-bundle approach (renders
 *                         the homepage on every route, silently). Engine uses
 *                         vite.ssrLoadModule. Lessons/quotes are exempt via
 *                         negation lines.
 *   6. `jekyll-theme-minimal` - the old docs frame. The site is a custom
 *                         _layouts/default.html now (vant-shape); references
 *                         to the theme gem as current state are fiction.
 *
 * SCOPE: markdown and YAML files, tree-wide, minus the allow-list. Code files
 * are out of scope: engine/init/example comments QUOTE banned patterns as
 * lessons (that's the docs, not fiction).
 *
 * Allow-list (files that legitimately contain these strings):
 *   - scripts/check-fiction-signatures.js (this file: the signatures)
 *   - AGENTS.md, labs/**                  (history quotes the fiction it fixed)
 *   - docs/guides/changelog.md            (historical release records)
 *   - CHANGELOG.md, package-lock.json, node_modules, .git (not prose / lodash 0.2.6)
 *
 * A line that DEBUNKS a signature ("there is no", "old approach", "do not
 * use...", "was removed") is doing the gate's job - not a regression. A line
 * containing `FICTION-OK:` waives itself for a deliberate, documented reason.
 *
 * Add a signature here the moment a fiction is caught twice. Exit 1 on hits
 * outside the allow-list.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// signature: [regex, human explanation]
const SIGNATURES = [
    [/\b0\.2\.6\b/,
     'stale version - current is 1.0.0; historical values only in changelogs/labs/AGENTS'],
    [/npx\s+degit\s+dhaupin\/prestruct\/example/i,
     'pre-package install story - shipped path is `npm i -D prestruct` + `npx prestruct init`'],
    [/['"](react-router-dom\/server)['"]/,
     "bare react-router-dom/server subpath breaks Node ESM on CF Pages - use .js (v6) or the package root (v7)"],
    [/\/index\.html\s+200\b/,
     'SPA-fallback _redirects rule - post-prerender it loops with CF Pretty URLs; remove it'],
    [/vite\s+build\s+--ssr/,
     'compiled-SSR-bundle approach is banned - engine uses vite.ssrLoadModule (AGENTS.md rule)'],
    [/jekyll-theme-minimal/,
     'old docs frame - the site uses _layouts/default.html custom layout now (vant-shape)'],
];

// path relative to ROOT; return true to skip the file
function allowListed(rel) {
    if (rel === 'scripts/check-fiction-signatures.cjs') return true;
    if (/^scripts\/check-.*\.(js|mjs|cjs)$/.test(rel)) return true; // gates may quote signatures
    if (rel === 'AGENTS.md') return true;
    if (rel.startsWith('labs/')) return true;
    if (rel === 'docs/guides/changelog.md') return true;
    if (rel === 'CHANGELOG.md') return true;
    if (rel === 'package-lock.json') return true;
    if (rel.startsWith('node_modules/') || rel.startsWith('.git/')) return true;
    return false;
}

// A line (or its predecessor) that debunks the pattern is the gate WORKING
// in prose - lesson-telling, not fiction-telling.
const NEGATION =
    /there is no\b|does not exist|never existed|removed|deleted|was replaced|replaced by|do not use|don't use|never use|must not|avoid|legacy|pre-package|old (approach|practice|form|version)|previous(ly)?|instead of|broke|broken|migrat|historic|history|rule|lesson|gotcha|bad|wrong|stale|currently|today|now|since|because of|lore|folklore|errata|don't include|not include|including|causes|cause|remove|removing|cannot find|can't resolve|module not found|error:\s*can't|fail(?:s)? with|symptom|fix:/i;

// Flags a purposeful, documented exception. Applies to the line itself AND
// the line after it (agents write the waiver, then the flagged content).
function fictionOk(lines, i) {
    if (/FICTION-OK/.test(lines[i] || '')) return true;
    if (i > 0 && /FICTION-OK/.test(lines[i - 1] || '')) return true;
    return false;
}

const TEXT_EXT = new Set(['.md', '.yml', '.yaml']);

const hits = [];
let scanned = 0;
(function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = dir + '/' + f.name;
        const rel = path.relative(ROOT, p);
        if (f.isDirectory()) { walk(p); continue; }
        if (allowListed(rel)) continue;
        if (!TEXT_EXT.has(path.extname(f.name))) continue;
        let text;
        try { text = fs.readFileSync(p, 'utf8'); } catch (e) { continue; }
        scanned++;
        const lines = text.split('\n');
        for (const [re, why] of SIGNATURES) {
            for (let i = 0; i < lines.length; i++) {
                if (!re.test(lines[i])) continue;
                const context = (lines[i - 1] || '') + '\n' + lines[i] + '\n' + (lines[i + 1] || '');
                if (NEGATION.test(context)) continue;
                if (fictionOk(lines, i)) continue;
                hits.push(`${rel}:${i + 1}: "${lines[i].trim().slice(0, 110)}" - ${why}`);
            }
        }
    }
})(ROOT);

if (hits.length) {
    console.error(`FICTION SIGNATURES: FAIL (${hits.length} hit${hits.length === 1 ? '' : 's'} in ${scanned} files)`);
    for (const h of hits) console.error('  ' + h);
    console.error('  (fix the text, or document why with a FICTION-OK: <reason> line,');
    console.error('   or if the signature itself is stale, update the signature AND the ledger)');
    process.exit(1);
}
console.log(`FICTION SIGNATURES: PASS (${scanned} files scanned, ${SIGNATURES.length} signatures)`);
