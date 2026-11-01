import type { Block } from '../../shared/project'

export const usesTailwind = (css: string): boolean => /@import\s+["']tailwindcss/.test(css)

/**
 * Makes Tailwind's output safe to nest inside a block's `.b-<id> { }` wrapper. `@property` can't be
 * nested, so it is dropped and Tailwind's own fallback defaults (normally only for old Safari and
 * Firefox) are applied unconditionally instead.
 */
export function nestableTailwind(css: string): string {
  return css
    .replace(/\/\*![^]*?\*\/\n?/, '')
    .replace(/@layer properties;\n?/, '')
    .replace(/@property [^{]+\{[^}]*\}\n?/g, '')
    .replace(/@layer properties \{\s*@supports[^{]*\{\s*([^{]+\{[^}]*\})\s*\}\s*\}/, '$1')
    .trim()
}

export const blockClass = (id: string): string => `b-${id}`
export const scopedCss = (b: Block): string =>
  b.css.trim() ? `.${blockClass(b.id)} {\n${b.css}\n}` : ''
