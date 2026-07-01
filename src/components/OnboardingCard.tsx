import { BellRing, Check, Fingerprint, Sparkles, X } from 'lucide-react'
import { pushPermissionActionLabel } from '../utils/pushPermissionStatus'

type OnboardingCardProps = {
  pushEnabled?: boolean
  pushPermission?: string | null
  biometricAvailable?: boolean
  onEnablePush?: () => void
  onDismiss?: () => void
}

export default function OnboardingCard({ pushEnabled, pushPermission, biometricAvailable, onEnablePush, onDismiss }: OnboardingCardProps) {
  const pushGranted = pushPermission === 'granted'
  const pushDenied = pushPermission === 'denied'
  const pushCopy = pushGranted
    ? '기기 알림 권한이 허용되어 있습니다.'
    : pushDenied
      ? '기기 설정에서 COMS 알림을 허용해야 합니다.'
      : '새 공지·댓글·답글을 즉시 받아보세요.'

  return (
    <section className="onboarding-card">
      <header className="onboarding-head">
        <span><Sparkles size={16} aria-hidden="true" /> 회원 앱에 처음 오셨네요</span>
        <button type="button" className="icon-button" onClick={onDismiss} aria-label="안내 닫기"><X size={14} /></button>
      </header>
      <ul className="onboarding-steps">
        <li>
          {pushGranted ? <Check size={15} aria-hidden="true" /> : <BellRing size={15} aria-hidden="true" />}
          <div>
            <strong>{pushGranted ? '푸시 알림 허용됨' : '푸시 알림 켜기'}</strong>
            <p className="muted">{pushCopy}</p>
          </div>
          <button type="button" className="button secondary" onClick={onEnablePush} disabled={!pushEnabled || pushGranted || pushDenied}>
            {pushPermissionActionLabel(pushPermission, pushEnabled)}
          </button>
        </li>
        {biometricAvailable && (
          <li>
            <Fingerprint size={15} aria-hidden="true" />
            <div>
              <strong>Face ID / 지문 잠금</strong>
              <p className="muted">5분 자리 비움 후 자동 재인증.</p>
            </div>
          </li>
        )}
      </ul>
    </section>
  )
}
