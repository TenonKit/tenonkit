import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Component,
  Contrast,
  Copy,
  FileDown,
  FileUp,
  FolderOpen,
  Globe,
  House,
  Keyboard,
  LayoutGrid,
  Plus,
  Search,
  Settings as SettingsIcon,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import { newId, ProjectKind, ProjectSummary } from '../../../shared/project'
import { createProject, NewProjectOptions } from '../store'
import { forgetThumbnail, getThumbnail } from '../thumbs'
import ShortcutsDialog from './ShortcutsDialog'
import ContrastDialog from './ContrastDialog'
import TitleBar from './TitleBar'
import type { Tool } from './ToolsMenu'
import { Wordmark } from './Logo'
import BannerArt from './BannerArt'
import SettingsPanel from './SettingsPanel'
import { useSettings } from '../settings'
import { Button, Field, IconButton, Modal, Tabs } from './ui'
import { cx, inputClass } from './styles'

type Props = {
  onOpen: (id: string) => void
  notify: (msg: string) => void
  version: string
  platform: string
}
type View = 'home' | 'projects' | 'settings'
type Filter = 'all' | ProjectKind
type Preset = Pick<NewProjectOptions, 'kind' | 'starter' | 'tailwind'>

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
function ago(t: number): string {
  const s = (t - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ]
  for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u)
  return 'just now'
}

const KIND_LABEL: Record<ProjectKind, string> = { site: 'Website', component: 'Component' }
/** New-project presets, from Settings → General. Components always start in React. */
function usePresets(): { website: Preset; component: Preset } {
  const { settings } = useSettings()
  return {
    website: { kind: 'site', starter: settings.newStarter, tailwind: settings.newTailwind },
    component: { kind: 'component', starter: true, tailwind: settings.newTailwind }
  }
}

const errorText = (e: unknown): string =>
  e instanceof Error
    ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
    : 'Something went wrong'

