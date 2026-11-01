// Run with: bun test
import { expect, test } from 'bun:test'
import { DEFAULT_SETTINGS, normalizeSettings } from './settings'

test('new customization settings keep valid values and drop the rest', () => {
  const s = normalizeSettings({
    accent: '#E11D48',
    uiScale: 1.25,
    uiFont: 'system',
    codeFont: 'system',
    tabSize: 4,
    lineNumbers: false,
    startup: 'last',
    lastProject: 'abc-123',
    homeBanner: false
  })
  expect(s).toMatchObject({
    accent: '#e11d48',
    uiScale: 1.25,
    tabSize: 4,
    startup: 'last',
    homeBanner: false
  })

  const bad = normalizeSettings({
    accent: 'red; background: url(x)', // lands in a CSS variable: hex only
    uiScale: 3,
    tabSize: 8,
    uiFont: 'comic',
    startup: 'somewhere',
    lastProject: '../../etc'
  })
  expect(bad).toMatchObject({
    accent: '',
    uiScale: 1,
    tabSize: 2,
    uiFont: 'plex',
    startup: 'home',
    lastProject: ''
  })
  expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
})
