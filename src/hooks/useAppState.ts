import { useState } from 'react'
import { readLastSeen } from '../utils/lastSeen'
import { readIdleLock, readOnboarded, readTheme, resolveIdleLockMs } from '../utils/preferences'
import { isNativeRuntime } from '../services/nativeBridge'

// Boot LOCKED when the user enabled idle-lock so cached PII never renders before
// biometric re-auth. Native only (no biometric on web) and only when idle-lock is
// on; users who disabled it are never locked. The optimistic value is reconciled
// in App once preferences and biometric availability resolve.
function shouldLockOnBoot() {
  return isNativeRuntime() && resolveIdleLockMs(readIdleLock()) !== null
}

export function useAppState() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [appVersion, setAppVersion] = useState(null)
  const [locked, setLocked] = useState(shouldLockOnBoot)
  const [activeTab, setActiveTab] = useState('home')
  const [pushStatus, setPushStatus] = useState('idle')
  const [pushPermission, setPushPermission] = useState(null)
  const [lastSeenNotices, setLastSeenNotices] = useState(() => readLastSeen('notices'))
  const [lastSeenPosts, setLastSeenPosts] = useState(() => readLastSeen('posts'))
  const [themePreference, setThemePreference] = useState(() => readTheme())
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => readOnboarded())
  const [biometricReady, setBiometricReady] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedNotice, setSelectedNotice] = useState(null)
  const [noticeLoading, setNoticeLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [postLoading, setPostLoading] = useState(false)
  const [comments, setComments] = useState([])
  const [slowSync, setSlowSync] = useState(false)
  const [accountActionError, setAccountActionError] = useState('')
  const [pendingCommunityPosts, setPendingCommunityPosts] = useState([])

  return {
    user,
    setUser,
    authLoading,
    setAuthLoading,
    appVersion,
    setAppVersion,
    locked,
    setLocked,
    activeTab,
    setActiveTab,
    pushStatus,
    setPushStatus,
    pushPermission,
    setPushPermission,
    lastSeenNotices,
    setLastSeenNotices,
    lastSeenPosts,
    setLastSeenPosts,
    themePreference,
    setThemePreference,
    onboardingDismissed,
    setOnboardingDismissed,
    biometricReady,
    setBiometricReady,
    showPrivacy,
    setShowPrivacy,
    showSettings,
    setShowSettings,
    selectedNotice,
    setSelectedNotice,
    noticeLoading,
    setNoticeLoading,
    selectedPost,
    setSelectedPost,
    postLoading,
    setPostLoading,
    comments,
    setComments,
    slowSync,
    setSlowSync,
    accountActionError,
    setAccountActionError,
    pendingCommunityPosts,
    setPendingCommunityPosts,
  }
}
