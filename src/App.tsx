import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentUser, logoutUser, withdrawSelf } from './services/authApi'
import { listFiles } from './services/archiveApi'
import { listClubActivities } from './services/clubActivityApi'
import { listApps } from './services/appCatalogApi'
import {
  appendCommunityPostImages,
  createComment,
  createCommunityPost,
  createCommunityPostWithImage,
  deleteComment,
  getCommunityPost,
  appealDeletedCommunityPost,
  listBookmarkedPosts,
  listMyDeletedCommunityPosts,
  listComments,
  listCommunityPosts,
  toggleCommunityPostBookmark,
  updateComment,
  voteCommunityPoll,
  voteCommunityPost,
} from './services/communityApi'
import {
  DEFAULT_APP_CONFIG,
  getAppConfig,
  getMobileHome,
  isRecoverableMobileApiError,
  registerPushToken,
} from './services/mobileApi'
import { nativePlatform, openNotificationSettings, readAppVersion, readPushPermissionState, requestPushRegistration, resetPushRegistration, setupAppStateListener, setupBackButtonListener, setupDeepLinkListener } from './services/nativeBridge'
import { isBiometricAvailable } from './services/biometric'
import { getNotice, listNotices } from './services/noticeApi'
import { getNotificationSummary, listNotifications, markAllNotificationsRead, markNotificationRead } from './services/notificationApi'
import { asArray } from './utils/format'
import { isAdminUser, normalizeAppConfig, normalizeHomeData } from './utils/helpers'
import { isVersionBelow } from './utils/version'
import { useNotificationPolling } from './hooks/useNotificationPolling'
import { isNew, lastSeenStorageKey, readLastSeen, writeLastSeen } from './utils/lastSeen'
import { markOnboarded, PREFERENCE_STORAGE_KEYS, readFontScale, readIdleLock, readOnboarded, readTheme, resolveIdleLockMs, resolveTheme, writeTheme } from './utils/preferences'
import { BOOKMARKS_KEY } from './utils/bookmarks'
import { RECENT_RESOURCES_KEY } from './utils/resourceHistory'
import { hydrateStoredValues, removeStoredValuesByPrefix } from './utils/deviceStorage'
import { reportError, setUserContext } from './services/observability'
import { purgePersistedCache } from './services/queryClient'
import { registerPushTokenWithRetry } from './utils/pushRegistration'
import { getInstallationDeviceId } from './utils/installationDeviceId'
import { pushStatusFromPermission } from './utils/pushPermissionStatus'
import { DEFAULT_IDLE_LOCK_THRESHOLD_MS, SLOW_SYNC_NOTICE_DELAY_MS } from './config/appTiming'
import { useAppState } from './hooks/useAppState'
import {
  COMMUNITY_POST_QUEUE_KEY,
  enqueuePendingCommunityPost,
  readPendingCommunityPosts,
  removePendingCommunityPost,
  resolvePendingCommunityPostFlushFailure,
  shouldQueueCommunityPostError,
} from './utils/communityPostQueue'
import { hapticLight, hapticSuccess } from './services/haptics'
import { AppConfigBanner, LoadingScreen } from './components/ui'
import { Shell } from './components/Shell'
import OfflineBanner from './components/OfflineBanner'
import ErrorBoundary from './components/ErrorBoundary'
import OnboardingCard from './components/OnboardingCard'
import LoginScreen from './screens/LoginScreen'
import HomeTab from './screens/HomeTab'
import ActivityTab from './screens/ActivityTab'
import ForcedUpdateScreen from './screens/ForcedUpdateScreen'
import BiometricLockScreen from './screens/BiometricLockScreen'
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen'
import SettingsScreen from './screens/SettingsScreen'

const DASHBOARD_QUERY_KEY = ['member-app', 'dashboard']
const MEMBER_STORAGE_KEYS = [
  ...PREFERENCE_STORAGE_KEYS,
  BOOKMARKS_KEY,
  RECENT_RESOURCES_KEY,
  COMMUNITY_POST_QUEUE_KEY,
  lastSeenStorageKey('notices'),
  lastSeenStorageKey('posts'),
]

