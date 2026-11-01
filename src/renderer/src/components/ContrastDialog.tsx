import { useState } from 'react'
import { ArrowLeftRight, Check, X } from 'lucide-react'
import { contrast, toHex } from '../design'
import { Button, IconButton, Modal } from './ui'
import { cx, inputClass } from './styles'

/** Checks a text colour against a background colour for WCAG contrast. */
export default function ContrastDialog({
  open,
  onClose,
  initial
}: {
  open: boolean
  onClose: () => void
  /** Starting colours, e.g. the page's ink and paper tokens. */
  initial?: { text: string; background: string }
}): React.JSX.Element {
  return (
    <Modal open={open} onClose={onClose} title="Contrast checker">
      {open && <Checker initial={initial} onClose={onClose} />}
    </Modal>
  )
}

function Checker({
  initial,
  onClose
}: {
  initial?: { text: string; background: string }
  onClose: () => void
}): React.JSX.Element {
  const [fg, setFg] = useState(toHex(initial?.text ?? '') ?? '#16181d')
  const [bg, setBg] = useState(toHex(initial?.background ?? '') ?? '#ffffff')
  const ratio = contrast(fg, bg)

  const checks = [
    { label: 'Body text (AA)', need: 4.5 },
    { label: 'Large text, 24px+ (AA)', need: 3 },
    { label: 'Body text (AAA)', need: 7 }
  ]

  return (
    <div className="grid gap-5">
      <div
        className="rounded-xl px-5 py-6 shadow-[inset_0_0_0_1px_var(--color-line)]"
        style={{ color: toHex(fg) ?? undefined, background: toHex(bg) ?? undefined }}
      >
        <p className="text-2xl font-semibold tracking-[-0.01em]">Bread baked before dawn</p>
        <p className="mt-1">Open Tuesday to Sunday from 7am, on Harbour Street.</p>
      </div>

      <div className="flex items-end gap-2">
        <ColorField label="Text" value={fg} onChange={setFg} />
        <IconButton
          label="Swap colours"
          onClick={() => {
            setFg(bg)
            setBg(fg)
          }}
        >
          <ArrowLeftRight size={16} />
        </IconButton>
        <ColorField label="Background" value={bg} onChange={setBg} />
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted">Contrast ratio</span>
        <span className="text-[28px] font-semibold tabular-nums">
          {ratio ? `${ratio.toFixed(2)} : 1` : 'Enter two colours'}
        </span>
      </div>
      <ul className="grid gap-1.5">
        {checks.map((c) => {
          const pass = ratio !== null && ratio >= c.need
          return (
            <li key={c.label} className="flex items-center justify-between">
              <span>
                {c.label} <span className="text-faint">needs {c.need}:1</span>
              </span>
              <span
                className={cx(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  pass ? 'bg-positive-soft text-positive-ink' : 'bg-danger-soft text-danger-ink'
                )}
              >
                {pass ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
                {pass ? 'Pass' : 'Fail'}
              </span>
            </li>
          )
        })}
      </ul>
      <div className="flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}): React.JSX.Element {
  return (
    <div className="grid flex-1 gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={toHex(value) ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-control bg-surface p-0.5"
        />
        <input
          aria-label={`${label} colour`}
          className={cx(inputClass, 'font-mono text-xs')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
