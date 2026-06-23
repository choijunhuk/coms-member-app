import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = '2026-06-15'

export default function PrivacyPolicyScreen({ onBack }: any) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <button type="button" className="icon-button" onClick={onBack} aria-label="뒤로"><ArrowLeft size={18} /></button>
          <h1>개인정보 처리방침</h1>
        </div>
      </header>
      <section className="content">
        <article className="panel">
          <p className="muted">최종 수정일: {LAST_UPDATED}</p>
          <h2>1. 수집하는 정보</h2>
          <p>회원가입 시 학번, 이름, 이메일, 비밀번호(해시), 학과 정보를 수집합니다. 앱 사용 중에는 작성한 글·댓글·투표·공지 열람 기록과 푸시 토큰이 저장됩니다.</p>
          <h2>2. 이용 목적</h2>
          <p>회원 인증, 동아리 활동 공지, 커뮤니티 운영, 푸시 알림 발송 외 다른 목적으로는 사용하지 않습니다. 외부 광고 ID나 위치 정보는 수집하지 않습니다.</p>
          <h2>3. 보관 기간</h2>
          <p>회원이 탈퇴하면 학번/이메일/비밀번호/푸시 토큰은 즉시 삭제되며, 본인이 작성한 글과 댓글도 함께 삭제됩니다. 학교 규정에 따라 운영진의 감사 로그는 1년간 별도 보관됩니다.</p>
          <h2>4. 제3자 제공</h2>
          <p>학교, 광고주, 외부 분석 업체에 회원 정보를 제공하지 않습니다. 푸시 알림은 Apple/Google 푸시 서버를 경유합니다.</p>
          <h2>5. 본인 권리</h2>
          <p>언제든 앱 내 "내 정보 → 회원 탈퇴"로 본인 계정을 삭제할 수 있습니다. 비밀번호와 표시 이름은 본인 화면에서 수정 가능합니다.</p>
          <h2>6. 문의</h2>
          <p>광운대학교 컴퓨터 학술 동아리 COM&apos;s 운영진 메일: kwcoms69@gmail.com</p>
        </article>
      </section>
    </main>
  )
}
