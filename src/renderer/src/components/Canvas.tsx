import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from 'lucide-react'
import { Action, Project } from '../store'
import { PageOutput } from '../render'
import { blockClass } from '../page'
import { findElement, selectorFor } from '../design'
import { drag, dropIndex } from '../drag'

// Each device renders at its real width and is scaled down to fit the canvas.
const DEVICES = { desktop: 1280, tablet: 768, phone: 390 } as const
export type Device = keyof typeof DEVICES

// Editor-only chrome inside the page; never exported.
const EDITOR_CSS = `
.rd-root { min-height: 100vh; display: flow-root; }
.rd-slot { position: relative; }
.rd-slot::after { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 2147483646; }
.rd-slot:hover::after { box-shadow: inset 0 0 0 calc(1px * var(--rd-z)) rgba(27, 108, 128, .55); }
.rd-slot[data-selected]::after { box-shadow: inset 0 0 0 calc(2px * var(--rd-z)) #1b6c80; }
[data-rd-hover] { outline: calc(1px * var(--rd-z)) dashed #1b6c80 !important; outline-offset: calc(-1px * var(--rd-z)) !important; }
[data-rd-target] { outline: calc(2px * var(--rd-z)) solid #4fc1d6 !important; outline-offset: calc(-2px * var(--rd-z)) !important; }
.rd-design [class^="b-"] * { cursor: crosshair; }
.rd-bar {
  position: absolute; top: 8px; right: 8px; z-index: 2147483647; zoom: var(--rd-z);
  display: none; align-items: center; gap: 2px; height: 30px; padding: 0 3px 0 4px;
  background: #131416; color: #fff; border-radius: 6px;
  font: 500 12px/1 "IBM Plex Sans", system-ui, sans-serif; letter-spacing: 0;
  box-shadow: 0 4px 14px rgba(0,0,0,.18);
}
.rd-slot:hover > .rd-bar, .rd-slot[data-selected] > .rd-bar { display: flex; }
.rd-bar span { padding: 0 6px 0 2px; white-space: nowrap; }
.rd-bar button {
  all: unset; display: grid; place-items: center; width: 24px; height: 24px;
  border-radius: 4px; color: #d7d9db; cursor: pointer;
}
.rd-bar button:hover { background: #2c2e31; color: #fff; }
.rd-bar button:focus-visible { outline: 2px solid #7cc3d4; }
.rd-bar .grip { cursor: grab; }
.rd-bar button:disabled { opacity: .35; cursor: default; background: none; }
.rd-drop { position: relative; height: 0; z-index: 2147483647; }
.rd-drop::before {
  content: ""; position: absolute; left: 8px; right: 8px; top: calc(-2px * var(--rd-z)); height: calc(4px * var(--rd-z));
  border-radius: 2px; background: #1b6c80;
}
.rd-empty {
  margin: 40px; min-height: calc(100vh - 80px); display: grid; place-items: center; text-align: center;
  border: 1.5px dashed #b4b8bd; border-radius: 12px;
  font: 400 15px/1.5 "IBM Plex Sans", system-ui, sans-serif; color: #5d5f60;
}
.rd-error {
  margin: 16px; padding: 16px 18px; border-radius: 10px; background: #ffedea; color: #831c1e;
  font: 400 14px/1.5 "IBM Plex Mono", ui-monospace, monospace; white-space: pre-wrap;
}
.rd-error strong { display: block; font: 600 15px/1.4 "IBM Plex Sans", system-ui, sans-serif; margin-bottom: 4px; }
.rd-empty strong { display: block; font-size: 17px; font-weight: 600; color: #131416; margin-bottom: 4px; }
`

const BLANK = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'

type Props = {
  project: Project
  selected: string | null
  device: Device
  dispatch: (a: Action) => void
  onKey: (e: KeyboardEvent) => void
  output: PageOutput | null
  /** Websites can add, move and delete blocks; a component project is one fixed block. */
  editable: boolean
  /** Design tab is open: clicks pick elements to style instead of only selecting the block. */
  designMode: boolean
  /** The picked element in the selected block. */
  selector: string
  onPick: (blockId: string, selector: string) => void
  onDoc: (doc: Document | null) => void
}

