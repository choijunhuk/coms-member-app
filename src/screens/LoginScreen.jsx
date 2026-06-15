import { useState } from 'react'
import { Loader2, LockKeyhole } from 'lucide-react'
import { loginUser } from '../services/authApi.js'

export default function LoginScreen({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = identifier.trim() && password.trim() && !loading

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await loginUser({ identifier: identifier.trim(), password, rememberMe })
      await onLogin()
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-pill">COMS</div>
        <p className="eyebrow">Member App</p>
        <h1>회원용 앱으로 바로 들어가기</h1>
        <p className="muted">지원서, 모집, 관리자 기능은 웹에 두고 회원이 매일 쓰는 기능만 담았습니다.</p>
        <form className="form" onSubmit={submit}>
          <label>
            학번 또는 이메일
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" placeholder="학번 또는 이메일" />
          </label>
          <label>
            비밀번호
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="비밀번호" />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
            로그인 유지
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="button primary" disabled={!canSubmit}>
            {loading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
            로그인
          </button>
        </form>
      </section>
    </main>
  )
}
