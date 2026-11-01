import { createContext, useContext } from 'react'
import { DEFAULT_SETTINGS, Settings } from '../../shared/settings'
import { BUILT_IN_THEMES, Theme } from '../../shared/theme'

export type SettingsApi = {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  /** Hardware acceleration as the app was launched with, to tell whether a restart is pending. */
  launchedWithGpu: boolean
  /** Built-in themes first, then the user's. */
  themes: Theme[]
  activeTheme: Theme
  /** Re-reads the user's themes and settings after a theme is saved, imported or deleted. */
  reloadThemes: () => Promise<void>
  /** Shows a theme without saving it (the theme editor's live preview); null stops previewing. */
  previewTheme: (t: Theme | null) => void
}

export const SettingsContext = createContext<SettingsApi>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
  launchedWithGpu: true,
  themes: BUILT_IN_THEMES,
  activeTheme: BUILT_IN_THEMES[0],
  reloadThemes: async () => {},
  previewTheme: () => {}
})

export const useSettings = (): SettingsApi => useContext(SettingsContext)

/** For computers that struggle: no animations, no screenshots, slower canvas updates. */
export const LIGHT_SETTINGS: Partial<Settings> = {
  bannerAnimation: false,
  interfaceAnimations: false,
  cardImages: false,
  renderSpeed: 'saver'
}
