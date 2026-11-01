// App settings, shared by the main process (stored in settings.json) and the renderer.

export type Device = 'desktop' | 'tablet' | 'phone'
export type RenderSpeed = 'instant' | 'balanced' | 'saver'
export type FontChoice = 'plex' | 'system'

export type Settings = {
  /** A theme id from src/shared/theme.ts or the user's themes, or 'system'. */
  theme: string
  /** A hex colour that replaces the theme's accent, or '' to use the theme's own. */
  accent: string
  /** Interface zoom: 0.9, 1, 1.1 or 1.25. */
  uiScale: number
  uiFont: FontChoice
  // Startup and Home
  startup: 'home' | 'last'
  /** The project opened most recently, for startup: 'last'. */
  lastProject: string
  homeBanner: boolean
  homeRecent: boolean
  homeWays: boolean
  // New projects
  newTailwind: boolean
  newStarter: boolean
  // Editor
  codeFontSize: number
  codeWrap: boolean
  codeFont: FontChoice
  tabSize: number
  lineNumbers: boolean
  defaultDevice: Device
  // Performance
  bannerAnimation: boolean
  interfaceAnimations: boolean
  cardImages: boolean
  renderSpeed: RenderSpeed
  /** Read by the main process at launch; changes apply after a restart. */
  hardwareAcceleration: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: '',
  uiScale: 1,
  uiFont: 'plex',
  startup: 'home',
  lastProject: '',
  homeBanner: true,
  homeRecent: true,
  homeWays: true,
  newTailwind: true,
  newStarter: true,
  codeFontSize: 13,
  codeWrap: true,
  codeFont: 'plex',
  tabSize: 2,
  lineNumbers: true,
  defaultDevice: 'desktop',
  bannerAnimation: true,
  interfaceAnimations: true,
  cardImages: true,
  renderSpeed: 'instant',
  hardwareAcceleration: true
}

/** How long the canvas waits after a keystroke before re-rendering. */
export const RENDER_DELAY_MS: Record<RenderSpeed, number> = {
  instant: 80,
  balanced: 300,
  saver: 900
}

const pick = <T>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback)

/** Fills in defaults and drops anything invalid, for values read from disk or sent by the page. */
export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_SETTINGS
  return {
    theme: typeof r.theme === 'string' && /^[a-z0-9-]{1,64}$/.test(r.theme) ? r.theme : d.theme,
    accent:
      typeof r.accent === 'string' && /^#[0-9a-f]{6}$/i.test(r.accent)
        ? r.accent.toLowerCase()
        : '',
    uiScale: pick(r.uiScale, [0.9, 1, 1.1, 1.25], d.uiScale),
    uiFont: pick(r.uiFont, ['plex', 'system'] as const, d.uiFont),
    startup: pick(r.startup, ['home', 'last'] as const, d.startup),
    lastProject:
      typeof r.lastProject === 'string' && /^[a-z0-9-]{1,64}$/.test(r.lastProject)
        ? r.lastProject
        : '',
    homeBanner: bool(r.homeBanner, d.homeBanner),
    homeRecent: bool(r.homeRecent, d.homeRecent),
    homeWays: bool(r.homeWays, d.homeWays),
    newTailwind: bool(r.newTailwind, d.newTailwind),
    newStarter: bool(r.newStarter, d.newStarter),
    codeFontSize: pick(r.codeFontSize, [12, 13, 14, 15, 16], d.codeFontSize),
    codeWrap: bool(r.codeWrap, d.codeWrap),
    codeFont: pick(r.codeFont, ['plex', 'system'] as const, d.codeFont),
    tabSize: pick(r.tabSize, [2, 4], d.tabSize),
    lineNumbers: bool(r.lineNumbers, d.lineNumbers),
    defaultDevice: pick(r.defaultDevice, ['desktop', 'tablet', 'phone'] as const, d.defaultDevice),
    bannerAnimation: bool(r.bannerAnimation, d.bannerAnimation),
    interfaceAnimations: bool(r.interfaceAnimations, d.interfaceAnimations),
    cardImages: bool(r.cardImages, d.cardImages),
    renderSpeed: pick(r.renderSpeed, ['instant', 'balanced', 'saver'] as const, d.renderSpeed),
    hardwareAcceleration: bool(r.hardwareAcceleration, d.hardwareAcceleration)
  }
}
