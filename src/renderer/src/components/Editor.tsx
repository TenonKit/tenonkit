import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  CircleAlert,
  ClipboardCopy,
  Contrast,
  Download,
  Eye,
  FileDown,
  Keyboard,
  Monitor,
  Redo2,
  Settings,
  Smartphone,
  Tablet,
  Undo2,
  X
} from 'lucide-react'
import Canvas, { Device } from './Canvas'
import Sidebar, { SidebarTab } from './Sidebar'
import Inspector, { InspectorTab } from './Inspector'
import TitleBar from './TitleBar'
import { Button, IconButton } from './ui'
import { cx } from './styles'
import { ComponentDef } from '../library'
import { Block, createProject, initState, Project, reducer } from '../store'
import { buildHtml, PageOutput, renderProject } from '../render'
import { exportReactProject } from '../exportReact'
import { refreshThumbnail } from '../thumbs'
import { useSettings } from '../settings'
import { RENDER_DELAY_MS } from '../../../shared/settings'
import { SettingsDialog } from './SettingsPanel'
import type { PreviewError, PreviewPayload } from '../../../preload/index.d'
import ContrastDialog from './ContrastDialog'
import ShortcutsDialog from './ShortcutsDialog'
import type { Tool } from './ToolsMenu'
import { ROOT, readTokens } from '../design'

type SaveState = 'saved' | 'saving' | 'error'

type Props = {
  initial: Project
  platform: string
  myComponents: ComponentDef[]
  onBack: () => void
  onLibraryChange: () => void
  notify: (msg: string) => void
  version: string
}

const DEVICE_BUTTONS = [
  { id: 'desktop', label: 'Desktop, 1280 pixels', Icon: Monitor },
  { id: 'tablet', label: 'Tablet, 768 pixels', Icon: Tablet },
  { id: 'phone', label: 'Phone, 390 pixels', Icon: Smartphone }
] as const

const SAVE_DELAY_MS = 500

const errorText = (e: unknown): string =>
  e instanceof Error
    ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
    : String(e)

