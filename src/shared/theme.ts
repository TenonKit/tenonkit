// App themes: the colours of Tenonkit's own interface (not the websites you build).
// A .tenontheme file is this JSON:
//
//   { "format": "tenonkit-theme", "version": 1, "id": "ocean", "name": "Ocean",
//     "author": "…", "description": "…", "appearance": "dark", "colors": { "ground": "#0f1011", … } }

export const THEME_EXT = 'tenontheme'
export const THEME_FORMAT = 'tenonkit-theme'
/** Themes made before the app was renamed from Redesign. */
const LEGACY_FORMAT = 'redesign-theme'

/** Every colour a theme sets, in the order the theme editor shows them. Each is `--color-<token>`. */
export const THEME_TOKENS = [
  // Surfaces
  'ground',
  'surface',
  'raised',
  'active',
  'hover',
  'line',
  'rule',
  'control',
  // Text
  'ink',
  'muted',
  'faint',
  // Accent and buttons
  'accent',
  'accent-soft',
  'primary',
  'primary-hover',
  'primary-ink',
  // Status
  'danger',
  'danger-soft',
  'danger-ink',
  'warning-soft',
  'warning-ink',
  'positive-soft',
  'positive-ink',
  // Code editor
  'code-tag',
  'code-attr',
  'code-string',
  'code-number',
  'code-comment'
] as const

export type ThemeToken = (typeof THEME_TOKENS)[number]
export type Appearance = 'light' | 'dark'

export type Theme = {
  id: string
  name: string
  author: string
  description: string
  appearance: Appearance
  colors: Record<ThemeToken, string>
  /** Shipped with the app; can't be edited or deleted. */
  builtIn?: boolean
}

const LIGHT: Record<ThemeToken, string> = {
  ground: '#f9fbfc',
  surface: '#ffffff',
  raised: '#f4f6f8',
  active: '#ebedee',
  hover: '#e0e2e4',
  line: '#e8eaec',
  rule: '#f0f1f2',
  control: '#cdced1',
  ink: '#131416',
  muted: '#5d5f60',
  faint: '#6b6b6b',
  accent: '#1b6c80',
  'accent-soft': '#e3eff2',
  primary: '#1d1f20',
  'primary-hover': '#383b3d',
  'primary-ink': '#ffffff',
  danger: '#c4242a',
  'danger-soft': '#ffedea',
  'danger-ink': '#831c1e',
  'warning-soft': '#fffbeb',
  'warning-ink': '#92400e',
  'positive-soft': '#dcfae5',
  'positive-ink': '#04250e',
  'code-tag': '#1b6c80',
  'code-attr': '#5b4b2a',
  'code-string': '#8a5a07',
  'code-number': '#2f6bb0',
  'code-comment': '#6b6b6b'
}

const DARK: Record<ThemeToken, string> = {
  ground: '#0f1011',
  surface: '#17181a',
  raised: '#1d1f21',
  active: '#26282b',
  hover: '#2f3236',
  line: '#2a2c2f',
  rule: '#222427',
  control: '#45484d',
  ink: '#ececed',
  muted: '#a3a6aa',
  faint: '#8b8e93',
  accent: '#4fc1d6',
  'accent-soft': '#16343b',
  primary: '#ececed',
  'primary-hover': '#ffffff',
  'primary-ink': '#131416',
  danger: '#e5484d',
  'danger-soft': '#3a1d1f',
  'danger-ink': '#ffb4ab',
  'warning-soft': '#2e2512',
  'warning-ink': '#f5c46b',
  'positive-soft': '#12301f',
  'positive-ink': '#86e0a9',
  'code-tag': '#6fd3e6',
  'code-attr': '#e0c48a',
  'code-string': '#f0b45c',
  'code-number': '#8ab4f8',
  'code-comment': '#8b8e93'
}

const HIGH_CONTRAST: Record<ThemeToken, string> = {
  ground: '#000000',
  surface: '#000000',
  raised: '#0d0d0d',
  active: '#262626',
  hover: '#333333',
  line: '#8a8a8a',
  rule: '#5c5c5c',
  control: '#bdbdbd',
  ink: '#ffffff',
  muted: '#f0f0f0',
  faint: '#d6d6d6',
  accent: '#ffd60a',
  'accent-soft': '#332b00',
  primary: '#ffd60a',
  'primary-hover': '#ffe14d',
  'primary-ink': '#000000',
  danger: '#ff6b6b',
  'danger-soft': '#2a0000',
  'danger-ink': '#ffb3b3',
  'warning-soft': '#2a2000',
  'warning-ink': '#ffd60a',
  'positive-soft': '#002a12',
  'positive-ink': '#7dffb0',
  'code-tag': '#ffd60a',
  'code-attr': '#7dd3fc',
  'code-string': '#a7f3a0',
  'code-number': '#f9a8d4',
  'code-comment': '#d6d6d6'
}

const builtIn = (
  id: string,
  name: string,
  description: string,
  appearance: Appearance,
  colors: Record<ThemeToken, string>
): Theme => ({
  id,
  name,
  description,
  appearance,
  colors,
  author: 'Tenonkit',
  builtIn: true
})

export const BUILT_IN_THEMES: Theme[] = [
  builtIn('light', 'Light', 'Calm greys on white.', 'light', LIGHT),
  builtIn('dark', 'Dark', 'Easy on the eyes at night.', 'dark', DARK),
  builtIn(
    'high-contrast',
    'High contrast',
    'Black, white and yellow, for the clearest edges.',
    'dark',
    HIGH_CONTRAST
  )
]

/** The `theme` setting: a theme id, or this to follow the system's light or dark mode. */
export const SYSTEM_THEME = 'system'

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const RESERVED = new Set([SYSTEM_THEME, ...BUILT_IN_THEMES.map((t) => t.id)])

export const themeIdFrom = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'theme'

const text = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

/**
 * Validates a theme from a .tenontheme file or the theme editor. Colours must be hex; any that are
 * missing or invalid come from the matching light or dark base. Returns null if it isn't a theme.
 */
export function normalizeTheme(raw: unknown): Theme | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (
    (r.format !== THEME_FORMAT && r.format !== LEGACY_FORMAT) ||
    !r.colors ||
    typeof r.colors !== 'object'
  )
    return null
  const name = text(r.name, 60)
  if (!name) return null
  const appearance: Appearance = r.appearance === 'dark' ? 'dark' : 'light'
  const base = appearance === 'dark' ? DARK : LIGHT
  const given = r.colors as Record<string, unknown>
  const colors = Object.fromEntries(
    THEME_TOKENS.map((t) => {
      const v = given[t]
      return [t, typeof v === 'string' && HEX.test(v.trim()) ? v.trim().toLowerCase() : base[t]]
    })
  ) as Record<ThemeToken, string>
  let id = themeIdFrom(text(r.id, 48) || name)
  if (RESERVED.has(id)) id = `custom-${id}` // a file can't replace a built-in theme
  return {
    id,
    name,
    appearance,
    colors,
    author: text(r.author, 60),
    description: text(r.description, 200)
  }
}

/** The JSON written to a .tenontheme file. */
export const themeFile = (t: Theme): string =>
  JSON.stringify(
    {
      format: THEME_FORMAT,
      version: 1,
      id: t.id,
      name: t.name,
      author: t.author,
      description: t.description,
      appearance: t.appearance,
      colors: t.colors
    },
    null,
    2
  ) + '\n'
