import { useMemo, useState } from 'react'
import { Eye, Pin, PinOff, Search, ThumbsUp, Trash2, UserPen } from 'lucide-react'
import { confirmDialog, promptDialog } from '../components/ConfirmDialog'
import { formatDate, plainText } from '../utils/format'
import { canManageContent, isAdminUser } from '../utils/helpers'
import { contentPreview } from '../utils/postBlocks'
import { useInfiniteList } from '../hooks/useInfiniteList'
import { Detail, Empty, ListItem, LoadingScreen, Section } from '../components/ui'
import PostContent from './community/PostContent'
import type { CurrentUser, Notice } from '../contract/types'

const NOTICE_CATEGORY_LABELS: Record<string, string> = {
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

type NoticesTabProps = {
  notices: Notice[]
  selected?: Notice | null
  loading?: boolean
  openNotice: (id: unknown) => void
  closeNotice: () => void
  voteNotice?: (value: number) => void | Promise<void>
  currentUser?: CurrentUser | null
  pinNotice?: (pinned: boolean) => void | Promise<void>
  deleteNotice?: () => void | Promise<void>
  updateNoticeAuthor?: (name: string) => void | Promise<void>
}

export default function NoticesTab({ notices, selected, loading, openNotice, closeNotice, voteNotice, currentUser, pinNotice, deleteNotice, updateNoticeAuthor }: NoticesTabProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [voting, setVoting] = useState(false)
  const [voteError, setVoteError] = useState('')
  // One busy flag for the officer actions: they all mutate the same notice, so
  // they must not run concurrently (a pin racing a delete leaves a dead detail).
  const [officerBusy, setOfficerBusy] = useState('')
  const [officerError, setOfficerError] = useState('')

  // 임원 이상: 고정/삭제. 회장: 작성자 변경 (web Notices.tsx와 같은 게이트).
  const canManageNotice = canManageContent(currentUser)
  const canChangeAuthor = isAdminUser(currentUser)

  async function runOfficerAction(kind, action) {
    if (officerBusy) return
    setOfficerError('')
    setOfficerBusy(kind)
    try {
      await action()
    } catch (error) {
      setOfficerError(error?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setOfficerBusy('')
    }
  }

  async function togglePin() {
    if (!pinNotice || !selected) return
    await runOfficerAction('pin', () => pinNotice(!selected.pinned))
  }

  async function removeNotice() {
    if (!deleteNotice) return
    if (!(await confirmDialog({ message: '이 공지를 삭제할까요? 되돌릴 수 없습니다.', tone: 'danger', confirmText: '삭제' }))) return
    await runOfficerAction('delete', () => deleteNotice())
  }

  async function changeAuthor() {
    if (!updateNoticeAuthor || !selected) return
    const name = await promptDialog({
      message: '공지에 표시할 작성자 이름을 입력하세요.',
      prompt: { defaultValue: String(selected.author || ''), placeholder: '작성자 이름', maxLength: 100 },
      confirmText: '변경',
    })
    if (!name) return
    await runOfficerAction('author', () => updateNoticeAuthor(name))
  }

  async function submitVote() {
    if (!voteNotice || voting) return
    setVoteError('')
    setVoting(true)
    try {
      await voteNotice(1)
    } catch (error) {
      setVoteError(error?.message || '추천에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setVoting(false)
    }
  }

  const availableCategories = useMemo(() => {
    const set = new Set<string>()
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
        {loading ? <LoadingScreen label="공지 상세를 불러오는 중입니다." /> : <PostContent post={selected} pollVote={() => {}} />}
        {voteNotice && (
          <div className="button-row">
            <button type="button" className="button secondary" onClick={submitVote} disabled={voting}>
              <ThumbsUp size={16} aria-hidden="true" /> {voting ? '추천하는 중...' : '추천'}
            </button>
          </div>
        )}
        {voteError && <p className="form-error">{voteError}</p>}
        {(canManageNotice || canChangeAuthor) && (
          <div className="button-row">
            {canManageNotice && pinNotice && (
              <button type="button" className="button secondary" onClick={togglePin} disabled={Boolean(officerBusy)}>
                {selected.pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
                {selected.pinned ? '고정 해제' : '상단 고정'}
              </button>
            )}
            {canChangeAuthor && updateNoticeAuthor && (
              <button type="button" className="button secondary" onClick={changeAuthor} disabled={Boolean(officerBusy)}>
                <UserPen size={16} aria-hidden="true" /> 작성자 변경
              </button>
            )}
            {canManageNotice && deleteNotice && (
              <button type="button" className="button danger" onClick={removeNotice} disabled={Boolean(officerBusy)}>
                <Trash2 size={16} aria-hidden="true" /> 삭제
              </button>
            )}
          </div>
        )}
        {officerError && <p className="form-error">{officerError}</p>}
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
            body={contentPreview(notice.content)}
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
