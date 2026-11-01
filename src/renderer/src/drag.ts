import type { ComponentDef } from './library'

// dataTransfer can't be read during dragover, and drags cross into the canvas iframe, so the payload lives here.
export type DragPayload = { kind: 'new'; def: ComponentDef } | { kind: 'move'; id: string }

export const drag: { current: DragPayload | null } = { current: null }

/** Index to insert at, given the pointer Y and the elements currently in the list. */
export function dropIndex(y: number, els: Element[]): number {
  const i = els.findIndex((el) => {
    const r = el.getBoundingClientRect()
    return y < r.top + r.height / 2
  })
  return i < 0 ? els.length : i
}
