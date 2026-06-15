import { Bell, FileText, MessageCircle, ShieldCheck } from 'lucide-react'
import { downloadUrl } from '../services/archiveApi.js'
import { formatDate, preview } from '../utils/format.js'
import { categoryLabels, fileCategoryLabels, latest, postImage } from '../utils/helpers.js'
import { postPreviewText } from '../utils/postBlocks.js'
import { Empty, ListItem, Metric, Section } from '../components/ui.jsx'

export default function HomeTab({ notices, posts, files, unreadCount, openNotice, openPost, setActiveTab }) {
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
