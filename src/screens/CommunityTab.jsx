import { useMemo, useState } from 'react'
import { CornerDownRight, Eye, Plus, Search, Send, Share2, ThumbsDown, ThumbsUp, Trash2, Pencil, Check, X } from 'lucide-react'
import { asArray, formatDate } from '../utils/format.js'
import { categoryLabels, latest, postImage } from '../utils/helpers.js'
import { postPreviewText } from '../utils/postBlocks.js'
import { sharePost } from '../services/nativeShare.js'
import { hapticLight } from '../services/haptics.js'
import { Detail, Empty, ListItem, LoadingScreen, Section } from '../components/ui.jsx'
import EmojiText from '../components/EmojiText.jsx'
import Composer from './community/Composer.jsx'
import PostContent from './community/PostContent.jsx'

const MAX_THREAD_DEPTH = 3

const ORIGIN = (typeof window !== 'undefined' && window.location?.origin) || 'https://coms.kw.ac.kr'

function matchesQuery(post, query) {
  if (!query) return true
  const haystack = `${post.title || ''} ${postPreviewText(post)} ${post.authorDisplayName || post.authorName || ''}`.toLowerCase()
  return haystack.includes(query)
}

export default function CommunityTab({ posts, selected, comments, loading, openPost, closePost, createPost, createCommentForPost, vote, pollVote, editComment, removeComment, currentUser }) {
  const [writing, setWriting] = useState(false)
  const [comment, setComment] = useState('')
  const [query, setQuery] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyingToId, setReplyingToId] = useState(null)
  const [replyContent, setReplyContent] = useState('')

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
    return latest(posts, 'createdAt').filter((post) => matchesQuery(post, q))
  }, [posts, query])

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
            </div>
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

  return (
    <div className="stack">
      <button type="button" className="button primary" onClick={() => setWriting((value) => !value)}><Plus size={17} />글 작성</button>
      {writing && <Composer onSubmit={async (input) => { await createPost(input); setWriting(false) }} />}
      <div className="search-row"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목·본문·작성자 검색" /></div>
      <Section title={`커뮤니티${query ? ` · ${filtered.length}건` : ''}`}>
        {filtered.map((post) => <ListItem key={post.id} title={post.title} meta={`${categoryLabels[post.category] || '자유'} · 댓글 ${post.commentCount || 0}`} body={postPreviewText(post)} image={postImage(post)} onClick={() => openPost(post.id)} />)}
        {filtered.length === 0 && <Empty text={query ? '검색 결과가 없습니다.' : '커뮤니티 글이 없습니다.'} />}
      </Section>
    </div>
  )
}
