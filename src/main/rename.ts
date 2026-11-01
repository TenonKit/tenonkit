import { cpSync, existsSync, readdirSync, renameSync } from 'fs'
import { join } from 'path'

/**
 * The app was called Redesign, so its data lived in a "Redesign" folder. Copy projects, themes and
 * settings from `from` to `to` once, on the first launch as Tenonkit. Copied, not moved: the old
 * folder is left as it was, so nothing can be lost. Returns whether anything was copied.
 */
export function migrateFromRedesign(from: string, to: string): boolean {
  if (
    from.toLowerCase() === to.toLowerCase() ||
    !existsSync(from) ||
    existsSync(join(to, 'projects'))
  )
    return false
  try {
    for (const name of ['projects', 'themes', 'settings.json', 'window-state.json']) {
      if (existsSync(join(from, name)))
        cpSync(join(from, name), join(to, name), { recursive: true })
    }
    // Theme files were called .rdtheme then.
    const themes = join(to, 'themes')
    if (existsSync(themes))
      for (const f of readdirSync(themes))
        if (f.endsWith('.rdtheme'))
          renameSync(join(themes, f), join(themes, f.replace(/\.rdtheme$/, '.tenontheme')))
    return true
  } catch {
    // The old folder is untouched, so a failed copy can simply be retried by hand.
    return false
  }
}
