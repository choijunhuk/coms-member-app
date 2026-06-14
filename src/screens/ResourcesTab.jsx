import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { downloadUrl } from '../services/archiveApi.js'
import { asArray, formatDate } from '../utils/format.js'
import { fileCategoryLabels, latest } from '../utils/helpers.js'
import { Empty, ListItem, Section } from '../components/ui.jsx'

export default function ResourcesTab({ files }) {
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
