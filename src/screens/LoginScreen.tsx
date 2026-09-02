import { useState } from 'react'
import { Loader2, LockKeyhole, MailCheck } from 'lucide-react'
import { confirmPasswordReset, loginUser, requestPasswordReset } from '../services/authApi'
import { PASSWORD_POLICY_MESSAGE, validPassword } from '../utils/passwordPolicy'

const EMPTY_RESET = { email: '', code: '', newPassword: '', newPasswordConfirm: '' }

export default function LoginScreen({ onLogin }: { onLogin: () => void | Promise<void> }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // 비밀번호 찾기: 이메일로 인증코드 → 코드 + 새 비밀번호. codeSent gates step two.
  const [resetting, setResetting] = useState(false)
  const [resetForm, setResetForm] = useState(EMPTY_RESET)
  const [codeSent, setCodeSent] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const canSubmit = identifier.trim() && password.trim() && !loading
  const patchReset = (patch) => setResetForm((prev) => ({ ...prev, ...patch }))

  function closeReset() {
    setResetting(false)
    setResetForm(EMPTY_RESET)
    setCodeSent(false)
    setResetError('')
    setResetMessage('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      await loginUser({ identifier: identifier.trim(), password, rememberMe })
      await onLogin()
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function sendResetCode() {
    const email = resetForm.email.trim()
    if (!email.includes('@')) {
      setResetError('가입 이메일을 정확히 입력해주세요.')
      return
    }
    setLoading(true)
    setResetError('')
    try {
      const result = await requestPasswordReset({ email })
      setCodeSent(true)
      // Same copy whether or not the address has an account — branching here
      // would turn this form into a membership oracle.
      setResetMessage(result?.message || '입력한 이메일로 가입된 계정이 있다면 인증코드를 보냈습니다.')
    } catch (err) {
      setResetError(err.message || '인증코드 요청에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmReset() {
    const code = resetForm.code.trim()
    if (!/^\d{6}$/.test(code)) {
      setResetError('인증코드는 숫자 6자리입니다.')
      return
    }
    if (!validPassword(resetForm.newPassword)) {
      setResetError(PASSWORD_POLICY_MESSAGE)
      return
    }
    if (resetForm.newPassword !== resetForm.newPasswordConfirm) {
      setResetError('새 비밀번호 확인이 일치하지 않습니다.')
      return
    }
    setLoading(true)
    setResetError('')
    try {
      await confirmPasswordReset({ email: resetForm.email.trim(), code, newPassword: resetForm.newPassword })
      // Prefill the identifier so the member lands back on a form they can just
      // type the new password into.
      setIdentifier(resetForm.email.trim())
      setPassword('')
      setError('')
      closeReset()
      setNotice('비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.')
    } catch (err) {
      setResetError(err.message || '비밀번호 재설정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function submitReset(event) {
    event.preventDefault()
    if (loading) return
    void (codeSent ? confirmReset() : sendResetCode())
  }

  if (resetting) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <img className="brand-logo" src="/coms-logo.png" alt="COM's" />
          <h1>비밀번호 재설정</h1>
          <p className="muted">가입할 때 등록한 이메일로 인증코드를 보내드립니다.</p>
          <form className="form" onSubmit={submitReset}>
            <label>
              가입 이메일
              {/* Deliberately not type="email": the browser's own constraint
                  bubble would pre-empt our validation with a message in the
                  browser's locale, not the app's. inputMode still gets the
                  email keyboard on mobile. */}
              <input
                inputMode="email"
                value={resetForm.email}
                onChange={(event) => patchReset({ email: event.target.value })}
                autoComplete="email"
                placeholder="가입 이메일"
                disabled={codeSent}
              />
            </label>
            {codeSent && (
              <>
                <label>
                  인증코드
                  <input
                    value={resetForm.code}
                    onChange={(event) => patchReset({ code: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="숫자 6자리"
                  />
                </label>
                <label>
                  새 비밀번호
                  <input
                    type="password"
                    value={resetForm.newPassword}
                    onChange={(event) => patchReset({ newPassword: event.target.value })}
                    autoComplete="new-password"
                    placeholder="새 비밀번호"
                  />
                </label>
                <label>
                  새 비밀번호 확인
                  <input
                    type="password"
                    value={resetForm.newPasswordConfirm}
                    onChange={(event) => patchReset({ newPasswordConfirm: event.target.value })}
                    autoComplete="new-password"
                    placeholder="새 비밀번호 확인"
                  />
                </label>
                <p className="muted">{PASSWORD_POLICY_MESSAGE}</p>
              </>
            )}
            {resetMessage && <p className="form-success">{resetMessage}</p>}
            {resetError && <p className="form-error">{resetError}</p>}
            <button type="submit" className="button primary" disabled={loading}>
              {loading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <MailCheck size={17} aria-hidden="true" />}
              {loading ? '처리 중...' : codeSent ? '비밀번호 재설정' : '인증코드 받기'}
            </button>
            {codeSent && (
              <button type="button" className="link-button" onClick={() => { setCodeSent(false); setResetMessage('') }} disabled={loading}>
                이메일을 잘못 입력했어요
              </button>
            )}
            <button type="button" className="link-button" onClick={closeReset} disabled={loading}>
              로그인으로 돌아가기
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <img className="brand-logo" src="/coms-logo.png" alt="COM's" />
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
          {notice && <p className="form-success">{notice}</p>}
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="button primary" disabled={!canSubmit}>
            {loading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
            로그인
          </button>
          <button type="button" className="link-button" onClick={() => { setResetting(true); setNotice('') }}>
            비밀번호를 잊으셨나요?
          </button>
        </form>
      </section>
    </main>
  )
}
