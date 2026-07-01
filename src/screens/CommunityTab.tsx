import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { List, useDynamicRowHeight } from 'react-window'
import type { DynamicRowHeight, RowComponentProps } from 'react-window'
import { AlertTriangle, Bookmark, BookmarkCheck, CornerDownRight, Eye, Plus, Search, Send, Share2, ThumbsDown, ThumbsUp, Trash2, Pencil, Check, X } from 'lucide-react'
import { confirmDialog } from '../components/ConfirmDialog'
import { asArray, formatDate } from '../utils/format'
import { categoryLabels, latest, postImage } from '../utils/helpers'
import { postPreviewText } from '../utils/postBlocks'
import { sharePost } from '../services/nativeShare'
import { hapticLight, hapticSuccess } from '../services/haptics'
import { Detail, Empty, ListItem, LoadingScreen, Section } from '../components/ui'
import EmojiText from '../components/EmojiText'
import Composer from './community/Composer'
import PostContent from './community/PostContent'
import ReportDialog from './community/ReportDialog'
import { reportCommunityPost } from '../services/communityApi'
import type { CommunityPost, CurrentUser } from '../contract/types'

// Estimated height for a community list item (title + meta + body).
// react-window needs a stable row height; this covers the typical rendered size.
const COMMUNITY_ITEM_HEIGHT = 80
// Minimum number of items required before virtual scroll activates.
const VIRTUAL_THRESHOLD = 20

const MAX_THREAD_DEPTH = 3

type PostRowExtra = { observeRow: DynamicRowHeight['observeRowElements'] }

const ORIGIN = (typeof window !== 'undefined' && window.location?.origin) || 'https://coms.kw.ac.kr'

function matchesQuery(post, query) {
  if (!query) return true
  const haystack = `${post.title || ''} ${postPreviewText(post)} ${post.authorDisplayName || post.authorName || ''}`.toLowerCase()
  return haystack.includes(query)
}

// Wraps the shared ListItem (itself a button) with a sibling scrap toggle, since
// an interactive control can't be nested inside another button.
type PostListItemProps = {
  post: CommunityPost
  openPost: (id: unknown) => void
  toggleBookmark?: (id: unknown) => void | Promise<void>
}

