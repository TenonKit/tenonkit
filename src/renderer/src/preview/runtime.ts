// The live React preview, opened in the browser from the local preview server (src/main/preview.ts).
// Unlike the editor canvas, components really run here: state, effects and events all work.
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { transform } from 'sucrase'

type Page = {
  title: string
  css: string
  blocks: { id: string; lang: 'html' | 'jsx'; code: string }[]
}
const page = (window as unknown as { __PAGE: Page }).__PAGE
const h = React.createElement

function reportError(message: string, blockId?: string): void {
  const payload = { type: 'tenonkit:preview-error', blockId, message }
  try {
    window.parent?.postMessage(payload, '*')
  } catch {
    // ignore cross-frame errors
  }
  fetch('/__error', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ blockId, message })
  }).catch(() => {})
}

window.addEventListener('error', (e) => {
  reportError(e.error instanceof Error ? e.error.message : e.message || 'Runtime error')
})

window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason
  reportError(r instanceof Error ? r.message : String(r ?? 'Unhandled promise rejection'))
})

function load(code: string): React.ComponentType {
  const js = transform(code, {
    transforms: ['jsx', 'imports'],
    jsxRuntime: 'classic',
    production: true
  }).code
  const mod: { exports: Record<string, unknown> } = { exports: {} }
  const require = (name: string): unknown => {
    if (name === 'react') return React
    throw new Error(`Only "react" can be imported in a component (found "${name}").`)
  }
  new Function('require', 'module', 'exports', 'React', js)(require, mod, mod.exports, React)
  const C = mod.exports.default
  if (typeof C !== 'function') throw new Error('Export your component as the default.')
  return C as React.ComponentType
}

const errorBox = (name: string, message: string): React.ReactElement =>
  h(
    'pre',
    {
      style: {
        margin: 16,
        padding: 16,
        borderRadius: 10,
        background: '#ffedea',
        color: '#831c1e',
        font: '14px/1.5 ui-monospace, monospace',
        whiteSpace: 'pre-wrap'
      }
    },
    `${name}: ${message}`
  )

class Boundary extends React.Component<
  { name: string; blockId: string; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }
  componentDidCatch(error: Error): void {
    reportError(error.message, this.props.blockId)
  }
  render(): React.ReactNode {
    return this.state.error
      ? errorBox(this.props.name, this.state.error.message)
      : this.props.children
  }
}

document.title = page.title
const style = document.createElement('style')
style.textContent = page.css
document.head.appendChild(style)

const children = page.blocks.map((b) => {
  const className = `b-${b.id}`
  if (b.lang === 'html')
    return h('div', {
      key: b.id,
      className,
      'data-block-id': b.id,
      dangerouslySetInnerHTML: { __html: b.code }
    })
  let content: React.ReactNode
  try {
    content = h(Boundary, { name: 'Component', blockId: b.id, children: h(load(b.code)) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    reportError(msg, b.id)
    content = errorBox('Component', msg)
  }
  return h('div', { key: b.id, className, 'data-block-id': b.id }, content)
})

createRoot(document.getElementById('root')!).render(h(React.StrictMode, null, children))
