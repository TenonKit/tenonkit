import { compile } from 'tailwindcss'
import twIndex from 'tailwindcss/index.css?raw'
import twTheme from 'tailwindcss/theme.css?raw'
import twPreflight from 'tailwindcss/preflight.css?raw'
import twUtilities from 'tailwindcss/utilities.css?raw'
import JsxWorker from './jsx.worker?worker'
import type { Project } from '../../shared/project'
import { blockClass, scopedCss, usesTailwind } from './page'

export type BlockOutput = { html: string; error?: string }
export type PageOutput = { blocks: Record<string, BlockOutput>; css: string; cssError?: string }

// ---- JSX: rendered in a worker, cached by source, with a timeout for runaway code ----

const RENDER_TIMEOUT_MS = 3000
const jsxCache = new Map<string, Promise<BlockOutput>>()
let worker: Worker | null = null
let seq = 0
const pending = new Map<number, (r: BlockOutput) => void>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new JsxWorker()
  worker.onmessage = (e: MessageEvent<{ id: number; html?: string; error?: string }>) => {
    const done = pending.get(e.data.id)
    pending.delete(e.data.id)
    done?.({ html: e.data.html ?? '', error: e.data.error })
  }
  return worker
}

function renderJsx(code: string): Promise<BlockOutput> {
  const hit = jsxCache.get(code)
  if (hit) return hit
  const id = ++seq
  const result = new Promise<BlockOutput>((resolve) => {
    const timer = setTimeout(() => {
      // An infinite loop would block the worker forever: replace it.
      worker?.terminate()
      worker = null
      for (const [, done] of pending)
        done({
          html: '',
          error: 'Rendering took longer than 3 seconds and was stopped. Check for an endless loop.'
        })
      pending.clear()
      jsxCache.clear() // innocent renders that were queued behind it should retry
    }, RENDER_TIMEOUT_MS)
    pending.set(id, (r) => {
      clearTimeout(timer)
      resolve(r)
    })
    getWorker().postMessage({ id, code })
  })
  if (jsxCache.size > 300) jsxCache.clear()
  jsxCache.set(code, result)
  return result
}

// ---- Tailwind: compiled in the page from the project's CSS, for the classes the page uses ----

const SHEETS: Record<string, string> = {
  tailwindcss: twIndex,
  'tailwindcss/index.css': twIndex,
  'tailwindcss/theme': twTheme,
  'tailwindcss/theme.css': twTheme,
  'tailwindcss/preflight': twPreflight,
  'tailwindcss/preflight.css': twPreflight,
  'tailwindcss/utilities': twUtilities,
  'tailwindcss/utilities.css': twUtilities
}

let compiler: { css: string; build: Promise<(candidates: string[]) => string> } | null = null

function getCompiler(css: string): Promise<(candidates: string[]) => string> {
  if (compiler?.css !== css) {
    const build = compile(css, {
      base: '/',
      loadStylesheet: async (id, base) => {
        const content = SHEETS[id]
        if (content === undefined)
          throw new Error(`Can't import "${id}". Only Tailwind's own files can be imported.`)
        return { path: id, base, content }
      }
    }).then((c) => (candidates: string[]) => c.build(candidates))
    compiler = { css, build }
  }
  return compiler.build
}

/** Every token that could be a class name. Tailwind ignores the ones that aren't. */
export function candidates(sources: string[]): string[] {
  // shortcut: a plain tokenizer instead of Tailwind's native scanner; misses classes built by string concatenation.
  const out = new Set<string>()
  for (const s of sources)
    for (const t of s.split(/[\s"'`<>{}=;,]+/)) if (t && t.length < 200) out.add(t)
  return [...out]
}

export async function buildCss(
  pageCss: string,
  sources: string[]
): Promise<{ css: string; error?: string }> {
  if (!usesTailwind(pageCss)) return { css: pageCss }
  try {
    const build = await getCompiler(pageCss)
    return { css: build(candidates(sources)) }
  } catch (e) {
    compiler = null
    return {
      css: pageCss.replace(/@import\s+["']tailwindcss[^;]*;/, ''),
      error: e instanceof Error ? e.message : String(e)
    }
  }
}

// ---- The whole page ----

export async function renderProject(p: Project): Promise<PageOutput> {
  const outputs = await Promise.all(
    p.blocks.map((b) => (b.lang === 'jsx' ? renderJsx(b.code) : Promise.resolve({ html: b.code })))
  )
  const blocks: Record<string, BlockOutput> = {}
  p.blocks.forEach((b, i) => (blocks[b.id] = outputs[i]))
  const tw = await buildCss(p.css, [...outputs.map((o) => o.html), ...p.blocks.map((b) => b.code)])
  const css = [tw.css, ...p.blocks.map(scopedCss)].filter(Boolean).join('\n\n')
  return { blocks, css, cssError: tw.error }
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function buildHtml(p: Project, out: PageOutput): string {
  const body = p.blocks
    .map((b) => `<div class="${blockClass(b.id)}">\n${out.blocks[b.id]?.html ?? ''}\n</div>`)
    .join('\n')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(p.title || p.name)}</title>
<style>
${out.css}
</style>
</head>
<body>
${body}
</body>
</html>
`
}
