import { ExternalLink, Smartphone } from 'lucide-react'
import { formatDate } from '../utils/format.js'
import { latest } from '../utils/helpers.js'
import { routeFromNotification } from '../utils/mobileRoutes.js'
import { isNativeRuntime } from '../services/nativeBridge.js'
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

function hasExternalAcceptUrl(item) {
  return typeof item?.acceptUrl === 'string' && /^https?:\/\//i.test(item.acceptUrl)
}

async function openExternal(url) {
  if (!url) return
  try {
    if (isNativeRuntime()) {
      const { Browser } = await import('@capacitor/browser').catch(() => ({}))
      if (Browser?.open) {
        await Browser.open({ url })
        return
      }
    }
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  } catch (err) {
    console.warn('open external failed', err)
  }
}

export default function NotificationsTab({ notifications, unreadCount, pushStatus, appConfig, enablePush, markRead, markAllRead, openRoute }) {
  const items = latest(notifications, 'createdAt')

  async function openNotification(item) {
    if (!item?.read && item?.id) await markRead(item.id)
    const route = routeFromNotification(item)
    if (route) {
      openRoute(route)
      return
    }
    // Only fall through to an external link if there is no in-app route at all.
    if (hasExternalAcceptUrl(item)) await openExternal(item.acceptUrl)
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
        <p className="muted" style={{ marginTop: '0.4rem' }}>알림 종류·잠금·테마는 설정에서 바꿀 수 있습니다.</p>
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
          >
            {hasExternalAcceptUrl(item) && (
              <span className="media-chip"><ExternalLink size={12} aria-hidden="true" /> 외부 링크</span>
            )}
          </ListItem>
        ))}
        {items.length === 0 && <Empty text="새 알림이 없습니다." />}
      </Section>
    </div>
  )
}
