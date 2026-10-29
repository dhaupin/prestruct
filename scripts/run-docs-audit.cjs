#!/usr/bin/env node
// scripts/run-docs-audit.cjs - prestruct's gate set over the shared docs-audit
// runner (prestruct#75). The runner (scripts/lib/docs-audit.cjs) owns discovery,
// the shared findings list, the per-gate count line, and gate selection; this
// file owns prestruct's GATE SET, its globs/allow-lists, and its voice/exit.
//
// The runner is VENDORED (a byte copy of freestruct's scripts/lib/docs-audit.cjs)
// and requires node builtins only, so prestruct needs no freestruct install and
// freestruct needs no prestruct install: one runner shape, two gate sets.
//
// prestruct's gates (conservative - only PROVEN violations fail):
//
//   frontmatter   every docs page carries all five style.md fields
//                 (version, permalink, layout, title, nav_order), permalink
//                 absolute, nav_order an integer
//   links         every /prestruct/... link matches a real frontmatter
//                 permalink; other absolute links match a permalink or resolve
//                 under docs/; relative links resolve on disk
//   style         fence language tags, no heading-level skips, no trailing
//                 whitespace or tabs, hyphens not em/en dashes, no emoji,
//                 pipe-table shape
//   language      English-only prose (scripts/check-language.cjs owns the
//                 logic; the gate shells out so one command covers it)
//   truthfulness  module references and `prestruct <verb>` CLI verbs used in
//                 docs exist in the tree
//
// Exit 1 on any finding, evidence inline.
// Run: node scripts/run-docs-audit.cjs [gate ...]
'use strict';

const path = require('path');
const { runDocsAudit } = require('./lib/docs-audit.cjs');

const ROOT = path.resolve(__dirname, '..');
const DOCS_REL = 'docs';

// The runner discovers docs + README. frontmatter/links/style in prestruct
// have always been docs-only (README carries no frontmatter and is prose-anchored),
// so those gates scope to the docs tree; truthfulness scans docs + README.
const docsOnly = (ctx) => ctx.files.filter((f) => ctx.relOf(f).startsWith(DOCS_REL + path.sep));

// ---------------------------------------------------------------------------
// Gate: frontmatter
// ---------------------------------------------------------------------------

// The five fields docs/guides/content-style.md requires. version is
// PRESENCE-only (it names the version the page was introduced in, which
// legitimately differs from package.json), so no equality check.
const REQUIRED_FM = ['version', 'permalink', 'layout', 'title', 'nav_order'];

function gateFrontmatter(ctx) {
  const { relOf, collect, fs, fmBlock, path } = ctx;
  for (const f of docsOnly(ctx)) {
    const rel = relOf(f);
    const fm = fmBlock(fs.readFileSync(f, 'utf8'));
    if (!fm) { collect([], rel, 1, 'no frontmatter block'); continue; }
    for (const field of REQUIRED_FM) {
      const m = fm.match(new RegExp(`^${field}:\\s*(.*\\S)`, 'm'));
      if (!m) { collect([], rel, 1, `missing frontmatter field "${field}"`); continue; }
      const val = m[1].trim();
      if (!val || val === '""' || val === "''") { collect([], rel, 1, `frontmatter field "${field}" is empty`); continue; }
      if (field === 'permalink' && !val.startsWith('/')) collect([], rel, 1, `permalink "${val}" should start with / (site links by it)`);
      if (field === 'nav_order' && !/^-?\d+$/.test(val)) collect([], rel, 1, `nav_order "${val}" is not an integer`);
    }
  }
}

// ---------------------------------------------------------------------------
// Gate: links
// ---------------------------------------------------------------------------

// prestruct's routing model: page permalinks are baseurl-free (/guides/cli),
// while in-docs links use the deployed baseurl prefix (/prestruct/guides/cli).
// This gate owns that normalization; the runner's generic urlKey does not
// apply (it is freestruct's Jekyll shape).
const norm = (s) => {
  const t = '/' + String(s).replace(/^\/+|\/+$/g, '');
  return t === '/' ? '/' : t;
};

