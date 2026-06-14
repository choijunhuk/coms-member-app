import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { getCurrentUser, logoutUser } from './services/authApi.js'
import { listFiles } from './services/archiveApi.js'
import {
  createComment,
  createCommunityPost,
  getCommunityPost,
  listComments,
  listCommunityPosts,
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
import { nativePlatform, readAppVersion, requestPushRegistration, setupDeepLinkListener } from './services/nativeBridge.js'
import { getNotice, listNotices } from './services/noticeApi.js'
import { getNotificationSummary, listNotifications, markAllNotificationsRead, markNotificationRead } from './services/notificationApi.js'
import { asArray } from './utils/format.js'
import { isAdminUser, normalizeAppConfig, normalizeHomeData } from './utils/helpers.js'
import { isVersionBelow } from './utils/version.js'
import { AppConfigBanner, LoadingScreen } from './components/ui.jsx'
import { Shell } from './components/Shell.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import HomeTab from './screens/HomeTab.jsx'
import ForcedUpdateScreen from './screens/ForcedUpdateScreen.jsx'

const NoticesTab = lazy(() => import('./screens/NoticesTab.jsx'))
const CommunityTab = lazy(() => import('./screens/CommunityTab.jsx'))
const ResourcesTab = lazy(() => import('./screens/ResourcesTab.jsx'))
const NotificationsTab = lazy(() => import('./screens/NotificationsTab.jsx'))
const OperationsTab = lazy(() => import('./screens/OperationsTab.jsx'))
const ProfileTab = lazy(() => import('./screens/ProfileTab.jsx'))

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [appVersion, setAppVersion] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [notices, setNotices] = useState([])
  const [posts, setPosts] = useState([])
  const [files, setFiles] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [appConfig, setAppConfig] = useState(DEFAULT_APP_CONFIG)
  const [pushStatus, setPushStatus] = useState('idle')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedNotice, setSelectedNotice] = useState(null)
  const [noticeLoading, setNoticeLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [postLoading, setPostLoading] = useState(false)
  const [comments, setComments] = useState([])

  const restoreSession = useCallback(async () => {
    try {
      setUser(await getCurrentUser())
    } catch {
      setUser(null)
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const loadDashboard = useCallback(async ({ quiet = false } = {}) => {
    await Promise.resolve()
    if (!quiet) setLoading(true)
    setRefreshing(quiet)
    setError('')
    try {
      const configData = await getAppConfig().catch(() => DEFAULT_APP_CONFIG)
      setAppConfig(normalizeAppConfig(configData))

      const mobileHome = await getMobileHome().catch((err) => {
        if (isRecoverableMobileApiError(err)) return null
        throw err
      })

      if (mobileHome) {
        const home = normalizeHomeData(mobileHome)
        setNotices(home.notices)
        setPosts(home.posts)
        setFiles(home.files)
        setUnreadCount(home.unreadCount)
        if (Object.hasOwn(mobileHome, 'notifications')) {
          setNotifications(home.notifications)
        } else {
          setNotifications(asArray(await listNotifications().catch(() => [])))
        }
        return
      }

      const [noticeData, postData, fileData, notificationData, notificationList] = await Promise.all([
        listNotices(),
        listCommunityPosts(),
        listFiles(),
        getNotificationSummary().catch(() => ({ unreadCount: 0 })),
        listNotifications().catch(() => []),
      ])
      setNotices(asArray(noticeData))
      setPosts(asArray(postData))
      setFiles(asArray(fileData))
      setNotifications(asArray(notificationList))
      setUnreadCount(Number(notificationData?.unreadCount || 0))
    } catch (err) {
      setError(err.message || '앱 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

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
    readAppVersion().then((version) => {
      if (!cancelled) setAppVersion(version)
    }).catch(() => {
      if (!cancelled) setAppVersion('0.0.0')
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadDashboard()
    })
    return () => {
      cancelled = true
    }
  }, [loadDashboard, user])

  const changeTab = useCallback((tabId) => {
    const nextTab = tabId === 'operations' && !isAdminUser(user) ? 'home' : tabId
    setActiveTab(nextTab)
    if (nextTab !== 'notices') setSelectedNotice(null)
    if (nextTab !== 'community') {
      setSelectedPost(null)
      setComments([])
    }
  }, [user])

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

  async function createPost(payload) {
    await createCommunityPost(payload)
    await loadDashboard({ quiet: true })
  }

  async function createCommentForPost(content) {
    if (!selectedPost?.id) return
    await createComment(selectedPost.id, content)
    await openPost(selectedPost.id)
  }

  async function vote(value) {
    if (!selectedPost?.id) return
    await voteCommunityPost(selectedPost.id, value)
    await openPost(selectedPost.id)
  }

  async function pollVote(pollId, optionIndex) {
    if (!selectedPost?.id) return
    await voteCommunityPoll(selectedPost.id, pollId, optionIndex)
    await openPost(selectedPost.id)
  }

  const markRead = useCallback(async (id) => {
    await markNotificationRead(id)
    const wasUnread = notifications.some((item) => item.id === id && !item.read)
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, read: true } : item))
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1))
  }, [notifications])

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
    setUnreadCount(0)
  }, [])

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
    }
  }

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

  let content
  if (loading) content = <LoadingScreen label="회원 앱 데이터를 불러오는 중입니다." />
  else if (error) content = <section className="empty-panel"><ShieldCheck size={24} /><p>{error}</p><button className="button secondary" onClick={() => loadDashboard()}>다시 시도</button></section>
  else if (activeTab === 'home') content = <HomeTab notices={notices} posts={posts} files={files} unreadCount={unreadCount} openNotice={openNotice} openPost={openPost} setActiveTab={changeTab} />
  else if (activeTab === 'notices') content = <NoticesTab notices={notices} selected={selectedNotice} loading={noticeLoading} openNotice={openNotice} closeNotice={() => setSelectedNotice(null)} />
  else if (activeTab === 'community') content = <CommunityTab posts={posts} selected={selectedPost} comments={comments} loading={postLoading} openPost={openPost} closePost={() => { setSelectedPost(null); setComments([]) }} createPost={createPost} createCommentForPost={createCommentForPost} vote={vote} pollVote={pollVote} />
  else if (activeTab === 'resources') content = <ResourcesTab files={files} />
  else if (activeTab === 'notifications') content = <NotificationsTab notifications={notifications} unreadCount={unreadCount} pushStatus={pushStatus} appConfig={appConfig} enablePush={enablePush} markRead={markRead} markAllRead={markAllRead} openRoute={openRoute} />
  else if (activeTab === 'operations') content = <OperationsTab user={user} notices={notices} posts={posts} loadDashboard={loadDashboard} />
  else content = <ProfileTab user={user} onLogout={handleLogout} />

  const body = appConfig.maintenanceMessage ? <div className="stack"><AppConfigBanner appConfig={appConfig} />{content}</div> : content

  return (
    <Shell user={user} activeTab={activeTab} setActiveTab={changeTab} unreadCount={unreadCount} refreshing={refreshing} onRefresh={() => loadDashboard({ quiet: true })}>
      <Suspense fallback={<LoadingScreen label="화면을 준비 중입니다." />}>{body}</Suspense>
    </Shell>
  )
}