function PostListItem({ post, openPost, toggleBookmark }: PostListItemProps) {
  const bookmarked = Boolean(post.bookmarked)
  return (
    <div className="post-list-row">
      <ListItem
        title={post.title}
        meta={`${categoryLabels[post.category] || '자유'} · 댓글 ${post.commentCount || 0}`}
        body={postPreviewText(post)}
        image={postImage(post)}
        onClick={() => openPost(post.id)}
      />
      {toggleBookmark && (
        <button
          type="button"
          className="icon-button post-list-bookmark"
          aria-label={bookmarked ? '스크랩 취소' : '스크랩'}
          aria-pressed={bookmarked}
          onClick={() => { void hapticLight(); void toggleBookmark(post.id) }}
        >
          {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      )}
    </div>
  )
}

type CommunityComment = {
  id?: unknown
  content?: string
  depth?: number
  edited?: boolean
  authorDisplayName?: string
  authorName?: string
  authorStudentId?: unknown
  authorId?: unknown
  createdAt?: string
  [key: string]: unknown
}

type PendingPost = { id?: unknown; payload?: unknown; [key: string]: unknown }

type CommunityTabProps = {
  posts: CommunityPost[]
  selected?: CommunityPost | null
  comments: CommunityComment[]
  loading?: boolean
  openPost: (id: unknown) => void
  closePost: () => void
  createPost: (input: unknown) => unknown
  createCommentForPost: (content: string, parentCommentId?: unknown) => void | Promise<void>
  vote: (value: number) => void | Promise<void>
  pollVote: (pollId: unknown, optionIndex: number) => void
  toggleBookmark?: (id: unknown) => void | Promise<void>
  editComment?: (id: unknown, content: string) => void | Promise<void>
  removeComment?: (id: unknown) => void | Promise<void>
  currentUser?: CurrentUser | null
  pendingPosts?: PendingPost[]
  retryPendingPosts?: () => void | Promise<void>
}

export default function CommunityTab({ posts, selected, comments, loading, openPost, closePost, createPost, createCommentForPost, vote, pollVote, toggleBookmark, editComment, removeComment, currentUser, pendingPosts = [], retryPendingPosts }: CommunityTabProps) {
  const [writing, setWriting] = useState(false)
  const [comment, setComment] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [editingCommentId, setEditingCommentId] = useState<unknown>(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyingToId, setReplyingToId] = useState<unknown>(null)
  const [replyContent, setReplyContent] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportedAt, setReportedAt] = useState<number | null>(null)

  async function submitReport(reason, detail) {
    if (!selected?.id) return
    await reportCommunityPost(selected.id, reason, detail)
    void hapticSuccess()
    setReportedAt(Date.now())
  }

  // The backend marks each post with a `bookmarked` flag; toggleBookmark flips it server-side
  // and the parent patches the cached post, so we read straight from the selected post.
  const bookmarked = Boolean(selected?.bookmarked)

  async function onToggleBookmark() {
    if (!selected?.id) return
    await toggleBookmark?.(selected.id)
  }

  async function submitComment(event) {
    event.preventDefault()
    if (!comment.trim()) return
    await createCommentForPost(comment.trim())
    setComment('')
  }

  async function submitReply(parentId) {
    const next = replyContent.trim()
    if (!next) return
    await createCommentForPost(next, parentId)
    setReplyContent('')
    setReplyingToId(null)
  }

  async function shareSelected() {
    void hapticLight()
    const shareUrl = `${ORIGIN.replace(/\/$/, '')}/community/${selected.id}`
    await sharePost({ title: selected.title || 'COM\'s 커뮤니티', text: '여기를 눌러 내용을 확인하세요.', url: shareUrl })
  }

  function startEditing(item) {
    setEditingCommentId(item.id)
    setEditingContent(item.content || '')
  }

  function cancelEditing() {
    setEditingCommentId(null)
    setEditingContent('')
  }

  async function commitEditing(id) {
    const next = editingContent.trim()
    if (!next) return
    await editComment?.(id, next)
    cancelEditing()
  }

  async function removeOne(id) {
    if (!(await confirmDialog({ message: '이 댓글을 삭제할까요?', tone: 'danger', confirmText: '삭제' }))) return
    await removeComment?.(id)
  }

  function isOwnedByMe(item) {
    if (!currentUser) return false
    if (item.authorStudentId && currentUser.studentId) return String(item.authorStudentId) === String(currentUser.studentId)
    if (item.authorId && currentUser.id) return String(item.authorId) === String(currentUser.id)
    return false
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return latest(posts, 'createdAt')
      .filter((post) => (category === 'ALL' || (post.category || 'GENERAL') === category))
      .filter((post) => matchesQuery(post, q))
  }, [posts, query, category])

  if (selected) {
    return (
      <Detail title={selected.title} meta={`${categoryLabels[selected.category] || '자유'} · ${formatDate(selected.createdAt)}`} onBack={closePost}>
        {loading ? <LoadingScreen label="글을 불러오는 중입니다." /> : (
          <div className="stack">
            <div className="stats"><span><Eye size={14} />{selected.viewCount || 0}</span><span><ThumbsUp size={14} />{selected.upvotes || 0}</span><span><ThumbsDown size={14} />{selected.downvotes || 0}</span></div>
            <PostContent post={selected} pollVote={pollVote} />
            <div className="button-row">
              <button className="button secondary" onClick={() => vote(1)}><ThumbsUp size={16} />추천</button>
              <button className="button secondary" onClick={() => vote(-1)}><ThumbsDown size={16} />비추천</button>
              <button className="button secondary" onClick={shareSelected}><Share2 size={16} />공유</button>
              <button className="button secondary" onClick={onToggleBookmark} aria-label={bookmarked ? '스크랩 취소' : '스크랩'} aria-pressed={bookmarked}>
                {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {bookmarked ? '스크랩됨' : '스크랩'}
              </button>
              <button className="button secondary" onClick={() => setReporting(true)} disabled={Boolean(reportedAt)}>
                <AlertTriangle size={16} /> {reportedAt ? '신고됨' : '신고'}
              </button>
            </div>
            {reporting && <ReportDialog onClose={() => setReporting(false)} onSubmit={submitReport} />}
            <Section title={`댓글 ${asArray(comments).length}`}>
              {asArray(comments).map((item) => {
                const owned = isOwnedByMe(item)
                const editing = editingCommentId === item.id
                const depth = Math.min(Number(item.depth || 0), MAX_THREAD_DEPTH)
                const replying = replyingToId === item.id
                return (
                  <div className={`comment comment-depth-${depth}`} key={item.id}>
                    {depth > 0 && <CornerDownRight className="comment-thread-arrow" size={14} aria-hidden="true" />}
                    <strong>{item.authorDisplayName || item.authorName || '회원'}</strong>
                    <span>{formatDate(item.createdAt)}{item.edited ? ' · 수정됨' : ''}</span>
                    {editing ? (
                      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); void commitEditing(item.id) }}>
                        <input value={editingContent} onChange={(event) => setEditingContent(event.target.value)} autoFocus />
                        <button type="submit" aria-label="저장"><Check size={15} /></button>
                        <button type="button" aria-label="취소" onClick={cancelEditing}><X size={15} /></button>
                      </form>
                    ) : (
                      <EmojiText as="p" text={item.content} />
                    )}
                    {!editing && (
                      <div className="comment-actions">
                        {depth < MAX_THREAD_DEPTH && (
                          <button type="button" className="link-button" onClick={() => { setReplyingToId(item.id); setReplyContent('') }}>답글</button>
                        )}
                        {owned && (
                          <>
                            <button type="button" className="icon-button" onClick={() => startEditing(item)} aria-label="댓글 수정"><Pencil size={13} /></button>
                            <button type="button" className="icon-button danger" onClick={() => removeOne(item.id)} aria-label="댓글 삭제"><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    )}
                    {replying && (
                      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); void submitReply(item.id) }}>
                        <input value={replyContent} onChange={(event) => setReplyContent(event.target.value)} placeholder="답글 작성" autoFocus />
                        <button type="submit" aria-label="답글 등록"><Send size={15} /></button>
                        <button type="button" aria-label="취소" onClick={() => setReplyingToId(null)}><X size={15} /></button>
                      </form>
                    )}
                  </div>
                )
              })}
              {asArray(comments).length === 0 && <Empty text="댓글이 없습니다." />}
            </Section>
            <form className="inline-form" onSubmit={submitComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="댓글 작성" /><button aria-label="댓글 등록"><Send size={17} /></button></form>
          </div>
        )}
      </Detail>
    )
  }

  return <CommunityListView
    posts={posts}
    filtered={filtered}
    query={query}
    setQuery={setQuery}
    category={category}
    setCategory={setCategory}
    writing={writing}
    setWriting={setWriting}
    createPost={createPost}
    openPost={openPost}
    toggleBookmark={toggleBookmark}
    currentUser={currentUser}
    pendingPosts={pendingPosts}
    retryPendingPosts={retryPendingPosts}
  />
}

