import { newId, normalizeProject, Project, PROJECT_VERSION } from '../../shared/project'

const DONE = 'redesign:migrated-v2'

let running: Promise<void> | null = null

/** Moves work from the first version (kept in localStorage) into project files, once. */
export function migrateLocalStorage(): Promise<void> {
  // Shared promise: StrictMode runs effects twice, and two runs would import everything twice.
  running ??= migrate()
  return running
}

async function migrate(): Promise<void> {
  let raw: string | null, saved: string | null
  try {
    if (localStorage.getItem(DONE)) return
    raw = localStorage.getItem('redesign:project')
    saved = localStorage.getItem('redesign:saved')
  } catch {
    return
  }
  const old = raw ? normalizeProject(JSON.parse(raw)) : null
  if (old) await window.api.projects.save({ ...old, id: newId(), kind: 'site' })

  const defs: unknown = saved ? JSON.parse(saved) : []
  if (Array.isArray(defs)) {
    for (const d of defs) {
      if (!d || typeof d.name !== 'string') continue
      const now = Date.now()
      const component: Project = {
        version: PROJECT_VERSION,
        id: newId(),
        name: d.name,
        kind: 'component',
        title: d.name,
        css: old?.css ?? '',
        blocks: [
          {
            id: newId().slice(0, 8),
            type: 'custom',
            name: d.name,
            lang: 'html',
            code: String(d.html ?? ''),
            css: String(d.css ?? '')
          }
        ],
        createdAt: now,
        updatedAt: now
      }
      await window.api.projects.save(component)
    }
  }
  try {
    localStorage.setItem(DONE, '1')
    localStorage.removeItem('redesign:project')
    localStorage.removeItem('redesign:saved')
  } catch {
    // Worst case the import runs again next launch.
  }
}
