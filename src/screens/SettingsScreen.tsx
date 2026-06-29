import { useMemo, useState } from 'react'
import { ArrowLeft, BellRing, Bookmark, ChevronRight, Eraser, FileText, Fingerprint, Hand, LogOut, Moon, Smartphone, Sun, Type, UserX } from 'lucide-react'
import {
  FONT_SCALE_VALUES,
  IDLE_LOCK_VALUES,
  PUSH_TYPES,
  readFontScale,
  readHapticEnabled,
  readIdleLock,
  readPushPreferences,
  writeFontScale,
  writeHapticEnabled,
  writeIdleLock,
  writePushPreferences,
} from '../utils/preferences'
import { bundleVersion } from '../utils/version'

const THEME_OPTIONS = [
  { id: 'system', label: '시스템', icon: Smartphone },
  { id: 'light', label: '라이트', icon: Sun },
  { id: 'dark', label: '다크', icon: Moon },
]

export default function SettingsScreen({
  themePreference,
  onChangeTheme,
  onShowPrivacy,
  onWipeDevice,
  onWithdraw,
  onLogout,
  accountActionError = '',
  onBack,
}) {
  const [fontScale, setFontScale] = useState(() => readFontScale())
  const [haptic, setHaptic] = useState(() => readHapticEnabled())
  const [idleLock, setIdleLock] = useState(() => readIdleLock())
  const [pushPrefs, setPushPrefs] = useState(() => readPushPreferences())
  const [busy, setBusy] = useState('')
  const version = useMemo(() => bundleVersion(), [])

  function pickFontScale(id) {
    setFontScale(id)
    writeFontScale(id)
  }
  function pickHaptic(value) {
    setHaptic(value)
    writeHapticEnabled(value)
  }
  function pickIdleLock(id) {
    setIdleLock(id)
    writeIdleLock(id)
  }
  function togglePushType(id) {
    setPushPrefs((current) => {
      const next = { ...current, [id]: !current[id] }
      writePushPreferences(next)
      return next
    })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <button type="button" className="icon-button" onClick={onBack} aria-label="뒤로"><ArrowLeft size={18} /></button>
          <h1>설정</h1>
        </div>
      </header>
      <section className="content">
        <section className="panel">
          <div className="section-title"><h2><Sun size={14} aria-hidden="true" /> 화면</h2></div>
          <p className="muted">테마</p>
          <div className="segments">
            {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={themePreference === id ? 'active' : ''} onClick={() => onChangeTheme?.(id)}>
                <Icon size={14} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: '0.5rem' }}>글자 크기</p>
          <div className="segments">
            {FONT_SCALE_VALUES.map((option) => (
              <button key={option.id} type="button" className={fontScale === option.id ? 'active' : ''} onClick={() => pickFontScale(option.id)}>
                <Type size={13} aria-hidden="true" /> {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-title"><h2><BellRing size={14} aria-hidden="true" /> 알림</h2></div>
          <div className="list compact-list">
            {PUSH_TYPES.map((type) => (
              <label key={type.id} className="toggle-row">
                <span>{type.label}</span>
                <input type="checkbox" checked={Boolean(pushPrefs[type.id])} onChange={() => togglePushType(type.id)} />
              </label>
            ))}
          </div>
          <p className="muted" style={{ marginTop: '0.5rem' }}>이 기기에서 표시·소리 무음 처리. 운영진 발송 자체는 별도.</p>
        </section>

        <section className="panel">
          <div className="section-title"><h2><Fingerprint size={14} aria-hidden="true" /> 보안</h2></div>
          <p className="muted">자리 비움 후 잠금</p>
          <div className="segments">
            {IDLE_LOCK_VALUES.map((option) => (
              <button key={option.id} type="button" className={idleLock === option.id ? 'active' : ''} onClick={() => pickIdleLock(option.id)}>
                {option.label}
              </button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: '0.5rem' }}>해당 시간 이상 자리를 비웠다가 돌아오면 Face ID / 지문으로 재인증을 요청합니다.</p>
        </section>

        <section className="panel">
          <div className="section-title"><h2><Hand size={14} aria-hidden="true" /> 피드백</h2></div>
          <label className="toggle-row">
            <span>버튼 햅틱 진동</span>
            <input type="checkbox" checked={haptic} onChange={(event) => pickHaptic(event.target.checked)} />
          </label>
        </section>

        <section className="panel">
          <div className="section-title"><h2><Bookmark size={14} aria-hidden="true" /> 데이터</h2></div>
          <button
            type="button"
            className="settings-row"
            disabled={busy === 'wipe'}
            onClick={async () => {
              if (typeof window !== 'undefined' && !window.confirm('이 기기에 저장된 캐시·북마크·테마 설정을 모두 지우고 로그아웃합니다. 계속할까요?')) return
              setBusy('wipe')
              try { await onWipeDevice?.() } finally { setBusy('') }
            }}
          >
            <span><Eraser size={16} aria-hidden="true" /> 이 기기에서 데이터 지우기</span>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </section>

        <section className="panel">
          <div className="section-title"><h2><FileText size={14} aria-hidden="true" /> 정보</h2></div>
          <button type="button" className="settings-row" onClick={onShowPrivacy}>
            <span>개인정보 처리방침</span>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
          <div className="settings-row" style={{ pointerEvents: 'none' }}>
            <span>앱 버전</span>
            <span className="muted">v{version}</span>
          </div>
        </section>

        <section className="panel">
          <button
            type="button"
            className="button danger"
            disabled={busy === 'logout'}
            onClick={async () => {
              setBusy('logout')
              try { await onLogout?.() } catch { /* App owns the visible accountActionError. */ } finally { setBusy('') }
            }}
          >
            <LogOut size={16} aria-hidden="true" /> {busy === 'logout' ? '로그아웃 중...' : '로그아웃'}
          </button>
          <button
            type="button"
            className="button danger"
            disabled={busy === 'withdraw'}
            style={{ marginTop: '0.5rem' }}
            onClick={async () => {
              if (typeof window !== 'undefined' && !window.confirm('정말로 회원에서 탈퇴할까요? 작성한 글과 댓글도 함께 삭제되며 되돌릴 수 없습니다.')) return
              setBusy('withdraw')
              try { await onWithdraw?.() } catch { /* App owns the visible accountActionError. */ } finally { setBusy('') }
            }}
          >
            <UserX size={16} aria-hidden="true" /> 회원 탈퇴
          </button>
          {accountActionError && <p className="form-error">{accountActionError}</p>}
        </section>
      </section>
    </main>
  )
}
