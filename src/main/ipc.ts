import { app, BrowserWindow, clipboard, dialog, ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import { dirname, join, normalize, sep } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { isProjectId, summarize } from '../shared/project'
import {
  deleteProject,
  listProjects,
  projectsDir,
  readProject,
  readThumbnail,
  saveProject,
  thumbnailOf,
  writeAtomic
} from './projects'
import { openFile, openProjectFile, PROJECT_EXT, takePendingFile } from './open'
import { captureThumbnail } from './thumbnail'
import { getSettings, updateSettings } from './settings'
import { deleteTheme, listThemes, saveTheme } from './themes'
import { normalizeTheme, THEME_EXT, themeFile } from '../shared/theme'
import { PreviewPage, startPreview, updatePreview } from './preview'
import { log } from './log'

const MAX_TEXT = 50 * 1024 * 1024
const MAX_FILES = 500

const text = (v: unknown, name: string): string => {
  if (typeof v !== 'string' || v.length > MAX_TEXT) throw new Error(`Invalid ${name}`)
  return v
}
/** A safe file name stem from user text, for dialog defaults. */
const stem = (v: unknown): string =>
  (typeof v === 'string' ? v : '')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 80) || 'untitled'

export function registerIpc(appUrl: () => string): void {
  const devServer = appUrl().startsWith('http') ? appUrl() : undefined
  const rendererRoot = join(__dirname, '../renderer')
  // Every handler checks that the call comes from our own page, not from a frame or a navigated page.
  const handle = <A extends unknown[], R>(
    channel: string,
    fn: (win: BrowserWindow, ...args: A) => Promise<R> | R
  ): void => {
    ipcMain.handle(channel, async (e: IpcMainInvokeEvent, ...args: unknown[]) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (!win || !e.senderFrame?.url.startsWith(appUrl())) throw new Error('Untrusted sender')
      try {
        return await fn(win, ...(args as A))
      } catch (err) {
        log.error(`IPC ${channel} failed`, err)
        throw err
      }
    })
  }

  handle('window:minimize', (win) => win.minimize())
  handle('window:toggleMaximize', (win) => (win.isMaximized() ? win.unmaximize() : win.maximize()))
  handle('window:close', (win) => win.close())
  handle('window:isMaximized', (win) => win.isMaximized())
  handle('app:info', () => ({ version: app.getVersion(), platform: process.platform }))

  handle('projects:list', () => listProjects())
  handle('projects:get', (_w, id: unknown) => readProject(String(id)))
  handle('projects:save', async (_w, project: unknown) => summarize(await saveProject(project)))
  handle('projects:delete', (_w, id: unknown) => deleteProject(String(id)))

  handle('projects:import', async (win) => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Import project',
      filters: [{ name: 'Tenonkit project', extensions: [PROJECT_EXT, 'redesign', 'json'] }],
      properties: ['openFile']
    })
    const file = res.filePaths[0]
    if (res.canceled || !file) return null
    return openProjectFile(file)
  })

  handle('projects:thumbnail', (_w, id: unknown) => readThumbnail(String(id)))
  handle('projects:makeThumbnail', async (_w, id: unknown, html: unknown) => {
    if (!isProjectId(id)) throw new Error('Invalid project id')
    if (!(await readProject(id))) return null
    const jpeg = await captureThumbnail(text(html, 'html'), thumbnailOf(id))
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`
  })
  handle('projects:openFolder', async () => {
    await mkdir(projectsDir(), { recursive: true })
    const err = await shell.openPath(projectsDir())
    if (err) throw new Error(err)
  })
  handle('projects:takePending', () => takePendingFile())

  handle('projects:export', async (win, id: unknown) => {
    const p = await readProject(String(id))
    if (!p) throw new Error('Project not found')
    const res = await dialog.showSaveDialog(win, {
      title: 'Export project file',
      defaultPath: `${stem(p.name)}.${PROJECT_EXT}`,
      filters: [{ name: 'Tenonkit project', extensions: [PROJECT_EXT] }]
    })
    if (res.canceled || !res.filePath) return null
    await writeAtomic(res.filePath, JSON.stringify(p, null, 2))
    return res.filePath
  })

  handle('export:html', async (win, html: unknown, name: unknown) => {
    const res = await dialog.showSaveDialog(win, {
      title: 'Export HTML',
      defaultPath: `${stem(name)}.html`,
      filters: [{ name: 'HTML', extensions: ['html'] }]
    })
    if (res.canceled || !res.filePath) return null
    await writeFile(res.filePath, text(html, 'html'), 'utf8')
    return res.filePath
  })

  handle('export:folder', async (win, files: unknown, name: unknown) => {
    if (!files || typeof files !== 'object') throw new Error('Invalid files')
    const entries = Object.entries(files as Record<string, unknown>)
    if (entries.length > MAX_FILES) throw new Error('Too many files')
    const res = await dialog.showOpenDialog(win, {
      title: 'Choose where to create the React project',
      properties: ['openDirectory', 'createDirectory']
    })
    const parent = res.filePaths[0]
    if (res.canceled || !parent) return null
    const root = join(parent, stem(name))
    for (const [rel, content] of entries) {
      const target = normalize(join(root, rel))
      if (!target.startsWith(root + sep)) throw new Error(`Invalid path ${rel}`)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, text(content, rel), 'utf8')
    }
    return root
  })

  // Previews run on a local web server and open in the default browser.
  handle('preview:open', async (_w, raw: unknown, kind: unknown) => {
    const origin = await startPreview(previewPage(raw), { rendererRoot, devServer })
    // Tests set TENONKIT_NO_BROWSER so they don't open tabs; never honoured by an installed build.
    if (app.isPackaged || !process.env['TENONKIT_NO_BROWSER'])
      await shell.openExternal(`${origin}/${kind === 'react' ? 'react/' : ''}`)
    return origin
  })
  handle('preview:update', (_w, raw: unknown) => updatePreview(previewPage(raw)))

  // The page itself has no clipboard permission; copying goes through here.
  handle('clipboard:write', (_w, value: unknown) => clipboard.writeText(text(value, 'text')))

  handle('themes:list', () => listThemes())
  handle('themes:save', (_w, theme: unknown) => saveTheme(theme))
  handle('themes:delete', (_w, id: unknown) => deleteTheme(String(id)))
  handle('themes:import', async (win) => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Import theme',
      filters: [{ name: 'Tenonkit theme', extensions: [THEME_EXT, 'rdtheme'] }],
      properties: ['openFile']
    })
    const file = res.filePaths[0]
    return res.canceled || !file ? null : openFile(file)
  })
  handle('themes:export', async (win, raw: unknown) => {
    const t = normalizeTheme(raw)
    if (!t) throw new Error('That isn’t a valid theme')
    const res = await dialog.showSaveDialog(win, {
      title: 'Export theme',
      defaultPath: `${stem(t.name)}.${THEME_EXT}`,
      filters: [{ name: 'Tenonkit theme', extensions: [THEME_EXT] }]
    })
    if (res.canceled || !res.filePath) return null
    await writeAtomic(res.filePath, themeFile(t))
    return res.filePath
  })

  handle('settings:get', () => getSettings())
  handle('settings:set', (_w, patch: unknown) => updateSettings(patch))
  handle('app:relaunch', () => {
    app.relaunch()
    app.quit()
  })
  handle('app:openLogs', () => shell.openPath(app.getPath('logs')))

  handle('shell:showItem', (_w, path: unknown) => {
    if (typeof path === 'string') shell.showItemInFolder(path)
  })
}

function previewPage(raw: unknown): PreviewPage {
  const r = (raw ?? {}) as Record<string, unknown>
  const react = (r.react ?? {}) as Record<string, unknown>
  if (!Array.isArray(react.blocks) || react.blocks.length > 500) throw new Error('Invalid preview')
  return {
    html: text(r.html, 'html'),
    react: {
      title: String(react.title ?? '').slice(0, 300),
      css: text(react.css, 'css'),
      selectMode: react.selectMode === true,
      blocks: react.blocks.map((b: Record<string, unknown>) => ({
        id: String(b.id)
          .replace(/[^a-z0-9-]/gi, '')
          .slice(0, 64),
        lang: b.lang === 'jsx' ? 'jsx' : 'html',
        code: text(b.code, 'code')
      }))
    }
  }
}
