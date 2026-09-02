import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ─── Promise-based confirm modal ─────────────────────────────────────────────
// Replaces window.confirm with an in-app modal that matches the app's own
// .lightbox/.panel styling (like ReportDialog), is accessible (role=dialog,
// aria-modal, Escape cancels, focus in + return), and works in the Capacitor
// webview. Trigger imperatively via confirmDialog(); mount one <ConfirmHost/>.

type DialogTone = 'default' | 'danger'

type PromptOptions = {
  defaultValue?: string
  placeholder?: string
  maxLength?: number
}

type Request = {
  message: string
  title?: string
  confirmText?: string
  cancelText?: string
  tone?: DialogTone
  // When present the card renders one text field and resolves with its value
  // (null on cancel) instead of a boolean — the web's promptDialog equivalent.
  // window.prompt is unusable here for the same reason window.confirm was: the
  // Capacitor WebView renders it as a bare system dialog outside the app shell.
  prompt?: PromptOptions
}

type DialogResult = boolean | string | null

type State = Request & { id: number; resolve: (value: DialogResult) => void }

let current: State | null = null
const listeners = new Set<(s: State | null) => void>()
let nextId = 1

function emit() {
  for (const listener of listeners) listener(current)
}

function settle(value: DialogResult) {
  if (!current) return
  const { resolve } = current
  current = null
  emit()
  resolve(value)
}

// Dismissing (backdrop tap, Escape, 취소) resolves with the "nothing happened"
// value for the dialog's own shape: false for confirm, null for prompt.
function cancelValue(state: State | null): DialogResult {
  return state?.prompt ? null : false
}

function open(req: Request): Promise<DialogResult> {
  if (current) settle(cancelValue(current))
  return new Promise<DialogResult>((resolve) => {
    current = { ...req, id: nextId++, resolve }
    emit()
  })
}

// eslint-disable-next-line react-refresh/only-export-components
export function confirmDialog(input: Request | string): Promise<boolean> {
  const req: Request = typeof input === 'string' ? { message: input } : input
  return open({ ...req, prompt: undefined }) as Promise<boolean>
}

// Resolves with the trimmed input, or null when the member cancels.
// eslint-disable-next-line react-refresh/only-export-components
export function promptDialog(input: Request & { prompt?: PromptOptions }): Promise<string | null> {
  return open({ ...input, prompt: input.prompt || {} }) as Promise<string | null>
}

function DialogCard({ state }: { state: State }) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const [value, setValue] = useState(state.prompt?.defaultValue || '')
  const cancel = () => settle(cancelValue(state))
  const accept = () => settle(state.prompt ? value.trim() : true)

  useEffect(() => {
    restoreRef.current = (document.activeElement as HTMLElement) ?? null
    // A prompt's field is what the member came for, so it takes focus instead.
    const frame = requestAnimationFrame(() => (inputRef.current || confirmRef.current)?.focus())
    return () => {
      cancelAnimationFrame(frame)
      restoreRef.current?.focus?.()
    }
  }, [])

  return (
    <div className="lightbox" role="presentation" onClick={cancel}>
      <div
        className="panel confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={state.title || state.message}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') cancel()
        }}
      >
        {state.title && <h2 className="confirm-dialog-title">{state.title}</h2>}
        <p className="muted confirm-dialog-message">{state.message}</p>
        {state.prompt && (
          <form
            className="inline-form"
            onSubmit={(event) => { event.preventDefault(); accept() }}
          >
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={state.prompt.placeholder || ''}
              maxLength={state.prompt.maxLength || 60}
              aria-label={state.message}
            />
          </form>
        )}
        <div className="button-row confirm-dialog-actions">
          <button type="button" className="button secondary" onClick={cancel}>
            {state.cancelText || '취소'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`button ${state.tone === 'danger' ? 'danger' : 'primary'}`}
            disabled={Boolean(state.prompt) && !value.trim()}
            onClick={accept}
          >
            {state.confirmText || '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfirmHost() {
  const [state, setState] = useState<State | null>(current)
  useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])
  if (typeof document === 'undefined' || !state) return null
  return createPortal(<DialogCard key={state.id} state={state} />, document.body)
}

export default ConfirmHost
