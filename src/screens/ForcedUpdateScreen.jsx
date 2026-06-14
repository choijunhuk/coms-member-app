import { Download } from 'lucide-react'

export default function ForcedUpdateScreen({ currentVersion, minimumVersion, updateUrl }) {
  const href = typeof updateUrl === 'string' && updateUrl ? updateUrl : 'https://coms.kw.ac.kr'
  return (
    <main className="center-screen">
      <section className="login-panel">
        <div className="brand-pill">COMS</div>
        <h1>업데이트가 필요합니다</h1>
        <p className="muted">
          현재 버전 {currentVersion}은(는) 더 이상 지원되지 않습니다. 안정성과 보안을 위해 최신 버전 {minimumVersion} 이상으로 업데이트해 주세요.
        </p>
        <a className="button primary" href={href} target="_blank" rel="noreferrer">
          <Download size={17} aria-hidden="true" /> 업데이트 받기
        </a>
      </section>
    </main>
  )
}
