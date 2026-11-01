import { cx } from './styles'

// Wireframe pages drifting upward behind the Home banner: pages being built from blocks, with the
// logo's teal marking the block that was just dropped in. Transform-only, so it stays cheap.

type Piece = { h: number; w?: string; teal?: boolean; cols?: number }

const PAGES: Piece[][] = [
  [
    { h: 10, w: '70%' },
    { h: 88 },
    { h: 8, w: '80%' },
    { h: 8, w: '55%' },
    { h: 46, cols: 3 },
    { h: 28, teal: true }
  ],
  [{ h: 10, w: '45%' }, { h: 56, cols: 2 }, { h: 110, teal: true }, { h: 8, w: '65%' }, { h: 36 }],
  [
    { h: 10, w: '60%' },
    { h: 120 },
    { h: 34, cols: 3, teal: true },
    { h: 8, w: '75%' },
    { h: 8, w: '40%' }
  ],
  [{ h: 72, cols: 2 }, { h: 8, w: '50%' }, { h: 40, teal: true }, { h: 96 }, { h: 10, w: '35%' }]
]
const DURATIONS = [46, 58, 40, 64]

function MiniPage({ pieces }: { pieces: Piece[] }): React.JSX.Element {
  return (
    <div className="grid gap-2.5 rounded-xl bg-white/[0.035] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
      {pieces.map((p, i) =>
        p.cols ? (
          <div
            key={i}
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${p.cols}, 1fr)` }}
          >
            {Array.from({ length: p.cols }, (_, j) => (
              <div
                key={j}
                className={cx(
                  'rounded-md',
                  p.teal && j === 0 ? 'banner-drop bg-[#4fc1d6]/60' : 'bg-white/[0.07]'
                )}
                style={{ height: p.h }}
              />
            ))}
          </div>
        ) : (
          <div
            key={i}
            className={cx('rounded-md', p.teal ? 'banner-drop bg-[#4fc1d6]/55' : 'bg-white/[0.07]')}
            style={{ height: p.h, width: p.w }}
          />
        )
      )}
    </div>
  )
}

export default function BannerArt({ animate }: { animate: boolean }): React.JSX.Element {
  return (
    <div
      aria-hidden
      data-animate={animate || undefined}
      className="banner-art pointer-events-none absolute -top-1/2 -right-[4%] -bottom-1/2 flex w-[60%] -rotate-12 gap-4"
    >
      {PAGES.map((pages, c) => (
        <div
          key={c}
          className="banner-col flex flex-1 flex-col gap-4 pb-4"
          style={{ animationDuration: `${DURATIONS[c]}s`, marginTop: c * 37 }}
        >
          {/* Two copies, so moving up by exactly half loops without a seam. */}
          {[0, 1].flatMap((copy) =>
            [0, 1, 2].map((k) => (
              <MiniPage key={`${copy}-${k}`} pieces={[...pages.slice(k), ...pages.slice(0, k)]} />
            ))
          )}
        </div>
      ))}
    </div>
  )
}
