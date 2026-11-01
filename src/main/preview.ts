import { BrowserWindow } from 'electron'
import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import { readFile } from 'fs/promises'
import { extname, join, normalize, sep } from 'path'
import { AddressInfo } from 'net'
import { log } from './log'

export type PreviewBlock = { id: string; lang: 'html' | 'jsx'; code: string }
export type PreviewPage = {
  /** The exported page, served at / */
  html: string
  /** Served at /react/ and run by src/renderer/src/preview/runtime.ts */
  react: { title: string; css: string; blocks: PreviewBlock[]; selectMode?: boolean }
}

const TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
}
// Every preview page reloads itself when the project changes in the editor.
const LIVE_RELOAD = `<script>new EventSource('/__events').onmessage = () => location.reload()</script>`

let server: Server | null = null
let origin = ''
let page: PreviewPage | null = null
const clients = new Set<ServerResponse>()

/**
 * A local web server for previews, bound to 127.0.0.1 only. `rendererRoot` holds the built preview
 * runtime; in development the runtime is loaded from the Vite dev server instead.
 */
export async function startPreview(
  next: PreviewPage,
  opts: { rendererRoot: string; devServer?: string }
): Promise<string> {
  page = next
  if (server) return origin
  server = createServer((req, res) => {
    handle(req, res, opts).catch((e) => {
      log.error('Preview request failed', e)
      if (!res.headersSent) res.writeHead(500).end('Preview error')
    })
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  log.info(`Preview server on ${origin}`)
  return origin
}

export function updatePreview(next: PreviewPage): void {
  page = next
  for (const c of clients) c.write('data: reload\n\n')
}

export function stopPreview(): void {
  for (const c of clients) c.end()
  clients.clear()
  server?.close()
  server = null
}

function send(res: ServerResponse, status: number, type: string, body: string | Buffer): void {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body)
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = []
  let len = 0
  for await (const c of req) {
    const b = Buffer.isBuffer(c) ? c : Buffer.from(c)
    len += b.length
    if (len > 64_000) return null
    chunks.push(b)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  opts: { rendererRoot: string; devServer?: string }
): Promise<void> {
  // Only this machine, by its own address: blocks DNS-rebinding pages from reading the preview.
  if (req.headers.host !== origin.slice('http://'.length)) {
    return send(res, 403, 'text/plain', 'Forbidden')
  }
  const path = decodeURIComponent(new URL(req.url ?? '/', origin).pathname)
  if (req.method === 'POST' && path === '/__error') {
    const body = await readJson(req)
    if (body)
      for (const w of BrowserWindow.getAllWindows()) w.webContents.send('preview:error', body)
    return send(res, 204, 'text/plain', '')
  }
  if (req.method !== 'GET') {
    return send(res, 403, 'text/plain', 'Forbidden')
  }
  if (!page) return send(res, 404, 'text/plain', 'Nothing to preview yet')

  if (path === '/__events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive'
    })
    res.write(': connected\n\n')
    clients.add(res)
    req.on('close', () => clients.delete(res))
    return
  }
  if (path === '/') {
    return send(
      res,
      200,
      'text/html; charset=utf-8',
      page.html.replace('</body>', `${LIVE_RELOAD}\n</body>`)
    )
  }
  if (path === '/react/page.js') {
    return send(
      res,
      200,
      TYPES['.js'],
      `window.__PAGE = ${JSON.stringify(page.react).replace(/</g, '\\u003c')}`
    )
  }
  if (path === '/react/' || path === '/react') {
    const head = `<script src="/react/page.js"></script>${LIVE_RELOAD}`
    const html = opts.devServer
      ? `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}<script type="module" src="${opts.devServer}/src/preview/runtime.ts"></script></head><body><div id="root"></div></body></html>`
      : (await readFile(join(opts.rendererRoot, 'preview.html'), 'utf8')).replace(
          '</head>',
          `${head}</head>`
        )
    return send(res, 200, 'text/html; charset=utf-8', html)
  }
  // The built runtime's scripts and fonts.
  const m = /^\/(?:react\/)?(assets\/.+)$/.exec(path)
  if (m && !opts.devServer) {
    const file = normalize(join(opts.rendererRoot, m[1]))
    if (file.startsWith(join(opts.rendererRoot, 'assets') + sep)) {
      try {
        return send(
          res,
          200,
          TYPES[extname(file)] ?? 'application/octet-stream',
          await readFile(file)
        )
      } catch {
        // fall through to 404
      }
    }
  }
  send(res, 404, 'text/plain', 'Not found')
}
