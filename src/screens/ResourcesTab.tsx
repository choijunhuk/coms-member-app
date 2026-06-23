import { useMemo, useState } from 'react'
import { Download, Eye, Search, ThumbsUp } from 'lucide-react'
import { downloadUrl, voteFile } from '../services/archiveApi'
import { asArray, formatDate } from '../utils/format'
import { fileCategoryLabels, latest } from '../utils/helpers'
import { readRecentResourceIds, rememberResource } from '../utils/resourceHistory'
import { Empty, ListItem, Section } from '../components/ui'

export default function ResourcesTab({ files }: any) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [voteState, setVoteState] = useState({})
  const [recentIds, setRecentIds] = useState(() => readRecentResourceIds())
  const categories = useMemo(() => ['ALL', ...new Set(asArray(files).map((file) => file.category || 'GENERAL'))], [files])
  const recentFiles = useMemo(() => {
    const byId = new Map(asArray(files).map((file) => [String(file.id), file]))
    return recentIds.map((id) => byId.get(id)).filter(Boolean)
  }, [files, recentIds])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return latest(files, 'uploadedAt').filter((file) => {
      const text = `${file.title || ''} ${file.description || ''} ${file.originalName || ''}`.toLowerCase()
      return (category === 'ALL' || (file.category || 'GENERAL') === category) && (!q || text.includes(q))
    })
  }, [category, files, query])
  const openFile = (file) => {
    rememberResource(file.id)
    setRecentIds(readRecentResourceIds())
    window.open(downloadUrl(file.id), '_blank', 'noopener,noreferrer')
  }
  const statsFor = (file) => voteState[file.id] || file
  const toggleVote = async (file) => {
    const current = statsFor(file)
    const nextValue = current.myVote ? 0 : 1
    try {
      const updated = await voteFile(file.id, nextValue)
      setVoteState((prev) => ({ ...prev, [file.id]: updated }))
    } catch {
      // ignore vote failures; UI stays unchanged
    }
  }

  return (
    <div className="stack">
      <div className="search-row"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="자료 검색" /></div>
      <div className="segments">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item === 'ALL' ? '전체' : fileCategoryLabels[item] || item}</button>)}</div>
      {recentFiles.length > 0 && (
        <Section title="최근 다운로드">
          {recentFiles.map((file) => <ListItem key={file.id} title={file.title} meta={fileCategoryLabels[file.category] || '일반'} body={file.originalName} onClick={() => openFile(file)}><span className="media-chip"><Download size={14} />다시 열기</span></ListItem>)}
        </Section>
      )}
      <Section title="자료실">
        {filtered.map((file) => {
          const stats = statsFor(file)
          return (
            <ListItem key={file.id} title={file.title} meta={`${fileCategoryLabels[file.category] || '일반'} · ${formatDate(file.uploadedAt)}`} body={file.description || file.originalName} onClick={() => openFile(file)}>
              <span className="media-chip"><Download size={14} />다운로드</span>
              <div className="stats">
                <span><Eye size={14} />{stats.viewCount || 0}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className={stats.myVote ? 'voted' : ''}
                  onClick={(event) => { event.stopPropagation(); toggleVote(file) }}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); toggleVote(file) } }}
                ><ThumbsUp size={14} />{stats.upvotes || 0}</span>
              </div>
            </ListItem>
          )
        })}
        {filtered.length === 0 && <Empty text="조건에 맞는 자료가 없습니다." />}
      </Section>
    </div>
  )
}
