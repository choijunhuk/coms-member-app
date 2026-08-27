import { useEffect, useRef, useState } from 'react'
import { Fingerprint, Loader2, LogOut } from 'lucide-react'
import { verifyBiometric } from '../services/biometric'

const MAX_ATTEMPTS = 3

// Dismissing the OS prompt (back button, tap outside, app switch) is not a
// failed authentication — counting it used to log people out after three
// accidental cancels.
const CANCEL_REASONS = new Set(['userCancel', 'systemCancel', 'appCancel'])

export default function BiometricLockScreen({ onUnlock, onLogout }: { onUnlock: () => void; onLogout: () => void }) {
  const [attempts, setAttempts] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const autoPromptedRef = useRef(false)

  async function attempt() {
    if (busy) return
    setBusy(true)
    setError('')
    const result = await verifyBiometric({ reason: '회원 앱 잠금을 해제합니다.' })
    setBusy(false)
    if (result.ok) {
      onUnlock()
      return
    }
    if (CANCEL_REASONS.has(String(result.reason))) {
      setError('')
      return
    }
    const next = attempts + 1
    setAttempts(next)
    if (next >= MAX_ATTEMPTS) {
      onLogout()
      return
    }
    setError('인증에 실패했습니다. 다시 시도해주세요.')
  }

  // Prompt immediately instead of making the user find the button first.
  useEffect(() => {
    if (autoPromptedRef.current) return
    autoPromptedRef.current = true
    void attempt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="center-screen">
      <section className="login-panel">
        <img className="brand-logo" src="/coms-logo.png" alt="COM's" />
        <h1>잠금 해제</h1>
        <p className="muted">잠시 자리를 비웠습니다. 지문·얼굴 인식 또는 기기 PIN으로 다시 들어오세요. (인증 창의 &quot;다른 방법&quot;에서 PIN을 선택할 수 있습니다.)</p>
        <button type="button" className="button primary" onClick={attempt} disabled={busy}>
          {busy ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Fingerprint size={17} aria-hidden="true" />}
          다시 시도
        </button>
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="button danger" onClick={onLogout}>
          <LogOut size={17} aria-hidden="true" /> 로그아웃하고 다시 로그인
        </button>
      </section>
    </main>
  )
}
