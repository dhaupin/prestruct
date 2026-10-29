#!/usr/bin/env node
/**
 * Docs audit caller (prestruct's gate set over the shared runner).
 *
 * The runner (scripts/lib/docs-audit.cjs, vendored from dhaupin/freestruct) owns
 * discovery, the findings list, the per-gate count line, and gate selection;
 * this file owns prestruct's GATE SET and its voice/exit. freestruct's
 * scripts/run-docs-audit.cjs is the first caller of the same runner
 * (prestruct#75), so the two repos share ONE runner shape and differ only in
 * gates, globs and allow-lists.
 *
 * prestruct's gates (all conservative - only PROVEN violations fail):
 *
 *   frontmatter   every docs page carries all 5 fields (version, permalink,
 *                 layout, title, nav_order); permalink is absolute; nav_order
 *                 is an integer
 *   links         every markdown link resolves on disk or in the permalink set
 *                 (skips code fences, inline code, externals, anchors)
 *   nav           every docs/_data/nav.yml URL resolves to a real page, and no
 *                 URL is listed twice. FORWARD-only: prestruct's sidebar is a
 *                 curated menu (the playbooks index is the hub; discussions and
 *                 playbook detail pages are linked from prose, not the menu),
 *                 so the reverse "every page must be listed" rule is a
 *                 freestruct contract and is deliberately NOT applied here.
 *   style         fenced blocks carry a language tag; no heading level skips;
 *                 no trailing whitespace; no tabs in prose; hyphens not em/en
 *                 dashes; no emoji; pipe-table shape. CHANGELOG exempt on voice.
 *   truthfulness  `prestruct <verb>` and `require('./<tree>/x')` promises in
 *                 docs/README resolve to real CLI verbs and files
 *   language      English-only prose (scripts/check-language.cjs owns the
 *                 logic; the gate shells out so one command covers it)
 *   jekyll        build-time Liquid constructs that Jekyll refuses at build
 *                 time: a two-argument call to a single-argument string filter
 *                 (`| remove: 'a', ''`, crashtest#23), any `{% tag %}` the
 *                 Jekyll 4.x set does not define (`{% seo %}` in prose,
 *                 prestruct#77), and an unbalanced `{% raw %}` (an open with
 *                 no matching `endraw` refuses with "'raw' tag was never
 *                 closed"). Scans docs/ source (.html/.md/.yml/.txt,
 *                 including `_`-prefixed dirs) so the class fails in lint:docs
 *                 with a file:line, not in Jekyll's stack trace.
 *
 * Claims (scripts/check-fiction-signatures.cjs) stays a SEPARATE script run as
 * `lint:claims` - the same split freestruct keeps, so neither repo folds the
 * fiction-signature scan into the docs runner.
 *
 * Exit 1 on any finding, evidence inline.
 * Run: node scripts/run-docs-audit.cjs [gate ...]
 */
'use strict';

const path = require('path');
const { runDocsAudit } = require('./lib/docs-audit.cjs');

const ROOT = path.resolve(__dirname, '..');
// The docs deploy base (docs/_config.yml baseurl). Nav + link URLs are the
// deployment form, so the permalink -> URL mapping prefixes it.
const BASEURL = '/prestruct';
const DOCS_PREFIX = 'docs/';

// Deployment URL for a docs page: baseurl + declared permalink (else the
// Jekyll path shape the runner derives). README (not under docs/) passes
// through the default so it never collides with a real page.
function urlFor(relDocPath, fm) {
  const m = fm && fm.match(/^permalink:\s*(\S+)/m);
  const rel = m ? m[1] : '/' + relDocPath.replace(/\.md$/, '');
  return BASEURL + (rel === '/' ? '/' : rel);
}

