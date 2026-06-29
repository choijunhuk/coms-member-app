import type { CSSProperties, ReactNode } from 'react'
import { Bell, Grid2X2, RefreshCcw, Settings, UserRound } from 'lucide-react'
import { APP_SHELL_TABS } from '../config/appScope'
import { DEFAULT_APP_LINKS, normalizeExternalUrl } from '../config/appLinks'
import { isAdminUser } from '../utils/helpers'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { hapticLight } from '../services/haptics'
import type { AppLinks, CurrentUser } from '../contract/types'

type ShellProps = {
  user?: CurrentUser | null
  activeTab: string
  setActiveTab: (tabId: string) => void
  unreadCount?: number
  onRefresh?: () => void | Promise<void>
  refreshing?: boolean
  children?: ReactNode
  tabBadges?: Record<string, number>
  onOpenSettings?: () => void
  appLinks?: AppLinks | null
}

export function Shell({ user, activeTab, setActiveTab, unreadCount, onRefresh, refreshing, children, tabBadges = {}, onOpenSettings, appLinks }: ShellProps) {
  const tabs = APP_SHELL_TABS.filter((tab) => !tab.adminOnly || isAdminUser(user))
  const active = APP_SHELL_TABS.find((tab) => tab.id === activeTab)
  const hubUrl = normalizeExternalUrl(appLinks?.hub, DEFAULT_APP_LINKS.hub)

  const { ref: pullRef, distance, refreshing: pullRefreshing, triggered } = usePullToRefresh(async () => {
    void hapticLight()
    await onRefresh?.()
  }, { enabled: Boolean(onRefresh) })

  const indicatorOpacity = Math.min(1, distance / 70)
  const indicatorTransform = `translateY(${Math.min(distance, 90)}px)`
  const spinning = pullRefreshing || triggered

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <img className="brand-logo-small" src="/coms-logo.png" alt="COM's" />
          <h1>{active?.label || '회원 앱'}</h1>
        </div>
        <div className="top-actions">
          <a className="icon-button" href={hubUrl} target="_blank" rel="noreferrer" aria-label="COMS 앱 허브">
            <Grid2X2 size={18} aria-hidden="true" />
          </a>
          <button type="button" className="icon-button" onClick={onRefresh} disabled={refreshing} aria-label="새로고침">
            <RefreshCcw size={18} className={refreshing ? 'spin' : ''} aria-hidden="true" />
          </button>
          {onOpenSettings && (
            <button type="button" className="icon-button" onClick={onOpenSettings} aria-label="설정">
              <Settings size={18} aria-hidden="true" />
            </button>
          )}
          <span className="user-chip"><UserRound size={14} aria-hidden="true" />{user?.name || '회원'}</span>
        </div>
      </header>
      {unreadCount > 0 && (
        <button type="button" className="notice-strip" onClick={() => setActiveTab('notifications')}>
          <Bell size={16} aria-hidden="true" /> 읽지 않은 알림 {unreadCount}개
        </button>
      )}
      <section ref={pullRef} className="content">
        {(distance > 0 || pullRefreshing) && (
          <div className="pull-indicator" style={{ opacity: indicatorOpacity, transform: indicatorTransform }} aria-hidden="true">
            <RefreshCcw size={18} className={spinning ? 'spin' : ''} />
          </div>
        )}
        {children}
      </section>
      <nav className="tabbar" aria-label="회원 앱 메뉴" style={{ '--tab-count': tabs.length } as CSSProperties}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          const badge = tabBadges[tab.id] || 0
          return (
            <button key={tab.id} type="button" className={selected ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab.id)}>
              <span className="tab-icon">
                <Icon size={20} aria-hidden="true" />
                {badge > 0 && <span className="tab-badge" aria-label={`${badge}개의 새 알림`}>{badge > 99 ? '99+' : badge}</span>}
              </span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </main>
  )
}
