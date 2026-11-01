import { useEffect, useRef, useState } from 'react'
import {
  Code,
  FileText,
  FolderOpen,
  Gauge,
  Info,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  X,
  type LucideIcon
} from 'lucide-react'
import { DEFAULT_SETTINGS, Settings } from '../../../shared/settings'
import { LIGHT_SETTINGS, useSettings } from '../settings'
import { Wordmark } from './Logo'
import AppearanceSettings from './AppearanceSettings'
import { Heading, Row, Segmented, Switch } from './SettingsControls'
import { Button, IconButton } from './ui'

type Section = 'general' | 'appearance' | 'editor' | 'performance' | 'about'

const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'editor', label: 'Editor', icon: Code },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'about', label: 'About', icon: Info }
]

/** Settings with their own section sidebar. Shown as a Home page and as a modal in the editor. */
export default function SettingsPanel({
  version,
  onClose
}: {
  version: string
  /** Present in the modal: shows a close button. */
  onClose?: () => void
}): React.JSX.Element {
  const [section, setSection] = useState<Section>('general')
  return (
    <div className="grid h-full min-h-0 grid-cols-[200px_minmax(0,1fr)]">
      <nav
        aria-label="Settings sections"
        className="flex flex-col gap-0.5 border-r border-rule p-3"
      >
        <h2 className="px-2.5 pt-2 pb-3 text-base font-semibold">Settings</h2>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-current={section === id ? 'page' : undefined}
            onClick={() => setSection(id)}
            className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-muted hover:bg-raised hover:text-ink aria-[current=page]:bg-active aria-[current=page]:font-medium aria-[current=page]:text-ink"
          >
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </nav>
      <div className="relative min-h-0 overflow-y-auto">
        {onClose && (
          <IconButton label="Close settings" className="absolute top-3 right-3" onClick={onClose}>
            <X size={16} />
          </IconButton>
        )}
        <div className="max-w-[640px] px-8 pt-7 pb-10">
          {section === 'general' && <General />}
          {section === 'appearance' && <AppearanceSettings />}
          {section === 'editor' && <Editor />}
          {section === 'performance' && <Performance />}
          {section === 'about' && <About version={version} />}
        </div>
      </div>
    </div>
  )
}

// ---- Sections ----

function General(): React.JSX.Element {
  const { settings, update } = useSettings()
  return (
    <>
      <Heading title="General" text="New projects, and what you see when Tenonkit opens." />
      <Row
        title="Use Tailwind CSS in new projects"
        text="You can still turn it off for a single project when you create it."
      >
        <Switch
          label="Use Tailwind CSS in new projects"
          checked={settings.newTailwind}
          onChange={(v) => update({ newTailwind: v })}
        />
      </Row>
      <Row
        title="Start websites with an example page"
        text="Navigation, hero, features and footer, ready to edit. Components start in React."
      >
        <Switch
          label="Start websites with an example page"
          checked={settings.newStarter}
          onChange={(v) => update({ newStarter: v })}
        />
      </Row>

      <h4 className="mt-8 mb-1 font-semibold">Startup and Home</h4>
      <Row title="When Tenonkit opens">
        <Segmented
          label="When Tenonkit opens"
          value={settings.startup}
          onChange={(v) => update({ startup: v })}
          options={[
            { value: 'home', label: 'Show Home' },
            { value: 'last', label: 'Reopen last project' }
          ]}
        />
      </Row>
      <Row title="Banner" text="The Tenonkit banner at the top of Home.">
        <Switch
          label="Show the banner on Home"
          checked={settings.homeBanner}
          onChange={(v) => update({ homeBanner: v })}
        />
      </Row>
      <Row title="Recent projects">
        <Switch
          label="Show recent projects on Home"
          checked={settings.homeRecent}
          onChange={(v) => update({ homeRecent: v })}
        />
      </Row>
      <Row title="Ways to build" text="The three getting-started panels.">
        <Switch
          label="Show Ways to build on Home"
          checked={settings.homeWays}
          onChange={(v) => update({ homeWays: v })}
        />
      </Row>
    </>
  )
}

function Editor(): React.JSX.Element {
  const { settings, update } = useSettings()
  return (
    <>
      <Heading title="Editor" text="How code and the canvas look while you work." />
      <Row title="Code font size">
        <Segmented
          label="Code font size"
          value={settings.codeFontSize}
          onChange={(v) => update({ codeFontSize: v })}
          options={[12, 13, 14, 15, 16].map((n) => ({ value: n, label: String(n) }))}
        />
      </Row>
      <Row title="Code font">
        <Segmented
          label="Code font"
          value={settings.codeFont}
          onChange={(v) => update({ codeFont: v })}
          options={[
            { value: 'plex', label: 'IBM Plex Mono' },
            { value: 'system', label: 'System' }
          ]}
        />
      </Row>
      <Row title="Tab size" text="Spaces inserted when you press Tab.">
        <Segmented
          label="Tab size"
          value={settings.tabSize}
          onChange={(v) => update({ tabSize: v })}
          options={[2, 4].map((n) => ({ value: n, label: `${n} spaces` }))}
        />
      </Row>
      <Row title="Line numbers">
        <Switch
          label="Line numbers"
          checked={settings.lineNumbers}
          onChange={(v) => update({ lineNumbers: v })}
        />
      </Row>
      <Row title="Wrap long lines" text="Off scrolls long lines sideways instead.">
        <Switch
          label="Wrap long lines"
          checked={settings.codeWrap}
          onChange={(v) => update({ codeWrap: v })}
        />
      </Row>
      <Row title="Canvas width when a project opens">
        <Segmented
          label="Canvas width when a project opens"
          value={settings.defaultDevice}
          onChange={(v) => update({ defaultDevice: v })}
          options={[
            { value: 'desktop', label: 'Desktop' },
            { value: 'tablet', label: 'Tablet' },
            { value: 'phone', label: 'Phone' }
          ]}
        />
      </Row>
    </>
  )
}

