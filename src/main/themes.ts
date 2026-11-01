import { app } from 'electron'
import { join } from 'path'
import { mkdir, readdir, readFile, rm, stat } from 'fs/promises'
import { normalizeTheme, Theme, THEME_EXT, themeFile } from '../shared/theme'
import { writeAtomic } from './projects'
import { updateSettings } from './settings'

const MAX_THEME_BYTES = 256 * 1024
const dir = (): string => join(app.getPath('userData'), 'themes')
const fileOf = (id: string): string => join(dir(), `${id}.${THEME_EXT}`)

/** The user's own themes (the built-in ones live in src/shared/theme.ts). */
export async function listThemes(): Promise<Theme[]> {
  await mkdir(dir(), { recursive: true })
  const out: Theme[] = []
  for (const f of await readdir(dir())) {
    if (!f.endsWith(`.${THEME_EXT}`)) continue
    try {
      const t = normalizeTheme(JSON.parse(await readFile(join(dir(), f), 'utf8')))
      if (t) out.push(t)
    } catch {
      // A broken file is skipped rather than breaking the list.
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/** Saves (or replaces, by id) a user theme. */
export async function saveTheme(raw: unknown): Promise<Theme> {
  const t = normalizeTheme(raw)
  if (!t) throw new Error('That isn’t a valid theme')
  await mkdir(dir(), { recursive: true })
  await writeAtomic(fileOf(t.id), themeFile(t))
  return t
}

export async function deleteTheme(id: string): Promise<void> {
  if (!/^[a-z0-9-]{1,64}$/.test(id)) throw new Error('Invalid theme id')
  await rm(fileOf(id), { force: true })
}

/** Installs a .tenontheme file and switches the app to it. */
export async function installThemeFile(file: string): Promise<Theme> {
  if ((await stat(file)).size > MAX_THEME_BYTES) throw new Error('That theme file is too large')
  let raw: unknown = null
  try {
    raw = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    // handled by normalizeTheme returning null
  }
  if (!normalizeTheme(raw)) throw new Error('That file isn’t a Tenonkit theme')
  const t = await saveTheme(raw)
  await updateSettings({ theme: t.id })
  return t
}