const NoticesTab = lazy(() => import('./screens/NoticesTab'))
const CommunityTab = lazy(() => import('./screens/CommunityTab'))
const ResourcesTab = lazy(() => import('./screens/ResourcesTab'))
const NotificationsTab = lazy(() => import('./screens/NotificationsTab'))
const OperationsTab = lazy(() => import('./screens/OperationsTab'))
const ProfileTab = lazy(() => import('./screens/ProfileTab'))

const EMPTY_DASHBOARD = {
  appConfig: DEFAULT_APP_CONFIG,
  notices: [],
  posts: [],
  files: [],
  clubActivities: [],
  apps: [],
  notifications: [],
  unreadCount: 0,
  partialError: false,
}

async function fetchDashboard() {
  // Always fetch the full notice/post/file lists so the Community and Notices tabs
  // can show every entry, not just the small "recent" slice the mobile home aggregate
  // returns. Mobile home is still consulted in parallel for unreadCount and the
  // pre-shaped notifications block, but we prefer the full lists when they arrive.
  // Keep the per-request fallback so partial data still renders, but flag when any
  // of these fail so the UI can surface a non-blocking warning instead of silently
  // showing empty tabs during a backend outage.
  let partialError = false
  const onError = (fallback) => () => {
    partialError = true
    return fallback
  }
  const [configData, mobileHome, noticeData, postData, fileData, clubActivityData, appData, notificationData, notificationList] = await Promise.all([
    getAppConfig().catch(onError(DEFAULT_APP_CONFIG)),
    // Mobile home is a supplementary aggregate and may be absent on some backends,
    // so its failure is tolerated quietly and does not flag a partial error.
    getMobileHome().catch(() => null),
    listNotices().catch(onError([])),
    listCommunityPosts().catch(onError([])),
    listFiles().catch(onError([])),
    listClubActivities().catch(onError([])),
    listApps().catch(onError([])),
    getNotificationSummary().catch(onError({ unreadCount: 0 })),
    listNotifications().catch(onError([])),
  ])

  const appConfig = normalizeAppConfig(configData)
  const home = mobileHome ? normalizeHomeData(mobileHome) : null

  return {
    appConfig,
    notices: asArray(noticeData),
    posts: asArray(postData),
    files: asArray(fileData),
    clubActivities: asArray(clubActivityData),
    apps: asArray(appData),
    notifications: asArray(notificationList),
    unreadCount: Number(home?.unreadCount ?? notificationData?.unreadCount ?? 0),
    partialError,
  }
}

