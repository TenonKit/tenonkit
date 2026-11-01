// Run with: bun test
import { expect, test } from 'bun:test'
import { BUILT_IN_THEMES, normalizeTheme, THEME_TOKENS, themeFile } from './theme'

const file = {
  format: 'tenonkit-theme',
  version: 1,
  id: 'ocean',
  name: 'Ocean',
  author: 'Per',
  description: 'Deep blue',
  appearance: 'dark',
  colors: { ground: '#0B1A2A', accent: '#4fc1d6' }
}

test('a .tenontheme file round-trips, with missing colours from its base', () => {
  const t = normalizeTheme(file)!
  expect(t).toMatchObject({ id: 'ocean', name: 'Ocean', author: 'Per', appearance: 'dark' })
  expect(t.colors.ground).toBe('#0b1a2a')
  const dark = BUILT_IN_THEMES.find((b) => b.id === 'dark')!
  expect(t.colors.surface).toBe(dark.colors.surface) // not in the file → dark base
  expect(Object.keys(t.colors)).toEqual([...THEME_TOKENS])
  expect(normalizeTheme(JSON.parse(themeFile(t)))).toEqual(t)
})

test('anything that is not a colour is dropped, and junk is rejected', () => {
  const t = normalizeTheme({
    ...file,
    colors: { ink: 'red; background: url(x)', ground: 'url(evil)' }
  })!
  expect(t.colors.ink).not.toContain('url')
  expect(t.colors.ground).toMatch(/^#[0-9a-f]{6}$/)
  expect(normalizeTheme({ ...file, format: 'other' })).toBeNull()
  expect(normalizeTheme({ ...file, name: '  ' })).toBeNull()
  expect(normalizeTheme('{}')).toBeNull()
})

test("a file can't replace a built-in theme or escape the themes folder", () => {
  expect(normalizeTheme({ ...file, id: 'dark' })!.id).toBe('custom-dark')
  expect(normalizeTheme({ ...file, id: '../../evil' })!.id).toBe('evil')
})

test('themes from before the rename (redesign-theme) still load', () => {
  expect(normalizeTheme({ ...file, format: 'redesign-theme' })?.name).toBe('Ocean')
})

test('three built-in themes', () => {
  expect(BUILT_IN_THEMES.map((t) => t.id)).toEqual(['light', 'dark', 'high-contrast'])
})
