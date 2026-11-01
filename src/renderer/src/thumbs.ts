import type { Project } from '../../shared/project'
import { buildHtml, renderProject } from './render'

// Project card images: a JPEG of the page's first screen, made by the main process.
const cache = new Map<string, Promise<string | null>>()

async function make(p: Project): Promise<string | null> {
  if (!p.blocks.length) return null
  return window.api.projects.makeThumbnail(p.id, buildHtml(p, await renderProject(p)))
}

/** The saved thumbnail, made on first use for projects that don't have one yet. */
export function getThumbnail(id: string): Promise<string | null> {
  let job = cache.get(id)
  if (!job) {
    job = window.api.projects
      .thumbnail(id)
      .then(async (url) => url ?? make((await window.api.projects.get(id))!))
      .catch(() => null)
    cache.set(id, job)
  }
  return job
}

/** Re-capture after the project changed (called when leaving the editor). */
export function refreshThumbnail(p: Project): void {
  cache.set(
    p.id,
    make(p).catch(() => null)
  )
}

export const forgetThumbnail = (id: string): boolean => cache.delete(id)
