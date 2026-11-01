import { useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'

export type Tool =
  { icon: LucideIcon; label: string; hint?: string; onClick: () => void } | 'divider'

/**
 * The tools menu that opens from the logo. Arrow keys move between items, Esc closes, and the
 * first item takes focus so it works from the keyboard straight away.
 */
export default function ToolsMenu({
  tools,
  onClose
}: {
  tools: Tool[]
  onClose: () => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()
  }, [])

  const onKeyDown = (e: React.KeyboardEvent): void => {
    const items = [...ref.current!.querySelectorAll<HTMLButtonElement>('[role=menuitem]')]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next =
        e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
      items[next].focus()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        role="menu"
        aria-label="Tools"
        onKeyDown={onKeyDown}
        className="absolute top-11 left-0 z-50 w-72 rounded-xl border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
      >
        {tools.map((t, i) =>
          t === 'divider' ? (
            <div key={`d${i}`} role="separator" className="mx-2 my-1 h-px bg-rule" />
          ) : (
            <button
              key={t.label}
              role="menuitem"
              onClick={() => {
                onClose()
                t.onClick()
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left outline-none hover:bg-raised focus-visible:bg-active"
            >
              <t.icon size={16} className="text-muted" aria-hidden />
              <span className="flex-1">{t.label}</span>
              {t.hint && <span className="text-xs text-faint">{t.hint}</span>}
            </button>
          )
        )}
      </div>
    </>
  )
}
