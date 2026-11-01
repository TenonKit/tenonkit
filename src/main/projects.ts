import { app } from 'electron'
import { join } from 'path'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'fs/promises'
import {
  isProjectId,
  MAX_PROJECT_BYTES,
  normalizeProject,
  Project,
  ProjectSummary,
  summarize
} from '../shared/project'
import { log } from './log'

// One JSON file per project in the user's data folder.
export const projectsDir = (): string => join(app.getPath('userData'), 'projects')
const dir = projectsDir
const fileOf = (id: string): string => join(dir(), `${id}.json`)
export const thumbnailOf = (id: string): string => join(dir(), `${id}.jpg`)

/** Write to a temp file then rename, so a crash mid-write never leaves a half-written project. */
export async function writeAtomic(path: string, data: string | Buffer): Promise<void> {
  const tmp = `${path}.${process.pid}.tmp`
  await writeFile(tmp, data)
  await rename(tmp, path)
}

export async function listProjects(): Promise<ProjectSummary[]> {
  await mkdir(dir(), { recursive: true })
  const out: ProjectSummary[] = []
  for (const f of await readdir(dir())) {
    if (!f.endsWith('.json')) continue
    const p = await readProject(f.slice(0, -5)).catch(() => null)
    if (p) out.push(summarize(p))
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function readProject(id: string): Promise<Project | null> {
  if (!isProjectId(id)) return null
  try {
    return normalizeProject(JSON.parse(await readFile(fileOf(id), 'utf8')))
  } catch (e) {
    log.warn(`Could not read project ${id}`, e)
    return null
  }
}

export async function saveProject(raw: unknown): Promise<Project> {
  const p = normalizeProject(raw)
  if (!p) throw new Error('Not a valid project')
  const data = JSON.stringify(p)
  if (data.length > MAX_PROJECT_BYTES) throw new Error('Project is larger than 20 MB')
  await mkdir(dir(), { recursive: true })
  await writeAtomic(fileOf(p.id), data)
  return p
}

export async function deleteProject(id: string): Promise<void> {
  if (!isProjectId(id)) throw new Error('Invalid project id')
  await rm(fileOf(id), { force: true })
  await rm(thumbnailOf(id), { force: true })
  // History files written by earlier versions.
  await rm(join(dir(), 'snapshots', `${id}.json`), { force: true })
}

/** The project's thumbnail as a data URL, or null if none has been made yet. */
export async function readThumbnail(id: string): Promise<string | null> {
  if (!isProjectId(id)) return null
  try {
    return `data:image/jpeg;base64,${(await readFile(thumbnailOf(id))).toString('base64')}`
  } catch {
    return null
  }
}
