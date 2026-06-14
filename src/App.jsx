import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  BellRing,
  CheckCircle2,
  Download,
  Edit3,
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
  Smartphone,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { APP_SHELL_TABS } from './config/appScope.js'
import { apiUrl } from './services/apiClient.js'
import { listAuditLogs, listEligibleMembers, listMembers } from './services/adminApi.js'
import { changePassword, getCurrentUser, loginUser, logoutUser } from './services/authApi.js'
import { downloadUrl, listFiles } from './services/archiveApi.js'
import {
  createComment,
  createCommunityPost,
  deleteCommunityPost,
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
import { nativePlatform, requestPushRegistration, setupDeepLinkListener } from './services/nativeBridge.js'
import { createNotice, getNotice, listNotices, updateNotice } from './services/noticeApi.js'
import { getNotificationSummary, listNotifications, markAllNotificationsRead, markNotificationRead } from './services/notificationApi.js'
import { asArray, formatDate, generationFromStudentId, preview, plainText } from './utils/format.js'
import { routeFromNotification } from './utils/mobileRoutes.js'
import { passwordPolicyMessage, validPassword } from './utils/passwordPolicy.js'
import { pollOptionImageUrl, pollOptionLabel, pollTotals, postBlocks, postPreviewText } from './utils/postBlocks.js'

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
  if (post?.imageUrl) return mediaSrc(post.imageUrl)
  if (Array.isArray(post?.imageUrls) && post.imageUrls[0]) return mediaSrc(post.imageUrls[0])
  if (Array.isArray(post?.imageInfos) && post.imageInfos[0]?.url) return mediaSrc(post.imageInfos[0].url)
  return null
}

function mediaSrc(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(String(value))) return value
  return apiUrl(value)
}

function isAdminUser(user) {
  return user?.role === 'ADMIN'
}

function normalizeHomeData(data) {
  return {
    notices: asArray(data?.latestNotices || data?.notices),
    posts: asArray(data?.recentPosts || data?.posts),
    files: asArray(data?.quickFiles || data?.files),
    notifications: asArray(data?.notifications),
    unreadCount: Number(data?.notificationSummary?.unreadCount ?? data?.unreadCount ?? 0),
  }
}

function normalizeAppConfig(data) {
  return { ...DEFAULT_APP_CONFIG, ...(data || {}) }
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
  const tabs = APP_SHELL_TABS.filter((tab) => !tab.adminOnly || isAdminUser(user))
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
      {unreadCount > 0 && (
        <button type="button" className="notice-strip" onClick={() => setActiveTab('notifications')}>
          <Bell size={16} aria-hidden="true" /> 읽지 않은 알림 {unreadCount}개
        </button>
      )}
      <section className="content">{children}</section>
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
        {recentPosts.map((post) => <ListItem key={post.id} title={post.title} meta={`${categoryLabels[post.category] || '자유'} · 댓글 ${post.commentCount || 0}`} body={postPreviewText(post)} image={postImage(post)} onClick={() => openPost(post.id)} />)}
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
            <PostContent post={selected} pollVote={pollVote} />
            <div className="button-row"><button className="button secondary" onClick={() => vote(1)}><ThumbsUp size={16} />추천</button><button className="button secondary" onClick={() => vote(-1)}><ThumbsDown size={16} />비추천</button></div>
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
        {items.map((post) => <ListItem key={post.id} title={post.title} meta={`${categoryLabels[post.category] || '자유'} · 댓글 ${post.commentCount || 0}`} body={postPreviewText(post)} image={postImage(post)} onClick={() => openPost(post.id)} />)}
        {items.length === 0 && <Empty text="커뮤니티 글이 없습니다." />}
      </Section>
    </div>
  )
}

