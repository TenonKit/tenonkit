import { useEffect, useState } from 'react'
import { Check, Download, Paintbrush, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import {
  BUILT_IN_THEMES,
  SYSTEM_THEME,
  Theme,
  THEME_FORMAT,
  THEME_TOKENS,
  ThemeToken,
  themeIdFrom
} from '../../../shared/theme'
import { useSettings } from '../settings'
import { contrast } from '../design'
import { Button, IconButton, Modal } from './ui'
import { cx, inputClass } from './styles'
import { Row, Segmented } from './SettingsControls'

const NAMES: Record<ThemeToken, string> = {
  ground: 'Window',
  surface: 'Panels',
  raised: 'Raised areas',
  active: 'Selected',
  hover: 'Hover',
  line: 'Borders',
  rule: 'Dividers',
  control: 'Field borders',
  ink: 'Text',
  muted: 'Secondary text',
  faint: 'Hints',
  accent: 'Accent',
  'accent-soft': 'Accent tint',
  primary: 'Primary button',
  'primary-hover': 'Primary button hover',
  'primary-ink': 'Primary button text',
  danger: 'Danger',
  'danger-soft': 'Danger tint',
  'danger-ink': 'Danger text',
  'warning-soft': 'Warning tint',
  'warning-ink': 'Warning text',
  'positive-soft': 'Success tint',
  'positive-ink': 'Success text',
  'code-tag': 'Tags and properties',
  'code-attr': 'Keywords',
  'code-string': 'Strings',
  'code-number': 'Numbers',
  'code-comment': 'Comments'
}
const GROUPS: [string, ThemeToken[]][] = [
  ['Surfaces', THEME_TOKENS.slice(0, 8)],
  ['Text', THEME_TOKENS.slice(8, 11)],
  ['Accent and buttons', THEME_TOKENS.slice(11, 16)],
  ['Status', THEME_TOKENS.slice(16, 23)],
  ['Code editor', THEME_TOKENS.slice(23)]
]

// The main process validates themes, and only accepts objects marked with the file format.
const asFile = (t: Theme): Theme & { format: string } => ({ ...t, format: THEME_FORMAT })

const errorText = (e: unknown): string =>
  e instanceof Error
    ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
    : String(e)

export default function AppearanceSettings(): React.JSX.Element {
  const { settings, update, themes, activeTheme, reloadThemes } = useSettings()
  const [draft, setDraft] = useState<{ theme: Theme; isNew: boolean } | null>(null)
  const [deleting, setDeleting] = useState<Theme | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>): Promise<void> => {
    setMessage(null)
    try {
      await fn()
    } catch (e) {
      setMessage(errorText(e))
    }
  }

  if (draft)
    return (
      <ThemeEditor
        initial={draft.theme}
        onCancel={() => setDraft(null)}
        onSave={(t) =>
          run(async () => {
            // A new theme gets a fresh id, never one that's already taken.
            let id = draft.isNew ? themeIdFrom(t.name) : t.id
            if (draft.isNew)
              for (let i = 2; themes.some((x) => x.id === id); i++)
                id = `${themeIdFrom(t.name)}-${i}`
            const saved = await window.api.themes.save(asFile({ ...t, id }))
            await reloadThemes()
            update({ theme: saved.id })
            setDraft(null)
          })
        }
      />
    )

  const startNew = (from: Theme): void =>
    setDraft({
      isNew: true,
      theme: {
        ...from,
        id: '',
        builtIn: undefined,
        name: `${from.name} copy`,
        author: '',
        description: ''
      }
    })

  return (
    <>
      <div className="mb-4">
        <h3 className="text-[22px] font-semibold tracking-[-0.01em]">Appearance</h3>
        <p className="mt-1 text-muted">
          Themes change Tenonkit’s own colours. The websites you build keep theirs.
        </p>
      </div>

      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-3">
        <ThemeCard
          name="Match system"
          detail="Light or Dark, following Windows"
          selected={settings.theme === SYSTEM_THEME}
          onSelect={() => update({ theme: SYSTEM_THEME })}
          preview={<SystemPreview />}
        />
        {themes.map((t) => (
          <ThemeCard
            key={t.id}
            name={t.name}
            detail={
              t.builtIn
                ? t.description
                : t.author
                  ? `By ${t.author}`
                  : t.description || 'Your theme'
            }
            selected={settings.theme === t.id}
            onSelect={() => update({ theme: t.id })}
            preview={<Preview theme={t} />}
            actions={
              <>
                {t.builtIn ? (
                  <IconButton
                    label={`Customize ${t.name}`}
                    title="Customize as a new theme"
                    onClick={() => startNew(t)}
                  >
                    <Paintbrush size={14} />
                  </IconButton>
                ) : (
                  <IconButton
                    label={`Edit ${t.name}`}
                    title="Edit"
                    onClick={() => setDraft({ theme: t, isNew: false })}
                  >
                    <Pencil size={14} />
                  </IconButton>
                )}
                <IconButton
                  label={`Export ${t.name}`}
                  title="Export .tenontheme file"
                  onClick={() => run(() => window.api.themes.export(asFile(t)))}
                >
                  <Download size={14} />
                </IconButton>
                {!t.builtIn && (
                  <IconButton
                    label={`Delete ${t.name}`}
                    title="Delete"
                    onClick={() => setDeleting(t)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                )}
              </>
            }
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => startNew(activeTheme)}>
          <Plus size={15} aria-hidden /> New theme
        </Button>
        <Button
          onClick={() => run(async () => (await window.api.themes.import()) && reloadThemes())}
        >
          <Upload size={15} aria-hidden /> Import .tenontheme
        </Button>
      </div>
      {message && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-danger-ink">
          {message}
        </p>
      )}
      <p className="mt-6 text-xs leading-[18px] text-muted">
        A theme is a <code className="font-mono">.tenontheme</code> file: a name, author,
        description, light or dark, and its colours. Double-click one to install it, or share yours
        with Export.
      </p>

      <h4 className="mt-8 mb-1 font-semibold">Personalize</h4>
      <Row
        title="Accent colour"
        text="Used for selections, links and highlights. Overrides the theme’s own accent."
      >
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label="Accent colour"
            value={settings.accent || activeTheme.colors.accent}
            onChange={(e) => update({ accent: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded-md border border-control bg-surface p-0.5"
          />
          <Button disabled={!settings.accent} onClick={() => update({ accent: '' })}>
            Use theme’s
          </Button>
        </div>
      </Row>
      <Row title="Interface size" text="Makes everything in Tenonkit larger or smaller.">
        <Segmented
          label="Interface size"
          value={settings.uiScale}
          onChange={(v) => update({ uiScale: v })}
          options={[0.9, 1, 1.1, 1.25].map((n) => ({ value: n, label: `${Math.round(n * 100)}%` }))}
        />
      </Row>
      <Row title="Interface font">
        <Segmented
          label="Interface font"
          value={settings.uiFont}
          onChange={(v) => update({ uiFont: v })}
          options={[
            { value: 'plex', label: 'IBM Plex Sans' },
            { value: 'system', label: 'System' }
          ]}
        />
      </Row>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
      >
        <p className="text-muted">Export it first if you might want it again.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => {
              const t = deleting!
              setDeleting(null)
              run(async () => {
                await window.api.themes.delete(t.id)
                if (settings.theme === t.id) update({ theme: SYSTEM_THEME })
                await reloadThemes()
              })
            }}
          >
            Delete theme
          </Button>
        </div>
      </Modal>
    </>
  )
}

function ThemeCard({
  name,
  detail,
  selected,
  onSelect,
  preview,
  actions
}: {
  name: string
  detail: string
  selected: boolean
  onSelect: () => void
  preview: React.ReactNode
  actions?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="group relative">
      <button
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cx(
          'block w-full rounded-xl p-2 text-left transition-shadow',
          selected
            ? 'shadow-[0_0_0_2px_var(--color-ink)]'
            : 'shadow-[0_0_0_1px_var(--color-line)] hover:shadow-[0_0_0_1px_var(--color-control)]'
        )}
      >
        {preview}
        <span className="mt-2 flex items-center gap-1.5 px-1 font-medium">
          {name}
          {selected && <Check size={14} aria-hidden />}
        </span>
        <span className="block truncate px-1 pb-0.5 text-xs text-muted">{detail}</span>
      </button>
      {actions && (
        <div className="absolute top-3 right-3 flex rounded-lg bg-surface opacity-0 shadow-[0_0_0_1px_var(--color-line)] group-focus-within:opacity-100 group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  )
}

/** A miniature Tenonkit window drawn in the theme's own colours. */
function Preview({ theme }: { theme: Theme }): React.JSX.Element {
  const c = theme.colors
  return (
    <div
      aria-hidden
      className="flex h-[88px] gap-1.5 overflow-hidden rounded-lg p-1.5"
      style={{ background: c.ground }}
    >
      <div className="flex w-1/4 flex-col gap-1 rounded-md p-1.5" style={{ background: c.surface }}>
        <span className="h-1.5 w-3/4 rounded-full" style={{ background: c.ink }} />
        <span className="h-1.5 w-1/2 rounded-full" style={{ background: c.muted }} />
        <span className="mt-0.5 h-3 rounded" style={{ background: c.active }} />
      </div>
      <div
        className="flex flex-1 flex-col gap-1 rounded-md p-1.5"
        style={{ background: c.surface }}
      >
        <span className="h-2 w-1/2 rounded-full" style={{ background: c.ink }} />
        <span className="h-1.5 w-4/5 rounded-full" style={{ background: c.muted }} />
        <span className="h-1.5 w-2/3 rounded-full" style={{ background: c['code-tag'] }} />
        <div className="mt-auto flex gap-1">
          <span className="h-3 w-8 rounded" style={{ background: c.primary }} />
          <span className="h-3 w-5 rounded" style={{ background: c.accent }} />
        </div>
      </div>
    </div>
  )
}

function SystemPreview(): React.JSX.Element {
  return (
    <div aria-hidden className="relative h-[88px] overflow-hidden rounded-lg">
      <div className="absolute inset-0">
        <Preview theme={BUILT_IN_THEMES[0]} />
      </div>
      <div className="absolute inset-0 [clip-path:polygon(60%_0,100%_0,100%_100%,40%_100%)]">
        <Preview theme={BUILT_IN_THEMES[1]} />
      </div>
    </div>
  )
}

function ThemeEditor({
  initial,
  onSave,
  onCancel
}: {
  initial: Theme
  onSave: (t: Theme) => void
  onCancel: () => void
}): React.JSX.Element {
  const { previewTheme } = useSettings()
  const [t, setT] = useState(initial)
  // The whole app shows the draft while it's being edited.
  useEffect(() => {
    previewTheme(t)
  }, [t, previewTheme])
  useEffect(() => () => previewTheme(null), [previewTheme])

  const set = (k: ThemeToken, v: string): void => setT({ ...t, colors: { ...t.colors, [k]: v } })
  const textContrast = contrast(t.colors.ink, t.colors.surface) ?? 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ ...t, name: t.name.trim() || 'Untitled theme' })
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[22px] font-semibold tracking-[-0.01em]">
            {initial.id ? 'Edit theme' : 'New theme'}
          </h3>
          <p className="mt-1 text-muted">Changes show across the app as you make them.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" type="submit">
            Save theme
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Name" value={t.name} max={60} onChange={(name) => setT({ ...t, name })} />
        <TextField
          label="Author"
          value={t.author}
          max={60}
          onChange={(author) => setT({ ...t, author })}
        />
        <div className="col-span-2">
          <TextField
            label="Description"
            value={t.description}
            max={200}
            onChange={(description) => setT({ ...t, description })}
          />
        </div>
        <div className="col-span-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted">Built for</span>
          <div role="radiogroup" aria-label="Built for" className="flex rounded-lg bg-active p-0.5">
            {(['light', 'dark'] as const).map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={t.appearance === a}
                onClick={() => setT({ ...t, appearance: a })}
                className="h-7 rounded-md px-3 text-muted capitalize aria-checked:bg-surface aria-checked:font-medium aria-checked:text-ink"
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {textContrast < 4.5 && (
        <p role="alert" className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-warning-ink">
          Text on panels has a contrast of {textContrast.toFixed(1)}:1, below the 4.5:1 that keeps
          it readable.
        </p>
      )}

      {GROUPS.map(([title, tokens]) => (
        <fieldset key={title} className="mt-6">
          <legend className="mb-2 text-xs font-semibold">{title}</legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {tokens.map((k) => (
              <label key={k} className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={t.colors[k]}
                  onChange={(e) => set(k, e.target.value)}
                  className="h-7 w-9 shrink-0 cursor-pointer rounded-md border border-control bg-surface p-0.5"
                />
                <span className="min-w-0 flex-1 truncate">{NAMES[k]}</span>
                <span className="font-mono text-xs text-faint">{t.colors[k]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </form>
  )
}

function TextField({
  label,
  value,
  max,
  onChange
}: {
  label: string
  value: string
  max: number
  onChange: (v: string) => void
}): React.JSX.Element {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        className={inputClass}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
