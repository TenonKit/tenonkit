import { existsSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { MAX_PROJECT_BYTES, newId, normalizeProject } from '../shared/project'
import { readProject, saveProject } from './projects'
import { installThemeFile } from './themes'

export const PROJECT_EXT = 'tenon'
// .redesign and .rdtheme are the app's names from before it was called Tenonkit.
const OPENABLE = /\.(tenon|tenontheme|redesign|rdtheme)$/i

/** The project file in a command line, as passed by a double-click or "Open with". */
export const projectFileArg = (argv: string[]): string | null =>
  argv.slice(1).find((a) => OPENABLE.test(a) && existsSync(a)) ?? null

export class NotAProjectError extends Error {
  constructor() {
    super('That file isn’t a Tenonkit project')
  }
}

/**
 * Adds a project file to the library and returns its id. Opening the same file again opens the
 * existing project; a file whose id is taken by a different version is added as a copy.
 */
export async function openProjectFile(file: string): Promise<string | null> {
  if ((await stat(file)).size > MAX_PROJECT_BYTES) throw new Error('That file is larger than 20 MB')
  const text = await readFile(file, 'utf8')
  let raw: unknown = null
  try {
    raw = JSON.parse(text)
  } catch {
    // handled below
  }
  const p = normalizeProject(raw)
  if (!p) throw new NotAProjectError()
  const existing = await readProject(p.id)
  if (existing && existing.updatedAt === p.updatedAt) return existing.id
  return (await saveProject(existing ? { ...p, id: newId() } : p)).id
}

export type OpenResult = { kind: 'project'; id: string } | { kind: 'theme'; name: string } | null

/** A double-clicked file: a project opens in the editor, a theme is installed and switched to. */
export async function openFile(file: string): Promise<OpenResult> {
  if (/\.(tenontheme|rdtheme)$/i.test(file))
    return { kind: 'theme', name: (await installThemeFile(file)).name }
  const id = await openProjectFile(file)
  return id ? { kind: 'project', id } : null
}

let pending: string | null = null
export const setPendingFile = (file: string | null): void => {
  pending = file
}
/** A file the app was launched with, opened once the window asks for it. */
export async function takePendingFile(): Promise<OpenResult> {
  const file = pending
  pending = null
  return file ? openFile(file) : null
}
