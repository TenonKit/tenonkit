import { contextBridge, ipcRenderer, webFrame } from 'electron'

// The only bridge between the page and the main process. Every call is validated in src/main/ipc.ts.
const api = {
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: (): Promise<void> => ipcRenderer.invoke('window:toggleMaximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximized: (cb: (maximized: boolean) => void): (() => void) => {
      const listener = (_e: unknown, v: boolean): void => cb(v)
      ipcRenderer.on('window:maximized', listener)
      return () => ipcRenderer.removeListener('window:maximized', listener)
    }
  },
  info: (): Promise<{ version: string; platform: string }> => ipcRenderer.invoke('app:info'),
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id: string) => ipcRenderer.invoke('projects:get', id),
    save: (project: unknown) => ipcRenderer.invoke('projects:save', project),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', id),
    import: () => ipcRenderer.invoke('projects:import'),
    export: (id: string) => ipcRenderer.invoke('projects:export', id),
    thumbnail: (id: string) => ipcRenderer.invoke('projects:thumbnail', id),
    makeThumbnail: (id: string, html: string) =>
      ipcRenderer.invoke('projects:makeThumbnail', id, html),
    openFolder: () => ipcRenderer.invoke('projects:openFolder'),
    takePending: () => ipcRenderer.invoke('projects:takePending'),
    /** A project file was double-clicked while the app is running. */
    onOpened: (cb: (id: string) => void): (() => void) => {
      const listener = (_e: unknown, id: string): void => cb(id)
      ipcRenderer.on('project:opened', listener)
      return () => ipcRenderer.removeListener('project:opened', listener)
    },
    onOpenFailed: (cb: (message: string) => void): (() => void) => {
      const listener = (_e: unknown, m: string): void => cb(m)
      ipcRenderer.on('project:openFailed', listener)
      return () => ipcRenderer.removeListener('project:openFailed', listener)
    }
  },
  exportHtml: (html: string, name: string) => ipcRenderer.invoke('export:html', html, name),
  exportFolder: (files: Record<string, string>, name: string) =>
    ipcRenderer.invoke('export:folder', files, name),
  preview: {
    open: (page: unknown, kind: 'html' | 'react') => ipcRenderer.invoke('preview:open', page, kind),
    update: (page: unknown) => ipcRenderer.invoke('preview:update', page),
    onError: (cb: (err: unknown) => void): (() => void) => {
      const listener = (_e: unknown, err: unknown): void => cb(err)
      ipcRenderer.on('preview:error', listener)
      return () => ipcRenderer.removeListener('preview:error', listener)
    }
  },
  themes: {
    list: () => ipcRenderer.invoke('themes:list'),
    save: (theme: unknown) => ipcRenderer.invoke('themes:save', theme),
    delete: (id: string) => ipcRenderer.invoke('themes:delete', id),
    import: () => ipcRenderer.invoke('themes:import'),
    export: (theme: unknown) => ipcRenderer.invoke('themes:export', theme),
    /** A .tenontheme file was double-clicked while the app is running. */
    onInstalled: (cb: (name: string) => void): (() => void) => {
      const listener = (_e: unknown, name: string): void => cb(name)
      ipcRenderer.on('theme:installed', listener)
      return () => ipcRenderer.removeListener('theme:installed', listener)
    }
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch: unknown) => ipcRenderer.invoke('settings:set', patch)
  },
  relaunch: () => ipcRenderer.invoke('app:relaunch'),
  /** Settings → Appearance → Interface size. */
  setZoom: (factor: number) => webFrame.setZoomFactor(Math.min(1.5, Math.max(0.75, factor))),
  copyText: (text: string) => ipcRenderer.invoke('clipboard:write', text),
  openLogs: () => ipcRenderer.invoke('app:openLogs'),
  showItem: (path: string) => ipcRenderer.invoke('shell:showItem', path)
}

contextBridge.exposeInMainWorld('api', api)
