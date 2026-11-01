import { useState } from 'react'
import { BookmarkPlus, Copy, Trash2 } from 'lucide-react'
import CodeEditor from './CodeEditor'
import DesignPanel, { PageDesign } from './DesignPanel'
import { Action, Block, Project } from '../store'
import { usesTailwind } from '../page'
import { Button, Field, IconButton, Tabs } from './ui'
import { inputClass } from './styles'

export type InspectorTab = 'design' | 'code' | 'css' | 'page'

type Props = {
  project: Project
  block: Block | null
  dispatch: (a: Action) => void
  onSaveComponent: (b: Block) => void
  blockError?: string
  cssError?: string
  tab: InspectorTab
  onTab: (t: InspectorTab) => void
  /** For the Design tab: the canvas document, the picked element and a value that changes per render. */
  doc: Document | null
  renderKey: unknown
  selector: string
  onSelector: (s: string) => void
}

const panel = 'flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-surface'

function ErrorBar({ text }: { text?: string }): React.JSX.Element | null {
  if (!text) return null
  return (
    <p
      role="alert"
      className="max-h-32 shrink-0 overflow-y-auto border-t border-rule bg-danger-soft px-4 py-2.5 font-mono text-xs leading-5 whitespace-pre-wrap text-danger-ink"
    >
      {text}
    </p>
  )
}

function PageCss({
  project,
  dispatch,
  cssError
}: Pick<Props, 'project' | 'dispatch' | 'cssError'>): React.JSX.Element {
  return (
    <>
      <p className="shrink-0 px-4 py-2.5 text-xs leading-[18px] text-muted">
        {usesTailwind(project.css)
          ? 'Tailwind is on. Add design tokens under @theme to use them as classes.'
          : 'Shared styles and colour tokens. Every component can use them.'}
      </p>
      <CodeEditor
        key="page-css"
        label="Page CSS"
        language="css"
        value={project.css}
        onChange={(css) => dispatch({ type: 'page', patch: { css }, key: 'css' })}
      />
      <ErrorBar text={cssError} />
    </>
  )
}

export default function Inspector({
  project,
  block,
  dispatch,
  onSaveComponent,
  blockError,
  cssError,
  tab,
  onTab,
  doc,
  renderKey,
  selector,
  onSelector
}: Props): React.JSX.Element {
  const [pageTab, setPageTab] = useState<'design' | 'page'>('design')
  const component = project.kind === 'component'
  const pageDesign = (
    <PageDesign
      css={project.css}
      onCss={(css) => dispatch({ type: 'page', patch: { css }, key: 'tokens' })}
    />
  )

  if (!block) {
    return (
      <aside className={panel}>
        <div className="grid shrink-0 gap-3 p-4">
          <h2 className="text-base font-semibold">Page</h2>
          <Field label="Page title">
            <input
              className={inputClass}
              value={project.title}
              onChange={(e) =>
                dispatch({ type: 'page', patch: { title: e.target.value }, key: 'title' })
              }
            />
          </Field>
        </div>
        <Tabs
          value={pageTab}
          onChange={setPageTab}
          tabs={[
            { id: 'design', label: 'Design' },
            { id: 'page', label: 'Page CSS' }
          ]}
        />
        {pageTab === 'design' ? (
          pageDesign
        ) : (
          <PageCss project={project} dispatch={dispatch} cssError={cssError} />
        )}
      </aside>
    )
  }

  const current = !component && tab === 'page' ? 'code' : tab
  const codeLabel = block.lang === 'jsx' ? 'JSX' : 'HTML'

  return (
    <aside className={panel}>
      <div className="grid shrink-0 gap-3 p-4">
        <Field label="Component name">
          <input
            className={inputClass}
            value={block.name}
            onChange={(e) =>
              dispatch({
                type: 'update',
                id: block.id,
                patch: { name: e.target.value },
                key: 'name'
              })
            }
          />
        </Field>
        {!component && (
          <div className="flex items-center gap-1">
            <Button className="mr-auto" onClick={() => onSaveComponent(block)}>
              <BookmarkPlus size={15} aria-hidden /> Save as component
            </Button>
            <IconButton
              label="Duplicate"
              title="Duplicate (Ctrl+D)"
              onClick={() => dispatch({ type: 'duplicate', id: block.id })}
            >
              <Copy size={15} />
            </IconButton>
            <IconButton
              label="Delete"
              title="Delete (Del)"
              onClick={() => dispatch({ type: 'remove', id: block.id })}
            >
              <Trash2 size={15} />
            </IconButton>
          </div>
        )}
      </div>
      <Tabs<InspectorTab>
        value={current}
        onChange={onTab}
        tabs={[
          { id: 'design', label: 'Design' },
          { id: 'code', label: codeLabel },
          { id: 'css', label: 'CSS' },
          ...(component ? [{ id: 'page' as const, label: 'Page' }] : [])
        ]}
      />
      {current === 'design' ? (
        <DesignPanel
          block={block}
          doc={doc}
          renderKey={renderKey}
          selector={selector}
          onSelector={onSelector}
          onCss={(css) => dispatch({ type: 'update', id: block.id, patch: { css }, key: 'design' })}
        />
      ) : current === 'page' ? (
        <>
          {pageDesign}
          <PageCss project={project} dispatch={dispatch} cssError={cssError} />
        </>
      ) : (
        <>
          <p className="shrink-0 px-4 py-2.5 text-xs leading-[18px] text-muted">
            {current === 'css'
              ? 'Styles here only apply inside this component. The Design tab writes into the marked @design section.'
              : block.lang === 'jsx'
                ? 'Export a component as the default. It renders as static HTML; import only from "react".'
                : 'Edits show on the page as you type. Scripts don’t run in the editor.'}
          </p>
          <CodeEditor
            key={`${block.id}-${current}`}
            label={`${block.name} ${current === 'css' ? 'CSS' : codeLabel}`}
            language={current === 'css' ? 'css' : block.lang}
            value={current === 'css' ? block.css : block.code}
            onChange={(v) =>
              dispatch({ type: 'update', id: block.id, patch: { [current]: v }, key: current })
            }
          />
          <ErrorBar text={current === 'code' ? blockError : undefined} />
        </>
      )}
    </aside>
  )
}
