import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { rm, writeFile } from 'fs/promises'
import { writeAtomic } from './projects'

const WIDTH = 1280
const HEIGHT = 800
const LOAD_TIMEOUT_MS = 8000

let queue: Promise<unknown> = Promise.resolve()

/** Renders a page off screen and saves a JPEG of its first screen. One capture at a time. */
export function captureThumbnail(html: string, out: string): Promise<Buffer> {
  const job = queue.then(() => capture(html, out))
  queue = job.catch(() => {})
  return job
}

async function capture(html: string, out: string): Promise<Buffer> {
  const tmp = join(app.getPath('temp'), `tenonkit-thumb-${process.pid}-${Date.now()}.html`)
  await writeFile(tmp, html, 'utf8')
  // Scripts off and its own session: the page is only looked at, never run.
  const win = new BrowserWindow({
    show: false,
    width: WIDTH,
    height: HEIGHT,
    webPreferences: { offscreen: true, javascript: false, sandbox: true, partition: 'thumbnails' }
  })
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  try {
    // Remote images that never arrive must not hold the capture forever.
    await Promise.race([
      win.loadFile(tmp),
      new Promise((resolve) => setTimeout(resolve, LOAD_TIMEOUT_MS))
    ])
    await new Promise((resolve) => setTimeout(resolve, 300))
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: WIDTH, height: HEIGHT })
    const jpeg = image.resize({ width: 640, quality: 'good' }).toJPEG(82)
    await writeAtomic(out, jpeg)
    return jpeg
  } finally {
    win.destroy()
    rm(tmp, { force: true }).catch(() => {})
  }
}
