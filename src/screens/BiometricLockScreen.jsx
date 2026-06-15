import { useState } from 'react'
import { Fingerprint, Loader2, LogOut } from 'lucide-react'
import { verifyBiometric } from '../services/biometric.js'

const MAX_ATTEMPTS = 3

export default function BiometricLockScreen({ onUnlock, onLogout }) {
  const [attempts, setAttempts] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
    const next = attempts + 1
    setAttempts(next)
    if (next >= MAX_ATTEMPTS) {
      onLogout()
      return
    }
    setError('인증에 실패했습니다. 다시 시도해주세요.')
  }

  return (
    <main className="center-screen">
      <section className="login-panel">
        <div className="brand-pill">COMS</div>
        <h1>잠금 해제</h1>
        <p className="muted">잠시 자리를 비웠습니다. Face ID / 지문으로 다시 들어오세요.</p>
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
