import { Block, newId, Project, PROJECT_VERSION, ProjectKind } from '../../shared/project'
import { ComponentDef, LIBRARY, pageCss, REACT_STARTER, STARTER_TYPES } from './library'

export type { Block, Project }

export type State = {
  project: Project
  selected: string | null
  past: Project[]
  future: Project[]
  // Typing in the editor merges into one undo step while the same field keeps changing.
  lastKey: string | null
  lastAt: number
}

export type Action =
  | { type: 'add'; def: ComponentDef; index: number }
  | { type: 'move'; id: string; index: number }
  | { type: 'remove'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'update'; id: string; patch: Partial<Block>; key: string }
  | { type: 'page'; patch: Partial<Pick<Project, 'name' | 'title' | 'css'>>; key: string }
  | { type: 'select'; id: string | null }
  | { type: 'undo' }
  | { type: 'redo' }

export const uid = (): string => newId().slice(0, 8)

export const fromDef = (def: ComponentDef): Block => ({
  id: uid(),
  type: def.type,
  name: def.name,
  lang: def.lang ?? 'html',
  code: def.code,
  css: def.css
})

const def = (type: string): ComponentDef => LIBRARY.find((d) => d.type === type)!

export type NewProjectOptions = {
  name: string
  kind: ProjectKind
  tailwind: boolean
  /** Website: start from the starter page. Component: write it in React. */
  starter: boolean
}

export function createProject(o: NewProjectOptions): Project {
  const now = Date.now()
  const blocks =
    o.kind === 'component'
      ? [{ ...fromDef(o.starter ? REACT_STARTER : def('custom')), name: o.name }]
      : o.starter
        ? STARTER_TYPES.map((t) => fromDef(def(t)))
        : []
  return {
    version: PROJECT_VERSION,
    id: newId(),
    name: o.name,
    kind: o.kind,
    title: o.name,
    css: pageCss(o.tailwind),
    blocks,
    createdAt: now,
    updatedAt: now
  }
}

/** A component project's single block, as an entry for the website palette. */
export const projectToDef = (p: Project): ComponentDef | null =>
  p.blocks[0]
    ? {
        type: `project:${p.id}`,
        name: p.name,
        group: 'My components',
        lang: p.blocks[0].lang,
        code: p.blocks[0].code,
        css: p.blocks[0].css
      }
    : null

export const initState = (project: Project): State => ({
  project,
  // A component project is one block, always selected.
  selected: project.kind === 'component' ? (project.blocks[0]?.id ?? null) : null,
  past: [],
  future: [],
  lastKey: null,
  lastAt: 0
})

const HISTORY = 100
const MERGE_MS = 1200

function commit(state: State, project: Project, key: string | null = null): State {
  const now = Date.now()
  const merge = key !== null && key === state.lastKey && now - state.lastAt < MERGE_MS
  return {
    ...state,
    project: { ...project, updatedAt: now },
    past: merge ? state.past : [...state.past.slice(-HISTORY), state.project],
    future: [],
    lastKey: key,
    lastAt: now
  }
}

export function reducer(state: State, action: Action): State {
  const { project } = state
  const blocks = project.blocks
  switch (action.type) {
    case 'add': {
      const block = fromDef(action.def)
      const next = [...blocks]
      next.splice(action.index, 0, block)
      return { ...commit(state, { ...project, blocks: next }), selected: block.id }
    }
    case 'move': {
      const from = blocks.findIndex((b) => b.id === action.id)
      if (from < 0) return state
      const to = action.index > from ? action.index - 1 : action.index
      if (to === from) return state
      const next = [...blocks]
      const [block] = next.splice(from, 1)
      next.splice(to, 0, block)
      return commit(state, { ...project, blocks: next })
    }
    case 'remove': {
      const i = blocks.findIndex((b) => b.id === action.id)
      if (i < 0 || project.kind === 'component') return state
      const next = blocks.filter((b) => b.id !== action.id)
      const selected =
        state.selected === action.id ? ((next[i] ?? next[i - 1])?.id ?? null) : state.selected
      return { ...commit(state, { ...project, blocks: next }), selected }
    }
    case 'duplicate': {
      const i = blocks.findIndex((b) => b.id === action.id)
      if (i < 0 || project.kind === 'component') return state
      const copy = { ...blocks[i], id: uid() }
      const next = [...blocks]
      next.splice(i + 1, 0, copy)
      return { ...commit(state, { ...project, blocks: next }), selected: copy.id }
    }
    case 'update': {
      const next = blocks.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b))
      return commit(state, { ...project, blocks: next }, `${action.id}:${action.key}`)
    }
    case 'page':
      return commit(state, { ...project, ...action.patch }, `page:${action.key}`)
    case 'select':
      if (project.kind === 'component') return state
      return { ...state, selected: action.id, lastKey: null }
    case 'undo': {
      const prev = state.past.at(-1)
      if (!prev) return state
      return keepSelection({
        ...state,
        project: prev,
        past: state.past.slice(0, -1),
        future: [state.project, ...state.future],
        lastKey: null
      })
    }
    case 'redo': {
      const [next, ...rest] = state.future
      if (!next) return state
      return keepSelection({
        ...state,
        project: next,
        past: [...state.past, state.project],
        future: rest,
        lastKey: null
      })
    }
  }
}

function keepSelection(state: State): State {
  const exists = state.project.blocks.some((b) => b.id === state.selected)
  return exists ? state : { ...state, selected: null }
}
