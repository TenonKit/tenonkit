import { forwardRef, useEffect, useRef } from 'react'
import { cx } from './styles'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

const VARIANTS = {
  primary: 'bg-primary text-primary-ink hover:bg-primary-hover',
  secondary: 'bg-active text-ink hover:bg-hover',
  ghost: 'text-muted hover:bg-active hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-90'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', className, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 font-medium transition-colors active:translate-y-px disabled:opacity-40',
        VARIANTS[variant],
        className
      )}
      {...rest}
    />
  )
})

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }

/** Icon-only button: the label is its accessible name and tooltip. */
export function IconButton({
  label,
  className,
  title,
  ...rest
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      className={cx(
        'grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:not-disabled:bg-active hover:not-disabled:text-ink disabled:opacity-40',
        className
      )}
      {...rest}
    />
  )
}

type Tab<T extends string> = { id: T; label: React.ReactNode }

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className
}: {
  tabs: Tab<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}): React.JSX.Element {
  return (
    <div
      role="tablist"
      className={cx(
        'flex shrink-0 shadow-[inset_0_-1px_var(--color-rule)]',
        className ?? 'gap-5 px-4'
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className="inline-flex h-[42px] shrink-0 items-center gap-1 whitespace-nowrap font-medium text-muted shadow-[inset_0_-2px_transparent] hover:text-ink aria-selected:font-semibold aria-selected:text-ink aria-selected:shadow-[inset_0_-2px_var(--color-ink)]"
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Field({
  label,
  children,
  hint
}: {
  label: string
  children: React.ReactNode
  hint?: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

/** A native modal dialog, opened while `open` is true. Esc and the backdrop close it. */
export function Modal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current!
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {open && (
        <div className="p-6">
          <h2 className="mb-5 text-base font-semibold">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  )
}

export function Toast({ message }: { message: string | null }): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-3.5 py-2 font-medium text-ground shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200',
        message ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      )}
    >
      {message}
    </div>
  )
}
