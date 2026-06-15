import { Smartphone } from 'lucide-react'
import { formatDate } from '../utils/format.js'
import { latest } from '../utils/helpers.js'
import { routeFromNotification } from '../utils/mobileRoutes.js'
import { Empty, ListItem, Section } from '../components/ui.jsx'

const PUSH_STATUS_LABEL = {
  idle: '푸시 알림을 켜면 새 공지와 내 글 댓글을 바로 받을 수 있습니다.',
  requesting: '기기 푸시 권한을 요청하는 중입니다.',
  requested: '기기 등록을 요청했습니다.',
  registered: '이 기기에서 푸시 알림을 받을 준비가 됐습니다.',
  denied: '기기 설정에서 알림 권한이 꺼져 있습니다.',
  unavailable: '브라우저 미리보기에서는 푸시 등록을 건너뜁니다.',
  'server-unavailable': '앱은 푸시 토큰을 받았지만 서버 등록 API가 아직 없습니다.',
  error: '푸시 등록 중 오류가 발생했습니다.',
}

export default function NotificationsTab({ notifications, unreadCount, pushStatus, appConfig, enablePush, markRead, markAllRead, openRoute }) {
  const items = latest(notifications, 'createdAt')

  async function openNotification(item) {
    if (!item?.read && item?.id) await markRead(item.id)
    if (typeof item?.acceptUrl === 'string' && /^https?:\/\//i.test(item.acceptUrl)) {
      window.open(item.acceptUrl, '_blank', 'noopener,noreferrer')
      return
    }
    const route = routeFromNotification(item)
    if (route) openRoute(route)
  }

  const pushMessage = PUSH_STATUS_LABEL[pushStatus] || '푸시 상태를 확인할 수 없습니다.'

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">
          <h2>푸시 알림</h2>
          <button type="button" onClick={enablePush} disabled={!appConfig.pushEnabled || pushStatus === 'requesting'}>
            <Smartphone size={15} aria-hidden="true" /> 켜기
          </button>
        </div>
        <p className="muted">{appConfig.pushEnabled ? pushMessage : '현재 앱 설정에서 푸시 알림이 비활성화되어 있습니다.'}</p>
      </section>
      <Section title={`알림 ${unreadCount > 0 ? `· 안 읽음 ${unreadCount}` : ''}`} action={items.length ? '모두 읽음' : ''} onAction={markAllRead}>
        {items.map((item) => (
          <ListItem
            key={item.id}
            title={item.message || '알림'}
            meta={`${item.actorLabel || item.type || 'COMS'} · ${formatDate(item.createdAt)}`}
            body={item.read ? '읽음' : '읽지 않음'}
            pinned={!item.read}
            onClick={() => openNotification(item)}
          />
        ))}
        {items.length === 0 && <Empty text="새 알림이 없습니다." />}
      </Section>
    </div>
  )
}