export default function Canvas({
  project,
  selected,
  device,
  dispatch,
  onKey,
  output,
  editable,
  designMode,
  selector,
  onPick,
  onDoc
}: Props): React.JSX.Element {
  const frame = useRef<HTMLIFrameElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)
  const pickActive = designMode

  // Design mode: dashed outline under the pointer, solid outline on the picked element.
  const hover = (el: Element | null): void => {
    doc?.querySelector('[data-rd-hover]')?.removeAttribute('data-rd-hover')
    if (pickActive && el?.closest('.rd-slot [class^="b-"]') && !el.closest('.rd-bar'))
      el.setAttribute('data-rd-hover', '')
  }
  useEffect(() => {
    if (!doc) return
    doc.querySelector('[data-rd-target]')?.removeAttribute('data-rd-target')
    if (!pickActive) doc.querySelector('[data-rd-hover]')?.removeAttribute('data-rd-hover')
    const root = selected && doc.querySelector(`.${blockClass(selected)}`)
    if (pickActive && root && selector)
      findElement(root, selector)?.setAttribute('data-rd-target', '')
  })
  const [drop, setDrop] = useState<number | null>(null)
  const well = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const keyHandler = useRef(onKey)
  useEffect(() => {
    keyHandler.current = onKey
  })

  // Shortcuts must work while focus is inside the page, and a cancelled drag must clear the drop line.
  useEffect(() => {
    if (!doc) return
    const key = (e: KeyboardEvent): void => keyHandler.current(e)
    const end = (): void => setDrop(null)
    doc.addEventListener('keydown', key)
    for (const d of [doc, document]) d.addEventListener('dragend', end)
    return () => {
      doc.removeEventListener('keydown', key)
      for (const d of [doc, document]) d.removeEventListener('dragend', end)
    }
  }, [doc])

  // Scroll a newly selected block into view once it has rendered (a new JSX block is empty at first).
  const scrollTo = useRef<string | null>(null)
  useEffect(() => {
    scrollTo.current = selected
  }, [selected])
  useEffect(() => {
    const el = doc?.querySelector(`[data-id="${scrollTo.current}"]`)
    if (!el || !el.getBoundingClientRect().height) return
    scrollTo.current = null
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [doc, selected, output])

  useEffect(() => {
    const el = well.current!
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth - 24, h: el.clientHeight - 24 })
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const width = DEVICES[device]
  const scale = size.w ? Math.min(1, size.w / width) : 1

  const slots = (): Element[] => (doc ? [...doc.querySelectorAll('.rd-slot')] : [])

  const onDragOver = (e: React.DragEvent): void => {
    if (!drag.current) return
    e.preventDefault()
    e.dataTransfer.dropEffect = drag.current.kind === 'new' ? 'copy' : 'move'
    setDrop(dropIndex(e.clientY, slots()))
  }

  const onDrop = (e: React.DragEvent): void => {
    const p = drag.current
    if (!p) return
    e.preventDefault()
    const index = dropIndex(e.clientY, slots())
    dispatch(
      p.kind === 'new' ? { type: 'add', def: p.def, index } : { type: 'move', id: p.id, index }
    )
    drag.current = null
    setDrop(null)
  }

  const blocks = project.blocks
  const last = blocks.length - 1

  const page = (
    <>
      <style>{output?.css ?? ''}</style>
      <style>{EDITOR_CSS}</style>
      {/* Editor chrome counter-scales so it stays readable when the page is zoomed out. */}
      <style>{`:root { --rd-z: ${1 / scale}; }`}</style>
      <div
        className={pickActive ? 'rd-root rd-design' : 'rd-root'}
        onMouseOver={(e) => hover(e.target as Element)}
        onMouseLeave={() => hover(null)}
        onDragOver={editable ? onDragOver : undefined}
        onDrop={editable ? onDrop : undefined}
        onDragLeave={(e) => !e.relatedTarget && setDrop(null)}
        onSubmitCapture={(e) => e.preventDefault()}
        onClick={(e) => e.target === e.currentTarget && dispatch({ type: 'select', id: null })}
      >
        {blocks.length === 0 && (
          <div className="rd-empty">
            <div>
              <strong>Your page is empty</strong>
              Drag a component here from the left panel, or click one to add it.
            </div>
          </div>
        )}
        {blocks.map((b, i) => (
          <div key={b.id}>
            {drop === i && <div className="rd-drop" />}
            <div
              className="rd-slot"
              data-id={b.id}
              data-selected={selected === b.id ? '' : undefined}
              onClick={(e) => {
                if ((e.target as Element).closest('a')) e.preventDefault()
                dispatch({ type: 'select', id: b.id })
                const root = e.currentTarget.querySelector(`.${blockClass(b.id)}`)
                const el = e.target as Element
                if (designMode && root?.contains(el)) onPick(b.id, selectorFor(el, root))
              }}
            >
              {output?.blocks[b.id]?.error ? (
                <div className="rd-error" role="alert">
                  <strong>{b.name} can’t be shown</strong>
                  {output.blocks[b.id].error}
                </div>
              ) : (
                <div
                  className={blockClass(b.id)}
                  dangerouslySetInnerHTML={{ __html: output?.blocks[b.id]?.html ?? '' }}
                />
              )}
              {editable && (
                <div className="rd-bar" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="grip"
                    draggable
                    aria-label={`Drag ${b.name}`}
                    title="Drag to move"
                    onDragStart={(e) => {
                      drag.current = { kind: 'move', id: b.id }
                      e.dataTransfer.setData('text/plain', b.id)
                      e.dataTransfer.effectAllowed = 'move'
                      const slot = (e.currentTarget as HTMLElement).closest('.rd-slot')
                      if (slot) e.dataTransfer.setDragImage(slot, 24, 24)
                    }}
                  >
                    <GripVertical size={15} />
                  </button>
                  <span>{b.name}</span>
                  <button
                    aria-label="Move up"
                    title="Move up"
                    disabled={i === 0}
                    onClick={() => dispatch({ type: 'move', id: b.id, index: i - 1 })}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    aria-label="Move down"
                    title="Move down"
                    disabled={i === last}
                    onClick={() => dispatch({ type: 'move', id: b.id, index: i + 2 })}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    aria-label="Duplicate"
                    title="Duplicate (Ctrl+D)"
                    onClick={() => dispatch({ type: 'duplicate', id: b.id })}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    aria-label="Delete"
                    title="Delete (Del)"
                    onClick={() => dispatch({ type: 'remove', id: b.id })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {drop === blocks.length && blocks.length > 0 && <div className="rd-drop" />}
      </div>
    </>
  )

  return (
    <div
      ref={well}
      className="relative flex min-h-0 min-w-0 flex-1 justify-center overflow-hidden rounded-panel border border-line bg-raised p-3"
    >
      <div
        className="relative flex-none overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_var(--color-line)] transition-[width] duration-300 ease-out-soft"
        style={{ width: width * scale, height: size.h }}
      >
        <iframe
          ref={frame}
          className="absolute top-0 left-0 block origin-top-left border-0 bg-white"
          style={{ width, height: size.h / scale, transform: `scale(${scale})` }}
          title="Page canvas"
          srcDoc={BLANK}
          onLoad={() => {
            const d = frame.current?.contentDocument ?? null
            setDoc(d)
            onDoc(d)
          }}
        />
      </div>
      <p className="pointer-events-none absolute right-4 bottom-4 rounded-md bg-surface px-2 py-0.5 text-xs text-muted tabular-nums shadow-[0_0_0_1px_var(--color-line)]">
        {width} px · {Math.round(scale * 100)}%
      </p>
      {doc && createPortal(page, doc.body)}
    </div>
  )
}
