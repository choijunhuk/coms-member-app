import { useMemo, useState } from 'react'
import { Eye, Search, ThumbsUp } from 'lucide-react'
import { formatDate, plainText, preview } from '../utils/format.js'
import { useInfiniteList } from '../hooks/useInfiniteList.js'
import { Detail, Empty, ListItem, LoadingScreen, Section } from '../components/ui.jsx'

const NOTICE_CATEGORY_LABELS = {
  GENERAL: '전체',
  RECRUIT: '모집',
  STUDY: '스터디',
  EVENT: '행사',
  NOTICE: '공지',
  PROJECT: '프로젝트',
}

function categoryDisplay(value) {
  if (!value) return null
  return NOTICE_CATEGORY_LABELS[value] || value
}

function comparePinnedThenDate(a, b) {
  const ap = a?.pinned ? 1 : 0
  const bp = b?.pinned ? 1 : 0
  if (ap !== bp) return bp - ap
  const at = new Date(a?.createdAt || 0).getTime()
  const bt = new Date(b?.createdAt || 0).getTime()
  return bt - at
}

export default function NoticesTab({ notices, selected, loading, openNotice, closeNotice }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')

  const availableCategories = useMemo(() => {
    const set = new Set()
    for (const item of notices) if (item?.category) set.add(item.category)
    return ['ALL', ...set]
  }, [notices])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notices
      .filter((notice) => {
        if (category !== 'ALL' && (notice?.category || 'GENERAL') !== category) return false
        if (!q) return true
        const haystack = `${notice.title || ''} ${plainText(notice.content || '')}`.toLowerCase()
        return haystack.includes(q)
      })
      .slice()
      .sort(comparePinnedThenDate)
  }, [notices, query, category])

  const { visible, hasMore, sentinelRef } = useInfiniteList(filtered)

  if (selected) {
    return (
      <Detail title={selected.title} meta={`${categoryDisplay(selected.category) || '공지'} · ${formatDate(selected.createdAt)}`} onBack={closeNotice}>
        {selected.pinned && <span className="badge">중요 공지</span>}
        <div className="stats"><span><Eye size={14} />{selected.viewCount || 0}</span><span><ThumbsUp size={14} />{selected.upvotes || 0}</span></div>
        {loading ? <LoadingScreen label="공지 상세를 불러오는 중입니다." /> : <p className="body-text">{plainText(selected.content)}</p>}
      </Detail>
    )
  }
  return (
    <div className="stack">
      <div className="search-row"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="공지 제목·본문 검색" /></div>
      {availableCategories.length > 2 && (
        <div className="segments">
          {availableCategories.map((value) => (
            <button key={value} type="button" className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>
              {value === 'ALL' ? '전체' : (NOTICE_CATEGORY_LABELS[value] || value)}
            </button>
          ))}
        </div>
      )}
      <Section title={`공지사항${query || category !== 'ALL' ? ` · ${filtered.length}건` : ''}`}>
        {visible.map((notice) => (
          <ListItem
            key={notice.id}
            title={notice.title}
            meta={`${categoryDisplay(notice.category) || '공지'} · ${formatDate(notice.createdAt)}`}
            body={preview(notice.content)}
            pinned={notice.pinned}
            onClick={() => openNotice(notice.id)}
          >
            <div className="stats"><span><Eye size={14} />{notice.viewCount || 0}</span><span><ThumbsUp size={14} />{notice.upvotes || 0}</span></div>
          </ListItem>
        ))}
        {hasMore && <div ref={sentinelRef} className="infinite-sentinel" aria-hidden="true" />}
        {filtered.length === 0 && <Empty text={query || category !== 'ALL' ? '검색 결과가 없습니다.' : '등록된 공지가 없습니다.'} />}
      </Section>
    </div>
  )
}
