import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BellRing, Bookmark, ChevronRight, Eraser, FileText, Fingerprint, Hand, HeartHandshake, LogOut, Moon, Smartphone, Sun, Type, UserX } from 'lucide-react'
import { confirmDialog } from '../components/ConfirmDialog'
import { Switch } from '../components/ui'
import { updateProfile } from '../services/authApi'
import { listFonts } from '../services/fontApi'
import { getNotificationPreferences, updateNotificationPreferences } from '../services/notificationApi'
import { BUILT_IN_FONTS, applyFontPreference, effectiveFontId, writeFontPreference } from '../utils/fontPreferences'
import {
  FONT_SCALE_VALUES,
  IDLE_LOCK_FEATURE_ENABLED,
  IDLE_LOCK_VALUES,
  NOTIFICATION_CATEGORIES,
  defaultNotificationPreferences,
  readFontScale,
  readHapticEnabled,
  readIdleLock,
  writeFontScale,
  writeHapticEnabled,
  writeIdleLock,
} from '../utils/preferences'
import { bundleVersion } from '../utils/version'
import { useSiteSettings } from '../hooks/useSiteSettings'

const THEME_OPTIONS = [
  { id: 'system', label: '시스템', icon: Smartphone },
  { id: 'light', label: '라이트', icon: Sun },
  { id: 'dark', label: '다크', icon: Moon },
]

