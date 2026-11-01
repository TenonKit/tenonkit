import { useId, useMemo, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronRight,
  MousePointerClick,
  RotateCcw,
  X
} from 'lucide-react'
import type { Block } from '../../../shared/project'
import {
  clearDesign,
  describe,
  findElement,
  isColor,
  isTransparent,
  readDesign,
  readTokens,
  ROOT,
  setDesign,
  setToken,
  toHex
} from '../design'
import { blockClass } from '../page'
import { cx } from './styles'

const FONTS = [
  { label: 'Page font', value: '' },
  { label: 'System sans', value: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  { label: 'Inter', value: '"Inter", system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Rounded', value: 'ui-rounded, "SF Pro Rounded", "Segoe UI", sans-serif' },
  { label: 'Monospace', value: 'ui-monospace, "Cascadia Code", Consolas, monospace' }
]
const WEIGHTS = ['', '300', '400', '500', '600', '700', '800', '900']

type Props = {
  block: Block
  doc: Document | null
  /** Changes whenever the canvas re-renders, so computed values are re-read. */
  renderKey: unknown
  selector: string
  onSelector: (s: string) => void
  onCss: (css: string) => void
}

/** No-code styling for the element picked on the canvas. Everything it does is CSS in the CSS tab. */
export default function DesignPanel({
  block,
  doc,
  renderKey,
  selector,
  onSelector,
  onCss
}: Props): React.JSX.Element {
  const design = useMemo(() => readDesign(block.css), [block.css])
  const own = design[selector] ?? {}

  const root = doc?.querySelector(`.${blockClass(block.id)}`) ?? null
  const el = root ? findElement(root, selector) : null
  // What the element looks like right now, shown as placeholders for anything not set here.
  const computed = useMemo(
    () => (el ? getComputedStyle(el) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [el, renderKey]
  )
  const now = (prop: string): string => computed?.getPropertyValue(prop) ?? ''

  const set = (props: Record<string, string>): void => onCss(setDesign(block.css, selector, props))
  const val = (prop: string): string => own[prop] ?? ''

  // Ancestors of the picked element, for the breadcrumb.
  const trail = useMemo(() => {
    if (selector === ROOT) return [ROOT]
    const parts = selector.slice(4).split(' > ')
    return [ROOT, ...parts.map((_, i) => `& > ${parts.slice(0, i + 1).join(' > ')}`)]
  }, [selector])

  const styled = Object.keys(design)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-t border-rule">
      <div className="px-4 pt-3 pb-1">
        <nav aria-label="Element" className="flex flex-wrap items-center gap-0.5 text-xs">
          {trail.map((s, i) => (
            <span key={s} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight size={12} className="text-faint" aria-hidden />}
              <button
                onClick={() => onSelector(s)}
                aria-current={s === selector ? 'true' : undefined}
                className="rounded px-1.5 py-0.5 text-muted hover:bg-active hover:text-ink aria-[current=true]:bg-accent-soft aria-[current=true]:font-medium aria-[current=true]:text-accent"
              >
                {describe(s)}
              </button>
            </span>
          ))}
        </nav>
        {!el ? (
          <div
            role="alert"
            className="mt-3 rounded-lg bg-warning-soft px-3 py-2.5 text-xs text-warning-ink"
          >
            This element isn’t in the component any more, probably because its code changed.
            <div className="mt-2 flex gap-2">
              <button
                className="font-medium underline"
                onClick={() => onCss(clearDesign(block.css, selector))}
              >
                Remove its styles
              </button>
              <button className="font-medium underline" onClick={() => onSelector(ROOT)}>
                Style the whole component
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <MousePointerClick size={13} aria-hidden /> Click anything on the canvas to style it.
          </p>
        )}
      </div>

      <Group title="Text">
        <Field label="Font" wide>
          <select
            className={input}
            value={FONTS.find((f) => f.value === val('font-family'))?.value ?? val('font-family')}
            onChange={(e) => set({ 'font-family': e.target.value })}
          >
            {FONTS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
            {val('font-family') && !FONTS.some((f) => f.value === val('font-family')) && (
              <option value={val('font-family')}>{val('font-family')}</option>
            )}
          </select>
        </Field>
        <Field label="Size">
          <Num
            value={val('font-size')}
            placeholder={now('font-size')}
            unit="px"
            onChange={(v) => set({ 'font-size': v })}
          />
        </Field>
        <Field label="Weight">
          <select
            className={input}
            value={val('font-weight')}
            onChange={(e) => set({ 'font-weight': e.target.value })}
          >
            {WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {w || `Auto (${now('font-weight')})`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Line height">
          <Num
            value={val('line-height')}
            placeholder={now('line-height')}
            unit="px"
            onChange={(v) => set({ 'line-height': v })}
          />
        </Field>
        <Field label="Letter spacing">
          <Num
            value={val('letter-spacing')}
            placeholder={now('letter-spacing')}
            unit="px"
            step={0.1}
            onChange={(v) => set({ 'letter-spacing': v })}
          />
        </Field>
        <Field label="Align" wide>
          <div
            role="radiogroup"
            aria-label="Text align"
            className="flex w-fit rounded-md bg-active p-0.5"
          >
            {[
              ['left', AlignLeft],
              ['center', AlignCenter],
              ['right', AlignRight]
            ].map(([a, Icon]) => {
              const I = Icon as typeof AlignLeft
              const on = val('text-align') === a
              return (
                <button
                  key={a as string}
                  role="radio"
                  aria-checked={on}
                  aria-label={`Align ${a}`}
                  onClick={() => set({ 'text-align': on ? '' : (a as string) })}
                  className="grid h-7 w-8 place-items-center rounded text-muted hover:text-ink aria-checked:bg-surface aria-checked:text-ink aria-checked:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                >
                  <I size={15} />
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Color" wide>
          <Color
            value={val('color')}
            placeholder={now('color')}
            onChange={(v) => set({ color: v })}
            label="Text color"
          />
        </Field>
      </Group>

      <Group title="Fill">
        <Field label="Background" wide>
          <Color
            value={val('background-color')}
            placeholder={now('background-color')}
            onChange={(v) => set({ 'background-color': v })}
            label="Background color"
          />
        </Field>
        <Field label="Opacity">
          <Num
            value={val('opacity')}
            placeholder={now('opacity')}
            unit=""
            step={0.05}
            min={0}
            max={1}
            onChange={(v) => set({ opacity: v })}
          />
        </Field>
      </Group>

      <Group title="Spacing">
        <Field label="Padding top / bottom">
          <Num
            value={val('padding-top')}
            placeholder={now('padding-top')}
            unit="px"
            onChange={(v) => set({ 'padding-top': v, 'padding-bottom': v })}
          />
        </Field>
        <Field label="Padding left / right">
          <Num
            value={val('padding-left')}
            placeholder={now('padding-left')}
            unit="px"
            onChange={(v) => set({ 'padding-left': v, 'padding-right': v })}
          />
        </Field>
        <Field label="Space above">
          <Num
            value={val('margin-top')}
            placeholder={now('margin-top')}
            unit="px"
            onChange={(v) => set({ 'margin-top': v })}
          />
        </Field>
        <Field label="Space below">
          <Num
            value={val('margin-bottom')}
            placeholder={now('margin-bottom')}
            unit="px"
            onChange={(v) => set({ 'margin-bottom': v })}
          />
        </Field>
      </Group>

      <Group title="Shape">
        <Field label="Corner radius">
          <Num
            value={val('border-top-left-radius')}
            placeholder={now('border-top-left-radius')}
            unit="px"
            onChange={(v) => set({ 'border-radius': v })}
          />
        </Field>
        <Field label="Border width">
          <Num
            value={val('border-top-width')}
            placeholder={now('border-top-width')}
            unit="px"
            onChange={(v) => set({ 'border-width': v, 'border-style': v ? 'solid' : '' })}
          />
        </Field>
        <Field label="Border color" wide>
          <Color
            value={val('border-top-color')}
            placeholder={now('border-top-color')}
            onChange={(v) => set({ 'border-color': v })}
            label="Border color"
          />
        </Field>
      </Group>

      <div className="flex items-center justify-between gap-2 border-t border-rule px-4 py-3">
        <span className="text-xs text-muted">
          {Object.keys(own).length
            ? `${Object.keys(own).length} styles on this element`
            : 'No styles set on this element'}
        </span>
        <button
          disabled={!Object.keys(own).length}
          onClick={() => onCss(clearDesign(block.css, selector))}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-active hover:text-ink disabled:opacity-40"
        >
          <RotateCcw size={13} aria-hidden /> Reset element
        </button>
      </div>

      {styled.length > 0 && (
        <div className="border-t border-rule px-4 pt-3 pb-4">
          <h3 className="text-xs font-medium text-muted">Styled in this component</h3>
          <ul className="mt-1.5 grid gap-0.5">
            {styled.map((s) => {
              const missing = !root || !findElement(root, s)
              return (
                <li key={s} className="group flex items-center gap-1">
                  <button
                    onClick={() => onSelector(s)}
                    className={cx(
                      'min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-xs hover:bg-raised',
                      s === selector && 'bg-active font-medium'
                    )}
                    title={s}
                  >
                    {describe(s)}{' '}
                    <span className="text-faint">
                      {Object.keys(design[s]).length} styles{missing && ', element not found'}
                    </span>
                  </button>
                  <button
                    aria-label={`Remove styles for ${describe(s)}`}
                    onClick={() => onCss(clearDesign(block.css, s))}
                    className="grid size-6 place-items-center rounded text-faint opacity-0 group-hover:opacity-100 hover:bg-active hover:text-ink focus-visible:opacity-100"
                  >
                    <X size={13} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Page-wide tokens from :root (colours, font, radius), for when no component is selected. */
export function PageDesign({
  css,
  onCss
}: {
  css: string
  onCss: (css: string) => void
}): React.JSX.Element {
  const tokens = readTokens(css)
  if (!tokens.length)
    return (
      <p className="border-t border-rule px-4 py-4 text-xs text-muted">
        Add design tokens to the page CSS, like{' '}
        <code className="font-mono">:root {'{ --brand: #1b6c80; }'}</code>, and they show up here.
      </p>
    )
  const colors = tokens.filter((t) => isColor(t.value))
  const other = tokens.filter((t) => !isColor(t.value))
  return (
    <div className="min-h-0 flex-1 overflow-y-auto border-t border-rule">
      <p className="px-4 pt-3 text-xs text-muted">
        Every component uses these. Changing one restyles the whole page.
      </p>
      {colors.length > 0 && (
        <Group title="Colours">
          {colors.map((t) => (
            <Field key={t.name} label={tokenLabel(t.name)} wide>
              <Color
                value={t.value}
                placeholder={t.value}
                onChange={(v) => v && onCss(setToken(css, t.name, v))}
                label={t.name}
              />
            </Field>
          ))}
        </Group>
      )}
      {other.length > 0 && (
        <Group title="Type and shape">
          {other.map((t) => (
            <Field key={t.name} label={tokenLabel(t.name)} wide>
              {t.name === '--font' ? (
                <select
                  className={input}
                  value={t.value}
                  onChange={(e) => onCss(setToken(css, t.name, e.target.value))}
                >
                  {[
                    ...FONTS.slice(1).map((f) => f.value),
                    ...(FONTS.some((f) => f.value === t.value) ? [] : [t.value])
                  ].map((v) => (
                    <option key={v} value={v}>
                      {FONTS.find((f) => f.value === v)?.label ?? v}
                    </option>
                  ))}
                </select>
              ) : (
                <TextInput
                  value={t.value}
                  label={t.name}
                  onCommit={(v) => v && onCss(setToken(css, t.name, v))}
                />
              )}
            </Field>
          ))}
        </Group>
      )}
    </div>
  )
}

const tokenLabel = (name: string): string => {
  const s = name.replace(/^--/, '').replace(/-/g, ' ')
  return s[0].toUpperCase() + s.slice(1)
}

// ---- Controls ----

const input =
  'h-8 w-full min-w-0 rounded-md border border-control bg-surface px-2 text-sm placeholder:text-faint focus:border-transparent focus:outline-2 focus:outline-solid focus:-outline-offset-1 focus:outline-accent'

function Group({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="border-t border-rule px-4 pt-3 pb-4">
      <h3 className="mb-2.5 text-xs font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">{children}</div>
    </section>
  )
}

// A group, not a <label>: a label around several controls would open the colour picker on click.
function Field({
  label,
  wide,
  children
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className={cx('grid gap-1', wide && 'col-span-2')}>
      <span id={id} className="text-xs text-muted">
        {label}
      </span>
      {children}
    </div>
  )
}

/** A number in `unit`. Empty removes the style; the placeholder shows the current computed value. */
function Num({
  value,
  placeholder,
  unit,
  step = 1,
  min,
  max,
  onChange
}: {
  value: string
  placeholder: string
  unit: string
  step?: number
  min?: number
  max?: number
  onChange: (v: string) => void
}): React.JSX.Element {
  const number = (s: string): string => {
    const n = parseFloat(s)
    return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : ''
  }
  // Values typed by hand in another unit (2rem, 1.5em) are shown as written and kept as text.
  const foreign = value !== '' && unit !== '' && !value.endsWith(unit)
  return (
    <div className="relative">
      <input
        type={foreign ? 'text' : 'number'}
        className={cx(input, unit && !foreign && 'pr-7')}
        value={foreign ? value : number(value)}
        placeholder={number(placeholder) || placeholder}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? '' : foreign ? v : `${v}${unit}`)
        }}
      />
      {unit && !foreign && (
        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-faint">
          {unit}
        </span>
      )}
    </div>
  )
}

function Color({
  value,
  placeholder,
  onChange,
  label
}: {
  value: string
  placeholder: string
  onChange: (v: string) => void
  label: string
}): React.JSX.Element {
  const swatch = toHex(value) ?? toHex(placeholder) ?? '#000000'
  return (
    <div className="flex gap-2">
      <input
        type="color"
        aria-label={`${label}, picker`}
        value={swatch}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-control bg-surface p-0.5"
      />
      <TextInput
        value={value}
        placeholder={toHex(placeholder) ?? (isTransparent(placeholder) ? 'None' : placeholder)}
        label={label}
        onCommit={onChange}
      />
      {value && (
        <button
          aria-label={`Clear ${label}`}
          onClick={() => onChange('')}
          className="grid size-8 shrink-0 place-items-center rounded-md text-faint hover:bg-active hover:text-ink"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

/** Text that is applied on Enter or when leaving the field, so half-typed values aren't written. */
function TextInput({
  value,
  placeholder,
  label,
  onCommit
}: {
  value: string
  placeholder?: string
  label: string
  onCommit: (v: string) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = (): void => {
    if (draft !== null && draft !== value) onCommit(draft)
    setDraft(null)
  }
  return (
    <input
      aria-label={label}
      className={cx(input, 'font-mono text-xs')}
      value={draft ?? value}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}
