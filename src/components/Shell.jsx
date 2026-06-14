import { Bell, RefreshCcw, UserRound } from 'lucide-react'
import { APP_SHELL_TABS } from '../config/appScope.js'
import { isAdminUser } from '../utils/helpers.js'
import { usePullToRefresh } from '../hooks/usePullToRefresh.js'
import { hapticLight } from '../services/haptics.js'

export function Shell({ user, activeTab, setActiveTab, unreadCount, onRefresh, refreshing, children }) {
  const tabs = APP_SHELL_TABS.filter((tab) => !tab.adminOnly || isAdminUser(user))
  const active = APP_SHELL_TABS.find((tab) => tab.id === activeTab)

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
        <div>
          <p className="eyebrow">COMS</p>
          <h1>{active?.label || '회원 앱'}</h1>
        </div>
        <div className="top-actions">
          <button type="button" className="icon-button" onClick={onRefresh} disabled={refreshing} aria-label="새로고침">
            <RefreshCcw size={18} className={refreshing ? 'spin' : ''} aria-hidden="true" />
          </button>
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
      <nav className="tabbar" aria-label="회원 앱 메뉴" style={{ '--tab-count': tabs.length }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          return (
            <button key={tab.id} type="button" className={selected ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab.id)}>
              <Icon size={20} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </main>
  )
}
