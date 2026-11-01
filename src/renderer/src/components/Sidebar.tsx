import { createElement, useRef, useState } from 'react'
import {
  AlignLeft,
  Atom,
  Blocks,
  ChevronRight,
  CircleHelp,
  Code,
  Columns2,
  Component,
  CreditCard,
  GripVertical,
  Heading,
  Image,
  Images,
  Layers as LayersIcon,
  LayoutTemplate,
  ListChecks,
  Mail,
  Megaphone,
  Menu,
  MousePointerClick,
  PanelBottom,
  Puzzle,
  Quote,
  Search,
  SeparatorHorizontal,
  X,
  type LucideIcon
} from 'lucide-react'
import { ComponentDef, LIBRARY } from '../library'
import { Action, Block } from '../store'
import { drag, dropIndex } from '../drag'
import { cx } from './styles'

const ICONS: Record<string, LucideIcon> = {
  nav: Menu,
  hero: LayoutTemplate,
  'hero-image': Columns2,
  features: ListChecks,
  about: Columns2,
  gallery: Images,
  pricing: CreditCard,
  quote: Quote,
  faq: CircleHelp,
  cta: Megaphone,
  contact: Mail,
  footer: PanelBottom,
  heading: Heading,
  text: AlignLeft,
  button: MousePointerClick,
  image: Image,
  spacer: SeparatorHorizontal,
  custom: Code
}
const iconFor = (type: string, lang?: string): LucideIcon =>
  type.startsWith('project:') ? Component : (ICONS[type] ?? (lang === 'jsx' ? Atom : Puzzle))

const GROUPS = ['My components', 'Sections', 'React', 'Elements'] as const

export type SidebarTab = 'components' | 'layers'

type Props = {
  tab: SidebarTab
  onTab: (tab: SidebarTab) => void
  blocks: Block[]
  selected: string | null
  myComponents: ComponentDef[]
  dispatch: (a: Action) => void
}

// One entry per tab: a new sidebar panel is one line here plus its body in Sidebar.
const TABS: {
  id: SidebarTab
  label: string
  icon: React.ReactNode
  count?: (p: Props) => number
}[] = [
  { id: 'components', label: 'Components', icon: <Blocks size={15} aria-hidden /> },
  {
    id: 'layers',
    label: 'Layers',
    icon: <LayersIcon size={15} aria-hidden />,
    count: (p) => p.blocks.length
  }
]

export default function Sidebar(props: Props): React.JSX.Element {
  const { tab, onTab } = props
  const list = useRef<HTMLDivElement>(null)

  // Arrow keys move between tabs, as in any tablist.
  const onKeyDown = (e: React.KeyboardEvent): void => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const i = (TABS.findIndex((t) => t.id === tab) + step + TABS.length) % TABS.length
    onTab(TABS[i].id)
    list.current?.querySelectorAll<HTMLElement>('[role=tab]')[i]?.focus()
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-surface">
      <div
        ref={list}
        role="tablist"
        aria-label="Sidebar"
        onKeyDown={onKeyDown}
        className="m-2 mb-0 grid shrink-0 auto-cols-fr grid-flow-col gap-0.5 rounded-lg bg-raised p-0.5"
      >
        {TABS.map((t) => {
          const count = t.count?.(props)
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`sidebar-tab-${t.id}`}
              aria-controls={`sidebar-panel-${t.id}`}
              aria-selected={tab === t.id}
              tabIndex={tab === t.id ? 0 : -1}
              title={t.label}
              onClick={() => onTab(t.id)}
              className="flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted transition-colors hover:text-ink aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-sm"
            >
              <span className="shrink-0">{t.icon}</span>
              <span className="truncate">{t.label}</span>
              {count !== undefined && count > 0 && (
                <span className="shrink-0 text-xs font-normal text-faint tabular-nums">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`sidebar-panel-${t.id}`}
          aria-labelledby={`sidebar-tab-${t.id}`}
          hidden={tab !== t.id}
          className="flex min-h-0 flex-1 flex-col"
        >
          {t.id === 'components' && tab === t.id && <Palette {...props} />}
          {t.id === 'layers' && tab === t.id && <Layers {...props} />}
        </div>
      ))}
    </aside>
  )
}