function PostContent({ post, pollVote }) {
  const blocks = postBlocks(post)
  const hasPollBlock = blocks.some((block) => block.type === 'poll')

  return (
    <div className="post-content">
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          const text = plainText(block.content)
          return text ? <p className="body-text" key={index}>{text}</p> : null
        }
        if (block.type === 'image') {
          const src = mediaSrc(block.url)
          return src ? <img key={index} className="post-image" src={src} alt={block.name || '이미지'} loading="lazy" /> : null
        }
        if (block.type === 'video') {
          const src = mediaSrc(block.url)
          return src ? <video key={index} className="post-video" src={src} controls preload="metadata" /> : null
        }
        if (block.type === 'file') {
          const href = mediaSrc(block.url)
          return href ? <a key={index} className="file-link" href={href} target="_blank" rel="noreferrer"><Download size={14} />{block.name || '첨부파일'}</a> : null
        }
        if (block.type === 'externalEmbed') {
          if (block.kind === 'image' && block.url) return <img key={index} className="post-image" src={block.url} alt={block.title || '외부 이미지'} loading="lazy" />
          if (block.kind === 'video' && block.url) return <video key={index} className="post-video" src={block.url} controls preload="metadata" />
          if (block.url) return <a key={index} className="file-link" href={block.url} target="_blank" rel="noreferrer">{block.title || block.url}</a>
          return null
        }
        if (block.type === 'poll') {
          const result = asArray(post.pollResults).find((item) => item.pollId === block.pollId)
          return <PollBlock key={block.pollId || index} block={block} result={result} pollVote={pollVote} />
        }
        return null
      })}
      {!hasPollBlock && <Polls polls={post.pollResults} pollVote={pollVote} />}
    </div>
  )
}

function PollBlock({ block, result, pollVote }) {
  const { counts, total } = pollTotals(result)
  const closed = Boolean(result?.closed)
  const voted = result?.myOption !== null && result?.myOption !== undefined
  const disabled = closed || voted

  return (
    <section className="poll-card">
      <div className="poll-head">
        <strong>{block.question || '투표'}</strong>
        <span>{closed ? '종료' : total > 0 ? `총 ${total}표` : '진행 중'}</span>
      </div>
      <div className="poll">
        {asArray(block.options).map((option, index) => {
          const label = pollOptionLabel(option) || `선택 ${index + 1}`
          const imageUrl = pollOptionImageUrl(option)
          const count = counts[index] || 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const selected = result?.myOption === index
          return (
            <button key={`${block.pollId}-${index}`} type="button" className={selected ? 'active' : ''} disabled={disabled} onClick={() => pollVote(block.pollId, index)}>
              <span className="poll-label">
                {imageUrl && <img src={imageUrl} alt="" loading="lazy" />}
                {label}
              </span>
              <span>{count}표 · {pct}%</span>
            </button>
          )
        })}
      </div>
      {disabled && <p className="poll-note">{closed ? '종료된 투표입니다.' : '이미 참여한 투표입니다.'}</p>}
    </section>
  )
}

