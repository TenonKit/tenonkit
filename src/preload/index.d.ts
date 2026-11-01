import type { Project, ProjectSummary } from '../shared/project'
import type { Settings } from '../shared/settings'
import type { Theme } from '../shared/theme'

export type OpenResult = { kind: 'project'; id: string } | { kind: 'theme'; name: string } | null

export type PreviewError = {
  blockId?: string
  message: string
}

export type PreviewPayload = {
  html: string
  react: {
    title: string
    css: string
    blocks: { id: string; lang: 'html' | 'jsx'; code: string }[]
  }
}

declare global {
  interface Window {
    api: {
      window: {
        minimize: () => Promise<void>
        toggleMaximize: () => Promise<void>
        close: () => Promise<void>
        isMaximized: () => Promise<boolean>
        onMaximized: (cb: (maximized: boolean) => void) => () => void
      }
      info: () => Promise<{ version: string; platform: string }>
      projects: {
        list: () => Promise<ProjectSummary[]>
        get: (id: string) => Promise<Project | null>
        save: (project: Project) => Promise<ProjectSummary>
        delete: (id: string) => Promise<void>
        /** Returns the id of the imported (or already present) project. */
        import: () => Promise<string | null>
        export: (id: string) => Promise<string | null>
        thumbnail: (id: string) => Promise<string | null>
        makeThumbnail: (id: string, html: string) => Promise<string | null>
        openFolder: () => Promise<void>
        /** The file the app was launched with: a project to open, or a theme that was installed. */
        takePending: () => Promise<OpenResult>
        onOpened: (cb: (id: string) => void) => () => void
        onOpenFailed: (cb: (message: string) => void) => () => void
      }
      exportHtml: (html: string, name: string) => Promise<string | null>
      exportFolder: (files: Record<string, string>, name: string) => Promise<string | null>
      preview: {
        /** Starts the local preview server if needed and opens the page in the browser. */
        open: (page: PreviewPayload, kind: 'html' | 'react') => Promise<string>
        /** Replaces the previewed page; open browser tabs reload. */
        update: (page: PreviewPayload) => Promise<void>
        onError: (cb: (err: PreviewError) => void) => () => void
      }
      themes: {
        /** The user's own themes; built-in ones are in src/shared/theme.ts. */
        list: () => Promise<Theme[]>
        save: (theme: Theme) => Promise<Theme>
        delete: (id: string) => Promise<void>
        /** Opens a file dialog; installs the theme and switches to it. */
        import: () => Promise<OpenResult>
        export: (theme: Theme) => Promise<string | null>
        onInstalled: (cb: (name: string) => void) => () => void
      }
      settings: {
        get: () => Promise<Settings>
        set: (patch: Partial<Settings>) => Promise<Settings>
      }
      relaunch: () => Promise<void>
      setZoom: (factor: number) => void
      copyText: (text: string) => Promise<void>
      openLogs: () => Promise<void>
      showItem: (path: string) => Promise<void>
    }
  }
}
