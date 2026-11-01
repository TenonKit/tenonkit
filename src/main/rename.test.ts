// Run with: bun test
import { expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { migrateFromRedesign } from './rename'

function oldData(): string {
  const from = mkdtempSync(join(tmpdir(), 'old-redesign-'))
  mkdirSync(join(from, 'projects'))
  mkdirSync(join(from, 'themes'))
  writeFileSync(join(from, 'projects', 'p1.json'), '{"name":"Bakery"}')
  writeFileSync(join(from, 'themes', 'ocean.rdtheme'), '{}')
  writeFileSync(join(from, 'settings.json'), '{"theme":"dark"}')
  return from
}

test('copies projects, themes and settings from the old Redesign folder', () => {
  const from = oldData()
  const to = mkdtempSync(join(tmpdir(), 'tenonkit-'))
  expect(migrateFromRedesign(from, to)).toBe(true)
  expect(readFileSync(join(to, 'projects', 'p1.json'), 'utf8')).toContain('Bakery')
  expect(existsSync(join(to, 'themes', 'ocean.tenontheme'))).toBe(true) // renamed to the new extension
  expect(readFileSync(join(to, 'settings.json'), 'utf8')).toContain('dark')
  // the old folder is left exactly as it was
  expect(existsSync(join(from, 'projects', 'p1.json'))).toBe(true)
  expect(existsSync(join(from, 'themes', 'ocean.rdtheme'))).toBe(true)
})

test('runs only once, and never overwrites Tenonkit projects', () => {
  const from = oldData()
  const to = mkdtempSync(join(tmpdir(), 'tenonkit-'))
  mkdirSync(join(to, 'projects'))
  writeFileSync(join(to, 'projects', 'p1.json'), '{"name":"Newer"}')
  expect(migrateFromRedesign(from, to)).toBe(false)
  expect(readFileSync(join(to, 'projects', 'p1.json'), 'utf8')).toContain('Newer')
  expect(
    migrateFromRedesign(join(tmpdir(), 'no-such-folder-x9'), mkdtempSync(join(tmpdir(), 't-')))
  ).toBe(false)
})
