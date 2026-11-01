// Run with: bun test
import { expect, test } from 'bun:test'
import { createProject, reducer, initState, State, projectToDef } from './store'
import { LIBRARY } from './library'
import { normalizeProject } from '../../shared/project'
import { exportReactProject } from './exportReact'

const site = (): State =>
  initState(createProject({ name: 'Site', kind: 'site', tailwind: true, starter: true }))
const types = (s: State): string[] => s.project.blocks.map((b) => b.type)

test('move uses drop-line index semantics', () => {
  let s = site() // nav hero features about cta footer
  const nav = s.project.blocks[0].id
  s = reducer(s, { type: 'move', id: nav, index: 2 }) // drop between hero and features
  expect(types(s).slice(0, 3)).toEqual(['hero', 'nav', 'features'])
  s = reducer(s, { type: 'move', id: nav, index: 0 })
  expect(types(s)[0]).toBe('nav')
  expect(reducer(s, { type: 'move', id: nav, index: 1 })).toBe(s) // no-op drop keeps history clean
})

test('add, undo, redo', () => {
  let s = reducer(site(), { type: 'add', def: LIBRARY[0], index: 0 })
  expect(s.project.blocks).toHaveLength(7)
  expect(s.selected).toBe(s.project.blocks[0].id)
  s = reducer(s, { type: 'undo' })
  expect(s.project.blocks).toHaveLength(6)
  expect(s.selected).toBeNull()
  s = reducer(s, { type: 'redo' })
  expect(s.project.blocks).toHaveLength(7)
})

test('typing in one field merges into one undo step', () => {
  let s = site()
  const id = s.project.blocks[1].id
  s = reducer(s, { type: 'update', id, patch: { css: 'a' }, key: 'css' })
  s = reducer(s, { type: 'update', id, patch: { css: 'ab' }, key: 'css' })
  expect(s.past).toHaveLength(1)
  s = reducer(s, { type: 'update', id, patch: { code: 'x' }, key: 'code' })
  expect(s.past).toHaveLength(2)
})

test('component projects are one fixed, always-selected block', () => {
  let s = initState(
    createProject({ name: 'Card', kind: 'component', tailwind: true, starter: true })
  )
  const id = s.project.blocks[0].id
  expect(s.selected).toBe(id)
  expect(s.project.blocks[0].lang).toBe('jsx')
  s = reducer(s, { type: 'remove', id })
  s = reducer(s, { type: 'select', id: null })
  expect(s.project.blocks).toHaveLength(1)
  expect(s.selected).toBe(id)
  expect(projectToDef(s.project)?.name).toBe('Card')
})

test('normalizeProject upgrades v1 files and rejects junk', () => {
  const v1 = {
    name: 'Old',
    title: 'T',
    css: 'a{}',
    blocks: [{ id: 'abc', type: 'hero', name: 'Hero', html: '<h1>x</h1>', css: '' }]
  }
  const p = normalizeProject(v1)!
  expect(p.kind).toBe('site')
  expect(p.blocks[0]).toMatchObject({ lang: 'html', code: '<h1>x</h1>' })
  expect(normalizeProject({ blocks: 'nope' })).toBeNull()
  expect(normalizeProject(null)).toBeNull()
  // ids that could escape the projects folder are replaced
  expect(normalizeProject({ ...v1, id: '../../evil' })!.id).not.toContain('/')
})

test('React export has one file per component and unique names', () => {
  const p = createProject({ name: 'My Site', kind: 'site', tailwind: true, starter: true })
  p.blocks.push({ ...p.blocks[1], id: 'dup1' })
  const files = exportReactProject(p)
  expect(files['src/components/Hero.jsx']).toBeDefined()
  expect(files['src/components/Hero2.jsx']).toBeDefined()
  expect(files['vite.config.js']).toContain('tailwindcss()')
  expect(JSON.parse(files['package.json']).name).toBe('my-site')
})
