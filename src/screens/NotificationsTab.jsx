import { useEffect } from 'react'
import { Check, ExternalLink, Settings as SettingsIcon, ShieldOff, Smartphone } from 'lucide-react'
import { formatDate } from '../utils/format.js'
import { latest } from '../utils/helpers.js'
import { routeFromNotification } from '../utils/mobileRoutes.js'
import { isNativeRuntime } from '../services/nativeBridge.js'
import { pushPermissionActionLabel } from '../utils/pushPermissionStatus.js'
import { Empty, ListItem, Section } from '../components/ui.jsx'

const STATUS_BADGE = {
  granted: { label: '허용됨', className: 'badge-success', icon: Check },
  denied: { label: '거부됨', className: 'badge-danger', icon: ShieldOff },
  prompt: { label: '미설정', className: 'badge-warn', icon: SettingsIcon },
  unavailable: { label: '미지원', className: 'badge-muted', icon: ShieldOff },
}

const PUSH_STATUS_LABEL = {
  idle: '아래 "켜기"를 누르면 알림 권한을 요청합니다.',
  requesting: '기기 푸시 권한을 요청하는 중입니다.',
  requested: '권한 요청을 보냈습니다. 시스템 다이얼로그에서 응답을 기다리세요.',
  registered: '이 기기에서 푸시 알림을 받을 준비가 됐습니다.',
  denied: '알림 권한이 거부되었습니다. 기기 설정에서 알림을 허용해 주세요.',
  unavailable: '이 환경에서는 푸시 알림을 사용할 수 없습니다.',
  'server-unavailable': '권한은 허용되었지만, 서버 푸시 발송이 아직 준비되지 않았습니다. 앱 내 새 알림은 매 30초마다 확인합니다.',
  error: '푸시 등록 중 오류가 발생했습니다.',
}

function hasExternalAcceptUrl(item) {
  return typeof item?.acceptUrl === 'string' && /^https?:\/\//i.test(item.acceptUrl)
}

async function openExternal(url) {
  if (!url) return
  try {
    if (isNativeRuntime()) {
      const mod = await import('@capacitor/browser').catch(() => ({}))
      if (mod?.Browser?.open) {
        await mod.Browser.open({ url })
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

export default function NotificationsTab({ notifications, unreadCount, pushStatus, pushPermission, refreshPushPermission, appConfig, enablePush, markRead, markAllRead, openRoute }) {
  const items = latest(notifications, 'createdAt')

  useEffect(() => {
    Promise.resolve(refreshPushPermission?.()).catch(() => {})
  }, [pushStatus, refreshPushPermission])

  async function openNotification(item) {
    if (!item?.read && item?.id) await markRead(item.id)
    const route = routeFromNotification(item)
    if (route) {
      openRoute(route)
      return
    }
    if (hasExternalAcceptUrl(item)) await openExternal(item.acceptUrl)
  }

  const permission = pushPermission
  const badge = permission ? STATUS_BADGE[permission] : null
  const BadgeIcon = badge?.icon
  const pushMessage = PUSH_STATUS_LABEL[pushStatus] || '푸시 상태를 확인할 수 없습니다.'
  const denied = permission === 'denied'
  const granted = permission === 'granted'

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">
          <h2>푸시 알림</h2>
          <button type="button" onClick={enablePush} disabled={!appConfig.pushEnabled || pushStatus === 'requesting' || denied || granted}>
            <Smartphone size={15} aria-hidden="true" /> {pushPermissionActionLabel(permission, appConfig.pushEnabled)}
          </button>
        </div>
        {badge && (
          <div className="status-row">
            <span className={`status-badge ${badge.className}`}>
              {BadgeIcon && <BadgeIcon size={12} aria-hidden="true" />} {badge.label}
            </span>
            <span className="muted">시스템 알림 권한 상태</span>
          </div>
        )}
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