// ---------------------------------------------------------------------------
// Gate: frontmatter (pass 153)
//
// docs/advanced/style.md requires every page to carry all 5 frontmatter fields
// (version, permalink, layout, title, nav_order). The version field is
// PRESENCE-only: style.md defines it as "version introduced", which
// legitimately differs from package.json.
// ---------------------------------------------------------------------------

const FM_REQUIRED = ['version', 'permalink', 'layout', 'title', 'nav_order'];

function gateFrontmatter(ctx) {
  const { files, relOf, collect, fs, path, fmBlock } = ctx;
  for (const f of files) {
    if (path.basename(f) === 'README.md') continue; // no frontmatter domain there
    const rel = relOf(f);
    const block = fmBlock(fs.readFileSync(f, 'utf8'));
    if (!block) { collect([], rel, 1, 'no frontmatter block'); continue; }
    for (const field of FM_REQUIRED) {
      const m = block.match(new RegExp(`^${field}:\\s*(.*\\S)`, 'm'));
      if (!m) { collect([], rel, 1, `missing frontmatter field "${field}"`); continue; }
      const val = m[1].trim();
      if (!val || val === '""' || val === "''") {
        collect([], rel, 1, `frontmatter field "${field}" is empty`);
        continue;
      }
      if (field === 'permalink' && !val.startsWith('/')) {
        collect([], rel, 1, `permalink "${val}" should start with / (site links by it)`);
      }
      if (field === 'nav_order' && !/^-?\d+$/.test(val)) {
        collect([], rel, 1, `nav_order "${val}" is not an integer`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Gate: links
// ---------------------------------------------------------------------------

function gateLinks(ctx) {
  const { files, relOf, collect, fs, path, resolveUrl } = ctx;
  for (const f of files) {
    const rel = relOf(f);
    if (!rel.startsWith(DOCS_PREFIX)) continue; // original scope: docs/ only
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
          const hash = u.indexOf('#');
          u = hash === -1 ? u : u.slice(0, hash);
          if (!u) continue; // pure anchor
          if (u.startsWith('/')) {
            if (!resolveUrl(u) && !fs.existsSync(path.join(ctx.docsDir, u))) {
              collect([], rel, n, `broken docs link ${m[1]}`);
            }
          } else {
            const target = path.resolve(path.dirname(f), u.replace(/\.md$/, ''));
            const good = fs.existsSync(target + '.md') || fs.existsSync(path.join(target, 'index.md')) || fs.existsSync(target);
            if (!good) collect([], rel, n, `broken relative link ${m[1]}`);
          }
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Gate: nav (forward only - every menu URL resolves, no duplicates)
// ---------------------------------------------------------------------------

function parseNav(ctx) {
  // Minimal flat parse of docs/_data/nav.yml: sections + {title, url} items
  const { fs, navFile } = ctx;
  const nav = [];
  let section = null;
  fs.readFileSync(navFile, 'utf8').split('\n').forEach((line) => {
    if (/^\s*#/.test(line) || !line.trim()) return;
    const sec = line.match(/^- title: (.+)$/);
    if (sec && !line.startsWith(' ')) {
      section = { title: sec[1].trim().replace(/^["']|["']$/g, ''), items: [] };
      nav.push(section);
      return;
    }
    const item = line.match(/^\s+- title: (.+)$/);
    const url = line.match(/^\s+url: (\S+)/);
    if (section && item && !url) section._pendingTitle = item[1].trim().replace(/^["']|["']$/g, '');
    else if (section && url) section.items.push({ title: section._pendingTitle || '', url: url[1] });
  });
  return nav;
}

function gateNav(ctx) {
  const { findings, resolveUrl } = ctx;
  const nav = parseNav(ctx);
  const seen = new Set();
  for (const section of nav) {
    if (!section.items.length) findings.push(`nav: section "${section.title}" has no items`);
    for (const item of section.items) {
      if (!item.title) findings.push(`nav: item with url "${item.url}" has no title`);
      if (item.url.startsWith('http')) continue; // external link, no page to resolve
      if (seen.has(item.url)) findings.push(`nav: "${item.url}" listed more than once`);
      seen.add(item.url);
      if (!resolveUrl(item.url)) findings.push(`nav: "url: ${item.url}" resolves to no docs page`);
    }
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
// Gate: style
// ---------------------------------------------------------------------------

const VOICE_EXEMPT = /CHANGELOG\.md$/;

function gateStyle(ctx) {
  const { files, relOf, collect, fs } = ctx;
  for (const f of files) {
    const rel = relOf(f);
    if (!rel.startsWith(DOCS_PREFIX)) continue; // original scope: docs/ only
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    let inFence = false;
    let lastHeading = 0;
    lines.forEach((line, i) => {
      const n = i + 1;
      if (/^\s*```/.test(line)) {
        if (!inFence && /^```\s*$/.test(line)) collect([], rel, n, 'opening fence missing language tag');
        inFence = !inFence;
        return;
      }
      if (inFence) return;
      if (/[ \t]+$/.test(line)) collect([], rel, n, 'trailing whitespace');
      if (/\t/.test(line)) collect([], rel, n, 'tab character');
      if (!VOICE_EXEMPT.test(rel)) {
        if (/[\u2013\u2014]/.test(line)) collect([], rel, n, 'em/en dash (use hyphen)');
        const prose = line.replace(/`[^`]*`/g, '');
        if (/[\u2190-\u21FF\u2300-\u23FF\u25A0-\u25FF\u2600-\u27BF\uFE0F]|\uD83C[\uDF00-\uDFFF]|\uD83E[\uDD00-\uDDFF]/.test(prose)) {
          collect([], rel, n, 'emoji/glyph in prose');
        }
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
// Gate: truthfulness
//
// Verify what the prose PROMISES exists against the actual tree, mechanically.
// Only PROVEN-absent findings fail. Fenced blocks and inline code spans are the
// scan targets; prose without code is not parsed. `<!-- TRUTHFULNESS-OK: reason
// -->` exempts the line after it.
// ---------------------------------------------------------------------------

const BIN_ALLOW = new Set(['prestruct', 'help', '-h', '--help',
  'npm', 'npx', 'gem', 'curl', 'node', 'git', 'yarn', 'pnpm', 'bun',
  'rm', 'cp', 'cd', 'echo', 'grep', 'tar', 'sh']);

function cliVerbs(root) {
  const fs = require('fs');
  const src = fs.readFileSync(path.join(root, 'bin', 'cli.mjs'), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/case\s+'([a-z][a-z0-9-]*)'\s*:/g)) names.add(m[1]);
  return names;
}

function routedBinVerbs(root) {
  const fs = require('fs');
  const dir = path.join(root, 'bin');
  const set = new Set();
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.js') || f.endsWith('.mjs')) set.add(f.replace(/\.(js|mjs)$/, ''));
  }
  return set;
}

function refResolves(root, relPath) {
  const fs = require('fs');
  const cleaned = relPath.replace(/^\.\//, '');
  const candidates = [
    path.join(root, cleaned),
    path.join(root, cleaned + '.js'),
    path.join(root, cleaned + '.mjs'),
    path.join(root, cleaned, 'index.js'),
    path.join(root, cleaned, 'index.mjs'),
  ];
  for (const base of candidates) {
    if (fs.existsSync(base) && fs.statSync(base).isFile()) {
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

function codeSpans(text) {
  const spans = [];
  let m;
  const fenceRe = /```[\s\S]*?```/g;
  while ((m = fenceRe.exec(text)) !== null) spans.push(m[0]);
  const inlineRe = /`[^`\n]+`/g;
  while ((m = inlineRe.exec(text)) !== null) spans.push(m[0]);
  return spans;
}

function gateTruthfulness(ctx) {
  const { files, relOf, findings, fs, root } = ctx;
  const commands = cliVerbs(root);
  const bins = routedBinVerbs(root);
  for (const f of files) {
    const rel = relOf(f);
    const raw = fs.readFileSync(f, 'utf8');
    const lines = raw.split('\n');
    // `<!-- TRUTHFULNESS-OK: reason -->` exempts the line after it.
    for (let i = 0; i < lines.length; i++) {
      if (/TRUTHFULNESS-OK/.test(lines[i]) && lines[i + 1] !== undefined) lines[i + 1] = '';
    }
    const text = lines.join('\n');
    for (const span of codeSpans(text)) {
      const reqRe = /require\('\.\/((?:engine|bin|src|init|example|scripts)\/[a-zA-Z0-9/._-]+)'\)/g;
      let m;
      while ((m = reqRe.exec(span)) !== null) {
        const relPath = m[1];
        if (!refResolves(root, './' + relPath)) {
          findings.push(`truthfulness ${rel}: module reference does not exist: ./${relPath}`);
        }
      }
      const verbRe = /(?:^|\n|&&|;|\$ |#|\/)\s*(?:npx\s+)?(?:prestruct|node\s+bin\/cli\.mjs)\s+([a-z][a-z0-9-]*)(\s+[a-z-][a-z0-9-]*)?/g;
      const scannable = ' ' + span.replace(/^\s*```[a-z]*\s*\n?/, '').replace(/```\s*$/, '');
      while ((m = verbRe.exec(scannable)) !== null) {
        const verb = m[1];
        const sub = m[2] ? m[2].trim() : null;
        if (BIN_ALLOW.has(verb)) continue;
        if (commands.has(verb) || bins.has(verb)) continue;
        findings.push(`truthfulness ${rel}: unknown prestruct verb in docs: ${verb}${sub ? ' ' + sub : ''}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Gate: jekyll
//
// Two source-level Liquid constructs that only fail at BUILD time, ported from
// poststruct's check-jekyll-filters.cjs (e53b1e0), plus the unbalanced-raw
// class CI's Jekyll build caught on this gate's own first doc write:
//
//   1. A two-argument call to a single-argument string filter. Liquid's
//      `remove`, `remove_first`, `append`, `prepend`, `newline_to_br` take
//      exactly ONE argument; `| remove: '/x', ''` throws "wrong number of
//      arguments" and kills the whole build (crashtest#23).
//   2. An unknown `{% tag %}`. The docs ship no theme gem and no plugin, so
//      any tag outside the Jekyll 4.x set refuses at build time -- writing the
//      literal `{% seo %}` in prose (backticks are markdown, not Liquid
//      escaping) killed the poststruct docs deploy (prestruct#77). Wrap
//      literal text in {% raw %}.
//   3. An unbalanced raw tag: an open with no matching endraw refuses with
//      "'raw' tag was never closed"; a stray endraw refuses too.
//
// The runner's discovery is .md-only prose; this gate needs the full Liquid
// source set (.html/.md/.yml/.txt, INCLUDING `_`-prefixed dirs like _layouts),
// so it walks docs/ itself. The run loop passes ctx.findings, so findings land
// in the shared list and the caller still owns voice + exit.
// ---------------------------------------------------------------------------

const LIQUID_SINGLE_ARG = ['remove_first', 'remove', 'append', 'prepend', 'newline_to_br'];

// Jekyll 4.x tag set (Liquid core + Jekyll core + the end/else companions).
const LIQUID_KNOWN_TAGS = new Set([
  'assign', 'break', 'capture', 'case', 'comment', 'continue', 'cycle',
  'decrement', 'echo', 'else', 'elsif', 'endcapture', 'endcase', 'endcomment',
  'endfor', 'endif', 'endraw', 'endtablerow', 'endunless', 'for', 'if',
  'ifchanged', 'include', 'include_relative', 'increment', 'layout', 'link',
  'liquid', 'post_url', 'raw', 'render', 'tablerow', 'unless', 'when',
]);

const LIQUID_EXTS = new Set(['.html', '.md', '.yml', '.txt']);
const LIQUID_SKIP_DIRS = new Set(['_site', 'node_modules', 'vendor', '.bundle', '.jekyll-cache']);

function gateJekyll(ctx) {
  const { findings, fs, path, docsDir } = ctx;
  if (!fs.existsSync(docsDir)) return;
  const RAW_PAIR = /(\{%-?\s*raw\s*-?%\})([\s\S]*?)(\{%-?\s*endraw\s*-?%\})/g;
  const blank = (s) => s.replace(/[^\n]/g, ' ');

  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!LIQUID_SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
        continue;
      }
      if (!LIQUID_EXTS.has(path.extname(entry.name))) continue;
      const file = path.join(dir, entry.name);
      const rel = path.relative(ctx.root, file);
      const source = fs.readFileSync(file, 'utf8');
      // Blank out {% raw %}...{% endraw %} regions (literal content, not
      // Liquid) while keeping line count so file:line stays honest.
      const stripped = source.replace(RAW_PAIR, (m, open, body, close) => open + blank(body) + close);
      // A raw open with no matching endraw refuses at build time ("'raw' tag
      // was never closed") -- blank the BALANCED pairs entirely, then any raw
      // or endraw still standing is unbalanced. (This gate missed the class on
      // its own first doc write; CI's Jekyll build caught it -- prestruct#77.)
      const balanced = source.replace(RAW_PAIR, (m) => blank(m));
      const lineOf = (idx) => balanced.slice(0, idx).split('\n').length;
      for (const m of balanced.matchAll(/\{%-?\s*raw\s*-?%\}/g)) {
        findings.push(`${rel}:${lineOf(m.index)}: unclosed "raw" tag (no matching endraw - the Jekyll build dies: 'raw' tag was never closed)`);
      }
      for (const m of balanced.matchAll(/\{%-?\s*endraw\s*-?%\}/g)) {
        findings.push(`${rel}:${lineOf(m.index)}: stray "endraw" tag (no matching raw - the Jekyll build dies)`);
      }
      stripped.split('\n').forEach((line, i) => {
        const n = i + 1;
        for (const filter of LIQUID_SINGLE_ARG) {
          // {{ x | remove: 'a', '' }} - one quoted arg, a comma, a second one.
          const re = new RegExp("\\|[ ]*-?[ ]*" + filter + "\\s*:\\s*(?:'([^']*)'|\"([^\"]*)\")\\s*,");
          if (re.test(line)) {
            findings.push(`${rel}:${n}: Liquid "${filter}" takes exactly one argument (the two-arg form kills the Jekyll build - crashtest#23): \`${line.trim()}\``);
          }
        }
        // An unknown tag ({% seo %} in prose) is the same build-time class.
        const tagRe = /\{%-?\s*([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let t;
        while ((t = tagRe.exec(line)) !== null) {
          if (!LIQUID_KNOWN_TAGS.has(t[1])) {
            findings.push(`${rel}:${n}: unknown Liquid tag "${t[1]}" (no theme gem / plugin defines it, so the Jekyll build dies - wrap literal text in {% raw %}): \`${line.trim()}\``);
          }
        }
      });
    }
  })(docsDir);
}

// ---------------------------------------------------------------------------

const gates = {
  frontmatter: gateFrontmatter,
  links: gateLinks,
  nav: gateNav,
  style: gateStyle,
  truthfulness: gateTruthfulness,
  language: gateLanguage,
  jekyll: gateJekyll,
};

module.exports = { gates, urlFor };

// Run the audit only when invoked as a CLI, not when required for its gates
// (the battery imports `gates` to trip each one against a fixture tree).
if (require.main === module) {
  let result;
  try {
    result = runDocsAudit({
      root: ROOT,
      gates,
      names: process.argv.slice(2),
      urlFor,
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
