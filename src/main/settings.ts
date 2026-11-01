import { app } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { normalizeSettings, Settings } from '../shared/settings'
import { writeAtomic } from './projects'

const file = (): string => join(app.getPath('userData'), 'settings.json')

let current: Settings | null = null

/** Synchronous so it can run before `app.ready` (hardware acceleration must be decided first). */
export function getSettings(): Settings {
  if (!current) {
    try {
      current = normalizeSettings(JSON.parse(readFileSync(file(), 'utf8')))
    } catch {
      current = normalizeSettings(null)
    }
  }
  return current
}

export async function updateSettings(patch: unknown): Promise<Settings> {
  const next = normalizeSettings({
    ...getSettings(),
    ...(patch && typeof patch === 'object' ? patch : {})
  })
  // Update memory first and write one at a time: quick successive changes (toggling several
  // switches) would otherwise merge into stale settings, or collide on the same temp file.
  current = next
  const write = writing.then(() => writeAtomic(file(), JSON.stringify(next, null, 2)))
  writing = write.catch(() => {})
  await write
  return next
}

let writing: Promise<void> = Promise.resolve()
