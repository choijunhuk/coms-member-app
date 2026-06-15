import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { formatDate, plainText, preview } from '../utils/format.js'
import { latest } from '../utils/helpers.js'
import { Detail, Empty, ListItem, LoadingScreen, Section } from '../components/ui.jsx'

export default function NoticesTab({ notices, selected, loading, openNotice, closeNotice }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return latest(notices, 'createdAt').filter((notice) => {
      if (!q) return true
      const haystack = `${notice.title || ''} ${plainText(notice.content || '')}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [notices, query])

  if (selected) {
    return (
      <Detail title={selected.title} meta={formatDate(selected.createdAt)} onBack={closeNotice}>
        {selected.pinned && <span className="badge">중요 공지</span>}
        {loading ? <LoadingScreen label="공지 상세를 불러오는 중입니다." /> : <p className="body-text">{plainText(selected.content)}</p>}
      </Detail>
    )
  }
  return (
    <div className="stack">
      <div className="search-row"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="공지 제목·본문 검색" /></div>
      <Section title={`공지사항${query ? ` · ${filtered.length}건` : ''}`}>
        {filtered.map((notice) => <ListItem key={notice.id} title={notice.title} meta={formatDate(notice.createdAt)} body={preview(notice.content)} pinned={notice.pinned} onClick={() => openNotice(notice.id)} />)}
        {filtered.length === 0 && <Empty text={query ? '검색 결과가 없습니다.' : '등록된 공지가 없습니다.'} />}
      </Section>
    </div>
  )
}
