import { cx } from './styles'

// Rows and controls shared by the Settings sections.

export function Heading({ title, text }: { title: string; text: string }): React.JSX.Element {
  return (
    <div className="mb-4">
      <h3 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-1 text-muted">{text}</p>
    </div>
  )
}

export function Row({
  title,
  text,
  children
}: {
  title: string
  text?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-8 border-b border-rule py-4 last:border-b-0">
      <div>
        <p className="font-medium">{title}</p>
        {text && <p className="mt-0.5 text-xs leading-[18px] text-muted">{text}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function Switch({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}): React.JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-6 w-10 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-control'
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 left-0.5 size-5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform',
          checked ? 'translate-x-4 bg-primary-ink' : 'bg-white'
        )}
      />
    </button>
  )
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}): React.JSX.Element {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-active p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className="h-7 min-w-9 rounded-md px-2.5 text-muted hover:text-ink aria-checked:bg-surface aria-checked:font-medium aria-checked:text-ink aria-checked:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