export default function Home({ onOpen, notify, version, platform }: Props): React.JSX.Element {
  const [view, setView] = useState<View>('home')
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [error, setError] = useState(false)
  const [creating, setCreating] = useState<Preset | null>(null)
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null)
  const [shortcuts, setShortcuts] = useState(false)
  const { website: WEBSITE, component: COMPONENT } = usePresets()
  const [contrastOpen, setContrastOpen] = useState(false)

  // Ctrl+, opens Settings, as in most desktop apps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setView('settings')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const load = useCallback(() => {
    window.api.projects
      .list()
      .then((p) => {
        setProjects(p)
        setError(false)
      })
      .catch(() => setError(true))
  }, [])
  useEffect(load, [load])

  const run = async (fn: () => Promise<unknown>, done?: string): Promise<void> => {
    try {
      await fn()
      if (done) notify(done)
    } catch (e) {
      notify(errorText(e))
    }
    load()
  }

  const actions: CardActions = {
    open: onOpen,
    duplicate: (p) =>
      run(async () => {
        const full = await window.api.projects.get(p.id)
        if (!full) throw new Error('That project no longer exists')
        const now = Date.now()
        await window.api.projects.save({
          ...full,
          id: newId(),
          name: `${full.name} copy`,
          createdAt: now,
          updatedAt: now
        })
      }, 'Project duplicated'),
    exportFile: (p) =>
      run(async () => {
        if (await window.api.projects.export(p.id)) notify(`Exported “${p.name}”`)
      }),
    remove: setDeleting
  }

  const importProject = (): Promise<void> =>
    run(async () => {
      const id = await window.api.projects.import()
      if (id) onOpen(id)
    })

  const create = async (o: NewProjectOptions): Promise<void> => {
    const p = createProject(o)
    try {
      await window.api.projects.save(p)
      setCreating(null)
      onOpen(p.id)
    } catch {
      notify('The project couldn’t be created. Check free disk space and try again.')
    }
  }

  const tools: Tool[] = [
    { icon: Globe, label: 'New website', onClick: () => setCreating(WEBSITE) },
    { icon: Component, label: 'New component', onClick: () => setCreating(COMPONENT) },
    { icon: FileUp, label: 'Import project', onClick: () => importProject() },
    'divider',
    { icon: Contrast, label: 'Contrast checker', onClick: () => setContrastOpen(true) },
    { icon: Keyboard, label: 'Keyboard shortcuts', onClick: () => setShortcuts(true) },
    {
      icon: FolderOpen,
      label: 'Projects folder',
      onClick: () => run(() => window.api.projects.openFolder())
    },
    { icon: SettingsIcon, label: 'Settings', hint: 'Ctrl ,', onClick: () => setView('settings') }
  ]

  return (
    <>
      <TitleBar platform={platform} tools={tools} />
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Main" className="flex w-[232px] shrink-0 flex-col px-3 pb-3">
          <Button
            variant="primary"
            className="mb-5 h-9 w-full justify-center"
            onClick={() => setCreating(WEBSITE)}
          >
            <Plus size={16} aria-hidden /> New project
          </Button>
          <NavItem
            icon={House}
            label="Home"
            current={view === 'home'}
            onClick={() => setView('home')}
          />
          <NavItem
            icon={LayoutGrid}
            label="Projects"
            count={projects?.length}
            current={view === 'projects'}
            onClick={() => setView('projects')}
          />
          <div className="mt-auto grid gap-0.5">
            <NavItem icon={FileUp} label="Import project" onClick={importProject} />
            <NavItem
              icon={FolderOpen}
              label="Projects folder"
              onClick={() => run(() => window.api.projects.openFolder())}
            />
            <NavItem
              icon={Keyboard}
              label="Keyboard shortcuts"
              onClick={() => setShortcuts(true)}
            />
            <NavItem
              icon={SettingsIcon}
              label="Settings"
              current={view === 'settings'}
              onClick={() => setView('settings')}
            />
            <p className="px-2.5 pt-3 text-xs text-faint">Tenonkit {version}</p>
          </div>
        </nav>

        <main className="mr-2 mb-2 min-h-0 flex-1 overflow-y-auto rounded-panel border border-line bg-surface">
          {error ? (
            <Empty
              title="Projects didn’t load"
              text="Check that the app can write to its data folder, then try again."
              action={<Button onClick={load}>Try again</Button>}
            />
          ) : view === 'settings' ? (
            <SettingsPanel version={version} />
          ) : projects === null ? null : view === 'home' ? (
            <HomeView
              projects={projects}
              actions={actions}
              onNew={setCreating}
              onImport={importProject}
              onViewAll={() => setView('projects')}
            />
          ) : (
            <ProjectsView projects={projects} actions={actions} onNew={setCreating} />
          )}
        </main>

        {/* Mounted only while open, so every new project starts with a fresh form. */}
        {creating && (
          <NewProjectDialog preset={creating} onClose={() => setCreating(null)} onCreate={create} />
        )}
        <Modal
          open={!!deleting}
          onClose={() => setDeleting(null)}
          title={`Delete “${deleting?.name}”?`}
        >
          <p className="text-muted">
            The project is removed from this computer. Export it first if you might need it again.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                const p = deleting!
                setDeleting(null)
                forgetThumbnail(p.id)
                run(() => window.api.projects.delete(p.id), `Deleted “${p.name}”`)
              }}
            >
              Delete project
            </Button>
          </div>
        </Modal>
        <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
        <ContrastDialog open={contrastOpen} onClose={() => setContrastOpen(false)} />
      </div>
    </>
  )
}

function NavItem({
  icon: Icon,
  label,
  count,
  current,
  onClick
}: {
  icon: LucideIcon
  label: string
  count?: number
  current?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      aria-current={current ? 'page' : undefined}
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-muted hover:bg-active hover:text-ink aria-[current=page]:bg-active aria-[current=page]:font-medium aria-[current=page]:text-ink"
    >
      <Icon size={16} aria-hidden />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-faint tabular-nums">{count}</span>}
    </button>
  )
}

// ---- Home ----

