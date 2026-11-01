import { Button, Modal } from './ui'

const SHORTCUTS: [string, string][] = [
  ['Undo', 'Ctrl Z'],
  ['Redo', 'Ctrl Shift Z'],
  ['Duplicate the selected component', 'Ctrl D'],
  ['Delete the selected component', 'Del'],
  ['Save now', 'Ctrl S'],
  ['Deselect, close menus', 'Esc'],
  ['Indent code', 'Tab'],
  ['Open settings', 'Ctrl ,']
]

export default function ShortcutsDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): React.JSX.Element {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <dl className="grid gap-2.5">
        {SHORTCUTS.map(([what, keys]) => (
          <div key={what} className="flex items-center justify-between gap-4">
            <dt className="text-muted">{what}</dt>
            <dd className="flex gap-1">
              {keys.split(' ').map((k) => (
                <kbd
                  key={k}
                  className="min-w-6 rounded-md bg-raised px-1.5 py-0.5 text-center font-sans text-xs font-medium shadow-[inset_0_-1px_0_var(--color-line)]"
                >
                  {k}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs text-muted">On macOS, use Cmd instead of Ctrl.</p>
      <div className="mt-5 flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
