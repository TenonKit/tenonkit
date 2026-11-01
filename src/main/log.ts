import { app } from 'electron'
import { join } from 'path'
import { appendFile, mkdir, stat, rename } from 'fs/promises'

const MAX_BYTES = 2 * 1024 * 1024

// Plain file log in the user's data folder; rotated once it passes 2 MB.
async function write(level: string, msg: string, err?: unknown): Promise<void> {
  const line = `${new Date().toISOString()} ${level} ${msg}${err ? ` ${err instanceof Error ? err.stack : String(err)}` : ''}\n`
  if (!app.isPackaged) (level === 'ERROR' ? console.error : console.log)(line.trimEnd())
  try {
    const logs = app.getPath('logs')
    await mkdir(logs, { recursive: true })
    const file = join(logs, 'main.log')
    const size = await stat(file)
      .then((s) => s.size)
      .catch(() => 0)
    if (size > MAX_BYTES) await rename(file, join(logs, 'main.old.log'))
    await appendFile(file, line)
  } catch {
    // Logging must never crash the app.
  }
}

export const log = {
  info: (msg: string): Promise<void> => write('INFO', msg),
  warn: (msg: string, err?: unknown): Promise<void> => write('WARN', msg, err),
  error: (msg: string, err?: unknown): Promise<void> => write('ERROR', msg, err)
}