export default function Editor({
  initial,
  platform,
  myComponents,
  onBack,
  onLibraryChange,
  notify,
  version
}: Props): React.JSX.Element {
  const [state, dispatch] = useReducer(reducer, initial, initState)
  const { settings } = useSettings()
  const [device, setDevice] = useState<Device>(settings.defaultDevice)
  const [output, setOutput] = useState<PageOutput | null>(null)
  const [save, setSave] = useState<SaveState>('saved')
  const [menu, setMenu] = useState<'preview' | 'export' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dialog, setDialog] = useState<'contrast' | 'shortcuts' | null>(null)
  // Design tab: which element of the selected component is being styled.
  const [tab, setTab] = useState<InspectorTab>('design')
  const [picked, setPicked] = useState<{ block: string | null; selector: string }>({
    block: null,
    selector: ROOT
  })
  const [canvasDoc, setCanvasDoc] = useState<Document | null>(null)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('components')
  const [runtimeError, setRuntimeError] = useState<PreviewError | null>(null)
  const renderDelay = RENDER_DELAY_MS[settings.renderSpeed]
  const { project, selected } = state
  const block = project.blocks.find((b) => b.id === selected) ?? null
  const isSite = project.kind === 'site'
  //Picking another component starts from its whole root again.
  const selector = picked.block === selected ? picked.selector : ROOT

  // Errors thrown by components in the browser preview.
  useEffect(() => window.api.preview.onError((err) => setRuntimeError(err)), [])

  const activeError = (() => {
    if (output) {
      for (const b of project.blocks) {
        const err = output.blocks[b.id]?.error
        if (err) return { blockId: b.id, name: b.name, message: err }
      }
      if (output.cssError) return { blockId: undefined, name: 'Page CSS', message: output.cssError }
    }
    if (runtimeError) {
      const b = runtimeError.blockId
        ? project.blocks.find((x) => x.id === runtimeError.blockId)
        : undefined
      return {
        blockId: b?.id,
        name: b ? b.name : 'Preview runtime',
        message: runtimeError.message
      }
    }
    return null
  })()

  // ---- Render: JSX in the worker, Tailwind for the classes in use ----
  useEffect(() => {
    let live = true
    const t = setTimeout(() => {
      renderProject(project).then((o) => live && setOutput(o))
    }, renderDelay)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [project, renderDelay])

  // ---- Autosave: every change is written to disk shortly after it happens ----
  const latest = useRef(project)
  const cardImages = useRef(settings.cardImages)
  useEffect(() => {
    cardImages.current = settings.cardImages
  })
  const saved = useRef(project)
  const writeNow = useCallback(async (): Promise<boolean> => {
    const p = latest.current
    if (p === saved.current) return true
    setSave('saving')
    try {
      await window.api.projects.save(p)
      saved.current = p
      setSave(latest.current === p ? 'saved' : 'saving')
      return true
    } catch (e) {
      setSave('error')
      notify(`Couldn’t save: ${errorText(e)}`)
      return false
    }
  }, [notify])

  useEffect(() => {
    latest.current = project
    if (project === saved.current) return
    setSave('saving')
    const t = setTimeout(writeNow, SAVE_DELAY_MS)
    return () => clearTimeout(t)
  }, [project, writeNow])

  useEffect(() => {
    const flush = (): void => void writeNow()
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [writeNow])

  // Leaving the editor (Projects, or another file opened): save, and re-capture the card image.
  useEffect(
    () => () => {
      void writeNow()
      if (latest.current !== initial && cardImages.current) refreshThumbnail(latest.current)
    },
    [writeNow, initial]
  )

  const token = (name: string): string =>
    readTokens(project.css).find((t) => t.name === name)?.value ?? ''

  const copyHtml = async (): Promise<void> => {
    try {
      await window.api.copyText(await html())
      notify('Page HTML copied')
    } catch (e) {
      notify(`Couldn’t copy: ${errorText(e)}`)
    }
  }

  const exportFile = async (): Promise<void> => {
    try {
      if (await writeNow()) {
        const path = await window.api.projects.export(project.id)
        if (path) notify('Project file saved')
      }
    } catch (e) {
      notify(`Export failed: ${errorText(e)}`)
    }
  }

  // The logo's tools menu.
  const tools: Tool[] = [
    { icon: ArrowLeft, label: 'Back to projects', onClick: () => back() },
    'divider',
    { icon: Eye, label: 'Preview HTML page', onClick: () => preview('html') },
    { icon: Eye, label: 'Preview React app', onClick: () => preview('react') },
    { icon: ClipboardCopy, label: 'Copy page HTML', onClick: copyHtml },
    { icon: Download, label: 'Export HTML file', onClick: () => exportAs('html') },
    { icon: FileDown, label: 'Save project file (.tenon)', onClick: exportFile },
    'divider',
    { icon: Contrast, label: 'Contrast checker', onClick: () => setDialog('contrast') },
    { icon: Keyboard, label: 'Keyboard shortcuts', onClick: () => setDialog('shortcuts') },
    { icon: Settings, label: 'Settings', hint: 'Ctrl ,', onClick: () => setSettingsOpen(true) }
  ]

  const back = async (): Promise<void> => {
    if (await writeNow()) onBack()
  }

  // ---- Library and exports ----
  const saveAsComponent = async (b: Block): Promise<void> => {
    const p = createProject({ name: b.name, kind: 'component', tailwind: false, starter: false })
    const component: Project = { ...p, css: project.css, blocks: [{ ...b }] }
    try {
      await window.api.projects.save(component)
      onLibraryChange()
      notify(`Saved “${b.name}” as a component`)
    } catch (e) {
      notify(`Couldn’t save the component: ${errorText(e)}`)
    }
  }

  const html = async (): Promise<string> => buildHtml(project, await renderProject(project))

  const exportAs = async (kind: 'html' | 'react'): Promise<void> => {
    setMenu(null)
    try {
      const path =
        kind === 'html'
          ? await window.api.exportHtml(await html(), project.name)
          : await window.api.exportFolder(exportReactProject(project), project.name)
      if (path) notify(kind === 'html' ? 'Exported HTML' : 'Exported React project')
    } catch (e) {
      notify(`Export failed: ${errorText(e)}`)
    }
  }

  // ---- Preview: a local web server; open browser tabs reload as you edit ----
  const payload = (p: Project, out: PageOutput): PreviewPayload => ({
    html: buildHtml(p, out),
    react: {
      title: p.title || p.name,
      css: out.css,
      blocks: p.blocks.map((b) => ({ id: b.id, lang: b.lang, code: b.code }))
    }
  })
  const previewing = useRef(false)

  const preview = async (kind: 'html' | 'react'): Promise<void> => {
    setMenu(null)
    try {
      await window.api.preview.open(payload(project, await renderProject(project)), kind)
      previewing.current = true
    } catch (e) {
      notify(`Preview failed: ${errorText(e)}`)
    }
  }

  useEffect(() => {
    if (previewing.current && output)
      window.api.preview.update(payload(project, output)).catch(() => {})
    // Only when a new render lands; `project` is what that render was made from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output])

  // ---- Keyboard ----
  const onKey = useCallback(
    (e: KeyboardEvent): void => {
      // Not instanceof: events from the canvas iframe carry that frame's Element class.
      const typing = (e.target as Element).closest?.('input, textarea, .cm-editor')
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      if (mod && k === 's') {
        e.preventDefault()
        writeNow()
      } else if (typing) {
        return
      } else if (mod && k === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
      } else if (mod && k === 'y') {
        e.preventDefault()
        dispatch({ type: 'redo' })
      } else if (mod && k === 'd' && selected) {
        e.preventDefault()
        dispatch({ type: 'duplicate', id: selected })
      } else if ((k === 'delete' || k === 'backspace') && selected) {
        e.preventDefault()
        dispatch({ type: 'remove', id: selected })
      } else if (mod && k === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      } else if (k === 'escape') {
        setMenu(null)
        dispatch({ type: 'select', id: null })
      }
    },
    [writeNow, selected]
  )

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  return (
    <>
      <TitleBar
        platform={platform}
        tools={tools}
        left={
          <>
            <span className="text-control" aria-hidden>
              /
            </span>
            <button
              onClick={back}
              className="no-drag rounded-md px-1.5 py-1 text-muted hover:bg-active hover:text-ink"
            >
              Projects
            </button>
            <span className="text-control" aria-hidden>
              /
            </span>
            <input
              aria-label="Project name"
              value={project.name}
              onChange={(e) =>
                dispatch({ type: 'page', patch: { name: e.target.value }, key: 'name' })
              }
              className="no-drag h-[30px] w-48 min-w-0 rounded-md border border-transparent bg-transparent px-1.5 font-medium outline-none hover:border-line focus:border-control focus:bg-surface"
            />
            <span
              className={cx(
                'text-xs whitespace-nowrap',
                save === 'error' ? 'text-danger' : 'text-faint'
              )}
              aria-live="polite"
            >
              {save === 'saving' ? 'Saving…' : save === 'saved' ? 'Saved' : 'Not saved'}
            </span>
          </>
        }
        center={
          <div
            role="radiogroup"
            aria-label="Preview width"
            className="flex rounded-lg bg-active p-0.5"
          >
            {DEVICE_BUTTONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                role="radio"
                aria-checked={device === id}
                aria-label={label}
                title={label}
                onClick={() => setDevice(id)}
                className="grid h-7 w-[34px] place-items-center rounded-md text-muted hover:text-ink aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        }
        right={
          <>
            <IconButton
              label="Undo"
              title="Undo (Ctrl+Z)"
              disabled={!state.past.length}
              onClick={() => dispatch({ type: 'undo' })}
            >
              <Undo2 size={16} />
            </IconButton>
            <IconButton
              label="Redo"
              title="Redo (Ctrl+Shift+Z)"
              disabled={!state.future.length}
              onClick={() => dispatch({ type: 'redo' })}
            >
              <Redo2 size={16} />
            </IconButton>
            <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
            <IconButton
              label="Settings"
              title="Settings (Ctrl+,)"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings size={16} />
            </IconButton>
            <span className="mx-1.5 h-5 w-px bg-line" aria-hidden />
            <Menu
              open={menu === 'preview'}
              onToggle={() => setMenu(menu === 'preview' ? null : 'preview')}
              onClose={() => setMenu(null)}
              button={
                <>
                  <Eye size={15} aria-hidden /> Preview <ChevronDown size={15} aria-hidden />
                </>
              }
            >
              <MenuItem
                title="HTML page"
                text="The exported page, in your browser"
                onClick={() => preview('html')}
              />
              <MenuItem
                title="React app"
                text="Components run live: state, clicks and effects work"
                onClick={() => preview('react')}
              />
            </Menu>
            <Menu
              primary
              open={menu === 'export'}
              onToggle={() => setMenu(menu === 'export' ? null : 'export')}
              onClose={() => setMenu(null)}
              button={
                <>
                  Export <ChevronDown size={15} aria-hidden />
                </>
              }
            >
              <MenuItem
                title="HTML file"
                text="One file with everything inlined"
                onClick={() => exportAs('html')}
              />
              <MenuItem
                title="React project"
                text="Vite + React, one file per component"
                onClick={() => exportAs('react')}
              />
            </Menu>
          </>
        }
      />
      <main
        className={cx(
          'grid min-h-0 flex-1 gap-3 px-2 pb-2',
          !isSite
            ? 'grid-cols-[minmax(0,1fr)_420px]'
            : // One width for every tab, so switching tabs doesn't reflow the canvas.
              'grid-cols-[312px_minmax(0,1fr)_380px] max-[1180px]:grid-cols-[280px_minmax(0,1fr)_320px]'
        )}
      >
        {isSite && (
          <Sidebar
            tab={sidebarTab}
            onTab={setSidebarTab}
            blocks={project.blocks}
            selected={selected}
            myComponents={myComponents}
            dispatch={dispatch}
          />
        )}
        <div className="flex min-h-0 min-w-0 flex-col gap-2">
          {isSite && activeError && (
            <div
              role="alert"
              className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-rule bg-danger-soft px-3 py-2 text-xs text-danger-ink"
            >
              <span className="flex min-w-0 items-center gap-2">
                <CircleAlert size={14} className="shrink-0" aria-hidden />
                <span className="truncate">
                  <strong>{activeError.name}:</strong> {activeError.message}
                </span>
              </span>
              {runtimeError && (
                <IconButton label="Dismiss error" onClick={() => setRuntimeError(null)}>
                  <X size={14} />
                </IconButton>
              )}
            </div>
          )}
          <div className="flex min-h-0 flex-1">
            <Canvas
              project={project}
              selected={selected}
              device={device}
              dispatch={dispatch}
              onKey={onKey}
              output={output}
              editable={isSite}
              designMode={tab === 'design'}
              selector={selector}
              onPick={(b, s) => setPicked({ block: b, selector: s })}
              onDoc={setCanvasDoc}
            />
          </div>
        </div>
        <Inspector
          project={project}
          block={block}
          dispatch={dispatch}
          onSaveComponent={saveAsComponent}
          blockError={block ? output?.blocks[block.id]?.error : undefined}
          cssError={output?.cssError}
          tab={tab}
          onTab={setTab}
          doc={canvasDoc}
          renderKey={output}
          selector={selector}
          onSelector={(s) => setPicked({ block: selected, selector: s })}
        />
      </main>
      <ContrastDialog
        open={dialog === 'contrast'}
        onClose={() => setDialog(null)}
        initial={{ text: token('--ink'), background: token('--paper') }}
      />
      <ShortcutsDialog open={dialog === 'shortcuts'} onClose={() => setDialog(null)} />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        version={version}
      />
    </>
  )
}

function Menu({
  open,
  onToggle,
  onClose,
  button,
  primary,
  children
}: {
  open: boolean
  onToggle: () => void
  onClose: () => void
  button: React.ReactNode
  primary?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="relative">
      <Button
        variant={primary ? 'primary' : 'secondary'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
      >
        {button}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div
            role="menu"
            className="absolute top-10 right-0 z-50 w-72 rounded-xl border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
          >
            {children}
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({
  title,
  text,
  onClick
}: {
  title: string
  text: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-raised"
    >
      <span className="block font-medium">{title}</span>
      <span className="text-xs text-muted">{text}</span>
    </button>
  )
}
