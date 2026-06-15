import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentUser, logoutUser } from './services/authApi.js'
import { listFiles } from './services/archiveApi.js'
import {
  createComment,
  createCommunityPost,
  createCommunityPostWithImage,
  deleteComment,
  getCommunityPost,
  listComments,
  listCommunityPosts,
  updateComment,
  voteCommunityPoll,
  voteCommunityPost,
} from './services/communityApi.js'
import {
  DEFAULT_APP_CONFIG,
  getAppConfig,
  getMobileHome,
  isRecoverableMobileApiError,
  registerPushToken,
} from './services/mobileApi.js'
import { nativePlatform, readAppVersion, requestPushRegistration, setupAppStateListener, setupBackButtonListener, setupDeepLinkListener } from './services/nativeBridge.js'
import { isBiometricAvailable } from './services/biometric.js'
import { getNotice, listNotices } from './services/noticeApi.js'
import { getNotificationSummary, listNotifications, markAllNotificationsRead, markNotificationRead } from './services/notificationApi.js'
import { asArray } from './utils/format.js'
import { isAdminUser, normalizeAppConfig, normalizeHomeData } from './utils/helpers.js'
import { isVersionBelow } from './utils/version.js'
import { isNew, readLastSeen, writeLastSeen } from './utils/lastSeen.js'
import { setUserContext } from './services/observability.js'
import { purgePersistedCache } from './services/queryClient.js'
import { hapticLight, hapticSuccess } from './services/haptics.js'
import { AppConfigBanner, LoadingScreen } from './components/ui.jsx'
import { Shell } from './components/Shell.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import HomeTab from './screens/HomeTab.jsx'
import ForcedUpdateScreen from './screens/ForcedUpdateScreen.jsx'
import BiometricLockScreen from './screens/BiometricLockScreen.jsx'

const IDLE_LOCK_THRESHOLD_MS = 5 * 60 * 1000
const DASHBOARD_QUERY_KEY = ['member-app', 'dashboard']

const NoticesTab = lazy(() => import('./screens/NoticesTab.jsx'))
const CommunityTab = lazy(() => import('./screens/CommunityTab.jsx'))
const ResourcesTab = lazy(() => import('./screens/ResourcesTab.jsx'))
const NotificationsTab = lazy(() => import('./screens/NotificationsTab.jsx'))
const OperationsTab = lazy(() => import('./screens/OperationsTab.jsx'))
const ProfileTab = lazy(() => import('./screens/ProfileTab.jsx'))

const EMPTY_DASHBOARD = {
  appConfig: DEFAULT_APP_CONFIG,
  notices: [],
  posts: [],
  files: [],
  notifications: [],
  unreadCount: 0,
}

async function fetchDashboard() {
  const configData = await getAppConfig().catch(() => DEFAULT_APP_CONFIG)
  const appConfig = normalizeAppConfig(configData)

  const mobileHome = await getMobileHome().catch((err) => {
    if (isRecoverableMobileApiError(err)) return null
    throw err
  })

  if (mobileHome) {
    const home = normalizeHomeData(mobileHome)
    const notifications = Object.hasOwn(mobileHome, 'notifications')
      ? home.notifications
      : asArray(await listNotifications().catch(() => []))
    return {
      appConfig,
      notices: home.notices,
      posts: home.posts,
      files: home.files,
      notifications,
      unreadCount: home.unreadCount,
    }
  }

  const [noticeData, postData, fileData, notificationData, notificationList] = await Promise.all([
    listNotices(),
    listCommunityPosts(),
    listFiles(),
    getNotificationSummary().catch(() => ({ unreadCount: 0 })),
    listNotifications().catch(() => []),
  ])

  return {
    appConfig,
    notices: asArray(noticeData),
    posts: asArray(postData),
    files: asArray(fileData),
    notifications: asArray(notificationList),
    unreadCount: Number(notificationData?.unreadCount || 0),
  }
}

