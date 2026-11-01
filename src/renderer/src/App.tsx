import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Home from './components/Home'
import Editor from './components/Editor'
import TitleBar from './components/TitleBar'
import { Toast } from './components/ui'
import { ComponentDef } from './library'
import { Project, projectToDef } from './store'
import { migrateLocalStorage } from './migrate'
import { SettingsContext } from './settings'
import { DEFAULT_SETTINGS, Settings } from '../../shared/settings'
import { BUILT_IN_THEMES, SYSTEM_THEME, Theme, THEME_TOKENS } from '../../shared/theme'

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const subscribeDark = (cb: () => void): (() => void) => {
  darkQuery.addEventListener('change', cb)
  return () => darkQuery.removeEventListener('change', cb)
}

/** Puts a theme's colours on :root, where every Tailwind colour class reads them. */
const PLEX_SANS = "'IBM Plex Sans', system-ui, sans-serif"
const SYSTEM_SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif"
const PLEX_MONO = "'IBM Plex Mono', ui-monospace, monospace"
const SYSTEM_MONO = "'Cascadia Code', Consolas, ui-monospace, monospace"

function applyTheme(t: Theme): void {
  const root = document.documentElement
  for (const k of THEME_TOKENS) root.style.setProperty(`--color-${k}`, t.colors[k])
  root.style.colorScheme = t.appearance
}

export default function App(): React.JSX.Element {
  const [platform, setPlatform] = useState('win32')
  const [version, setVersion] = useState('')
  const [open, setOpen] = useState<Project | null>(null)
  const [myComponents, setMyComponents] = useState<ComponentDef[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [launchedWithGpu, setLaunchedWithGpu] = useState(true)
  const [userThemes, setUserThemes] = useState<Theme[]>([])
  // The theme editor shows its draft live without saving it.
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null)
  const systemDark = useSyncExternalStore(subscribeDark, () => darkQuery.matches)
  const themes = useMemo(() => [...BUILT_IN_THEMES, ...userThemes], [userThemes])
  const themeId = settings.theme === SYSTEM_THEME ? (systemDark ? 'dark' : 'light') : settings.theme
  const activeTheme = previewTheme ?? themes.find((t) => t.id === themeId) ?? BUILT_IN_THEMES[0]
  const { accent, uiFont, codeFont, uiScale } = settings
  // Read at startup only, so changing them later doesn't reopen anything.
  const startupDone = useRef(false)
  const startup = useRef(settings.startup)
  const lastProject = useRef(settings.lastProject)
  useEffect(() => {
    startup.current = settings.startup
    lastProject.current = settings.lastProject
  })
  useEffect(() => {
    applyTheme(activeTheme)
    const root = document.documentElement.style
    // A custom accent replaces the theme's, except while the theme editor shows its own draft.
    if (accent && !previewTheme) {
      root.setProperty('--color-accent', accent)
      root.setProperty(
        '--color-accent-soft',
        `color-mix(in srgb, ${accent} 18%, ${activeTheme.colors.surface})`
      )
    }
    root.setProperty('--font-sans', uiFont === 'system' ? SYSTEM_SANS : PLEX_SANS)
    root.setProperty('--font-mono', codeFont === 'system' ? SYSTEM_MONO : PLEX_MONO)
  }, [activeTheme, accent, previewTheme, uiFont, codeFont])
  useEffect(() => {
    window.api.setZoom(uiScale)
  }, [uiScale])

  const reloadThemes = useCallback(async () => {
    setUserThemes(await window.api.themes.list())
    setSettings(await window.api.settings.get())
  }, [])

  // Optimistic: the switch moves at once, and settles on what the main process stored.
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }))
    window.api.settings
      .set(patch)
      .then(setSettings)
      .catch(() => setToast('Settings couldn’t be saved'))
  }, [])
  const settingsApi = useMemo(
    () => ({
      settings,
      update: updateSettings,
      launchedWithGpu,
      themes,
      activeTheme,
      reloadThemes,
      previewTheme: setPreviewTheme
    }),
    [settings, updateSettings, launchedWithGpu, themes, activeTheme, reloadThemes]
  )

  useEffect(() => {
    document.documentElement.dataset.motion = settings.interfaceAnimations ? 'on' : 'off'
  }, [settings.interfaceAnimations])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // Component projects are the "My components" palette in every website.
  const loadComponents = useCallback(async () => {
    const list = await window.api.projects.list()
    const full = await Promise.all(
      list.filter((p) => p.kind === 'component').map((p) => window.api.projects.get(p.id))
    )
    setMyComponents(full.flatMap((p) => (p && projectToDef(p) ? [projectToDef(p)!] : [])))
  }, [])

  const openProject = useCallback(
    async (id: string): Promise<void> => {
      const p = await window.api.projects.get(id)
      if (!p) return setToast('That project couldn’t be opened. It may have been deleted.')
      await loadComponents().catch(() => {})
      setOpen(p)
      updateSettings({ lastProject: p.id })
    },
    [loadComponents, updateSettings]
  )

  useEffect(() => {
    window.api.info().then((i) => {
      setPlatform(i.platform)
      setVersion(i.version)
    })
    const loadSettings = window.api.settings.get().then((s) => {
      setSettings(s)
      setLaunchedWithGpu(s.hardwareAcceleration)
    })
    const loadThemes = window.api.themes.list().then(setUserThemes)
    Promise.allSettled([migrateLocalStorage(), loadSettings, loadThemes]).then(() => setReady(true))
  }, [])

  const themeInstalled = useCallback(
    async (name: string) => {
      await reloadThemes()
      setToast(`Installed the “${name}” theme`)
    },
    [reloadThemes]
  )

  // A .tenon file the app was launched with, or one double-clicked while it runs.
  useEffect(() => {
    if (!ready) return
    window.api.projects
      .takePending()
      .then((r) => {
        if (r?.kind === 'project') return openProject(r.id)
        if (r?.kind === 'theme') return themeInstalled(r.name)
        // Settings → General → Reopen last project, once per launch.
        if (!startupDone.current && startup.current === 'last' && lastProject.current)
          return openProject(lastProject.current)
        return undefined
      })
      .finally(() => (startupDone.current = true))
      .catch((e) =>
        setToast(
          e instanceof Error
            ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
            : 'That file couldn’t be opened'
        )
      )
    const offOpened = window.api.projects.onOpened((id) => openProject(id))
    const offFailed = window.api.projects.onOpenFailed(setToast)
    const offTheme = window.api.themes.onInstalled(themeInstalled)
    return () => {
      offOpened()
      offFailed()
      offTheme()
    }
  }, [ready, openProject, themeInstalled])

  useEffect(() => {
    document.title = open ? `${open.name} – Tenonkit` : 'Tenonkit'
  }, [open])

  return (
    <SettingsContext.Provider value={settingsApi}>
      <div className="flex h-full flex-col">
        {open ? (
          <Editor
            key={open.id}
            initial={open}
            platform={platform}
            myComponents={myComponents.filter((d) => d.type !== `project:${open.id}`)}
            onBack={() => setOpen(null)}
            onLibraryChange={() => loadComponents().catch(() => {})}
            notify={setToast}
            version={version}
          />
        ) : (
          <>
            {ready ? (
              <Home onOpen={openProject} notify={setToast} version={version} platform={platform} />
            ) : (
              <TitleBar platform={platform} />
            )}
          </>
        )}
        <Toast message={toast} />
      </div>
    </SettingsContext.Provider>
  )
}
