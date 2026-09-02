import { useEffect, useState } from 'react'
import { Award, FileText, MessageSquare, ThumbsUp } from 'lucide-react'
import { getMemberReputation, listPostsByAuthor } from '../../services/communityApi'
import { displayStudentId, generationLabel } from '../../utils/format'
import { postImage } from '../../utils/helpers'
import { postPreviewText } from '../../utils/postBlocks'
import { Detail, Empty, ListItem, LoadingScreen, Metric, Section } from '../../components/ui'
import type { CommunityPost } from '../../contract/types'

type Reputation = {
  name?: string
  generation?: number | string | null
  tierLabel?: string
  score?: number
  breakdown?: { posts?: number; comments?: number; upvotes?: number }
}

type MemberProfileProps = {
  studentId: string
  // Fallback while posts/reputation load — usually the name tapped to get here.
  initialName?: string
  onBack: () => void
  openPost: (id: unknown) => void
}

// Member profile panel (web parity: /community/members/:studentId) —
// reputation tier/score, activity stats, and the member's authored posts.
export default function MemberProfile({ studentId, initialName, onBack, openPost }: MemberProfileProps) {
  const [reputation, setReputation] = useState<Reputation | null>(null)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // No sync state resets here — the parent remounts this panel per member
  // (key={studentId}), so the initial state already covers "loading".
  useEffect(() => {
    let cancelled = false
    Promise.allSettled([getMemberReputation(studentId), listPostsByAuthor(studentId)]).then(([reputationResult, postsResult]) => {
      if (cancelled) return
      if (reputationResult.status === 'fulfilled') setReputation(reputationResult.value)
      if (postsResult.status === 'fulfilled') setPosts(postsResult.value)
      if (reputationResult.status === 'rejected' && postsResult.status === 'rejected') {
        setError(postsResult.reason?.message || '회원 정보를 불러오지 못했습니다.')
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [studentId])

  const memberName = String(posts[0]?.authorDisplayName || posts[0]?.authorName || reputation?.name || initialName || studentId)
  const breakdown = reputation?.breakdown || {}

  return (
    <Detail title={memberName} meta={`${generationLabel(reputation?.generation, studentId)} · ${displayStudentId(studentId)}`} onBack={onBack}>
      {loading ? <LoadingScreen label="회원 정보를 불러오는 중입니다." /> : (
        <div className="stack">
          {error && <Empty text={error} />}
          {reputation && (
            <div className="panel member-reputation">
              <span className="badge"><Award size={14} aria-hidden="true" /> {reputation.tierLabel || '회원'} · {Number(reputation.score || 0).toLocaleString('ko-KR')}점</span>
              <div className="metric-grid">
                <Metric icon={FileText} label="작성글" value={Number(breakdown.posts || 0).toLocaleString('ko-KR')} />
                <Metric icon={MessageSquare} label="댓글" value={Number(breakdown.comments || 0).toLocaleString('ko-KR')} />
                <Metric icon={ThumbsUp} label="받은 개추" value={Number(breakdown.upvotes || 0).toLocaleString('ko-KR')} />
              </div>
            </div>
          )}
          <Section title={`작성한 글 ${posts.length}`}>
            {posts.map((post) => (
              <ListItem
                key={post.id}
                title={post.title}
                meta={`댓글 ${post.commentCount || 0} · 조회 ${post.viewCount || 0}`}
                body={postPreviewText(post)}
                image={postImage(post)}
                onClick={() => openPost(post.id)}
              />
            ))}
            {posts.length === 0 && !error && <Empty text="작성한 글이 없습니다." />}
          </Section>
        </div>
      )}
    </Detail>
  )
}