export default function App() {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [appVersion, setAppVersion] = useState(null)
  const [locked, setLocked] = useState(false)
  const lastBackgroundedRef = useRef(null)
  const [activeTab, setActiveTab] = useState('home')
  const [pushStatus, setPushStatus] = useState('idle')
  const [lastSeenNotices, setLastSeenNotices] = useState(() => readLastSeen('notices'))
  const [lastSeenPosts, setLastSeenPosts] = useState(() => readLastSeen('posts'))
  const [selectedNotice, setSelectedNotice] = useState(null)
  const [noticeLoading, setNoticeLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [postLoading, setPostLoading] = useState(false)
  const [comments, setComments] = useState([])

  const restoreSession = useCallback(async () => {
    try {
      const current = await getCurrentUser()
      setUser(current)
    } catch {
      setUser(null)
      // No active session — any persisted cache belongs to a previous user or an expired login.
      queryClient.clear()
      await purgePersistedCache()
    } finally {
      setAuthLoading(false)
    }
  }, [queryClient])

  const dashboardQuery = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboard,
    enabled: Boolean(user),
    placeholderData: (previous) => previous,
  })

  const dashboard = dashboardQuery.data ?? EMPTY_DASHBOARD
  const { appConfig, notices, posts, files, notifications, unreadCount } = dashboard
  const dashboardLoading = dashboardQuery.isLoading && !dashboardQuery.data
  const dashboardError = dashboardQuery.error?.message || ''
  const refreshing = dashboardQuery.isFetching && !dashboardLoading

  const refreshDashboard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY })
  }, [queryClient])

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
    void setUserContext(user)
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    let cleanup = () => {}
    let mounted = true
    setupAppStateListener((active) => {
      if (!active) {
        lastBackgroundedRef.current = Date.now()
        return
      }
      const last = lastBackgroundedRef.current
      lastBackgroundedRef.current = null
      if (!last || Date.now() - last < IDLE_LOCK_THRESHOLD_MS) return
      void isBiometricAvailable().then((available) => {
        if (available) setLocked(true)
      })
    }).then((remove) => {
      if (mounted) cleanup = remove
      else remove()
    }).catch(() => {})
    return () => {
      mounted = false
      cleanup()
    }
  }, [user])

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
  }, [])

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
  }, [user, notices, posts, lastSeenNotices, lastSeenPosts])

  const newNoticesCount = notices.reduce((acc, item) => acc + (isNew(item?.createdAt, lastSeenNotices) ? 1 : 0), 0)
  const newPostsCount = posts.reduce((acc, item) => acc + (isNew(item?.createdAt, lastSeenPosts) ? 1 : 0), 0)

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
  }, [changeTab])

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
  }, [changeTab])

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
    }).catch(() => {})
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
    }).catch(() => {})
    return () => {
      mounted = false
      cleanup()
    }
  }, [activeTab, selectedNotice, selectedPost, user])

  const createPostMutation = useMutation({
    mutationFn: ({ payload, image }) => (image ? createCommunityPostWithImage(payload, image) : createCommunityPost(payload)),
    onSuccess: () => {
      void hapticSuccess()
      refreshDashboard()
    },
  })

  const voteMutation = useMutation({
    mutationFn: ({ postId, value }) => voteCommunityPost(postId, value),
    onSuccess: () => { void hapticLight() },
  })

  const pollVoteMutation = useMutation({
    mutationFn: ({ postId, pollId, optionIndex }) => voteCommunityPoll(postId, pollId, optionIndex),
    onSuccess: () => { void hapticLight() },
  })

  async function createCommentForPost(content) {
    if (!selectedPost?.id) return
    await createComment(selectedPost.id, content)
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
        onRoute: openRoute,
        onToken: async (token) => {
          if (!token) return
          try {
            await registerPushToken({
              token,
              platform: nativePlatform(),
              deviceId: String(user?.studentId || user?.id || 'member'),
            })
            setPushStatus('registered')
          } catch (err) {
            setPushStatus(isRecoverableMobileApiError(err) ? 'server-unavailable' : 'error')
          }
        },
      })
      if (result.status !== 'requested') setPushStatus(result.status)
      else setPushStatus((status) => status === 'registered' ? status : 'requested')
    } catch {
      setPushStatus('error')
    }
  }, [openRoute, user])

  async function handleLogout() {
    try {
      await logoutUser()
    } finally {
      setUser(null)
      queryClient.cancelQueries()
      queryClient.clear()
      await purgePersistedCache()
    }
  }

  const createPost = useCallback(async (input) => {
    await createPostMutation.mutateAsync(input)
  }, [createPostMutation])


  if (appVersion && isVersionBelow(appVersion, appConfig.minimumSupportedVersion)) {
    return (
      <ForcedUpdateScreen
        currentVersion={appVersion}
        minimumVersion={appConfig.minimumSupportedVersion}
        updateUrl={appConfig.updateUrl}
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
  else if (activeTab === 'home') content = <HomeTab notices={notices} posts={posts} files={files} unreadCount={unreadCount} openNotice={openNotice} openPost={openPost} setActiveTab={changeTab} />
  else if (activeTab === 'notices') content = <NoticesTab notices={notices} selected={selectedNotice} loading={noticeLoading} openNotice={openNotice} closeNotice={() => setSelectedNotice(null)} />
  else if (activeTab === 'community') content = <CommunityTab posts={posts} selected={selectedPost} comments={comments} loading={postLoading} openPost={openPost} closePost={() => { setSelectedPost(null); setComments([]) }} createPost={createPost} createCommentForPost={createCommentForPost} editComment={editCommentForPost} removeComment={removeCommentForPost} vote={vote} pollVote={pollVote} currentUser={user} />
  else if (activeTab === 'resources') content = <ResourcesTab files={files} />
  else if (activeTab === 'notifications') content = <NotificationsTab notifications={notifications} unreadCount={unreadCount} pushStatus={pushStatus} appConfig={appConfig} enablePush={enablePush} markRead={markRead} markAllRead={markAllRead} openRoute={openRoute} />
  else if (activeTab === 'operations') content = <OperationsTab user={user} notices={notices} posts={posts} loadDashboard={refreshDashboard} />
  else content = <ProfileTab user={user} onLogout={handleLogout} />

  const body = (
    <div className="stack">
      <OfflineBanner />
      {appConfig.maintenanceMessage && <AppConfigBanner appConfig={appConfig} />}
      {content}
    </div>
  )

  return (
    <Shell user={user} activeTab={activeTab} setActiveTab={changeTab} unreadCount={unreadCount} refreshing={refreshing} onRefresh={refreshDashboard} tabBadges={tabBadges}>
      <ErrorBoundary label={activeTab}>
        <Suspense fallback={<LoadingScreen label="화면을 준비 중입니다." />}>{body}</Suspense>
      </ErrorBoundary>
    </Shell>
  )
}
