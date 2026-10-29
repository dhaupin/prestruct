#!/usr/bin/env node
'use strict'

// Unwrap prose in markdown: join lines that belong to one paragraph or one
// list item into a single line. Never touches frontmatter (--- ... ---),
// fenced code (``` blocks), table rows (| lines), headings, thematic breaks
// (--- / *** / ___), or blank-line boundaries. The point: the 72-column
// commit-time habit is dead - prose flows, and future agents must not re-wrap
// it.
//
// Hardened from the eyestruct@3adda1d original (which detected frontmatter by
// counting the first `---` rows): frontmatter is only at file start, and a
// mid-document thematic break flushes the buffer instead of joining into it.
// Without this, TASKS.md's pass separators and CHANGELOG's first rule both
// collapse into prose.
//
// Usage: node scripts/unwrap-prose.cjs <file.md> [file2.md ...]

const fs = require('fs')

function unwrap(textOrLines) {
  const lines = Array.isArray(textOrLines) ? textOrLines : textOrLines.split('\n')
  const out = []
  let fenced = false

  const isCodeLines = (ln) => /^\s*```/.test(ln)
  const isTableRow = (ln) => /^\s*\|/.test(ln)
  const isHeading = (ln) => /^#{1,6} /.test(ln)
  const isBlank = (ln) => ln.trim() === ''
  // A thematic break (horizontal rule): ---, ***, ___ (3+, optional spaces).
  // Distinct from a frontmatter fence, which only opens/closes at file start.
  const isRule = (ln) => /^ {0,3}([-*_])( *\1){2,} *$/.test(ln)

  // Frontmatter exists only when line 0 is a `---` fence, line 1 looks like a
  // `key: value` pair, and a closing `---` follows. A bare top-of-file rule is
  // not frontmatter.
  const hasFrontmatter =
    lines[0] !== undefined && lines[0].trim() === '---' &&
    /^[A-Za-z0-9_.-]+\s*:/.test(lines[1] || '')
  let fmClose = -1
  if (hasFrontmatter) {
    for (let j = 1; j < lines.length; j++) {
      if (lines[j].trim() === '---') { fmClose = j; break }
    }
  }

  let buf = null

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]

    // Frontmatter block: emitted verbatim, never joined.
    if (fmClose >= 0 && i <= fmClose) {
      if (buf != null) { out.push(buf); buf = null }
      out.push(ln)
      continue
    }

    if (isCodeLines(ln)) {
      fenced = !fenced
      if (buf != null) { out.push(buf); buf = null }
      out.push(ln)
      continue
    }
    if (fenced) { out.push(ln); continue }

    if (isBlank(ln)) {
      if (buf != null) { out.push(buf); buf = null }
      out.push(ln)
      continue
    }

    const listStart = /^([-*+] |\d+\. )/.test(ln)
    const quoteStart = /^>/.test(ln)
    const tableRow = isTableRow(ln)
    const heading = isHeading(ln)

    if (tableRow || heading || isRule(ln)) {
      if (buf != null) { out.push(buf); buf = null }
      out.push(ln)
      continue
    }

    if (listStart) {
      if (buf != null) { out.push(buf); buf = null }
      buf = ln.replace(/\s+$/, '')
      continue
    }

    if (quoteStart) {
      if (buf != null) { out.push(buf); buf = null }
      buf = ln.replace(/\s+$/, '')
      continue
    }

    // Continuation line: join into the current buffer.
    if (buf != null) {
      buf = buf.replace(/\s+$/, '') + ' ' + ln.trim()
    } else {
      buf = ln.replace(/\s+$/, '')
    }
  }
  if (buf != null) out.push(buf)
  // Collapse runs of >2 consecutive blank lines down to one.
  const collapsed = []
  let blanks = 0
  for (const ln of out) {
    if (ln.trim() === '') {
      blanks++
      if (blanks > 1) continue
    } else blanks = 0
    collapsed.push(ln)
  }
  return collapsed.join('\n')
}

if (require.main === module) {
  for (const file of process.argv.slice(2)) {
    const src = fs.readFileSync(file, 'utf8')
    const unwrapped = unwrap(src)
    fs.writeFileSync(file, unwrapped)
    const before = src.split('\n').filter((l) => l.trim() !== '').length
    const after = unwrapped.split('\n').filter((l) => l.trim() !== '').length
    console.log(`${file}: ${before} non-blank -> ${after} non-blank lines`)
  }
}

module.exports = { unwrap }
