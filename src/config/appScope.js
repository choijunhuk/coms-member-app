import { Bell, FileText, Home, MessageSquareText, UserRound } from 'lucide-react'

export const APP_SHELL_TABS = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'notices', label: '공지', icon: Bell },
  { id: 'community', label: '커뮤니티', icon: MessageSquareText },
  { id: 'resources', label: '자료실', icon: FileText },
  { id: 'profile', label: '내 정보', icon: UserRound },
]

export const APP_INCLUDED_FEATURES = [
  'login',
  'logout',
  'session-restore',
  'home-dashboard',
  'notices',
  'community',
  'resources',
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