function Row({
  mine,
  icon,
  name,
  lang,
  current,
  ...rest
}: {
  mine?: boolean
  icon: string
  name: string
  lang?: string
  current?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element {
  return (
    <button
      type="button"
      aria-current={current ? 'true' : undefined}
      className="group flex h-9 w-full items-center gap-2.5 rounded-md px-1.5 text-left text-[13px] hover:bg-raised active:cursor-grabbing aria-[current=true]:bg-active aria-[current=true]:font-medium"
      {...rest}
    >
      <span
        className={cx(
          'grid size-6 shrink-0 place-items-center rounded-md',
          mine ? 'bg-accent-soft text-accent' : 'bg-raised text-muted group-hover:bg-active'
        )}
      >
        {createElement(iconFor(icon, lang), { size: 14, 'aria-hidden': true })}
      </span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {lang === 'jsx' && (
        <span className="shrink-0 rounded bg-raised px-1 text-[10px] font-medium text-faint">
          JSX
        </span>
      )}
      <GripVertical
        size={14}
        className="shrink-0 text-control opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      />
    </button>
  )
}

function Palette({ blocks, selected, myComponents, dispatch }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const all = [...myComponents, ...LIBRARY].filter((d) => d.name.toLowerCase().includes(q))
  const groups = GROUPS.map((g) => [g, all.filter((d) => d.group === g)] as const).filter(
    ([, items]) => items.length
  )

  // Clicking adds after the selected component, or at the end of the page.
  const insertAt = (): number => {
    const i = blocks.findIndex((b) => b.id === selected)
    return i < 0 ? blocks.length : i + 1
  }

  return (
    <>
      {/* Outside the scroller, so search stays in reach however long the list gets. */}
      <div className="shrink-0 p-2 pb-1">
        <label className="flex h-8 items-center gap-2 rounded-md border border-line px-2.5 text-faint focus-within:border-control">
          <Search size={14} aria-hidden />
          <input
            type="search"
            placeholder="Search components"
            aria-label="Search components"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="grid size-5 place-items-center rounded text-faint hover:text-ink"
            >
              <X size={13} aria-hidden />
            </button>
          )}
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.map(([group, items]) => (
          <Group key={group} title={group} count={items.length} forceOpen={!!q}>
            {items.map((def) => (
              <li key={def.type}>
                <Row
                  mine={def.group === 'My components'}
                  icon={def.type}
                  name={def.name}
                  lang={def.lang}
                  draggable
                  title="Drag onto the page, or click to add"
                  onDragStart={(e) => {
                    drag.current = { kind: 'new', def }
                    e.dataTransfer.setData('text/plain', def.name)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onDragEnd={() => (drag.current = null)}
                  onClick={() => dispatch({ type: 'add', def, index: insertAt() })}
                />
              </li>
            ))}
          </Group>
        ))}
        {groups.length === 0 && <Empty>No components match “{query}”.</Empty>}
      </div>
    </>
  )
}

/** A collapsible list section. Searching forces it open, so a match is never hidden. */
function Group({
  title,
  count,
  forceOpen,
  children
}: {
  title: string
  count: number
  forceOpen: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(true)
  const shown = open || forceOpen
  return (
    <section className="pt-2">
      <button
        type="button"
        aria-expanded={shown}
        onClick={() => setOpen(!shown)}
        className="flex h-7 w-full items-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted hover:text-ink"
      >
        <ChevronRight
          size={13}
          className={cx('shrink-0 transition-transform', shown && 'rotate-90')}
          aria-hidden
        />
        <span className="flex-1 text-left">{title}</span>
        <span className="font-normal text-faint tabular-nums">{count}</span>
      </button>
      {shown && <ul className="pt-0.5">{children}</ul>}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p className="px-4 py-8 text-center text-xs leading-relaxed text-muted">{children}</p>
}

function Layers({ blocks, selected, dispatch }: Props): React.JSX.Element {
  const [drop, setDrop] = useState<number | null>(null)
  const rows = (el: HTMLElement): Element[] => [...el.querySelectorAll('[data-layer]')]

  if (blocks.length === 0)
    return <Empty>Components you add to the page appear here, in order.</Empty>

  return (
    <ol
      className="min-h-0 flex-1 overflow-y-auto p-2"
      onDragOver={(e) => {
        if (!drag.current) return
        e.preventDefault()
        setDrop(dropIndex(e.clientY, rows(e.currentTarget)))
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDrop(null)}
      onDrop={(e) => {
        const p = drag.current
        if (!p) return
        e.preventDefault()
        const index = dropIndex(e.clientY, rows(e.currentTarget))
        dispatch(
          p.kind === 'new' ? { type: 'add', def: p.def, index } : { type: 'move', id: p.id, index }
        )
        drag.current = null
        setDrop(null)
      }}
    >
      {blocks.map((b, i) => (
        <li key={b.id} data-layer className="relative">
          {(drop === i || (drop === blocks.length && i === blocks.length - 1)) && (
            <span
              className={cx(
                'absolute inset-x-2 h-0.5 rounded-full bg-accent',
                drop === i ? '-top-px' : '-bottom-px'
              )}
            />
          )}
          <Row
            icon={b.type}
            name={b.name}
            lang={b.lang}
            current={selected === b.id}
            draggable
            onDragStart={(e) => {
              drag.current = { kind: 'move', id: b.id }
              e.dataTransfer.setData('text/plain', b.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => {
              drag.current = null
              setDrop(null)
            }}
            onClick={() => dispatch({ type: 'select', id: b.id })}
          />
        </li>
      ))}
    </ol>
  )
}
