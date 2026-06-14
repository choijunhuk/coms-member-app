import { useState } from 'react'
import { Eye, Plus, Send, ThumbsDown, ThumbsUp } from 'lucide-react'
import { formatDate } from '../utils/format.js'
import { categoryLabels, latest, postImage } from '../utils/helpers.js'
import { postPreviewText } from '../utils/postBlocks.js'
import { Detail, Empty, ListItem, LoadingScreen, Section } from '../components/ui.jsx'
import Composer from './community/Composer.jsx'
import PostContent from './community/PostContent.jsx'

export default function CommunityTab({ posts, selected, comments, loading, openPost, closePost, createPost, createCommentForPost, vote, pollVote }) {
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
