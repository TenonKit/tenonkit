import type { Block } from '../../shared/project'

export const usesTailwind = (css: string): boolean => /@import\s+["']tailwindcss/.test(css)

export const blockClass = (id: string): string => `b-${id}`
export const scopedCss = (b: Block): string =>
  b.css.trim() ? `.${blockClass(b.id)} {\n${b.css}\n}` : ''