function Performance(): React.JSX.Element {
  const { settings, update, launchedWithGpu } = useSettings()
  const light = Object.entries(LIGHT_SETTINGS).every(
    ([k, v]) => settings[k as keyof Settings] === v
  )
  return (
    <>
      <Heading
        title="Performance"
        text="If Tenonkit feels slow on this computer, turn these down. Your projects aren’t affected."
      />
      <div className="mb-2 flex items-center justify-between gap-4 rounded-xl bg-raised px-4 py-3.5">
        <p className="text-muted">
          {light ? 'Light settings are on.' : 'Turn everything below down in one go.'}
        </p>
        <Button
          variant={light ? 'secondary' : 'primary'}
          onClick={() =>
            update(
              light
                ? {
                    bannerAnimation: DEFAULT_SETTINGS.bannerAnimation,
                    interfaceAnimations: DEFAULT_SETTINGS.interfaceAnimations,
                    cardImages: DEFAULT_SETTINGS.cardImages,
                    renderSpeed: DEFAULT_SETTINGS.renderSpeed
                  }
                : LIGHT_SETTINGS
            )
          }
        >
          {light ? 'Restore defaults' : 'Use light settings'}
        </Button>
      </div>
      <Row title="Banner animation" text="The moving page blocks behind the banner on Home.">
        <Switch
          label="Banner animation"
          checked={settings.bannerAnimation}
          onChange={(v) => update({ bannerAnimation: v })}
        />
      </Row>
      <Row
        title="Interface animations"
        text="Transitions in menus, dialogs and the canvas when you change its width."
      >
        <Switch
          label="Interface animations"
          checked={settings.interfaceAnimations}
          onChange={(v) => update({ interfaceAnimations: v })}
        />
      </Row>
      <Row
        title="Project card images"
        text="Takes a screenshot of each project after you edit it. Off shows the project’s name instead."
      >
        <Switch
          label="Project card images"
          checked={settings.cardImages}
          onChange={(v) => update({ cardImages: v })}
        />
      </Row>
      <Row
        title="Canvas updates while typing"
        text="Light waits until you pause, so the page re-renders less often."
      >
        <Segmented
          label="Canvas updates while typing"
          value={settings.renderSpeed}
          onChange={(v) => update({ renderSpeed: v })}
          options={[
            { value: 'instant', label: 'Instant' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'saver', label: 'Light' }
          ]}
        />
      </Row>
      <Row
        title="Graphics acceleration"
        text="Uses the graphics card to draw the window. Turn it off if the window flickers or stays blank."
      >
        <Switch
          label="Graphics acceleration"
          checked={settings.hardwareAcceleration}
          onChange={(v) => update({ hardwareAcceleration: v })}
        />
      </Row>
      {settings.hardwareAcceleration !== launchedWithGpu && (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-warning-soft px-4 py-3 text-warning-ink">
          <p>Graphics acceleration changes after a restart.</p>
          <Button onClick={() => window.api.relaunch()}>
            <RotateCcw size={15} aria-hidden /> Restart now
          </Button>
        </div>
      )}
    </>
  )
}

function About({ version }: { version: string }): React.JSX.Element {
  return (
    <>
      <div className="mb-8 rounded-2xl bg-brand-dark px-7 pt-7 pb-6 text-white">
        <Wordmark className="text-[56px]" />
        <p className="mt-4 text-[#c9ccd1]">Version {version}</p>
      </div>
      <Row title="Projects folder" text="Every project is a file here, with its card image.">
        <Button onClick={() => window.api.projects.openFolder()}>
          <FolderOpen size={15} aria-hidden /> Open
        </Button>
      </Row>
      <Row title="Logs" text="Useful when reporting a problem.">
        <Button onClick={() => window.api.openLogs()}>
          <FileText size={15} aria-hidden /> Open
        </Button>
      </Row>
    </>
  )
}

/** The same panel as a large modal, for opening settings from inside a project. */
export function SettingsDialog({
  open,
  onClose,
  version
}: {
  open: boolean
  onClose: () => void
  version: string
}): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current!
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-label="Settings"
      className="modal wide"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {open && <SettingsPanel version={version} onClose={onClose} />}
    </dialog>
  )
}