type CommunityListViewProps = {
  posts: CommunityPost[]
  filtered: CommunityPost[]
  query: string
  setQuery: (value: string) => void
  category: string
  setCategory: (value: string) => void
  writing: boolean
  setWriting: Dispatch<SetStateAction<boolean>>
  createPost: (input: unknown) => unknown
  openPost: (id: unknown) => void
  toggleBookmark?: (id: unknown) => void | Promise<void>
  currentUser?: CurrentUser | null
  pendingPosts: PendingPost[]
  retryPendingPosts?: () => void | Promise<void>
}

function CommunityListView({ posts, filtered, query, setQuery, category, setCategory, writing, setWriting, createPost, openPost, toggleBookmark, currentUser, pendingPosts, retryPendingPosts }: CommunityListViewProps) {
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    for (const post of posts) if (post?.category) set.add(post.category)
    return ['ALL', ...set]
  }, [posts])

  const useVirtual = filtered.length >= VIRTUAL_THRESHOLD

  const dynamicRowHeight = useDynamicRowHeight({ defaultRowHeight: COMMUNITY_ITEM_HEIGHT })

  // rowComponent receives { index, style, observeRow } from react-window.
  // The ref callback uses the React 19 cleanup-return pattern so react-window's
  // ResizeObserver starts/stops tracking each row element automatically.
  const PostRow = useCallback(({ index, style, observeRow }: RowComponentProps<PostRowExtra>) => {
    const post = filtered[index]
    return (
      <div style={style} ref={(el: HTMLDivElement | null) => { if (el) return observeRow([el]) }}>
        <PostListItem post={post} openPost={openPost} toggleBookmark={toggleBookmark} />
      </div>
    )
  }, [filtered, openPost, toggleBookmark])

  // Recompute list height on resize/rotation so the List fills the viewport correctly.
  // Approximate: viewport minus topbar (~3.5rem), tabbar (~4.5rem), and other chrome (~9rem total = 144px).
  const [viewportHeight, setViewportHeight] = useState(
    () => (typeof window !== 'undefined' ? window.innerHeight : 600),
  )
  useEffect(() => {
    function onResize() { setViewportHeight(window.innerHeight) }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])
  const listHeight = Math.max(200, viewportHeight - 144 - (writing ? 260 : 0))

  return (
    <div className="stack">
      <button type="button" className="button primary" onClick={() => setWriting((value) => !value)}><Plus size={17} />글 작성</button>
      {pendingPosts.length > 0 && (
        <div className="offline-banner" role="status">
          임시 저장된 커뮤니티 글 {pendingPosts.length}개가 연결 복구를 기다리고 있습니다.
          <button type="button" className="link-button" onClick={retryPendingPosts}>지금 재시도</button>
        </div>
      )}
      {writing && <Composer currentUser={currentUser} onSubmit={async (input) => { await createPost(input); setWriting(false) }} />}
      <div className="search-row"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목·본문·작성자 검색" /></div>
      {availableCategories.length > 2 && (
        <div className="segments">
          {availableCategories.map((value) => (
            <button key={value} type="button" className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>
              {value === 'ALL' ? '전체' : (categoryLabels[value] || value)}
            </button>
          ))}
        </div>
      )}
      <Section title={`커뮤니티${query || category !== 'ALL' ? ` · ${filtered.length}건` : ''}`}>
        {filtered.length === 0 && <Empty text={query || category !== 'ALL' ? '검색 결과가 없습니다.' : '커뮤니티 글이 없습니다.'} />}
        {useVirtual ? (
          <List
            data-inner-scroll=""
            rowComponent={PostRow}
            rowCount={filtered.length}
            rowHeight={dynamicRowHeight}
            rowProps={{ observeRow: dynamicRowHeight.observeRowElements }}
            style={{ height: listHeight }}
          />
        ) : (
          filtered.map((post) => (
            <PostListItem key={post.id} post={post} openPost={openPost} toggleBookmark={toggleBookmark} />
          ))
        )}
      </Section>
    </div>
  )
}
