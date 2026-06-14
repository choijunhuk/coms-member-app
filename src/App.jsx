import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Download,
  Eye,
  FileText,
  Image,
  Loader2,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from 'lucide-react'
import { APP_SHELL_TABS } from './config/appScope.js'
import { changePassword, getCurrentUser, loginUser, logoutUser } from './services/authApi.js'
import { downloadUrl, listFiles } from './services/archiveApi.js'
import {
  createComment,
  createCommunityPost,
  getCommunityPost,
  listComments,
  listCommunityPosts,
  voteCommunityPoll,
  voteCommunityPost,
} from './services/communityApi.js'
import { getNotice, listNotices } from './services/noticeApi.js'
import { getNotificationSummary } from './services/notificationApi.js'
import { asArray, formatDate, generationFromStudentId, preview, plainText } from './utils/format.js'

const categoryLabels = {
  GENERAL: '자유',
  STUDY: '스터디',
  QUESTION: '질문',
  PROJECT: '프로젝트',
  NOTICE: '공지',
}

const fileCategoryLabels = {
  GENERAL: '일반',
  STUDY: '스터디',
  PROJECT: '프로젝트',
  NOTICE: '공지',
}

function latest(items, field) {
  return [...asArray(items)].sort((a, b) => new Date(b?.[field] || 0) - new Date(a?.[field] || 0))
}

function postImage(post) {
  if (post?.imageUrl) return post.imageUrl
  if (Array.isArray(post?.imageUrls) && post.imageUrls[0]) return post.imageUrls[0]
  if (Array.isArray(post?.imageInfos) && post.imageInfos[0]?.url) return post.imageInfos[0].url
  return null
}

