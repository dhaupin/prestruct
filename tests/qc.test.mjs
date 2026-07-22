import { test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const SYNCED_FILES = [
  'scripts/inject-brand.js',
  'scripts/prerender.js',
  'src/hooks/usePageMeta.js',
  'src/islands.js',
]

test('engine files stay synced between init and example', () => {
  for (const relativePath of SYNCED_FILES) {
    const initFile = readFileSync(`init/${relativePath}`, 'utf8')
    const exampleFile = readFileSync(`example/${relativePath}`, 'utf8')
    expect(exampleFile).toBe(initFile)
  }
})

test('code imports react-router-dom/server.js with explicit extension', () => {
  const cmd = String.raw`rg --pcre2 -n "react-router-dom/server(?!\\.js)" -g '*.js' -g '*.jsx' -g '*.mjs' -g '*.cjs' init example`

  let output = ''
  try {
    output = execSync(cmd, { encoding: 'utf8' })
  } catch (error) {
    output = error.stdout || ''
  }

  expect(output.trim()).toBe('')
})

test('release workflow packages only init starter files', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8')

  expect(workflow).toMatch(/cp -R init\/. "\$\{PACKAGE_DIR\}\//)
  expect(workflow).toMatch(/if unzip -l "\$\{ARCHIVE\}" \| grep -q "example\//)
  expect(workflow).not.toMatch(/zip -r "\$\{ARCHIVE\}" init\//)
})
