import { BellRing, Fingerprint, Sparkles, X } from 'lucide-react'

export default function OnboardingCard({ pushEnabled, biometricAvailable, onEnablePush, onDismiss }) {
  return (
    <section className="onboarding-card">
      <header className="onboarding-head">
        <span><Sparkles size={16} aria-hidden="true" /> 회원 앱에 처음 오셨네요</span>
        <button type="button" className="icon-button" onClick={onDismiss} aria-label="안내 닫기"><X size={14} /></button>
      </header>
      <ul className="onboarding-steps">
        <li>
          <BellRing size={15} aria-hidden="true" />
          <div>
            <strong>푸시 알림 켜기</strong>
            <p className="muted">새 공지·댓글·답글을 즉시 받아보세요.</p>
          </div>
          <button type="button" className="button secondary" onClick={onEnablePush} disabled={!pushEnabled}>켜기</button>
        </li>
        <li>
          <Fingerprint size={15} aria-hidden="true" />
          <div>
            <strong>Face ID / 지문 잠금</strong>
            <p className="muted">{biometricAvailable ? '5분 자리 비움 후 자동 재인증.' : '이 기기는 생체 인식을 지원하지 않습니다.'}</p>
          </div>
        </li>
      </ul>
    </section>
  )
}