function LoadingScreen({ label = '불러오는 중입니다.' }) {
  return (
    <div className="center-screen">
      <Loader2 className="spin" size={30} aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

function LoginScreen({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = identifier.trim() && password.trim() && !loading

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await loginUser({ identifier: identifier.trim(), password, rememberMe })
      await onLogin()
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-pill">COMS</div>
        <p className="eyebrow">Member App</p>
        <h1>회원용 앱으로 바로 들어가기</h1>
        <p className="muted">지원서, 모집, 관리자 기능은 웹에 두고 회원이 매일 쓰는 기능만 담았습니다.</p>
        <form className="form" onSubmit={submit}>
          <label>
            학번 또는 이메일
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" placeholder="학번 또는 이메일" />
          </label>
          <label>
            비밀번호
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="비밀번호" />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
            로그인 유지
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="button primary" disabled={!canSubmit}>
            {loading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
            로그인
          </button>
        </form>
      </section>
    </main>
  )
}

function Shell({ user, activeTab, setActiveTab, unreadCount, onRefresh, refreshing, children }) {
  const active = APP_SHELL_TABS.find((tab) => tab.id === activeTab)
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
      {unreadCount > 0 && <div className="notice-strip"><Bell size={16} aria-hidden="true" /> 읽지 않은 알림 {unreadCount}개</div>}
      <section className="content">{children}</section>
      <nav className="tabbar" aria-label="회원 앱 메뉴">
        {APP_SHELL_TABS.map((tab) => {
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

function Section({ title, action, onAction, children }) {
  return (
    <section className="card">
      <div className="section-title">
        <h2>{title}</h2>
        {action && <button type="button" onClick={onAction}>{action}</button>}
      </div>
      <div className="list">{children}</div>
    </section>
  )
}

function ListItem({ title, meta, body, pinned, image, onClick, children }) {
  return (
    <button type="button" className="list-item" onClick={onClick}>
      <span className="item-title">{pinned && <b>중요</b>}{title}</span>
      {meta && <span className="item-meta">{meta}</span>}
      {body && <span className="item-body">{body}</span>}
      {image && <span className="media-chip"><Image size={14} aria-hidden="true" /> 이미지</span>}
      {children}
    </button>
  )
}

function Empty({ text }) {
  return <p className="empty">{text}</p>
}

function HomeTab({ notices, posts, files, unreadCount, openNotice, openPost, setActiveTab }) {
  const recentNotices = latest(notices, 'createdAt').slice(0, 3)
  const recentPosts = latest(posts, 'createdAt').slice(0, 3)
  const recentFiles = latest(files, 'uploadedAt').slice(0, 2)
  return (
    <div className="stack">
      <section className="hero-card">
        <p className="eyebrow">Daily COMS</p>
        <h2>공지, 커뮤니티, 자료를 한 화면에서 확인합니다.</h2>
      </section>
      <div className="metric-grid">
        <Metric icon={Bell} label="공지" value={recentNotices.length} />
        <Metric icon={MessageCircle} label="최근 글" value={recentPosts.length} />
        <Metric icon={ShieldCheck} label="알림" value={unreadCount} />
        <Metric icon={FileText} label="자료" value={files.length} />
      </div>
      <Section title="최신 공지" action="전체" onAction={() => setActiveTab('notices')}>
        {recentNotices.map((notice) => <ListItem key={notice.id} title={notice.title} pinned={notice.pinned} meta={formatDate(notice.createdAt)} body={preview(notice.content)} onClick={() => openNotice(notice.id)} />)}
        {recentNotices.length === 0 && <Empty text="등록된 공지가 없습니다." />}
      </Section>
      <Section title="최근 커뮤니티" action="전체" onAction={() => setActiveTab('community')}>
        {recentPosts.map((post) => <ListItem key={post.id} title={post.title} meta={`${categoryLabels[post.category] || '자유'} · 댓글 ${post.commentCount || 0}`} body={preview(post.content)} image={postImage(post)} onClick={() => openPost(post.id)} />)}
        {recentPosts.length === 0 && <Empty text="커뮤니티 글이 없습니다." />}
      </Section>
      <Section title="빠른 자료실" action="열기" onAction={() => setActiveTab('resources')}>
        {recentFiles.map((file) => <ListItem key={file.id} title={file.title} meta={fileCategoryLabels[file.category] || '일반'} body={file.originalName} onClick={() => window.open(downloadUrl(file.id), '_blank', 'noopener,noreferrer')} />)}
        {recentFiles.length === 0 && <Empty text="최근 자료가 없습니다." />}
      </Section>
    </div>
  )
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <Icon size={18} aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Detail({ title, meta, onBack, children }) {
  return (
    <article className="detail">
      <button type="button" className="back-button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" />목록</button>
      <h2>{title}</h2>
      {meta && <p className="item-meta">{meta}</p>}
      {children}
    </article>
  )
}

function NoticesTab({ notices, selected, loading, openNotice, closeNotice }) {
  if (selected) {
    return (
      <Detail title={selected.title} meta={formatDate(selected.createdAt)} onBack={closeNotice}>
        {selected.pinned && <span className="badge">중요 공지</span>}
        {loading ? <LoadingScreen label="공지 상세를 불러오는 중입니다." /> : <p className="body-text">{plainText(selected.content)}</p>}
      </Detail>
    )
  }
  const items = latest(notices, 'createdAt')
  return (
    <Section title="공지사항">
      {items.map((notice) => <ListItem key={notice.id} title={notice.title} meta={formatDate(notice.createdAt)} body={preview(notice.content)} pinned={notice.pinned} onClick={() => openNotice(notice.id)} />)}
      {items.length === 0 && <Empty text="등록된 공지가 없습니다." />}
    </Section>
  )
}

function Composer({ onSubmit }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = title.trim().length >= 2 && content.trim().length >= 2 && !saving

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      await onSubmit({ title: title.trim(), content: content.trim(), category, anonymousName: '' })
      setTitle('')
      setContent('')
    } catch (err) {
      setError(err.message || '글 작성 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form panel" onSubmit={submit}>
      <label>제목<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></label>
      <label>분류<select value={category} onChange={(event) => setCategory(event.target.value)}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>내용<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} maxLength={5000} /></label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="button primary" disabled={!canSubmit}><Send size={17} aria-hidden="true" />등록</button>
    </form>
  )
}

function CommunityTab({ posts, selected, comments, loading, openPost, closePost, createPost, createCommentForPost, vote, pollVote }) {
  const [writing, setWriting] = useState(false)
  const [comment, setComment] = useState('')

  async function submitComment(event) {
    event.preventDefault()
    if (!comment.trim()) return
    await createCommentForPost(comment.trim())
    setComment('')
  }

  if (selected) {
    const image = postImage(selected)
    return (
      <Detail title={selected.title} meta={`${categoryLabels[selected.category] || '자유'} · ${formatDate(selected.createdAt)}`} onBack={closePost}>
        {loading ? <LoadingScreen label="글을 불러오는 중입니다." /> : (
          <div className="stack">
            <div className="stats"><span><Eye size={14} />{selected.viewCount || 0}</span><span><ThumbsUp size={14} />{selected.upvotes || 0}</span><span><ThumbsDown size={14} />{selected.downvotes || 0}</span></div>
            {image && <img className="post-image" src={image} alt="" />}
            <p className="body-text">{plainText(selected.content)}</p>
            <div className="button-row"><button className="button secondary" onClick={() => vote(1)}><ThumbsUp size={16} />추천</button><button className="button secondary" onClick={() => vote(-1)}><ThumbsDown size={16} />비추천</button></div>
            <Polls polls={selected.pollResults} pollVote={pollVote} />
            <Section title={`댓글 ${comments.length}`}>
              {comments.map((item) => <div className="comment" key={item.id}><strong>{item.authorDisplayName || item.authorName || '회원'}</strong><span>{formatDate(item.createdAt)}</span><p>{item.content}</p></div>)}
              {comments.length === 0 && <Empty text="댓글이 없습니다." />}
            </Section>
            <form className="inline-form" onSubmit={submitComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="댓글 작성" /><button aria-label="댓글 등록"><Send size={17} /></button></form>
          </div>
        )}
      </Detail>
    )
  }

  const items = latest(posts, 'createdAt')
  return (
    <div className="stack">
      <button type="button" className="button primary" onClick={() => setWriting((value) => !value)}><Plus size={17} />글 작성</button>
      {writing && <Composer onSubmit={async (payload) => { await createPost(payload); setWriting(false) }} />}
      <Section title="커뮤니티">
        {items.map((post) => <ListItem key={post.id} title={post.title} meta={`${categoryLabels[post.category] || '자유'} · 댓글 ${post.commentCount || 0}`} body={preview(post.content)} image={postImage(post)} onClick={() => openPost(post.id)} />)}
        {items.length === 0 && <Empty text="커뮤니티 글이 없습니다." />}
      </Section>
    </div>
  )
}

function Polls({ polls, pollVote }) {
  const items = asArray(polls)
  if (!items.length) return null
  return (
    <Section title="투표">
      {items.map((poll) => (
        <div className="poll" key={poll.pollId}>
          {asArray(poll.optionCounts).map((count, index) => <button key={index} className={poll.myOption === index ? 'active' : ''} disabled={poll.closed} onClick={() => pollVote(poll.pollId, index)}>선택 {index + 1}<span>{count}표</span></button>)}
        </div>
      ))}
    </Section>
  )
}

function ResourcesTab({ files }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const categories = useMemo(() => ['ALL', ...new Set(asArray(files).map((file) => file.category || 'GENERAL'))], [files])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return latest(files, 'uploadedAt').filter((file) => {
      const text = `${file.title || ''} ${file.description || ''} ${file.originalName || ''}`.toLowerCase()
      return (category === 'ALL' || (file.category || 'GENERAL') === category) && (!q || text.includes(q))
    })
  }, [category, files, query])

  return (
    <div className="stack">
      <div className="search-row"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="자료 검색" /></div>
      <div className="segments">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item === 'ALL' ? '전체' : fileCategoryLabels[item] || item}</button>)}</div>
      <Section title="자료실">
        {filtered.map((file) => <ListItem key={file.id} title={file.title} meta={`${fileCategoryLabels[file.category] || '일반'} · ${formatDate(file.uploadedAt)}`} body={file.description || file.originalName} onClick={() => window.open(downloadUrl(file.id), '_blank', 'noopener,noreferrer')}><span className="media-chip"><Download size={14} />다운로드</span></ListItem>)}
        {filtered.length === 0 && <Empty text="조건에 맞는 자료가 없습니다." />}
      </Section>
    </div>
  )
}

function ProfileTab({ user, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const canSubmit = currentPassword.trim() && newPassword.trim().length >= 8

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setMessage('')
    setError('')
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setMessage('비밀번호가 변경되었습니다.')
    } catch (err) {
      setError(err.message || '비밀번호 변경 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="stack">
      <section className="profile-card"><div className="avatar">{(user?.name || 'C').slice(0, 1)}</div><div><h2>{user?.name || '회원'}</h2><p>{user?.studentId || '학번 없음'} · {generationFromStudentId(user?.studentId)}</p></div></section>
      <section className="panel"><Info label="이메일 인증" value={user?.emailVerified ? '완료' : '미완료'} /><Info label="학과" value={user?.department || '미등록'} /><Info label="권한" value={user?.role === 'ADMIN' ? '관리자' : '회원'} /></section>
      <form className="form panel" onSubmit={submit}>
        <h2>비밀번호 변경</h2>
        <label>현재 비밀번호<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        <label>새 비밀번호<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="8자 이상" /></label>
        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="button primary" disabled={!canSubmit}>변경</button>
      </form>
      <button type="button" className="button danger" onClick={onLogout}><LogOut size={17} />로그아웃</button>
    </div>
  )
}

function Info({ label, value }) {
  return <div className="info-row"><span>{label}</span><strong>{value}</strong></div>
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [notices, setNotices] = useState([])
  const [posts, setPosts] = useState([])
  const [files, setFiles] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
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
      const [noticeData, postData, fileData, notificationData] = await Promise.all([
        listNotices(),
        listCommunityPosts(),
        listFiles(),
        getNotificationSummary().catch(() => ({ unreadCount: 0 })),
      ])
      setNotices(asArray(noticeData))
      setPosts(asArray(postData))
      setFiles(asArray(fileData))
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
    if (!user) return undefined
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadDashboard()
    })
    return () => {
      cancelled = true
    }
  }, [loadDashboard, user])

  async function openNotice(id) {
    setActiveTab('notices')
    setSelectedNotice(null)
    setNoticeLoading(true)
    try {
      setSelectedNotice(await getNotice(id))
    } finally {
      setNoticeLoading(false)
    }
  }

  async function openPost(id) {
    setActiveTab('community')
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
  }

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

  async function handleLogout() {
    try {
      await logoutUser()
    } finally {
      setUser(null)
    }
  }

  function changeTab(tabId) {
    setActiveTab(tabId)
    if (tabId !== 'notices') setSelectedNotice(null)
    if (tabId !== 'community') {
      setSelectedPost(null)
      setComments([])
    }
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
  else content = <ProfileTab user={user} onLogout={handleLogout} />

  return <Shell user={user} activeTab={activeTab} setActiveTab={changeTab} unreadCount={unreadCount} refreshing={refreshing} onRefresh={() => loadDashboard({ quiet: true })}>{content}</Shell>
}
