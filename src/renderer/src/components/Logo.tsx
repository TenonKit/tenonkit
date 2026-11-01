/** The Tenonkit mark: a T of two blocks, the teal stem set into the bar like a tenon into its joint. */
export default function Logo({ size = 22 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="8" fill="#131416" />
      <rect x="7" y="7" width="18" height="6.5" rx="1.8" fill="#fff" />
      <rect x="12.5" y="15" width="7" height="10" rx="1.8" fill="#4fc1d6" />
    </svg>
  )
}

/**
 * "Tenonkit" set in type, with the logo's T as the first letter. The T is drawn at the font's
 * cap height and sits on the baseline, so it reads as a letter at any font size.
 */
export function Wordmark({ className }: { className?: string }): React.JSX.Element {
  return (
    <span
      role="img"
      aria-label="Tenonkit"
      className={`inline-flex items-baseline leading-none font-semibold tracking-[-0.045em] ${className ?? ''}`}
    >
      <svg viewBox="0 0 18 18" aria-hidden className="mr-[0.04em] h-[0.698em] w-auto shrink-0">
        <rect width="18" height="6.5" rx="1.8" fill="currentColor" />
        <rect x="5.5" y="8" width="7" height="10" rx="1.8" fill="#4fc1d6" />
      </svg>
      <span aria-hidden>enonkit</span>
    </span>
  )
}
