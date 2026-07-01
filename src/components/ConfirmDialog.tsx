import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ─── Promise-based confirm modal ─────────────────────────────────────────────
// Replaces window.confirm with an in-app modal that matches the app's own
// .lightbox/.panel styling (like ReportDialog), is accessible (role=dialog,
// aria-modal, Escape cancels, focus in + return), and works in the Capacitor
// webview. Trigger imperatively via confirmDialog(); mount one <ConfirmHost/>.

type DialogTone = 'default' | 'danger'

type Request = {
  message: string
  title?: string
  confirmText?: string
  cancelText?: string
  tone?: DialogTone
}

type State = Request & { id: number; resolve: (value: boolean) => void }

let current: State | null = null
const listeners = new Set<(s: State | null) => void>()
let nextId = 1

function emit() {
  for (const listener of listeners) listener(current)
}

function settle(value: boolean) {
  if (!current) return
  const { resolve } = current
  current = null
  emit()
  resolve(value)
}

// eslint-disable-next-line react-refresh/only-export-components
export function confirmDialog(input: Request | string): Promise<boolean> {
  const req: Request = typeof input === 'string' ? { message: input } : input
  if (current) settle(false)
  return new Promise<boolean>((resolve) => {
    current = { ...req, id: nextId++, resolve }
    emit()
  })
}

function DialogCard({ state }: { state: State }) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreRef.current = (document.activeElement as HTMLElement) ?? null
    const frame = requestAnimationFrame(() => confirmRef.current?.focus())
    return () => {
      cancelAnimationFrame(frame)
      restoreRef.current?.focus?.()
    }
  }, [])

  return (
    <div className="lightbox" role="presentation" onClick={() => settle(false)}>
      <div
        className="panel confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={state.title || state.message}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') settle(false)
        }}
      >
        {state.title && <h2 className="confirm-dialog-title">{state.title}</h2>}
        <p className="muted confirm-dialog-message">{state.message}</p>
        <div className="button-row confirm-dialog-actions">
          <button type="button" className="button secondary" onClick={() => settle(false)}>
            {state.cancelText || '취소'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`button ${state.tone === 'danger' ? 'danger' : 'primary'}`}
            onClick={() => settle(true)}
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
