import { Bell, BellRing, CalendarDays, FileText, Home, MessageSquareText, ShieldCheck, UserRound } from 'lucide-react'

export const APP_SHELL_TABS = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'activity', label: '활동', icon: CalendarDays },
  { id: 'notices', label: '공지', icon: Bell },
  { id: 'community', label: '커뮤니티', icon: MessageSquareText },
  { id: 'resources', label: '자료실', icon: FileText },
  { id: 'notifications', label: '알림', icon: BellRing },
  { id: 'operations', label: '운영', icon: ShieldCheck, adminOnly: true },
  { id: 'profile', label: '내 정보', icon: UserRound },
]

export const APP_INCLUDED_FEATURES = [
  'login',
  'logout',
  'session-restore',
  'home-dashboard',
  'activity-log',
  'monthly-calendar',
  'notices',
  'community',
  'resources',
  'resource-queue',
  'apps-hub',
  'notification-center',
  'push-notifications',
  'schedule-reminders',
  'deep-links',
  'mobile-home-api',
  'app-config',
  'operator-light',
  'operator-activity-log',
  'profile',
]

export const WEB_ONLY_FEATURES = [
  'recruit-apply',
  'recruit-notice',
  'signup',
  'public-about',
  'public-activities',
  'public-projects',
  'admin-console',
]

export function getAppTabIds() {
  return APP_SHELL_TABS.map((tab) => tab.id)
}

export function isWebOnlyFeature(featureId) {
  return WEB_ONLY_FEATURES.includes(featureId)
}
