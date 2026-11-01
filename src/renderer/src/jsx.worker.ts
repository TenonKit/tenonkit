// Renders a user's JSX component to static HTML, off the main thread and away from the app.
// Production serves this file with a CSP that allows eval but no network (src/main/index.ts);
// the network APIs are also removed here so user code can't phone home in development either.
import { transform } from 'sucrase'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server.browser'

const scope = self as unknown as Record<string, unknown>
for (const k of [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'Worker'
]) {
  try {
    scope[k] = undefined
  } catch {
    // Non-writable in some engines; the CSP still blocks network in production.
  }
}

type Req = { id: number; code: string }

function render(code: string): string {
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
  const Component = mod.exports.default
  if (typeof Component !== 'function') {
    throw new Error('Export your component as the default: export default function Hero() { … }')
  }
  return renderToStaticMarkup(React.createElement(Component as React.FC))
}

self.onmessage = (e: MessageEvent<Req>): void => {
  const { id, code } = e.data
  try {
    self.postMessage({ id, html: render(code) })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
