import { useEffect, useRef } from 'react'
import { basicSetup } from 'codemirror'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { tags as t } from '@lezer/highlight'
import { useSettings } from '../settings'

// Syntax colours come from the active theme (code-* tokens).
const highlight = HighlightStyle.define([
  {
    tag: [t.tagName, t.propertyName, t.className, t.labelName, t.typeName],
    color: 'var(--color-code-tag)'
  },
  {
    tag: [t.attributeName, t.keyword, t.modifier, t.operatorKeyword],
    color: 'var(--color-code-attr)'
  },
  { tag: [t.string, t.attributeValue, t.special(t.string)], color: 'var(--color-code-string)' },
  { tag: [t.number, t.unit, t.color, t.atom, t.bool], color: 'var(--color-code-number)' },
  { tag: [t.comment, t.meta], color: 'var(--color-code-comment)', fontStyle: 'italic' },
  { tag: [t.angleBracket, t.punctuation, t.bracket], color: 'var(--color-code-comment)' },
  { tag: [t.variableName, t.function(t.variableName)], color: 'var(--color-ink)' },
  { tag: t.invalid, color: 'var(--color-danger)' }
])

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--color-surface)' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-gutters': {
    backgroundColor: 'var(--color-surface)',
    border: 'none',
    color: 'var(--color-faint)'
  },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--color-raised)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { caretColor: 'var(--color-ink)', paddingBottom: '40vh' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#cfe3e8 !important'
  }
})

type Props = {
  value: string
  language: 'html' | 'css' | 'jsx'
  onChange: (value: string) => void
  label: string
}

export default function CodeEditor({ value, language, onChange, label }: Props): React.JSX.Element {
  const { settings } = useSettings()
  const { codeFontSize, codeWrap, tabSize, lineNumbers } = settings
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const change = useRef(onChange)
  useEffect(() => {
    change.current = onChange
  })

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      doc: value,
      extensions: [
        basicSetup,
        syntaxHighlighting(highlight),
        // From Settings → Editor; changing them rebuilds the editor.
        EditorView.theme({ '&': { fontSize: `${codeFontSize}px` } }),
        codeWrap ? EditorView.lineWrapping : [],
        EditorState.tabSize.of(tabSize),
        indentUnit.of(' '.repeat(tabSize)),
        // basicSetup always adds line numbers; hiding the gutter is the switch.
        lineNumbers ? [] : EditorView.theme({ '.cm-gutters': { display: 'none' } }),
        keymap.of([indentWithTab]),
        language === 'html' ? html() : language === 'jsx' ? javascript({ jsx: true }) : css(),
        theme,
        EditorView.contentAttributes.of({ 'aria-label': label }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) change.current(u.state.doc.toString())
        })
      ]
    })
    view.current = v
    return () => v.destroy()
    // The editor is recreated per block/tab via `key`; value changes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, codeFontSize, codeWrap, tabSize, lineNumbers])

  // Undo/redo or other outside changes replace the document.
  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
    }
  }, [value])

  return <div className="min-h-0 flex-1 border-t border-rule" ref={host} />
}
