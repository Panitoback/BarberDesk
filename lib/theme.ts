export const THEME_IDS = [
  'midnight',
  'obsidian-gold',
  'forest',
  'ocean',
  'crimson',
  'mocha',
] as const

export type ThemeId = typeof THEME_IDS[number]

export type ThemePalette = {
  id:          ThemeId
  label:       string
  bg:          string   // sidebar / header background
  accent:      string   // active nav, primary buttons, highlights
  accentHover: string   // hover on accent
  accentText:  string   // text on accent bg ('white' or dark)
  preview:     string[] // [bg, accent] for the small swatch
}

export const THEMES: ThemePalette[] = [
  {
    id:          'midnight',
    label:       'Midnight',
    bg:          '#0f172a',
    accent:      '#4f46e5',
    accentHover: '#4338ca',
    accentText:  '#ffffff',
    preview:     ['#0f172a', '#4f46e5'],
  },
  {
    id:          'obsidian-gold',
    label:       'Obsidian Gold',
    bg:          '#1c1917',
    accent:      '#d97706',
    accentHover: '#b45309',
    accentText:  '#ffffff',
    preview:     ['#1c1917', '#d97706'],
  },
  {
    id:          'forest',
    label:       'Forest',
    bg:          '#14532d',
    accent:      '#86efac',
    accentHover: '#4ade80',
    accentText:  '#14532d',
    preview:     ['#14532d', '#86efac'],
  },
  {
    id:          'ocean',
    label:       'Ocean',
    bg:          '#0c4a6e',
    accent:      '#38bdf8',
    accentHover: '#0ea5e9',
    accentText:  '#0c4a6e',
    preview:     ['#0c4a6e', '#38bdf8'],
  },
  {
    id:          'crimson',
    label:       'Crimson',
    bg:          '#18181b',
    accent:      '#f43f5e',
    accentHover: '#e11d48',
    accentText:  '#ffffff',
    preview:     ['#18181b', '#f43f5e'],
  },
  {
    id:          'mocha',
    label:       'Mocha',
    bg:          '#292524',
    accent:      '#c084fc',
    accentHover: '#a855f7',
    accentText:  '#1a0533',
    preview:     ['#292524', '#c084fc'],
  },
]

export const DEFAULT_THEME: ThemeId = 'midnight'

export function getTheme(id: string | undefined): ThemePalette {
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}

/** Returns a React CSSProperties object with theme CSS vars. */
export function themeStyle(id: string | undefined): React.CSSProperties {
  const t = getTheme(id)
  return {
    '--theme-bg':           t.bg,
    '--theme-accent':       t.accent,
    '--theme-accent-hover': t.accentHover,
    '--theme-accent-text':  t.accentText,
  } as React.CSSProperties
}