export default function SettingsScreen({
  themePreference,
  onChangeTheme,
  onShowPrivacy,
  onShowSponsors,
  onWipeDevice,
  onWithdraw,
  onLogout,
  accountActionError = '',
  onBack,
  user = null,
}) {
  const [fontScale, setFontScale] = useState(() => readFontScale())
  const [fontId, setFontId] = useState(() => effectiveFontId(user))
  const [customFonts, setCustomFonts] = useState([])
  const [haptic, setHaptic] = useState(() => readHapticEnabled())
  const [idleLock, setIdleLock] = useState(() => readIdleLock())
  const [notifPrefs, setNotifPrefs] = useState(() => defaultNotificationPreferences())
  const [notifState, setNotifState] = useState('loading')
  const [notifDirty, setNotifDirty] = useState(false)
  const [busy, setBusy] = useState('')
  const version = useMemo(() => bundleVersion(), [])
  const site = useSiteSettings()

  useEffect(() => {
    let cancelled = false
    getNotificationPreferences()
      .then((prefs) => {
        if (cancelled) return
        setNotifPrefs(prefs)
        setNotifState('ready')
      })
      .catch(() => { if (!cancelled) setNotifState('error') })
    return () => { cancelled = true }
  }, [])

  function toggleNotifCategory(id) {
    setNotifPrefs((current) => ({ ...current, [id]: !current[id] }))
    setNotifDirty(true)
    setNotifState((state) => (state === 'saved' ? 'ready' : state))
  }

  async function saveNotifPrefs() {
    setNotifState('saving')
    try {
      await updateNotificationPreferences(notifPrefs)
      setNotifDirty(false)
      setNotifState('saved')
    } catch {
      setNotifState('save-error')
    }
  }

  function pickFontScale(id) {
    setFontScale(id)
    writeFontScale(id)
  }
  useEffect(() => {
    let cancelled = false
    listFonts().then((fonts) => { if (!cancelled) setCustomFonts(fonts) })
    return () => { cancelled = true }
  }, [])
  function pickFont(value) {
    setFontId(value)
    writeFontPreference(value)
    void applyFontPreference(user)
    // Sync to the profile so the web picks the same font. Best-effort: the
    // local preference above already applied, so a failure here is harmless.
    updateProfile({
      selectedFontId: value && !value.startsWith('b:') ? Number(value) : null,
      selectedBuiltinFontKey: value.startsWith('b:') ? value : null,
    }).catch(() => {})
  }
  function pickHaptic(value) {
    setHaptic(value)
    writeHapticEnabled(value)
  }
  function pickIdleLock(id) {
    setIdleLock(id)
    writeIdleLock(id)
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
          <p className="muted" style={{ marginTop: '0.5rem' }}>서체</p>
          <label className="font-select">
            <select value={fontId} onChange={(event) => pickFont(event.target.value)} aria-label="서체 선택">
              <option value="">기본 (시스템)</option>
              {BUILT_IN_FONTS.map((font) => <option key={font.id} value={font.id}>{font.name}</option>)}
              {customFonts.map((font) => <option key={font.id} value={String(font.id)}>{font.name}</option>)}
            </select>
          </label>
        </section>

        <section className="panel">
          <div className="section-title"><h2><BellRing size={14} aria-hidden="true" /> 알림</h2></div>
          <p className="muted">받고 싶은 알림 종류를 선택할 수 있습니다. 끈 항목은 더 이상 받지 않습니다.</p>
          {notifState === 'loading' && <p className="muted" style={{ marginTop: '0.5rem' }}>알림 설정을 불러오는 중...</p>}
          {notifState === 'error' && (
            <div className="button-row" style={{ marginTop: '0.5rem' }}>
              <p className="form-error">알림 설정을 불러오지 못했습니다.</p>
              <button
                type="button"
                className="button secondary compact"
                onClick={() => {
                  setNotifState('loading')
                  getNotificationPreferences()
                    .then((prefs) => { setNotifPrefs(prefs); setNotifState('ready') })
                    .catch(() => setNotifState('error'))
                }}
              >
                다시 시도
              </button>
            </div>
          )}
          {notifState !== 'loading' && notifState !== 'error' && (
            <>
              <div className="list compact-list" style={{ marginTop: '0.5rem' }}>
                {NOTIFICATION_CATEGORIES.map((category) => (
                  <div key={category.id} className="toggle-row">
                    <span className="toggle-copy">
                      <span>{category.label}</span>
                      <span className="muted">{category.description}</span>
                    </span>
                    <Switch
                      checked={Boolean(notifPrefs[category.id])}
                      disabled={notifState === 'saving'}
                      label={category.label}
                      onChange={() => toggleNotifCategory(category.id)}
                    />
                  </div>
                ))}
              </div>
              <div className="button-row" style={{ marginTop: '0.65rem' }}>
                <button
                  type="button"
                  className="button primary compact"
                  disabled={notifState === 'saving' || !notifDirty}
                  onClick={saveNotifPrefs}
                >
                  {notifState === 'saving' ? '저장 중...' : '알림 설정 저장'}
                </button>
                {notifState === 'saved' && !notifDirty && <span className="muted">알림 설정이 저장되었습니다.</span>}
                {notifState === 'save-error' && <span className="form-error">알림 설정 저장 중 오류가 발생했습니다.</span>}
              </div>
            </>
          )}
        </section>

        {IDLE_LOCK_FEATURE_ENABLED && (
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
        )}

        <section className="panel">
          <div className="section-title"><h2><Hand size={14} aria-hidden="true" /> 피드백</h2></div>
          <div className="toggle-row">
            <span>버튼 햅틱 진동</span>
            <Switch checked={haptic} label="버튼 햅틱 진동" onChange={(value) => pickHaptic(value)} />
          </div>
        </section>

        <section className="panel">
          <div className="section-title"><h2><Bookmark size={14} aria-hidden="true" /> 데이터</h2></div>
          <button
            type="button"
            className="settings-row"
            disabled={busy === 'wipe'}
            onClick={async () => {
              if (!(await confirmDialog({ message: '이 기기에 저장된 캐시·북마크·테마 설정을 모두 지우고 로그아웃합니다. 계속할까요?', tone: 'danger', confirmText: '지우고 로그아웃' }))) return
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
          <button type="button" className="settings-row" onClick={onShowSponsors}>
            <span><HeartHandshake size={16} aria-hidden="true" /> 후원자</span>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
          <button type="button" className="settings-row" onClick={onShowPrivacy}>
            <span>개인정보 처리방침</span>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
          {site.contactLinks.map((link) => (
            <a key={link.href} className="settings-row" href={link.href} target="_blank" rel="noopener noreferrer">
              <span>{link.label}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </a>
          ))}
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
              if (!(await confirmDialog({ message: '정말로 회원에서 탈퇴할까요? 작성한 글과 댓글도 함께 삭제되며 되돌릴 수 없습니다.', tone: 'danger', confirmText: '회원 탈퇴' }))) return
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
