import { useCallback, useMemo, useState } from 'react'
import { List } from 'react-window'
import { AlertTriangle, Bookmark, BookmarkCheck, CornerDownRight, Eye, Plus, Search, Send, Share2, ThumbsDown, ThumbsUp, Trash2, Pencil, Check, X } from 'lucide-react'
import { asArray, formatDate } from '../utils/format.js'
import { categoryLabels, latest, postImage } from '../utils/helpers.js'
import { postPreviewText } from '../utils/postBlocks.js'
import { sharePost } from '../services/nativeShare.js'
import { hapticLight, hapticSuccess } from '../services/haptics.js'
import { isBookmarked, toggleBookmark } from '../utils/bookmarks.js'
import { Detail, Empty, ListItem, LoadingScreen, Section } from '../components/ui.jsx'
import EmojiText from '../components/EmojiText.jsx'
import Composer from './community/Composer.jsx'
import PostContent from './community/PostContent.jsx'
import ReportDialog from './community/ReportDialog.jsx'
import { reportCommunityPost } from '../services/communityApi.js'

// Estimated height for a community list item (title + meta + body).
// react-window needs a stable row height; this covers the typical rendered size.
const COMMUNITY_ITEM_HEIGHT = 80
// Minimum number of items required before virtual scroll activates.
const VIRTUAL_THRESHOLD = 20

const MAX_THREAD_DEPTH = 3

const ORIGIN = (typeof window !== 'undefined' && window.location?.origin) || 'https://coms.kw.ac.kr'

function matchesQuery(post, query) {
  if (!query) return true
  const haystack = `${post.title || ''} ${postPreviewText(post)} ${post.authorDisplayName || post.authorName || ''}`.toLowerCase()
  return haystack.includes(query)
}

export default function CommunityTab({ posts, selected, comments, loading, openPost, closePost, createPost, createCommentForPost, vote, pollVote, editComment, removeComment, currentUser, pendingPosts = [], retryPendingPosts }) {
  const [writing, setWriting] = useState(false)
  const [comment, setComment] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyingToId, setReplyingToId] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [bookmarkTick, setBookmarkTick] = useState(0)
  const [reporting, setReporting] = useState(false)
  const [reportedAt, setReportedAt] = useState(null)

  async function submitReport(reason, detail) {
    if (!selected?.id) return
    await reportCommunityPost(selected.id, reason, detail)
    void hapticSuccess()
    setReportedAt(Date.now())
  }

  // Derive from device storage on each render keyed by selected id and the toggle tick.
  // Cheaper than wiring an effect, and the tick triggers a refresh after toggleBookmark writes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bookmarked = useMemo(() => Boolean(selected?.id) && isBookmarked(selected.id), [selected?.id, bookmarkTick])

  function onToggleBookmark() {
    if (!selected?.id) return
    void hapticLight()
    toggleBookmark(selected.id)
    setBookmarkTick((tick) => tick + 1)
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
    if (typeof window !== 'undefined' && !window.confirm('이 댓글을 삭제할까요?')) return
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
              <button className="button secondary" onClick={onToggleBookmark}>
                {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {bookmarked ? '북마크됨' : '북마크'}
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
    currentUser={currentUser}
    pendingPosts={pendingPosts}
    retryPendingPosts={retryPendingPosts}
  />
}

function CommunityListView({ posts, filtered, query, setQuery, category, setCategory, writing, setWriting, createPost, openPost, currentUser, pendingPosts, retryPendingPosts }) {
  const availableCategories = useMemo(() => {
    const set = new Set()
    for (const post of posts) if (post?.category) set.add(post.category)
    return ['ALL', ...set]
  }, [posts])

  const useVirtual = filtered.length >= VIRTUAL_THRESHOLD

  // rowComponent receives { index, style } from react-window plus rowProps spread.
  // Keep existing ListItem markup unchanged; only wrap in the absolute-positioned div.
  const PostRow = useCallback(({ index, style }) => {
    const post = filtered[index]
    return (
      <div style={style}>
        <ListItem
          title={post.title}
          meta={`${categoryLabels[post.category] || '자유'} · 댓글 ${post.commentCount || 0}`}
          body={postPreviewText(post)}
          image={postImage(post)}
          onClick={() => openPost(post.id)}
        />
      </div>
    )
  }, [filtered, openPost])

  // Approximate list height: fill viewport minus topbar (~3.5rem), tabbar (~4.5rem),
  // search row, category bar, section header, and some padding (~9rem total overhead).
  const listHeight =
    typeof window !== 'undefined'
      ? Math.max(200, window.innerHeight - 144 - (writing ? 260 : 0))
      : 400

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
            rowHeight={COMMUNITY_ITEM_HEIGHT}
            rowProps={{}}
            style={{ height: listHeight }}
          />
        ) : (
          filtered.map((post) => (
            <ListItem
              key={post.id}
              title={post.title}
              meta={`${categoryLabels[post.category] || '자유'} · 댓글 ${post.commentCount || 0}`}
              body={postPreviewText(post)}
              image={postImage(post)}
              onClick={() => openPost(post.id)}
            />
          ))
        )}
      </Section>
    </div>
  )
}
