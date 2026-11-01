// The Design panel stores its choices as plain CSS in the component's own CSS, between two markers:
//
//   /* @design: written by the Design panel. Safe to edit by hand. */
//   & > section.hero > h1 { color: rgb(225, 29, 72); font-size: 72px; }
//   /* @end design */
//
// The code stays the single source of truth: the panel re-reads this section every time, so hand
// edits show up in the panel, and the panel's edits show up in the CSS tab. The browser's own CSS
// parser (CSSOM) reads and writes the rules, so any valid CSS the user types survives.

const START = '/* @design: written by the Design panel. Safe to edit by hand. */'
const END = '/* @end design */'
const SECTION = /\/\* @design[^*]*\*\/([\s\S]*?)\/\* @end design \*\//

/** Selector for the component's root (the block wrapper, in nested CSS). */
export const ROOT = '&'

function parse(css: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet()
  const m = SECTION.exec(css)
  if (m) sheet.replaceSync(m[1])
  return sheet
}

function rules(sheet: CSSStyleSheet): CSSStyleRule[] {
  return [...sheet.cssRules].filter((r): r is CSSStyleRule => r instanceof CSSStyleRule)
}

/** The styled selectors and their declarations, as the CSS currently says. */
export function readDesign(css: string): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {}
  for (const r of rules(parse(css))) {
    const decl: Record<string, string> = {}
    for (let i = 0; i < r.style.length; i++) decl[r.style[i]] = r.style.getPropertyValue(r.style[i])
    out[r.selectorText] = { ...out[r.selectorText], ...decl }
  }
  return out
}

function write(css: string, sheet: CSSStyleSheet): string {
  const body = [...sheet.cssRules].map((r) => r.cssText).join('\n')
  const without = css
    .replace(SECTION, '')
    .replace(/\n{3,}$/, '\n')
    .trimEnd()
  if (!body) return without ? `${without}\n` : ''
  const section = `${START}\n${body}\n${END}\n`
  return SECTION.test(css)
    ? css.replace(SECTION, section.trimEnd())
    : `${without}${without ? '\n\n' : ''}${section}`
}

/** Sets (or, with an empty value, removes) one property for one selector. */
export function setDesign(css: string, selector: string, props: Record<string, string>): string {
  const sheet = parse(css)
  let rule = rules(sheet).find((r) => r.selectorText === selector)
  if (!rule) {
    sheet.insertRule(`${selector} {}`, sheet.cssRules.length)
    rule = rules(sheet).find((r) => r.selectorText === selector)
    if (!rule) return css // the browser rejected the selector
  }
  for (const [prop, value] of Object.entries(props)) {
    if (value.trim()) rule.style.setProperty(prop, value.trim())
    else rule.style.removeProperty(prop)
  }
  if (!rule.style.length) sheet.deleteRule([...sheet.cssRules].indexOf(rule))
  return write(css, sheet)
}

export function clearDesign(css: string, selector: string): string {
  const sheet = parse(css)
  const i = [...sheet.cssRules].findIndex(
    (r) => r instanceof CSSStyleRule && r.selectorText === selector
  )
  if (i >= 0) sheet.deleteRule(i)
  return write(css, sheet)
}

// ---- Elements on the canvas ----

/**
 * A selector for `el` inside the component `root`, built from tags, the first class and position.
 * It's specific enough to beat the component's own rules, and simple enough to read in the CSS tab.
 */
export function selectorFor(el: Element, root: Element): string {
  if (el === root) return ROOT
  const parts: string[] = []
  for (let e: Element | null = el; e && e !== root; e = e.parentElement) {
    let s = e.tagName.toLowerCase()
    const cls = [...e.classList].find((c) => /^[a-zA-Z_][\w-]*$/.test(c) && !c.startsWith('rd-'))
    if (cls) s += `.${cls}`
    const siblings = e.parentElement
      ? [...e.parentElement.children].filter((c) => c.tagName === e!.tagName)
      : []
    if (siblings.length > 1) s += `:nth-of-type(${siblings.indexOf(e) + 1})`
    parts.unshift(s)
  }
  return `& > ${parts.join(' > ')}`
}

/** The element a selector points at inside the component, or null if the code no longer has it. */
export function findElement(root: Element, selector: string): Element | null {
  if (selector === ROOT) return root
  try {
    return root.querySelector(`:scope${selector.slice(1)}`)
  } catch {
    return null
  }
}

const NAMES: Record<string, string> = {
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  p: 'Paragraph',
  a: 'Link',
  button: 'Button',
  img: 'Image',
  section: 'Section',
  header: 'Header',
  footer: 'Footer',
  nav: 'Navigation',
  ul: 'List',
  ol: 'List',
  li: 'List item',
  span: 'Text',
  div: 'Box',
  form: 'Form',
  input: 'Field',
  label: 'Label',
  figure: 'Figure',
  figcaption: 'Caption',
  blockquote: 'Quote',
  article: 'Card'
}

/** A readable name for the last step of a selector: "Link .btn", "Heading 1". */
export function describe(selector: string): string {
  if (selector === ROOT) return 'Whole component'
  const last = selector.split('>').pop()!.trim()
  const tag = /^[a-z0-9]+/.exec(last)?.[0] ?? last
  const cls = /\.([\w-]+)/.exec(last)?.[1]
  return `${NAMES[tag] ?? tag}${cls ? ` .${cls}` : ''}`
}

// ---- Page tokens (:root custom properties) ----

const ROOT_BLOCK = /:root\s*\{([^}]*)\}/

export function readTokens(css: string): { name: string; value: string }[] {
  const block = ROOT_BLOCK.exec(css)?.[1] ?? ''
  return [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)].map((m) => ({
    name: m[1],
    value: m[2].trim()
  }))
}

export function setToken(css: string, name: string, value: string): string {
  const m = ROOT_BLOCK.exec(css)
  if (!m) return `:root {\n  ${name}: ${value};\n}\n\n${css}`
  // Not preceded by a name character, so --ink never matches inside --brand--ink.
  const decl = new RegExp(`(?<![\\w-])(${name.replace(/-/g, '\\-')}\\s*:\\s*)([^;]+)(;?)`)
  const body = decl.test(m[1])
    ? m[1].replace(decl, `$1${value}$3`)
    : `${m[1].trimEnd()}\n  ${name}: ${value};\n`
  return css.replace(ROOT_BLOCK, `:root {${body}}`)
}

// ---- Colours ----

export const isTransparent = (color: string): boolean =>
  color.trim() === 'transparent' || /^rgba\(.*[\s,/]0(\.0+)?\s*\)$/i.test(color.trim())

/** "#1b6c80", "rgb(27, 108, 128)" or a named colour → "#1b6c80" (for <input type=color>). */
export function toHex(color: string): string | null {
  const c = color.trim()
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(c))
    return `#${[...c.slice(1)].map((x) => x + x).join('')}`.toLowerCase()
  const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c)
  // Fully transparent is "no colour", not black.
  if (m && !isTransparent(c))
    return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
  return null
}

export const isColor = (value: string): boolean => toHex(value) !== null

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrast(a: string, b: string): number | null {
  const x = toHex(a)
  const y = toHex(b)
  if (!x || !y) return null
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}
