#!/usr/bin/env node
/**
 * Docs truthfulness gate (ported from dhaupin/vant scripts/check-docs-truthfulness.js).
 * Verify what the prose PROMISES exists against the actual tree, mechanically.
 *
 * Check classes (conservative: unknown shapes are skipped, only PROVEN-absent
 * findings fail):
 *
 * 1. MODULE REFERENCES - every `require('./engine/x')`, `require('./bin/x')`
 *    or `require('./src/x')` inside docs markdown must resolve to a real file
 *    (resolves on disk by walking up from the root).
 *
 * 2. CLI VERBS - every `prestruct <verb> [sub...]`, `npx prestruct <verb>` or
 *    `node bin/cli.mjs <verb>` fenced/inline in docs must route to something
 *    real: bin/cli.mjs dispatch cases + bin/*.mjs basenames + a small allow
 *    list (npm/npx/gem/curl/node/bun/etc. appearing in install blocks). Only
 *    flags verbs whose FIRST token is entirely unknown (proven-absent class).
 *
 * Fenced code blocks and inline code spans are the scan targets (same data
 * domain as check-docs-style.js). Prose without code is not parsed.
 *
 * Escape hatch: `<!-- TRUTHFULNESS-OK: reason -->` line exempts the single
 * line after it.
 *
 * Run: node scripts/check-docs-truthfulness.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const README = path.join(ROOT, 'README.md');

// ---------------------------------------------------------------------------
// CLI-verb truth source
// ---------------------------------------------------------------------------

function cliVerbs() {
    const src = fs.readFileSync(path.join(ROOT, 'bin', 'cli.mjs'), 'utf8');
    const names = new Set();
    // Dispatch cases: `case 'init':` -> init, build, validate, clean, help
    const caseRe = /case\s+'([a-z][a-z0-9-]*)'\s*:/g;
    let m;
    while ((m = caseRe.exec(src)) !== null) names.add(m[1]);
    return names;
}

function routedBinVerbs() {
    const dir = path.join(ROOT, 'bin');
    const set = new Set();
    for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.js') || f.endsWith('.mjs')) {
            set.add(f.replace(/\.(js|mjs)$/, ''));
        }
    }
    return set;
}

const BIN_ALLOW = new Set(['prestruct', 'help', '-h', '--help',
    // non-prestruct tools legitimately appearing with a prestruct-shaped
    // command line in fenced install/build blocks
    'npm', 'npx', 'gem', 'curl', 'node', 'git', 'yarn', 'pnpm', 'bun',
    'rm', 'cp', 'cd', 'echo', 'grep', 'tar', 'sh'
]);

// Module-reference truth: paths the docs may require(), resolved on disk
function refResolves(relPath) {
    // relPath e.g. './engine/scripts/prerender.js' or './bin/cli.mjs'
    const cleaned = relPath.replace(/^\.\//, '');
    const candidates = [
        path.join(ROOT, cleaned),                       // exact
        path.join(ROOT, cleaned + '.js'),
        path.join(ROOT, cleaned + '.mjs'),
        path.join(ROOT, cleaned, 'index.js'),
        path.join(ROOT, cleaned, 'index.mjs'),
    ];
    for (const base of candidates) {
        if (fs.existsSync(base) && fs.statSync(base).isFile()) {
            // Proven-present ONLY if the basename matches too (suffix checks
            // would let './engine/foo' match './engine/foo.html')
            const reqName = path.basename(cleaned).replace(/\.(js|mjs)$/, '');
            const gotName = path.basename(base).replace(/\.(js|mjs)$/, '');
            if (reqName.includes('.')) {
                // explicit extension in the require - basename must match exactly
                if (path.basename(cleaned) === path.basename(base)) return true;
            } else if (reqName === gotName) {
                return true;
            }
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// Scan one markdown file
// ---------------------------------------------------------------------------

function stripExemptLines(text) {
    const lines = text.split('\n');
    return lines.map((line, i) => {
        if (/TRUTHFULNESS-OK/.test(line) && lines[i + 1] !== undefined) {
            lines[i + 1] = '';
        }
        return line;
    }).join('\n');
}

function codeSpans(text) {
    const spans = [];
    const fenceRe = /```[\s\S]*?```/g;
    let m;
    while ((m = fenceRe.exec(text)) !== null) spans.push(m[0]);
    const inlineRe = /`[^`\n]+`/g;
    while ((m = inlineRe.exec(text)) !== null) spans.push(m[0]);
    return spans;
}

function checkFile(file, ctx) {
    const findings = [];
    const raw = fs.readFileSync(file, 'utf8');
    const text = stripExemptLines(raw);
    const rel = path.relative(ROOT, file);

    for (const span of codeSpans(text)) {
        // 1) module references
        const reqRe = /require\('\.\/((?:engine|bin|src|init|example|scripts)\/[a-zA-Z0-9/._-]+)'\)/g;
        let m;
        while ((m = reqRe.exec(span)) !== null) {
            const relPath = m[1];
            if (!refResolves('./' + relPath)) {
                const line = raw.indexOf('./' + relPath) === -1 ? 0
                    : raw.slice(0, raw.indexOf('./' + relPath)).split('\n').length;
                findings.push(`${rel}:${line} module reference does not exist: ./${relPath}`);
            }
        }

        // 2) CLI verbs: `prestruct <verb>` / `npx prestruct <verb>` /
        //    `node bin/cli.mjs <verb>`. Guard against arbitrary suffixes
        //    ("pre-structx") via the separator set.
        const verbRe = /(?:^|\n|&&|;|\$ |#|\/)\s*(?:npx\s+)?(?:prestruct|node\s+bin\/cli\.mjs)\s+([a-z][a-z0-9-]*)(\s+[a-z-][a-z0-9-]*)?/g;
        const scannable = ' ' + span.replace(/^\s*```[a-z]*\s*\n?/, '').replace(/```\s*$/, '');
        while ((m = verbRe.exec(scannable)) !== null) {
            const verb = m[1];
            const sub = m[2] ? m[2].trim() : null;
            if (BIN_ALLOW.has(verb)) continue;
            if (ctx.commands.has(verb) || ctx.bins.has(verb)) continue;
            const verbIdx = scannable.indexOf(m[0]);
            const line = verbIdx === -1 ? 0
                : raw.slice(0, raw.indexOf(span.slice(0, verbIdx))).split('\n').length;
            findings.push(`${rel}:${line} unknown prestruct verb in docs: ${verb}${sub ? ' ' + sub : ''}`);
        }
    }

    return findings;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function walk(dir, out) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p, out);
        else if (f.endsWith('.md')) out.push(p);
    }
}

function main() {
    const files = [];
    walk(DOCS_DIR, files);
    try { fs.statSync(README); files.push(README); } catch (e) { /* optional */ }

    const ctx = { commands: cliVerbs(), bins: routedBinVerbs() };

    const findings = [];
    for (const f of files) {
        try { findings.push(...checkFile(f, ctx)); }
        catch (e) { findings.push(`${path.relative(ROOT, f)}: unreadable (${e.message})`); }
    }

    if (findings.length === 0) {
        console.log(`DOCS TRUTHFULNESS: PASS (${files.length} markdown files, ${ctx.commands.size} routed verbs cross-checked)`);
        process.exit(0);
    }
    console.log(`DOCS TRUTHFULNESS: FAIL (${findings.length} proven-absent promises)\n`);
    for (const f of findings) console.log('  ' + f);
    console.log('\nFix the promise in the doc OR add the missing thing to the tree.');
    console.log('Deliberate fiction/preview: exempt with <!-- TRUTHFULNESS-OK: reason --> on the line.');
    process.exit(1);
}

main();