function gateLinks(ctx) {
  const { relOf, collect, fs, path } = ctx;
  const files = docsOnly(ctx);
  const docsDir = path.join(ctx.root, DOCS_REL);

  const perm = new Set();
  for (const f of files) {
    const m = fs.readFileSync(f, 'utf8').match(/^permalink: (\S+)/m);
    if (m) perm.add(norm(m[1]));
  }

  for (const f of files) {
    const rel = relOf(f);
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    let inFence = false;
    lines.forEach((line, i) => {
      const n = i + 1;
      if (/^\s*```/.test(line)) { inFence = !inFence; return; }
      if (inFence) return;
      const parts = line.split('`');
      for (let s = 0; s < parts.length; s += 2) { // outside inline code only
        for (const m of parts[s].matchAll(/\]\(([^)\s]+)\)/g)) {
          let u = m[1];
          if (/^(https?:|mailto:)/.test(u)) continue;
          const anchor = u.includes('#') ? u.slice(u.indexOf('#')) : '';
          u = anchor ? u.slice(0, u.length - anchor.length) : u;
          if (!u) continue; // pure anchor
          if (u.startsWith('/prestruct/') || u === '/prestruct') {
            const key = norm(u.replace(/^\/prestruct\/?/, ''));
            if (!perm.has(key)) collect([], rel, n, `broken /prestruct/ link (no matching permalink) ${m[1]}`);
            continue;
          }
          if (u.startsWith('/')) {
            const key = norm(u);
            if (!perm.has(key) && !fs.existsSync(path.join(docsDir, u))) collect([], rel, n, `broken absolute link ${m[1]}`);
            continue;
          }
          const p = path.resolve(path.dirname(f), u.replace(/\.md$/, ''));
          if (fs.existsSync(p + '.md') || fs.existsSync(path.join(p, 'index.md')) || fs.existsSync(p)) continue;
          collect([], rel, n, `broken relative link ${m[1]}`);
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Gate: style
// ---------------------------------------------------------------------------

// Historical changelog entries keep their punctuation (voice-rule exempt).
const VOICE_EXEMPT = /CHANGELOG\.md$/;

function gateStyle(ctx) {
  const { relOf, collect, fs } = ctx;
  for (const f of docsOnly(ctx)) {
    const rel = relOf(f);
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    let inFence = false;
    let lastHeading = 0;
    lines.forEach((line, i) => {
      const n = i + 1;
      if (/^\s*```/.test(line)) {
        if (!inFence && /^```\s*$/.test(line)) collect([], rel, n, 'opening code fence has no language tag');
        inFence = !inFence;
        return;
      }
      if (inFence) return;
      if (/[ \t]+$/.test(line)) collect([], rel, n, 'trailing whitespace');
      if (/\t/.test(line)) collect([], rel, n, 'tab character');
      if (!VOICE_EXEMPT.test(rel)) {
        if (/[\u2013\u2014]/.test(line)) collect([], rel, n, 'em/en dash (use hyphen)');
        // Inline-code spans are literal data (e.g. theme icon tables), not
        // prose decoration, so strip them before the glyph scan.
        const prose = line.replace(/`[^`]*`/g, '');
        if (/[\u2190-\u21FF\u2300-\u23FF\u25A0-\u25FF\u2600-\u27BF\uFE0F]|\uD83C[\uDF00-\uDFFF]|\uD83E[\uDD00-\uDDFF]/.test(prose)) collect([], rel, n, 'emoji/glyph in prose');
      }
      if (/^\|.*[^|\s]\s*$/.test(line) && !/^\|[\s|:-]*$/.test(line)) collect([], rel, n, 'pipe line does not end with | (broken table)');
      if (/^- .*\|\s*$/.test(line)) collect([], rel, n, 'bullet ends with | (broken table)');
      if (/^#{1,6}\s.*\|/.test(line)) collect([], rel, n, 'pipe character in heading (broken table)');
      const h = line.match(/^(#{1,6})\s/);
      if (h) {
        const level = h[1].length;
        if (lastHeading && level > lastHeading + 1) collect([], rel, n, `heading skips h${lastHeading} to h${level}`);
        lastHeading = level;
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Gate: language (English-only prose; scripts/check-language.cjs owns it)
// ---------------------------------------------------------------------------

function gateLanguage(ctx) {
  const { execFileSync } = require('child_process');
  try {
    execFileSync(process.execPath, [path.join(ctx.root, 'scripts', 'check-language.cjs')], {
      cwd: ctx.root, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    for (const line of String(err.stdout || '').trim().split('\n').filter(Boolean)) ctx.findings.push(line);
    if (!err.stdout) ctx.findings.push(`language: checker failed to run: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Gate: truthfulness
// ---------------------------------------------------------------------------

// Truth sources: the CLI's dispatch cases (bin/cli.mjs) and the routed bin
// files (bin/*.mjs). A verb is unknown only when its FIRST token matches
// neither and is not a non-prestruct tool in an install block.
function cliVerbs(root) {
  const src = require('fs').readFileSync(path.join(root, 'bin', 'cli.mjs'), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/case\s+'([a-z][a-z0-9-]*)'\s*:/g)) names.add(m[1]);
  return names;
}

function routedBinVerbs(root) {
  const set = new Set();
  for (const f of require('fs').readdirSync(path.join(root, 'bin'))) {
    if (f.endsWith('.js') || f.endsWith('.mjs')) set.add(f.replace(/\.(js|mjs)$/, ''));
  }
  return set;
}

const BIN_ALLOW = new Set(['prestruct', 'help', '-h', '--help',
  'npm', 'npx', 'gem', 'curl', 'node', 'git', 'yarn', 'pnpm', 'bun',
  'rm', 'cp', 'cd', 'echo', 'grep', 'tar', 'sh']);

function refResolves(root, relPath) {
  const cleaned = relPath.replace(/^\.\//, '');
  const candidates = [
    path.join(root, cleaned),
    path.join(root, cleaned + '.js'),
    path.join(root, cleaned + '.mjs'),
    path.join(root, cleaned, 'index.js'),
    path.join(root, cleaned, 'index.mjs'),
  ];
  for (const base of candidates) {
    if (require('fs').existsSync(base) && require('fs').statSync(base).isFile()) {
      const reqName = path.basename(cleaned).replace(/\.(js|mjs)$/, '');
      const gotName = path.basename(base).replace(/\.(js|mjs)$/, '');
      if (reqName.includes('.')) {
        if (path.basename(cleaned) === path.basename(base)) return true;
      } else if (reqName === gotName) {
        return true;
      }
    }
  }
  return false;
}

function gateTruthfulness(ctx) {
  const { root, relOf, findings, fs } = ctx;
  const commands = cliVerbs(root);
  const bins = routedBinVerbs(root);

  for (const f of ctx.files) {
    const rel = relOf(f);
    const raw = fs.readFileSync(f, 'utf8');
    // `<!-- TRUTHFULNESS-OK: reason -->` on a line exempts the line after it.
    const lines = raw.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/TRUTHFULNESS-OK/.test(lines[i]) && lines[i + 1] !== undefined) lines[i + 1] = '';
    }
    const text = lines.join('\n');

    const spans = [];
    for (const m of text.matchAll(/```[\s\S]*?```/g)) spans.push(m[0]);
    for (const m of text.matchAll(/`[^`\n]+`/g)) spans.push(m[0]);

    for (const span of spans) {
      // 1) module references
      for (const m of span.matchAll(/require\('\.\/((?:engine|bin|src|init|example|scripts)\/[a-zA-Z0-9/._-]+)'\)/g)) {
        const relPath = m[1];
        if (!refResolves(root, './' + relPath)) {
          const idx = raw.indexOf('./' + relPath);
          const line = idx === -1 ? 0 : raw.slice(0, idx).split('\n').length;
          findings.push(`${rel}:${line} module reference does not exist: ./${relPath}`);
        }
      }
      // 2) CLI verbs
      const scannable = ' ' + span.replace(/^\s*```[a-z]*\s*\n?/, '').replace(/```\s*$/, '');
      for (const m of scannable.matchAll(/(?:^|\n|&&|;|\$ |#|\/)\s*(?:npx\s+)?(?:prestruct|node\s+bin\/cli\.mjs)\s+([a-z][a-z0-9-]*)(\s+[a-z-][a-z0-9-]*)?/g)) {
        const verb = m[1];
        const sub = m[2] ? m[2].trim() : null;
        if (BIN_ALLOW.has(verb)) continue;
        if (commands.has(verb) || bins.has(verb)) continue;
        const verbIdx = scannable.indexOf(m[0]);
        const line = verbIdx === -1 ? 0 : raw.slice(0, raw.indexOf(span.slice(0, verbIdx))).split('\n').length;
        findings.push(`${rel}:${line} unknown prestruct verb in docs: ${verb}${sub ? ' ' + sub : ''}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------

const gates = {
  frontmatter: gateFrontmatter,
  links: gateLinks,
  style: gateStyle,
  language: gateLanguage,
  truthfulness: gateTruthfulness,
};

module.exports = { gates };

// The CLI loop is behind `require.main === module` so tests can require the
// gate set and drive it over a fixture tree (same convention as
// scripts/unwrap-prose.cjs).
if (require.main === module) {
  let result;
  try {
    result = runDocsAudit({
      root: ROOT,
      docsDir: DOCS_REL,
      gates,
      names: process.argv.slice(2),
      log: (line) => console.log(line),
    });
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  const { findings } = result;
  if (findings.length) {
    console.error(`\ndocs audit FAILED - ${findings.length} finding(s):`);
    for (const f of findings) console.error('  ' + f);
    process.exit(1);
  }
  console.log('docs audit: all gates clean');
}
