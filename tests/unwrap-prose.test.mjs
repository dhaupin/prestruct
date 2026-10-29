import { describe, it, expect } from 'vitest'
import { unwrap } from '../scripts/unwrap-prose.cjs'

/**
 * Regression tests for the prose unwrapper (#67).
 * The helper joins hard-wrapped paragraphs but must leave structure intact:
 * frontmatter, fenced code, tables, headings, list items, and thematic breaks.
 */

describe('unwrap-prose', () => {
  it('joins a wrapped paragraph into one line', () => {
    const src = 'one two\nthree four\nfive six\n'
    expect(unwrap(src)).toBe('one two three four five six\n')
  })

  it('keeps frontmatter verbatim, wrapped lines and all', () => {
    const src = '---\ntitle: A wrapped\ntag: value\n---\nbody line one\nbody line two\n'
    const out = unwrap(src)
    expect(out).toBe('---\ntitle: A wrapped\ntag: value\n---\nbody line one body line two\n')
  })

  it('does not treat a top-of-file thematic break as frontmatter', () => {
    const src = '---\nintro one\nintro two\n'
    // line 1 ("intro one") is not `key: value`, so there is no frontmatter.
    expect(unwrap(src)).toBe('---\nintro one intro two\n')
  })

  it('preserves mid-document thematic breaks (the TASKS.md defect)', () => {
    const src = 'para one\npara two\n\n---\n\nnext one\nnext two\n'
    expect(unwrap(src)).toBe('para one para two\n\n---\n\nnext one next two\n')
  })

  it('preserves *** and ___ thematic breaks', () => {
    const src = 'a\nb\n\n***\n\nc\nd\n\n___\n\ne\nf\n'
    expect(unwrap(src)).toBe('a b\n\n***\n\nc d\n\n___\n\ne f\n')
  })

  it('leaves fenced code blocks untouched', () => {
    const src = 'before one\nbefore two\n\n```js\nconst a = 1\nconst b = 2\n```\n\nafter one\nafter two\n'
    const out = unwrap(src)
    expect(out).toContain('const a = 1\nconst b = 2')
    expect(out).toContain('before one before two')
    expect(out).toContain('after one after two')
  })

  it('leaves table rows untouched', () => {
    const src = 'brief one\nbrief two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n'
    const out = unwrap(src)
    expect(out).toContain('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(out).toContain('brief one brief two')
  })

  it('joins wrapped list items without merging separate items', () => {
    const src = '- item one\n  continued\n- item two\n  continued\n'
    expect(unwrap(src)).toBe('- item one continued\n- item two continued\n')
  })

  it('preserves headings and joins the paragraph under them', () => {
    const src = '## Head\n\nwrapped one\nwrapped two\n'
    expect(unwrap(src)).toBe('## Head\n\nwrapped one wrapped two\n')
  })

  it('collapses runs of blank lines to a single blank line', () => {
    const src = 'a\n\n\n\nb\n'
    expect(unwrap(src)).toBe('a\n\nb\n')
  })
})
