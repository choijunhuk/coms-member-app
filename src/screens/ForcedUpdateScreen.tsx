import { Download, LogOut } from 'lucide-react'
import { DEFAULT_APP_LINKS, normalizeExternalUrl } from '../config/appLinks'

type ForcedUpdateScreenProps = {
  currentVersion?: string | null
  minimumVersion?: string | null
  updateUrl?: string | null
  onLogout?: () => void | Promise<void>
}

export default function ForcedUpdateScreen({ currentVersion, minimumVersion, updateUrl, onLogout }: ForcedUpdateScreenProps) {
  const href = normalizeExternalUrl(updateUrl, DEFAULT_APP_LINKS.update)
  return (
    <main className="center-screen">
      <section className="login-panel">
        <img className="brand-logo" src="/coms-logo.png" alt="COM's" />
        <h1>업데이트가 필요합니다</h1>
        <p className="muted">
          현재 버전 {currentVersion}은(는) 더 이상 지원되지 않습니다. 안정성과 보안을 위해 최신 버전 {minimumVersion} 이상으로 업데이트해 주세요.
        </p>
        <a className="button primary" href={href} target="_blank" rel="noreferrer">
          <Download size={17} aria-hidden="true" /> 업데이트 받기
        </a>
        {/* 이 화면은 앱 전체를 가로막습니다. 로그아웃이 없으면 공용 기기에
            로그인된 계정을 내릴 방법이 전혀 없습니다. */}
        {onLogout && (
          <button type="button" className="button secondary" onClick={() => { void onLogout() }}>
            <LogOut size={17} aria-hidden="true" /> 로그아웃
          </button>
        )}
      </section>
    </main>
  )
}
