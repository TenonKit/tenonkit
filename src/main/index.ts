import { app, shell, BrowserWindow, protocol, net, session, screen } from 'electron'
import { join, normalize, sep } from 'path'
import { pathToFileURL } from 'url'
import { readFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { registerIpc } from './ipc'
import { log } from './log'
import { writeAtomic } from './projects'
import { getSettings } from './settings'
import { migrateFromRedesign } from './rename'
import { stopPreview } from './preview'
import { openFile, projectFileArg, setPendingFile } from './open'

// Production builds are served from app://bundle/ instead of file:// so every response
// can carry a Content-Security-Policy header and paths can't escape the bundle.
const SCHEME = 'app'
export const APP_ORIGIN = `${SCHEME}://bundle`

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ')
// The JSX worker evaluates user components, so it alone may use eval, and it gets no network.
const WORKER_CSP = "default-src 'none'; script-src 'self' 'unsafe-eval'"

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

// Tests run against a throwaway data folder; never honoured by an installed build.
if (!app.isPackaged && process.env['TENONKIT_USER_DATA']) {
  app.setPath('userData', process.env['TENONKIT_USER_DATA'])
}

// Before anything reads the data folder (settings are read on the next line).
if (!process.env['TENONKIT_USER_DATA'])
  migrateFromRedesign(join(app.getPath('appData'), 'Redesign'), app.getPath('userData'))

// The only setting needed before startup; toggled in Settings → Performance.
if (!getSettings().hardwareAcceleration) app.disableHardwareAcceleration()

if (!app.requestSingleInstanceLock()) {
  log.info('Another window is already open; focusing it instead')
  app.quit()
}

process.on('uncaughtException', (e) => log.error('uncaughtException', e))
process.on('unhandledRejection', (e) => log.error('unhandledRejection', e))

function serveBundle(): void {
  const root = join(__dirname, '../renderer')
  protocol.handle(SCHEME, async (req) => {
    const { pathname } = new URL(req.url)
    const file = normalize(join(root, decodeURIComponent(pathname)))
    if (!file.startsWith(root + sep)) return new Response('Not found', { status: 404 })
    const res = await net.fetch(pathToFileURL(file).toString())
    if (!res.ok) return res
    const headers = new Headers(res.headers)
    headers.set('Content-Security-Policy', /worker/i.test(file) ? WORKER_CSP : CSP)
    headers.set('X-Content-Type-Options', 'nosniff')
    return new Response(res.body, { status: res.status, headers })
  })
}

type WindowState = { x?: number; y?: number; width: number; height: number; maximized: boolean }
const stateFile = (): string => join(app.getPath('userData'), 'window-state.json')

function loadWindowState(): WindowState {
  const fallback = { width: 1440, height: 900, maximized: false }
  try {
    const s = JSON.parse(readFileSync(stateFile(), 'utf8')) as WindowState
    // Ignore a saved position that is no longer on any display (monitor unplugged).
    const visible = screen
      .getAllDisplays()
      .some(
        ({ workArea: a }) =>
          s.x !== undefined &&
          s.y !== undefined &&
          s.x < a.x + a.width &&
          s.x + s.width > a.x &&
          s.y < a.y + a.height &&
          s.y + s.height > a.y
      )
    return visible ? s : { ...fallback, ...s, x: undefined, y: undefined }
  } catch {
    return fallback
  }
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const state = loadWindowState()
  const mac = process.platform === 'darwin'
  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 1024,
    minHeight: 640,
    title: 'Tenonkit',
    backgroundColor: '#f9fbfc',
    show: false,
    // Custom title bar: no native frame on Windows/Linux; macOS keeps its traffic lights inset.
    frame: mac,
    titleBarStyle: mac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 14, y: 15 },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false
    }
  })
  mainWindow = win
  if (state.maximized) win.maximize()

  win.on('ready-to-show', () => win.show())
  const sendMax = (): void => win.webContents.send('window:maximized', win.isMaximized())
  win.on('maximize', sendMax)
  win.on('unmaximize', sendMax)
  win.on('close', () => {
    const b = win.getNormalBounds()
    writeAtomic(stateFile(), JSON.stringify({ ...b, maximized: win.isMaximized() })).catch(() => {})
  })
  win.on('closed', () => (mainWindow = null))

  // Only https links leave the app, and they open in the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(appUrl())) e.preventDefault()
  })
  win.webContents.on('render-process-gone', (_e, d) => log.error(`Renderer gone: ${d.reason}`))
  win.webContents.on('did-fail-load', (_e, code, desc, url) =>
    log.error(`Failed to load ${url}: ${desc} (${code})`)
  )

  win.loadURL(`${appUrl()}/index.html`)
}

// The Vite dev server in development; the bundled files over app:// otherwise (also for `npm start`).
const devServer = is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined
export const appUrl = (): string => (devServer ? devServer.replace(/\/$/, '') : APP_ORIGIN)

// Double-clicking a project file: Windows/Linux pass it on the command line (to this instance at
// launch, or to the running one via second-instance); macOS sends open-file.
setPendingFile(projectFileArg(process.argv))

async function openFromShell(file: string): Promise<void> {
  if (!mainWindow) return setPendingFile(file)
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
  try {
    const r = await openFile(file)
    if (r?.kind === 'project') mainWindow.webContents.send('project:opened', r.id)
    if (r?.kind === 'theme') mainWindow.webContents.send('theme:installed', r.name)
  } catch (e) {
    log.warn(`Could not open ${file}`, e)
    mainWindow.webContents.send('project:openFailed', e instanceof Error ? e.message : String(e))
  }
}

app.on('open-file', (e, file) => {
  e.preventDefault()
  if (app.isReady()) openFromShell(file)
  else setPendingFile(file)
})

app.on('second-instance', (_e, argv) => {
  if (!mainWindow) return
  const file = projectFileArg(argv)
  if (file) return void openFromShell(file)
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (e) => e.preventDefault())
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tenonkit.app')
  log.info(`Starting Tenonkit ${app.getVersion()}`)

  // F12 devtools in development only; reload shortcuts are disabled in production.
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  // The app needs no camera, location, notifications etc.
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false))
  session.defaultSession.setPermissionCheckHandler(() => false)

  if (!devServer) serveBundle()
  registerIpc(appUrl)
  createWindow()

  if (app.isPackaged) {
    autoUpdater.logger = { info: log.info, warn: log.warn, error: log.error, debug: () => {} }
    autoUpdater.checkForUpdatesAndNotify().catch((e) => log.warn('Update check failed', e))
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', stopPreview)

app.on('window-all-closed', () => {
  log.info('All windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
