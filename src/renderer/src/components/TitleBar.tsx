import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Logo from './Logo'
import ToolsMenu, { Tool } from './ToolsMenu'
import { cx } from './styles'

type Props = {
  platform: string
  /** Breadcrumb after the product name. */
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
  /** Opened by clicking the logo. */
  tools?: Tool[]
}

// The whole bar drags the window; anything clickable inside it opts out with `no-drag`.
export default function TitleBar({
  platform,
  left,
  center,
  right,
  tools
}: Props): React.JSX.Element {
  const mac = platform === 'darwin'
  const [menu, setMenu] = useState(false)
  return (
    <header
      className={cx(
        'drag grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 select-none',
        mac ? 'pr-3 pl-20' : 'pl-4'
      )}
      onDoubleClick={(e) => e.target === e.currentTarget && window.api.window.toggleMaximize()}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="no-drag relative">
          <button
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="Tenonkit tools"
            title="Tools"
            disabled={!tools}
            onClick={() => setMenu((m) => !m)}
            className="-ml-1.5 flex h-8 items-center gap-2 rounded-lg px-1.5 hover:bg-active aria-expanded:bg-active disabled:hover:bg-transparent"
          >
            <Logo />
            <h1 className="text-sm font-semibold">Tenonkit</h1>
            {tools && <ChevronDown size={14} className="-ml-0.5 text-faint" aria-hidden />}
          </button>
          {menu && tools && <ToolsMenu tools={tools} onClose={() => setMenu(false)} />}
        </div>
        {left}
      </div>
      <div className="no-drag">{center}</div>
      <div className="flex h-full items-center justify-end">
        <div className="no-drag flex items-center gap-1">{right}</div>
        {!mac && <WindowControls />}
      </div>
    </header>
  )
}

function WindowControls(): React.JSX.Element {
  const [maximized, setMaximized] = useState(false)
  useEffect(() => {
    window.api.window.isMaximized().then(setMaximized)
    return window.api.window.onMaximized(setMaximized)
  }, [])
  const btn = 'grid h-full w-[46px] place-items-center text-ink transition-colors'
  return (
    <div className="no-drag ml-3 flex h-full items-stretch">
      <button
        aria-label="Minimize"
        className={cx(btn, 'hover:bg-active')}
        onClick={() => window.api.window.minimize()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M0 5.5h10" stroke="currentColor" />
        </svg>
      </button>
      <button
        aria-label={maximized ? 'Restore' : 'Maximize'}
        className={cx(btn, 'hover:bg-active')}
        onClick={() => window.api.window.toggleMaximize()}
      >
        {maximized ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            aria-hidden
          >
            <path d="M2.5 2.5V.5h7v7h-2" />
            <rect x=".5" y="2.5" width="7" height="7" />
          </svg>
        ) : (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            aria-hidden
          >
            <rect x=".5" y=".5" width="9" height="9" />
          </svg>
        )}
      </button>
      <button
        aria-label="Close"
        className={cx(btn, 'hover:bg-close hover:text-white')}
        onClick={() => window.api.window.close()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M.5.5l9 9m0-9l-9 9" stroke="currentColor" />
        </svg>
      </button>
    </div>
  )
}