export default function App() {
  const queryClient = useQueryClient()
  const {
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
  } = useAppState()
  const lastBackgroundedRef = useRef(null)
  const pendingPostFlushRef = useRef(false)
  const [queueWarning, setQueueWarning] = useState('')

  const restoreSession = useCallback(async () => {
    try {
      const current = await getCurrentUser()
      setUser(current)
    } catch {
      setUser(null)
      setPushPermission(null)
      // No active session — any persisted cache belongs to a previous user or an expired login.
      queryClient.clear()
      await purgePersistedCache()
    } finally {
      setAuthLoading(false)
    }
  }, [queryClient, setAuthLoading, setPushPermission, setUser])

  const dashboardQuery = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboard,
    enabled: Boolean(user),
    placeholderData: (previous) => previous,
  })

  const deletedPostsQuery = useQuery({
    queryKey: ['member-app', 'deleted-community-posts'],
    queryFn: listMyDeletedCommunityPosts,
    enabled: Boolean(user),
    placeholderData: (previous) => previous,
  })

  // Bookmarks live across the whole board, not just the loaded dashboard window, so the
  // 내 스크랩 list must come from the dedicated endpoint. Only fetch once the profile tab
  // is opened to avoid an extra request on app boot.
  const bookmarkedPostsQuery = useQuery({
    queryKey: ['member-app', 'bookmarked-posts'],
    queryFn: listBookmarkedPosts,
    enabled: Boolean(user) && activeTab === 'profile',
    placeholderData: (previous) => previous,
  })

  const dashboard = dashboardQuery.data ?? EMPTY_DASHBOARD
  const { appConfig, notices, posts, files, clubActivities, apps, notifications, unreadCount } = dashboard
  const dashboardLoading = dashboardQuery.isLoading && !dashboardQuery.data
  const dashboardPartialError = Boolean(dashboard.partialError)
  const dashboardError = dashboardQuery.error?.message || ''
  const refreshing = dashboardQuery.isFetching && !dashboardLoading

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSlowSync(Boolean(dashboardQuery.isFetching))
    }, dashboardQuery.isFetching ? SLOW_SYNC_NOTICE_DELAY_MS : 0)
    return () => window.clearTimeout(timer)
  }, [dashboardQuery.isFetching, setSlowSync])

  const refreshDashboard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY })
  }, [queryClient])

  const flushPendingCommunityPosts = useCallback(async () => {
    if (!user || pendingPostFlushRef.current) return
    pendingPostFlushRef.current = true
    let published = 0
    try {
      setQueueWarning('')
      const queue = await readPendingCommunityPosts()
      setPendingCommunityPosts(queue)
      for (const item of queue) {
        try {
          await createCommunityPost(item.payload)
          published += 1
          const next = await removePendingCommunityPost(item.id)
          setPendingCommunityPosts(next)
        } catch (error) {
          const result = await resolvePendingCommunityPostFlushFailure(item, error)
          setPendingCommunityPosts(result.queue)
          if (result.action === 'retry-later') return
          reportError(error, { area: 'community-post-offline-flush', pendingId: item.id })
          setQueueWarning('임시 저장된 글 1개가 서버에서 거부되어 큐에서 제외되었습니다. 내용을 확인해 다시 작성해주세요.')
        }
      }
      if (published > 0) {
        void hapticSuccess()
        refreshDashboard()
      }
    } finally {
      pendingPostFlushRef.current = false
    }
  }, [refreshDashboard, setPendingCommunityPosts, user])

  // Without FCM we still want users to see new notifications while the app is
  // foregrounded — poll every 30s and skip when the document is hidden.
  useNotificationPolling({ enabled: Boolean(user), refresh: refreshDashboard })

  const patchDashboard = useCallback((updater) => {
    queryClient.setQueryData(DASHBOARD_QUERY_KEY, (prev) => {
      const base = prev ?? EMPTY_DASHBOARD
      return updater(base)
    })
  }, [queryClient])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void restoreSession()
    })
    return () => {
      cancelled = true
    }
  }, [restoreSession])

  useEffect(() => {
    let cancelled = false
    hydrateStoredValues(MEMBER_STORAGE_KEYS).then(() => {
      if (cancelled) return
      setThemePreference(readTheme())
      setOnboardingDismissed(readOnboarded())
      setLastSeenNotices(readLastSeen('notices'))
      setLastSeenPosts(readLastSeen('posts'))
      void readPendingCommunityPosts().then((queue) => {
        if (!cancelled) setPendingCommunityPosts(queue)
      })
    })
    return () => {
      cancelled = true
    }
  }, [setLastSeenNotices, setLastSeenPosts, setOnboardingDismissed, setPendingCommunityPosts, setThemePreference])

  useEffect(() => {
    if (!user || pendingCommunityPosts.length === 0) return undefined
    if (typeof window === 'undefined') return undefined
    if (navigator.onLine !== false) void flushPendingCommunityPosts()
    const onOnline = () => { void flushPendingCommunityPosts() }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [flushPendingCommunityPosts, pendingCommunityPosts.length, user])

  useEffect(() => {
    void setUserContext(user)
  }, [user])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const apply = () => {
      const resolved = resolveTheme(themePreference)
      document.documentElement.setAttribute('data-theme', resolved)
    }
    apply()
    if (themePreference !== 'system' || typeof window === 'undefined' || !window.matchMedia) return undefined
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => apply()
    media.addEventListener?.('change', listener)
    return () => media.removeEventListener?.('change', listener)
  }, [themePreference])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    document.documentElement.setAttribute('data-font-scale', readFontScale())
    return undefined
  }, [showSettings])

  const applyTheme = useCallback((next) => {
    setThemePreference(next)
    writeTheme(next)
  }, [setThemePreference])

  useEffect(() => {
    let cancelled = false
    if (!user) {
      void Promise.resolve().then(() => {
        if (!cancelled) setBiometricReady(false)
      })
      return () => {
        cancelled = true
      }
    }
    isBiometricAvailable().then((available) => {
      if (!cancelled) setBiometricReady(available)
    }).catch((error) => {
      reportError(error, { area: 'biometric-availability' })
      if (!cancelled) setBiometricReady(false)
    })
    return () => {
      cancelled = true
    }
  }, [setBiometricReady, user])

  // Reconcile the optimistic boot lock once preferences and biometric availability
  // resolve. The app boots locked (see useAppState) so cached PII never flashes,
  // but we must release the lock for users who disabled idle-lock or whose device
  // has no usable biometric — otherwise they would be trapped now that
  // verifyBiometric fails closed. Legitimate idle locks keep biometric available,
  // so this never clears them.
  useEffect(() => {
    if (!user || !locked) return undefined
    let cancelled = false
    Promise.all([isBiometricAvailable(), hydrateStoredValues(PREFERENCE_STORAGE_KEYS)]).then(([available]) => {
      if (cancelled) return
      if (!available || resolveIdleLockMs(readIdleLock()) === null) setLocked(false)
    }).catch((error) => {
      reportError(error, { area: 'biometric-boot-lock' })
    })
    return () => {
      cancelled = true
    }
  }, [locked, setLocked, user])

  const dismissOnboarding = useCallback(() => {
    markOnboarded()
    setOnboardingDismissed(true)
  }, [setOnboardingDismissed])

  const refreshPushPermission = useCallback(async () => {
    const permission = await readPushPermissionState()
    setPushPermission(permission)
    setPushStatus((status) => pushStatusFromPermission(permission, status))
    return permission
  }, [setPushPermission, setPushStatus])

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    readPushPermissionState().then((permission) => {
      if (cancelled) return
      setPushPermission(permission)
      setPushStatus((status) => pushStatusFromPermission(permission, status))
    })
    return () => {
      cancelled = true
    }
  }, [setPushPermission, setPushStatus, user])

  useEffect(() => {
    if (!user) return undefined
    let cleanup = () => {}
    let mounted = true
    setupAppStateListener((active) => {
      if (!active) {
        lastBackgroundedRef.current = Date.now()
        return
      }
      void refreshPushPermission()
      const last = lastBackgroundedRef.current
      lastBackgroundedRef.current = null
      const threshold = resolveIdleLockMs(readIdleLock()) ?? DEFAULT_IDLE_LOCK_THRESHOLD_MS
      if (threshold === null) return
      if (!last || Date.now() - last < threshold) return
      void isBiometricAvailable().then((available) => {
        if (mounted && available) setLocked(true)
      }).catch((error) => {
        reportError(error, { area: 'biometric-idle-lock' })
      })
    }).then((remove) => {
      if (mounted) cleanup = remove
      else remove()
    }).catch((error) => {
      reportError(error, { area: 'app-state-listener' })
    })
    return () => {
      mounted = false
      cleanup()
    }
  }, [refreshPushPermission, setLocked, user])

  useEffect(() => {
    let cancelled = false
    readAppVersion().then((version) => {
      if (!cancelled) setAppVersion(version)
    }).catch(() => {
      if (!cancelled) setAppVersion('0.0.0')
    })
    return () => {
      cancelled = true
    }
  }, [setAppVersion])

  const changeTab = useCallback((tabId) => {
    const nextTab = tabId === 'operations' && !isAdminUser(user) ? 'home' : tabId
    setActiveTab(nextTab)
    if (nextTab !== 'notices') setSelectedNotice(null)
    if (nextTab !== 'community') {
      setSelectedPost(null)
      setComments([])
    }
    if (nextTab === 'notices') {
      const latestTs = notices.reduce((acc, item) => Math.max(acc, new Date(item?.createdAt || 0).getTime() || 0), 0)
      if (latestTs > lastSeenNotices) {
        setLastSeenNotices(latestTs)
        writeLastSeen('notices', latestTs)
      }
    }
    if (nextTab === 'community') {
      const latestTs = posts.reduce((acc, item) => Math.max(acc, new Date(item?.createdAt || 0).getTime() || 0), 0)
      if (latestTs > lastSeenPosts) {
        setLastSeenPosts(latestTs)
        writeLastSeen('posts', latestTs)
      }
    }
  }, [lastSeenNotices, lastSeenPosts, notices, posts, setActiveTab, setComments, setLastSeenNotices, setLastSeenPosts, setSelectedNotice, setSelectedPost, user])

  const newNoticesCount = useMemo(
    () => notices.reduce((acc, item) => acc + (isNew(item?.createdAt, lastSeenNotices) ? 1 : 0), 0),
    [notices, lastSeenNotices],
  )
  const newPostsCount = useMemo(
    () => posts.reduce((acc, item) => acc + (isNew(item?.createdAt, lastSeenPosts) ? 1 : 0), 0),
    [posts, lastSeenPosts],
  )

  const tabBadges = {
    notices: newNoticesCount,
    community: newPostsCount,
    notifications: unreadCount,
  }

  const openNotice = useCallback(async (id) => {
    changeTab('notices')
    setSelectedNotice(null)
    setNoticeLoading(true)
    try {
      setSelectedNotice(await getNotice(id))
    } finally {
      setNoticeLoading(false)
    }
  }, [changeTab, setNoticeLoading, setSelectedNotice])

  const openPost = useCallback(async (id) => {
    changeTab('community')
    setSelectedPost(null)
    setComments([])
    setPostLoading(true)
    try {
      const [post, commentData] = await Promise.all([getCommunityPost(id), listComments(id)])
      setSelectedPost(post)
      setComments(asArray(commentData))
    } finally {
      setPostLoading(false)
    }
  }, [changeTab, setComments, setPostLoading, setSelectedPost])

  const openRoute = useCallback((route) => {
    if (route?.noticeId) {
      void openNotice(route.noticeId)
      return
    }
    if (route?.postId) {
      void openPost(route.postId)
      return
    }
    if (route?.tab) changeTab(route.tab)
  }, [changeTab, openNotice, openPost])

  useEffect(() => {
    if (!user) return undefined
    let cleanup = () => {}
    let mounted = true
    setupDeepLinkListener(openRoute).then((remove) => {
      if (mounted) cleanup = remove
      else remove()
    }).catch((error) => {
      reportError(error, { area: 'deep-link-listener' })
    })
    return () => {
      mounted = false
      cleanup()
    }
  }, [openRoute, user])

  useEffect(() => {
    if (!user) return undefined
    let cleanup = () => {}
    let mounted = true
    setupBackButtonListener(() => {
      if (showSettings) {
        setShowSettings(false)
        return true
      }
      if (showPrivacy) {
        setShowPrivacy(false)
        return true
      }
      if (selectedNotice) {
        setSelectedNotice(null)
        return true
      }
      if (selectedPost) {
        setSelectedPost(null)
        setComments([])
        return true
      }
      if (activeTab !== 'home') {
        setActiveTab('home')
        return true
      }
      return false
    }).then((remove) => {
      if (mounted) cleanup = remove
      else remove()
    }).catch((error) => {
      reportError(error, { area: 'back-button-listener' })
    })
    return () => {
      mounted = false
      cleanup()
    }
  }, [activeTab, selectedNotice, selectedPost, setActiveTab, setComments, setSelectedNotice, setSelectedPost, setShowPrivacy, setShowSettings, showPrivacy, showSettings, user])

  const createPostMutation = useMutation({
    mutationFn: async ({ payload, images }: { payload: unknown; images?: unknown[] }) => {
      const list = Array.isArray(images) ? images : []
      if (list.length === 0) return createCommunityPost(payload)
      const created = await createCommunityPostWithImage(payload, list[0])
      const extra = list.slice(1)
      if (extra.length && created?.id) {
        await appendCommunityPostImages(created.id, extra)
      }
      return created
    },
    onSuccess: () => {
      void hapticSuccess()
      refreshDashboard()
    },
  })

  const voteMutation = useMutation({
    mutationFn: ({ postId, value }: { postId: unknown; value: number }) => voteCommunityPost(postId, value),
    onSuccess: () => { void hapticLight() },
  })

  const bookmarkMutation = useMutation({
    mutationFn: ({ postId }: { postId: unknown }) => toggleCommunityPostBookmark(postId),
    onSuccess: () => { void hapticLight() },
  })

  const pollVoteMutation = useMutation({
    mutationFn: ({ postId, pollId, optionIndex }: { postId: unknown; pollId: unknown; optionIndex: number }) => voteCommunityPoll(postId, pollId, optionIndex),
    onSuccess: () => { void hapticLight() },
  })

  const appealDeletedPostMutation = useMutation({
    mutationFn: ({ id, message }: { id: unknown; message: string }) => appealDeletedCommunityPost(id, message),
    onSuccess: (appeal) => {
      queryClient.setQueryData(['member-app', 'deleted-community-posts'], (prev) => asArray(prev).map((item) => (
        item.id === appeal.deletedPostId
          ? {
              ...item,
              latestAppealStatus: appeal.status,
              latestAppealMessage: appeal.message,
              latestAppealCreatedAt: appeal.createdAt,
              latestAppealRequesterStudentId: appeal.requesterStudentId,
              latestAppealRequesterName: appeal.requesterName,
            }
          : item
      )))
    },
  })

  async function createCommentForPost(content, parentCommentId = null) {
    if (!selectedPost?.id) return
    await createComment(selectedPost.id, content, parentCommentId)
    void hapticSuccess()
    await openPost(selectedPost.id)
  }

  async function editCommentForPost(commentId, content) {
    if (!selectedPost?.id) return
    await updateComment(selectedPost.id, commentId, content)
    void hapticLight()
    await openPost(selectedPost.id)
  }

  async function removeCommentForPost(commentId) {
    if (!selectedPost?.id) return
    await deleteComment(selectedPost.id, commentId)
    void hapticLight()
    await openPost(selectedPost.id)
  }

  async function vote(value) {
    if (!selectedPost?.id) return
    await voteMutation.mutateAsync({ postId: selectedPost.id, value })
    await openPost(selectedPost.id)
  }

  async function toggleBookmark(postId) {
    if (!postId) return
    const result = await bookmarkMutation.mutateAsync({ postId })
    const bookmarked = Boolean(result?.bookmarked)
    patchDashboard((prev) => ({
      ...prev,
      posts: prev.posts.map((post) => String(post.id) === String(postId) ? { ...post, bookmarked } : post),
    }))
    setSelectedPost((prev) => (prev && String(prev.id) === String(postId) ? { ...prev, bookmarked } : prev))
    // The dedicated 내 스크랩 list is sourced from its own endpoint, so refresh it to reflect the toggle.
    void queryClient.invalidateQueries({ queryKey: ['member-app', 'bookmarked-posts'] })
  }

  async function pollVote(pollId, optionIndex) {
    if (!selectedPost?.id) return
    await pollVoteMutation.mutateAsync({ postId: selectedPost.id, pollId, optionIndex })
    await openPost(selectedPost.id)
  }

  const markRead = useCallback(async (id) => {
    await markNotificationRead(id)
    patchDashboard((prev) => {
      const wasUnread = prev.notifications.some((item) => item.id === id && !item.read)
      return {
        ...prev,
        notifications: prev.notifications.map((item) => item.id === id ? { ...item, read: true } : item),
        unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
      }
    })
  }, [patchDashboard])

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead()
    patchDashboard((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) => ({ ...item, read: true })),
      unreadCount: 0,
    }))
  }, [patchDashboard])

  const enablePush = useCallback(async () => {
    setPushStatus('requesting')
    try {
      const result = await requestPushRegistration({
        pushEnabled: appConfig.pushEnabled,
        onRoute: openRoute,
        onToken: async (token) => {
          if (!token) return
          try {
            await registerPushTokenWithRetry({
              register: registerPushToken,
              payload: {
                token,
                platform: nativePlatform(),
                deviceId: await getInstallationDeviceId(),
              },
              isRecoverable: isRecoverableMobileApiError,
            })
            setPushStatus('registered')
          } catch (err) {
            setPushStatus(isRecoverableMobileApiError(err) ? 'server-unavailable' : 'error')
          }
        },
      })
      const permission = await refreshPushPermission()
      if (result.status !== 'requested') setPushStatus(pushStatusFromPermission(permission, result.status))
      else setPushStatus((status) => status === 'registered' ? status : pushStatusFromPermission(permission, 'requested'))
    } catch (error) {
      reportError(error, { area: 'push-registration-request' })
      setPushStatus('error')
    }
  }, [appConfig.pushEnabled, openRoute, refreshPushPermission, setPushStatus])

  const openPushSettings = useCallback(() => {
    const opened = openNotificationSettings()
    if (!opened && typeof window !== 'undefined') {
      window.alert('기기 설정 앱에서 COMS 알림 권한을 직접 허용해주세요.')
    }
  }, [])

  async function handleLogout() {
    setAccountActionError('')
    try {
      await logoutUser()
    } catch (error) {
      reportError(error, { area: 'logout' })
      setAccountActionError(error?.message || '로그아웃에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.')
      throw error
    }
    setUser(null)
    setPushStatus('idle')
    setPushPermission(null)
    await resetPushRegistration()
    queryClient.cancelQueries()
    queryClient.clear()
    await purgePersistedCache()
  }

  async function handleWithdraw() {
    setAccountActionError('')
    try {
      await withdrawSelf()
    } catch (error) {
      reportError(error, { area: 'withdraw' })
      setAccountActionError(error?.message || '회원 탈퇴에 실패했습니다. 계정 상태는 변경되지 않았습니다.')
      throw error
    }
    setUser(null)
    setPushStatus('idle')
    await resetPushRegistration()
    queryClient.cancelQueries()
    queryClient.clear()
    await purgePersistedCache()
    await removeStoredValuesByPrefix('coms.')
  }

  async function handleWipeDevice() {
    setPushStatus('idle')
    await resetPushRegistration()
    queryClient.cancelQueries()
    queryClient.clear()
    await purgePersistedCache()
    await removeStoredValuesByPrefix('coms.')
    try {
      await logoutUser()
    } finally {
      setUser(null)
    }
  }

  const createPost = useCallback(async (input) => {
    try {
      await createPostMutation.mutateAsync(input)
      return { queued: false }
    } catch (error) {
      if (!shouldQueueCommunityPostError(error)) throw error
      if (Array.isArray(input?.images) && input.images.length > 0) {
        throw new Error('오프라인 상태에서는 이미지 첨부 글을 자동 임시 저장할 수 없습니다. 연결 후 이미지를 다시 첨부해 등록해주세요.', { cause: error })
      }
      const queue = await enqueuePendingCommunityPost(input.payload)
      setPendingCommunityPosts(queue)
      void hapticLight()
      return { queued: true }
    }
  }, [createPostMutation, setPendingCommunityPosts])


  if (appVersion && isVersionBelow(appVersion, appConfig.minimumSupportedVersion)) {
    return (
      <ForcedUpdateScreen
        currentVersion={appVersion}
        minimumVersion={appConfig.minimumSupportedVersion}
        updateUrl={appConfig.updateUrl}
      />
    )
  }
  if (showPrivacy) return <PrivacyPolicyScreen onBack={() => setShowPrivacy(false)} />
  if (showSettings && user) {
    return (
      <SettingsScreen
        themePreference={themePreference}
        onChangeTheme={applyTheme}
        onShowPrivacy={() => { setShowSettings(false); setShowPrivacy(true) }}
        onWipeDevice={async () => { await handleWipeDevice(); setShowSettings(false) }}
        onWithdraw={async () => { await handleWithdraw(); setShowSettings(false) }}
        onLogout={async () => { await handleLogout(); setShowSettings(false) }}
        accountActionError={accountActionError}
        onBack={() => setShowSettings(false)}
      />
    )
  }
  if (authLoading) return <LoadingScreen label="세션을 확인하는 중입니다." />
  if (!user) return <LoginScreen onLogin={restoreSession} />
  if (locked) {
    return (
      <BiometricLockScreen
        onUnlock={() => setLocked(false)}
        onLogout={async () => {
          setLocked(false)
          await handleLogout()
        }}
      />
    )
  }

  let content
  if (dashboardLoading) content = <LoadingScreen label="회원 앱 데이터를 불러오는 중입니다." />
  else if (dashboardError && !dashboardQuery.data) content = <section className="empty-panel"><ShieldCheck size={24} /><p>{dashboardError}</p><button className="button secondary" onClick={refreshDashboard}>다시 시도</button></section>
  else if (activeTab === 'home') content = (
    <div className="stack">
      {!onboardingDismissed && (
        <OnboardingCard
          pushEnabled={appConfig.pushEnabled}
          pushPermission={pushPermission}
          biometricAvailable={biometricReady}
          onEnablePush={enablePush}
          onDismiss={dismissOnboarding}
        />
      )}
      <HomeTab notices={notices} posts={posts} files={files} clubActivities={clubActivities} unreadCount={unreadCount} openNotice={openNotice} openPost={openPost} setActiveTab={changeTab} />
    </div>
  )
  else if (activeTab === 'activity') content = <ActivityTab clubActivities={clubActivities} apps={apps} appLinks={appConfig.links} />
  else if (activeTab === 'notices') content = <NoticesTab notices={notices} selected={selectedNotice} loading={noticeLoading} openNotice={openNotice} closeNotice={() => setSelectedNotice(null)} />
  else if (activeTab === 'community') content = <CommunityTab posts={posts} selected={selectedPost} comments={comments} loading={postLoading} openPost={openPost} closePost={() => { setSelectedPost(null); setComments([]) }} createPost={createPost} createCommentForPost={createCommentForPost} editComment={editCommentForPost} removeComment={removeCommentForPost} vote={vote} pollVote={pollVote} toggleBookmark={toggleBookmark} currentUser={user} pendingPosts={pendingCommunityPosts} retryPendingPosts={flushPendingCommunityPosts} />
  else if (activeTab === 'resources') content = <ResourcesTab files={files} />
  else if (activeTab === 'notifications') content = <NotificationsTab notifications={notifications} unreadCount={unreadCount} pushStatus={pushStatus} pushPermission={pushPermission} refreshPushPermission={refreshPushPermission} appConfig={appConfig} enablePush={enablePush} onOpenPushSettings={openPushSettings} markRead={markRead} markAllRead={markAllRead} openRoute={openRoute} />
  else if (activeTab === 'operations') content = <OperationsTab user={user} notices={notices} posts={posts} clubActivities={clubActivities} apps={apps} loadDashboard={refreshDashboard} />
  else content = (
    <ProfileTab
      user={user}
      onLogout={handleLogout}
      onWithdraw={handleWithdraw}
      onWipeDevice={handleWipeDevice}
      accountActionError={accountActionError}
      onShowPrivacy={() => setShowPrivacy(true)}
      themePreference={themePreference}
      onChangeTheme={applyTheme}
      posts={posts}
      bookmarkedPosts={asArray(bookmarkedPostsQuery.data)}
      bookmarkedPostsLoading={bookmarkedPostsQuery.isLoading}
      deletedPosts={asArray(deletedPostsQuery.data)}
      deletedPostsLoading={deletedPostsQuery.isLoading}
      appealDeletedPost={(id, message) => appealDeletedPostMutation.mutateAsync({ id, message })}
      appealBusy={appealDeletedPostMutation.isPending}
      openPost={openPost}
    />
  )

  const body = (
    <div className="stack">
        <OfflineBanner slow={slowSync} />
      {dashboardPartialError && <p className="form-error" role="status">일부 정보를 불러오지 못했습니다. 당겨서 새로고침하면 다시 시도합니다.</p>}
      {queueWarning && <p className="form-error" role="status">{queueWarning}</p>}
      {appConfig.maintenanceMessage && <AppConfigBanner appConfig={appConfig} />}
      {content}
    </div>
  )

  return (
    <Shell user={user} activeTab={activeTab} setActiveTab={changeTab} unreadCount={unreadCount} refreshing={refreshing} onRefresh={refreshDashboard} tabBadges={tabBadges} onOpenSettings={() => setShowSettings(true)} appLinks={appConfig.links}>
      <ErrorBoundary label={activeTab}>
        <Suspense fallback={<LoadingScreen label="화면을 준비 중입니다." />}>{body}</Suspense>
      </ErrorBoundary>
    </Shell>
  )
}
