import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { changePassword } from '../services/authApi.js'
import { generationFromStudentId } from '../utils/format.js'
import { passwordPolicyMessage, validPassword } from '../utils/passwordPolicy.js'
import { Info } from '../components/ui.jsx'

export default function ProfileTab({ user, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const passwordError = newPassword ? passwordPolicyMessage(newPassword) : ''
  const canSubmit = currentPassword.trim() && validPassword(newPassword)

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setMessage('')
    setError('')
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setMessage('비밀번호가 변경되었습니다.')
    } catch (err) {
      setError(err.message || '비밀번호 변경 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="stack">
      <section className="profile-card"><div className="avatar">{(user?.name || 'C').slice(0, 1)}</div><div><h2>{user?.name || '회원'}</h2><p>{user?.studentId || '학번 없음'} · {generationFromStudentId(user?.studentId)}</p></div></section>
      <section className="panel"><Info label="이메일 인증" value={user?.emailVerified ? '완료' : '미완료'} /><Info label="학과" value={user?.department || '미등록'} /><Info label="권한" value={user?.role === 'ADMIN' ? '관리자' : '회원'} /></section>
      <form className="form panel" onSubmit={submit}>
        <h2>비밀번호 변경</h2>
        <label>현재 비밀번호<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        <label>새 비밀번호<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="영문·숫자·특수문자 포함 8자 이상" /></label>
        {passwordError && <p className="form-error">{passwordError}</p>}
        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="button primary" disabled={!canSubmit}>변경</button>
      </form>
      <button type="button" className="button danger" onClick={onLogout}><LogOut size={17} />로그아웃</button>
    </div>
  )
}
