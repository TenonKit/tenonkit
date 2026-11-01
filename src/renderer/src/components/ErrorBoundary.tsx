import { Component } from 'react'

type State = { error: Error | null }

/** Last line of defence: a crash in the UI shows a way back instead of a blank window. */
export default class ErrorBoundary extends Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error): void {
    console.error(error)
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="drag grid h-full place-items-center p-8">
        <div className="no-drag max-w-md text-center">
          <h1 className="text-base font-semibold">Something went wrong</h1>
          <p className="mt-2 text-muted">
            Your projects are saved on disk. Reload to get back to them.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-raised p-3 text-left font-mono text-xs whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <button
            className="mt-5 h-8 rounded-md bg-primary px-3 font-medium text-primary-ink hover:bg-primary-hover"
            onClick={() => location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