function Polls({ polls, pollVote }) {
  const items = asArray(polls)
  if (!items.length) return null
  return (
    <Section title="투표">
      {items.map((poll) => (
        <div className="poll" key={poll.pollId}>
          {pollTotals(poll).counts.map((count, index) => <button key={index} className={poll.myOption === index ? 'active' : ''} disabled={poll.closed || poll.myOption !== null && poll.myOption !== undefined} onClick={() => pollVote(poll.pollId, index)}>선택 {index + 1}<span>{count}표</span></button>)}
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

function NotificationsTab({ notifications, unreadCount, pushStatus, appConfig, enablePush, markRead, markAllRead, openRoute }) {
  const items = latest(notifications, 'createdAt')

  async function openNotification(item) {
    if (!item?.read && item?.id) await markRead(item.id)
    if (typeof item?.acceptUrl === 'string' && /^https?:\/\//i.test(item.acceptUrl)) {
      window.open(item.acceptUrl, '_blank', 'noopener,noreferrer')
      return
    }
    const route = routeFromNotification(item)
    if (route) openRoute(route)
  }

  const pushMessage = {
    idle: '푸시 알림을 켜면 새 공지와 내 글 댓글을 바로 받을 수 있습니다.',
    requesting: '기기 푸시 권한을 요청하는 중입니다.',
    requested: '기기 등록을 요청했습니다.',
    registered: '이 기기에서 푸시 알림을 받을 준비가 됐습니다.',
    denied: '기기 설정에서 알림 권한이 꺼져 있습니다.',
    unavailable: '브라우저 미리보기에서는 푸시 등록을 건너뜁니다.',
    'server-unavailable': '앱은 푸시 토큰을 받았지만 서버 등록 API가 아직 없습니다.',
    error: '푸시 등록 중 오류가 발생했습니다.',
  }[pushStatus] || '푸시 상태를 확인할 수 없습니다.'

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">
          <h2>푸시 알림</h2>
          <button type="button" onClick={enablePush} disabled={!appConfig.pushEnabled || pushStatus === 'requesting'}>
            <Smartphone size={15} aria-hidden="true" /> 켜기
          </button>
        </div>
        <p className="muted">{appConfig.pushEnabled ? pushMessage : '현재 앱 설정에서 푸시 알림이 비활성화되어 있습니다.'}</p>
      </section>
      <Section title={`알림 ${unreadCount > 0 ? `· 안 읽음 ${unreadCount}` : ''}`} action={items.length ? '모두 읽음' : ''} onAction={markAllRead}>
        {items.map((item) => (
          <ListItem
            key={item.id}
            title={item.message || '알림'}
            meta={`${item.actorLabel || item.type || 'COMS'} · ${formatDate(item.createdAt)}`}
            body={item.read ? '읽음' : '읽지 않음'}
            pinned={!item.read}
            onClick={() => openNotification(item)}
          />
        ))}
        {items.length === 0 && <Empty text="새 알림이 없습니다." />}
      </Section>
    </div>
  )
}

function OperationsTab({ user, notices, posts, loadDashboard }) {
  const [noticeId, setNoticeId] = useState('')
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [noticePinned, setNoticePinned] = useState(true)
  const [savingNotice, setSavingNotice] = useState(false)
  const [deletingPostId, setDeletingPostId] = useState(null)
  const [eligibleMembers, setEligibleMembers] = useState([])
  const [members, setMembers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loadingOps, setLoadingOps] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const recentPosts = latest(posts, 'createdAt').slice(0, 5)
  const recentNotices = latest(notices, 'createdAt').slice(0, 12)
  const pendingRoster = asArray(eligibleMembers).filter((item) => !asArray(members).some((member) => member.studentId && member.studentId === item.studentId))

  const loadOperations = useCallback(async () => {
    if (!isAdminUser(user)) return
    setLoadingOps(true)
    setError('')
    try {
      const [eligible, memberList, logs] = await Promise.all([listEligibleMembers(), listMembers(), listAuditLogs()])
      setEligibleMembers(asArray(eligible))
      setMembers(asArray(memberList))
      setAuditLogs(asArray(logs).slice(0, 5))
    } catch (err) {
      setError(err.message || '운영진 데이터를 불러오지 못했습니다.')
    } finally {
      setLoadingOps(false)
    }
  }, [user])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadOperations()
    })
    return () => {
      cancelled = true
    }
  }, [loadOperations])

  function chooseNotice(id) {
    setNoticeId(id)
    const selected = recentNotices.find((notice) => String(notice.id) === String(id))
    setNoticeTitle(selected?.title || '')
    setNoticeContent(plainText(selected?.content || ''))
    setNoticePinned(Boolean(selected?.pinned))
  }

  async function submitNotice(event) {
    event.preventDefault()
    if (!noticeTitle.trim() || !noticeContent.trim()) return
    setSavingNotice(true)
    setMessage('')
    setError('')
    const payload = {
      title: noticeTitle.trim(),
      content: noticeContent.trim(),
      author: user?.name || '운영진',
      pinned: noticePinned,
      category: 'GENERAL',
    }
    try {
      if (noticeId) await updateNotice(noticeId, payload)
      else await createNotice(payload)
      setMessage(noticeId ? '공지가 수정되었습니다.' : '공지가 등록되었습니다.')
      setNoticeId('')
      setNoticeTitle('')
      setNoticeContent('')
      setNoticePinned(true)
      await loadDashboard({ quiet: true })
    } catch (err) {
      setError(err.message || '공지 저장에 실패했습니다.')
    } finally {
      setSavingNotice(false)
    }
  }

  async function removePost(postId) {
    setDeletingPostId(postId)
    setMessage('')
    setError('')
    try {
      await deleteCommunityPost(postId)
      setMessage('커뮤니티 글을 삭제했습니다.')
      await loadDashboard({ quiet: true })
    } catch (err) {
      setError(err.message || '글 삭제에 실패했습니다.')
    } finally {
      setDeletingPostId(null)
    }
  }

  if (!isAdminUser(user)) {
    return <section className="empty-panel"><ShieldCheck size={24} aria-hidden="true" /><p>운영진 권한이 필요합니다.</p></section>
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">
          <h2>공지 작성/수정</h2>
          <button type="button" onClick={() => chooseNotice('')}><Edit3 size={15} aria-hidden="true" /> 새 공지</button>
        </div>
        <form className="form" onSubmit={submitNotice}>
          <label>
            수정할 공지
            <select value={noticeId} onChange={(event) => chooseNotice(event.target.value)}>
              <option value="">새 공지 작성</option>
              {recentNotices.map((notice) => <option key={notice.id} value={notice.id}>{notice.title}</option>)}
            </select>
          </label>
          <label>제목<input value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} maxLength={255} /></label>
          <label>내용<textarea value={noticeContent} onChange={(event) => setNoticeContent(event.target.value)} rows={5} /></label>
          <label className="check-row"><input type="checkbox" checked={noticePinned} onChange={(event) => setNoticePinned(event.target.checked)} />중요 공지로 표시</label>
          <button className="button primary" type="submit" disabled={savingNotice || !noticeTitle.trim() || !noticeContent.trim()}>
            {savingNotice ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}저장
          </button>
        </form>
      </section>
      <Section title="문제 글 빠른 확인">
        {recentPosts.map((post) => (
          <div className="admin-row" key={post.id}>
            <div>
              <strong>{post.title}</strong>
              <span>{categoryLabels[post.category] || '자유'} · 댓글 {post.commentCount || 0} · {formatDate(post.createdAt)}</span>
            </div>
            <button type="button" className="icon-button danger" onClick={() => removePost(post.id)} disabled={deletingPostId === post.id} aria-label="글 삭제">
              {deletingPostId === post.id ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
            </button>
          </div>
        ))}
        {recentPosts.length === 0 && <Empty text="확인할 커뮤니티 글이 없습니다." />}
      </Section>
      <section className="panel">
        <div className="section-title">
          <h2>회원 승인 상태</h2>
          <button type="button" onClick={loadOperations} disabled={loadingOps}><RefreshCcw size={15} className={loadingOps ? 'spin' : ''} aria-hidden="true" /> 새로고침</button>
        </div>
        <div className="metric-grid">
          <Metric icon={Users} label="가입 회원" value={members.length} />
          <Metric icon={ShieldCheck} label="명부 대기" value={pendingRoster.length} />
        </div>
        <div className="list compact-list">
          {pendingRoster.slice(0, 5).map((item) => <Info key={item.id || item.studentId || item.name} label={`${item.name || '이름 없음'} · ${item.generation || generationFromStudentId(item.studentId)}`} value={item.studentId || '졸업생'} />)}
          {pendingRoster.length === 0 && <Empty text="명부 기준 대기자가 없습니다." />}
        </div>
      </section>
      <Section title="최근 운영 기록">
        {auditLogs.map((log) => <ListItem key={log.id} title={log.action || '운영 기록'} meta={`${log.actorName || log.actorStudentId || '운영진'} · ${formatDate(log.createdAt)}`} body={log.targetType ? `${log.targetType}${log.targetId ? ` #${log.targetId}` : ''}` : ''} />)}
        {auditLogs.length === 0 && <Empty text="최근 운영 기록이 없습니다." />}
      </Section>
      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

function AppConfigBanner({ appConfig }) {
  if (!appConfig?.maintenanceMessage) return null
  return (
    <section className="app-config-banner">
      <BellRing size={17} aria-hidden="true" />
      <span>{appConfig.maintenanceMessage}</span>
    </section>
  )
}

function ProfileTab({ user, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const passwordError = newPassword ? passwordPolicyMessage(newPassword) : ''
  const canSubmit = currentPassword.trim() && validPassword(newPassword)

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
        <label>새 비밀번호<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="영문·숫자·특수문자 포함 8자 이상" /></label>
        {passwordError && <p className="form-error">{passwordError}</p>}
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

  return <Shell user={user} activeTab={activeTab} setActiveTab={changeTab} unreadCount={unreadCount} refreshing={refreshing} onRefresh={() => loadDashboard({ quiet: true })}>{body}</Shell>
}