const CODE = {
  html: `<section class="hero">
  <h1>Bread baked before
      the city wakes up.</h1>
  <a class="btn" href="#visit">
    Plan a visit</a>
</section>`,
  jsx: `export default function Plans() {
  return plans.map((p) => (
    <Card key={p.name} {...p} />
  ))
}`,
  tailwind: `<a className="rounded-full
   bg-brand px-5 py-3
   text-brand-ink md:text-lg">
  Book a call
</a>`
}

function HomeView({
  projects,
  actions,
  onNew,
  onImport,
  onViewAll
}: {
  projects: ProjectSummary[]
  actions: CardActions
  onNew: (p: Preset) => void
  onImport: () => void
  onViewAll: () => void
}): React.JSX.Element {
  const recent = projects.slice(0, 3)
  const { website: WEBSITE, component: COMPONENT } = usePresets()
  const { settings } = useSettings()
  return (
    <div className="mx-auto max-w-[1120px] px-8 pt-8 pb-14">
      {settings.homeBanner && (
        <section className="relative overflow-hidden rounded-[20px] bg-brand-dark px-12 pt-12 pb-10 text-white max-[1100px]:px-9">
          <BannerArt animate={settings.bannerAnimation} />
          <h2 className="relative">
            <Wordmark className="text-[clamp(80px,10vw,148px)]" />
          </h2>
          <div className="relative mt-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <p className="max-w-[46ch] text-lg leading-7 text-[#c9ccd1]">
              Build websites from components. Drag sections onto a page, edit their HTML or React,
              and style them with Tailwind.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onNew(WEBSITE)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 font-medium text-brand-dark transition-colors hover:bg-[#e6e8ea] active:translate-y-px"
              >
                <Globe size={16} aria-hidden /> New website
              </button>
              <button
                onClick={() => onNew(COMPONENT)}
                className="inline-flex h-10 items-center gap-2 rounded-lg px-4 font-medium text-white shadow-[inset_0_0_0_1px_#4a4d52] transition-colors hover:bg-[#25272a] active:translate-y-px"
              >
                <Component size={16} aria-hidden /> New component
              </button>
            </div>
          </div>
        </section>
      )}

      {settings.homeRecent && (
        <section className="mt-12 first:mt-0">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Recent projects</h2>
            {projects.length > 0 && (
              <button onClick={onViewAll} className="font-medium text-accent hover:underline">
                View all {projects.length}
              </button>
            )}
          </div>
          {recent.length ? (
            <div className="mt-4 grid grid-cols-3 gap-5">
              {recent.map((p) => (
                <ProjectCard key={p.id} p={p} actions={actions} />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-control px-6 py-12 text-center">
              <div>
                <p className="font-medium">Your projects will appear here</p>
                <p className="mt-1 text-muted">Start a website, or import a .tenon project file.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="primary" onClick={() => onNew(WEBSITE)}>
                    <Plus size={15} aria-hidden /> New website
                  </Button>
                  <Button onClick={onImport}>
                    <FileUp size={15} aria-hidden /> Import project
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {settings.homeWays && (
        <section className="mt-12 first:mt-0">
          <h2 className="text-lg font-semibold">Ways to build</h2>
          <div className="mt-4 grid grid-cols-3 gap-5">
            <Way
              title="Drag and drop sections"
              text="Start from a navigation, hero, pricing or footer, then make it yours in the code."
              code={CODE.html}
              action="Start a website"
              onClick={() => onNew(WEBSITE)}
            />
            <Way
              title="Write React components"
              text="JSX with props and lists. Every component project is reusable in all your websites."
              code={CODE.jsx}
              action="New React component"
              onClick={() => onNew(COMPONENT)}
            />
            <Way
              title="Style with Tailwind CSS v4"
              text="Classes compile as you type, and your colour tokens work as classes."
              code={CODE.tailwind}
              action="Start with Tailwind"
              onClick={() => onNew({ kind: 'site', starter: false, tailwind: true })}
            />
          </div>
        </section>
      )}
    </div>
  )
}

function Way({
  title,
  text,
  code,
  action,
  onClick
}: {
  title: string
  text: string
  code: string
  action: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col rounded-2xl bg-raised p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-muted">{text}</p>
      <pre className="mt-4 flex-1 overflow-hidden rounded-lg bg-surface p-3.5 font-mono text-xs leading-5 text-ink">
        {code}
      </pre>
      <Button className="mt-4 self-start" onClick={onClick}>
        {action}
      </Button>
    </div>
  )
}

// ---- Projects ----

function ProjectsView({
  projects,
  actions,
  onNew
}: {
  projects: ProjectSummary[]
  actions: CardActions
  onNew: (p: Preset) => void
}): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter(
      (p) => (filter === 'all' || p.kind === filter) && p.name.toLowerCase().includes(q)
    )
  }, [projects, filter, query])
  const { website: WEBSITE, component: COMPONENT } = usePresets()
  const count = (k: Filter): number => projects.filter((p) => k === 'all' || p.kind === k).length

  return (
    <div className="mx-auto max-w-[1180px] px-8 pt-8 pb-14">
      <div className="flex items-center gap-3">
        <h2 className="mr-auto text-[22px] font-semibold tracking-[-0.01em]">Projects</h2>
        <label className="flex h-8 w-64 items-center gap-2 rounded-md border border-line px-2.5 text-faint focus-within:border-control">
          <Search size={15} aria-hidden />
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint"
          />
        </label>
        <Button
          variant="primary"
          onClick={() => onNew(filter === 'component' ? COMPONENT : WEBSITE)}
        >
          <Plus size={15} aria-hidden /> New {filter === 'component' ? 'component' : 'project'}
        </Button>
      </div>
      <Tabs<Filter>
        className="mt-4 px-0"
        value={filter}
        onChange={setFilter}
        tabs={[
          {
            id: 'all',
            label: (
              <>
                All <Count n={count('all')} />
              </>
            )
          },
          {
            id: 'site',
            label: (
              <>
                Websites <Count n={count('site')} />
              </>
            )
          },
          {
            id: 'component',
            label: (
              <>
                Components <Count n={count('component')} />
              </>
            )
          }
        ]}
      />
      {projects.length === 0 ? (
        <Empty
          title="No projects yet"
          text="A website is a page built from components. A component is one reusable piece in HTML or React."
          action={
            <Button variant="primary" onClick={() => onNew(WEBSITE)}>
              <Plus size={15} aria-hidden /> New project
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        <Empty title="No projects match" text="Try another name, or switch to All." />
      ) : (
        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-5 gap-y-7">
          {shown.map((p) => (
            <ProjectCard key={p.id} p={p} actions={actions} />
          ))}
        </div>
      )}
    </div>
  )
}

type CardActions = {
  open: (id: string) => void
  duplicate: (p: ProjectSummary) => void
  exportFile: (p: ProjectSummary) => void
  remove: (p: ProjectSummary) => void
}

function useThumbnail(p: ProjectSummary, enabled: boolean): string | null | undefined {
  const [url, setUrl] = useState<{ key: string; url: string | null } | null>(null)
  const key = `${p.id}:${p.updatedAt}`
  useEffect(() => {
    if (!enabled) return
    let live = true
    getThumbnail(p.id).then((u) => live && setUrl({ key, url: u }))
    return () => {
      live = false
    }
  }, [p.id, key, enabled])
  // undefined while loading, null when there is nothing to show (or images are off)
  if (!enabled) return null
  return url?.key === key ? url.url : undefined
}

function ProjectCard({
  p,
  actions
}: {
  p: ProjectSummary
  actions: CardActions
}): React.JSX.Element {
  const { settings } = useSettings()
  const thumb = useThumbnail(p, settings.cardImages)
  return (
    <article className="group relative">
      <button
        onClick={() => actions.open(p.id)}
        className="block w-full rounded-xl text-left outline-offset-4"
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-raised shadow-[0_0_0_1px_var(--color-line)] transition-shadow group-hover:shadow-[0_0_0_1px_var(--color-control),0_8px_24px_rgba(0,0,0,0.08)]">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className="size-full object-cover object-top transition-transform duration-300 ease-out-soft group-hover:scale-[1.02]"
            />
          ) : thumb === null ? (
            settings.cardImages ? (
              <span className="grid size-full place-items-center text-xs text-muted">
                {p.blockCount ? 'No preview yet' : 'Empty page'}
              </span>
            ) : (
              // Card images are off in Settings → Performance: the name stands in.
              <span className="grid size-full place-items-center px-6 text-center text-xl font-semibold tracking-[-0.01em] text-muted">
                {p.name}
              </span>
            )
          ) : null}
          {p.kind === 'component' && (
            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-accent shadow-[0_0_0_1px_var(--color-line)]">
              <Component size={12} aria-hidden /> Component
            </span>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <h3 className="min-w-0 flex-1 truncate font-medium">{p.name}</h3>
          <span className="shrink-0 text-xs text-faint">{ago(p.updatedAt)}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {KIND_LABEL[p.kind]}, {p.blockCount} {p.blockCount === 1 ? 'component' : 'components'}
        </p>
      </button>
      <div className="absolute top-2 right-2 flex rounded-lg bg-surface p-0.5 opacity-0 shadow-[0_0_0_1px_var(--color-line),0_4px_12px_rgba(0,0,0,0.1)] transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <IconButton
          label={`Duplicate ${p.name}`}
          title="Duplicate"
          onClick={() => actions.duplicate(p)}
        >
          <Copy size={15} />
        </IconButton>
        <IconButton
          label={`Export ${p.name} as a .tenon file`}
          title="Export project file"
          onClick={() => actions.exportFile(p)}
        >
          <FileDown size={15} />
        </IconButton>
        <IconButton label={`Delete ${p.name}`} title="Delete" onClick={() => actions.remove(p)}>
          <Trash2 size={15} />
        </IconButton>
      </div>
    </article>
  )
}

const Count = ({ n }: { n: number }): React.JSX.Element => (
  <span className="ml-0.5 font-normal text-faint tabular-nums">{n}</span>
)

function Empty({
  title,
  text,
  action
}: {
  title: string
  text: string
  action?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="mx-auto mt-24 max-w-sm text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-muted">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

// ---- Dialogs ----

function NewProjectDialog({
  preset,
  onClose,
  onCreate
}: {
  preset: Preset
  onClose: () => void
  onCreate: (o: NewProjectOptions) => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ProjectKind>(preset.kind)
  const [starter, setStarter] = useState(preset.starter)
  const [tailwind, setTailwind] = useState(preset.tailwind)

  const choice = (selected: boolean): string =>
    cx(
      'flex flex-1 cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors',
      selected ? 'border-ink bg-raised' : 'border-line hover:border-control'
    )

  return (
    <Modal open onClose={onClose} title="New project">
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          onCreate({
            name: name.trim() || (kind === 'site' ? 'Untitled website' : 'Untitled component'),
            kind,
            starter,
            tailwind
          })
        }}
      >
        <Field label="Name">
          <input
            autoFocus
            className={inputClass}
            value={name}
            maxLength={120}
            placeholder={kind === 'site' ? 'Bakery website' : 'Pricing table'}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-xs font-medium text-muted">Type</legend>
          <div className="flex gap-2">
            {(['site', 'component'] as const).map((k) => (
              <label key={k} className={choice(kind === k)}>
                <input
                  type="radio"
                  name="kind"
                  className="sr-only"
                  checked={kind === k}
                  onChange={() => {
                    setKind(k)
                    setStarter(true)
                  }}
                />
                {k === 'site' ? (
                  <Globe size={18} className="mt-px text-muted" aria-hidden />
                ) : (
                  <Component size={18} className="mt-px text-accent" aria-hidden />
                )}
                <span>
                  <span className="block font-semibold">{KIND_LABEL[k]}</span>
                  <span className="text-xs text-muted">
                    {k === 'site'
                      ? 'A page built from components'
                      : 'One reusable piece for any website'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-2.5">
          <Check checked={starter} onChange={setStarter}>
            {kind === 'site' ? 'Start with an example page' : 'Write it in React (JSX)'}
          </Check>
          <Check checked={tailwind} onChange={setTailwind}>
            Use Tailwind CSS
          </Check>
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Check({
  checked,
  onChange,
  children
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-ink"
      />
      {children}
    </label>
  )
}
