import { useEffect } from 'react'
import { Bell, Check, ExternalLink, FileText, Mail, Megaphone, MessageCircle, RefreshCw, Reply, RotateCcw, Settings as SettingsIcon, ShieldAlert, ShieldOff, Smartphone, Trash2 } from 'lucide-react'
import { formatDate } from '../utils/format'
import { latest } from '../utils/helpers'
import { routeFromNotification } from '../utils/mobileRoutes'
import { isNativeRuntime } from '../services/nativeBridge'
import { pushPermissionActionLabel } from '../utils/pushPermissionStatus'
import { reportError } from '../services/observability'
import { Empty, Section } from '../components/ui'
import type { LucideIcon } from 'lucide-react'
import type { AppConfig, NotificationItem } from '../contract/types'

const STATUS_BADGE: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  granted: { label: '허용됨', className: 'badge-success', icon: Check },
  denied: { label: '거부됨', className: 'badge-danger', icon: ShieldOff },
  prompt: { label: '미설정', className: 'badge-warn', icon: SettingsIcon },
  unavailable: { label: '미지원', className: 'badge-muted', icon: ShieldOff },
}

const PUSH_STATUS_LABEL: Record<string, string> = {
  idle: '아래 "켜기"를 누르면 알림 권한을 요청합니다.',
  requesting: '기기 푸시 권한을 요청하는 중입니다.',
  requested: '권한 요청을 보냈습니다. 시스템 다이얼로그에서 응답을 기다리세요.',
  registered: '이 기기에서 푸시 알림을 받을 준비가 됐습니다.',
  denied: '알림 권한이 거부되었습니다. 기기 설정에서 알림을 허용해 주세요.',
  unavailable: '이 환경에서는 푸시 알림을 사용할 수 없습니다.',
  'server-unavailable': '권한은 허용되었지만, 서버 푸시 발송이 아직 준비되지 않았습니다. 앱 내 새 알림은 매 30초마다 확인합니다.',
  error: '푸시 등록 중 오류가 발생했습니다.',
}

// Korean label + icon per backend Notification.Type — without this the meta line
// used to surface raw enum strings like COMMUNITY_POST_DELETED to members.
const TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  COMMENT_ON_POST: { label: '새 댓글', icon: MessageCircle },
  REPLY_ON_COMMENT: { label: '새 답글', icon: Reply },
  NOTICE_CREATED: { label: '새 공지', icon: Megaphone },
  EXTERNAL_INVITE: { label: '초대', icon: Mail },
  COMMUNITY_POST_RESTORED: { label: '글 복원', icon: RotateCcw },
  COMMUNITY_POST_DELETED: { label: '글 삭제', icon: Trash2 },
  RECRUIT_APPLICATION: { label: '새 지원서', icon: FileText },
  COMMUNITY_REPORT: { label: '새 신고', icon: ShieldAlert },
}

function hasExternalAcceptUrl(item) {
  return typeof item?.acceptUrl === 'string' && /^https?:\/\//i.test(item.acceptUrl)
}

async function openExternal(url) {
  if (!url) return
  try {
    if (isNativeRuntime()) {
      const mod = await import('@capacitor/browser').catch(() => ({})) as { Browser?: { open?: (options: { url: string }) => Promise<void> } }
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

type NotificationsTabProps = {
  notifications: NotificationItem[]
  unreadCount: number
  pushStatus: string
  pushPermission?: string | null
  refreshPushPermission?: () => void | Promise<unknown>
  appConfig: AppConfig
  enablePush?: () => void
  onOpenPushSettings?: () => void
  markRead: (id: unknown) => void | Promise<void>
  markAllRead: () => void | Promise<void>
  openRoute: (route: unknown) => void
}

export default function NotificationsTab({ notifications, unreadCount, pushStatus, pushPermission, refreshPushPermission, appConfig, enablePush, onOpenPushSettings, markRead, markAllRead, openRoute }: NotificationsTabProps) {
  const items = latest(notifications, 'createdAt')

  useEffect(() => {
    Promise.resolve(refreshPushPermission?.()).catch((err) => {
      reportError(err, { area: 'refresh-push-permission' })
    })
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
  const retryable = appConfig.pushEnabled && (pushStatus === 'error' || pushStatus === 'server-unavailable')
  const requestDisabled = !appConfig.pushEnabled || pushStatus === 'requesting' || denied || granted || retryable

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">
          <h2>푸시 알림</h2>
          <button type="button" onClick={enablePush} disabled={requestDisabled}>
            <Smartphone size={15} aria-hidden="true" /> {pushPermissionActionLabel(permission, appConfig.pushEnabled)}
          </button>
        </div>
        <p className="muted push-status-line">
          {badge && (
            <span className={`status-badge ${badge.className}`}>
              {BadgeIcon && <BadgeIcon size={12} aria-hidden="true" />} {badge.label}
            </span>
          )}
          {appConfig.pushEnabled ? pushMessage : '현재 앱 설정에서 푸시 알림이 비활성화되어 있습니다.'}
        </p>
        {(retryable || denied) && (
          <div className="button-row" style={{ marginTop: '0.6rem' }}>
            {retryable && (
              <button type="button" className="button secondary compact" onClick={enablePush}>
                <RefreshCw size={15} aria-hidden="true" /> 재시도
              </button>
            )}
            {denied && (
              <button type="button" className="button secondary compact" onClick={onOpenPushSettings}>
                <SettingsIcon size={15} aria-hidden="true" /> 설정 열기
              </button>
            )}
          </div>
        )}
        <p className="muted push-settings-hint">알림 종류별 수신 여부는 설정 → 알림에서 조정할 수 있습니다.</p>
      </section>
      <Section title={`알림 ${unreadCount > 0 ? `· 안 읽음 ${unreadCount}` : ''}`} action={items.length ? '모두 읽음' : ''} onAction={markAllRead}>
        {items.map((item) => {
          const typeMeta = item.type ? TYPE_META[item.type] : undefined
          const TypeIcon = typeMeta?.icon || Bell
          const metaText = [typeMeta?.label || item.actorLabel || 'COMS', typeMeta && item.actorLabel ? item.actorLabel : null, formatDate(item.createdAt)]
            .filter(Boolean)
            .join(' · ')
          return (
            <button
              type="button"
              key={item.id}
              className={`list-item notification-item${item.read ? '' : ' unread'}`}
              onClick={() => openNotification(item)}
            >
              <span className="notification-icon" aria-hidden="true"><TypeIcon size={15} /></span>
              <span className="notification-copy">
                <span className="item-title">{item.message || '알림'}</span>
                <span className="item-meta">{metaText}</span>
                {hasExternalAcceptUrl(item) && (
                  <span className="media-chip"><ExternalLink size={12} aria-hidden="true" /> 외부 링크</span>
                )}
              </span>
              {!item.read && <span className="unread-dot" aria-label="읽지 않음" />}
            </button>
          )
        })}
        {items.length === 0 && <Empty text="새 알림이 없습니다." />}
      </Section>
    </div>
  )
}
