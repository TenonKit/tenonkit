// Run with: bun test. The CSSOM-based parts (readDesign/setDesign) are covered by the Electron e2e.
import { expect, test } from 'bun:test'
import { contrast, describe as name, readTokens, setToken, toHex } from './design'

const css = `@import "tailwindcss";

:root {
  --ink: #16181d;
  --brand: #1b6c80;
  --font: "Inter", system-ui;
}

body { color: var(--ink); }
`

test('tokens are read from :root and edited in place', () => {
  expect(readTokens(css).map((t) => t.name)).toEqual(['--ink', '--brand', '--font'])
  const next = setToken(css, '--brand', '#e11d48')
  expect(next).toContain('--brand: #e11d48;')
  expect(next).toContain('body { color: var(--ink); }') // the rest is untouched
  expect(setToken(css, '--radius', '12px')).toContain('--radius: 12px;')
  // a token name that is a prefix of another must not match it
  expect(setToken(':root { --ink-soft: #aaa; --ink: #000; }', '--ink', '#111')).toContain(
    '--ink-soft: #aaa'
  )
})

test('colours convert for the colour picker', () => {
  expect(toHex('rgb(27, 108, 128)')).toBe('#1b6c80')
  expect(toHex('rgba(255, 255, 255, 0.5)')).toBe('#ffffff')
  expect(toHex('#ABC')).toBe('#aabbcc')
  expect(toHex('var(--brand)')).toBeNull()
})

test('contrast matches WCAG', () => {
  expect(contrast('#000000', '#ffffff')!.toFixed(1)).toBe('21.0')
  expect(contrast('#767676', '#ffffff')!).toBeGreaterThan(4.5)
  expect(contrast('#777777', '#ffffff')!).toBeLessThan(4.5)
})

test('selectors get readable names', () => {
  expect(name('&')).toBe('Whole component')
  expect(name('& > section.hero > h1')).toBe('Heading 1')
  expect(name('& > section > div.actions > a.btn:nth-of-type(2)')).toBe('Link .btn')
})
