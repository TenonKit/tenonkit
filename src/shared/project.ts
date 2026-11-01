// Project model shared by the main process (storage) and the renderer (editor).

export const PROJECT_VERSION = 2

export type Lang = 'html' | 'jsx'
export type ProjectKind = 'site' | 'component'

export type Block = {
  id: string
  type: string
  name: string
  lang: Lang
  /** HTML markup, or a JSX module whose default export is a React component. */
  code: string
  css: string
}

export type Project = {
  version: number
  id: string
  name: string
  kind: ProjectKind
  title: string
  /** Page CSS. When it contains `@import "tailwindcss"` it is compiled by Tailwind. */
  css: string
  blocks: Block[]
  createdAt: number
  updatedAt: number
}

export type ProjectSummary = Pick<Project, 'id' | 'name' | 'kind' | 'createdAt' | 'updatedAt'> & {
  blockCount: number
}

export const MAX_PROJECT_BYTES = 20 * 1024 * 1024
const ID = /^[a-z0-9-]{1,64}$/

export const isProjectId = (id: unknown): id is string => typeof id === 'string' && ID.test(id)

export const newId = (): string =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 36)

const str = (v: unknown, fallback = '', max = 2_000_000): string =>
  typeof v === 'string' ? v.slice(0, max) : fallback

/**
 * Validates anything read from disk or imported, upgrading v1 files (blocks with `html`).
 * Returns null when the value isn't a project at all.
 */
export function normalizeProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  if (!Array.isArray(p.blocks) || typeof p.css !== 'string') return null
  const now = Date.now()
  const blocks: Block[] = []
  for (const b of p.blocks.slice(0, 500)) {
    if (!b || typeof b !== 'object') continue
    const r = b as Record<string, unknown>
    blocks.push({
      id: isProjectId(r.id) ? r.id : newId().slice(0, 8),
      type: str(r.type, 'custom', 100),
      name: str(r.name, 'Component', 200),
      lang: r.lang === 'jsx' ? 'jsx' : 'html',
      code: str(r.code ?? r.html),
      css: str(r.css)
    })
  }
  return {
    version: PROJECT_VERSION,
    id: isProjectId(p.id) ? p.id : newId(),
    name: str(p.name, 'Untitled', 200) || 'Untitled',
    kind: p.kind === 'component' ? 'component' : 'site',
    title: str(p.title, '', 300),
    css: str(p.css),
    blocks,
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : now,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : now
  }
}

export const summarize = (p: Project): ProjectSummary => ({
  id: p.id,
  name: p.name,
  kind: p.kind,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  blockCount: p.blocks.length
})
