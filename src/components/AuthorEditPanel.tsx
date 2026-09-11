import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Search, UserCheck } from 'lucide-react'
import { listMembers } from '../services/adminApi'
import { asArray } from '../utils/format'
import type { CurrentUser } from '../contract/types'

type MemberItem = {
  id?: unknown
  studentId?: unknown
  name?: string | null
  nickname?: string | null
  generation?: unknown
  [key: string]: unknown
}

type AuthorPayload = { studentId?: string; name?: string; uploaderName?: string }

type AuthorEditPanelProps = {
  currentUser?: CurrentUser | null
  currentName?: string
  directNameKey: 'name' | 'uploaderName'
  onCancel: () => void
  onSubmit: (payload: AuthorPayload) => void | Promise<void>
}

function memberLabel(member: MemberItem) {
  return String(member.name || member.nickname || member.studentId || '이름 없음')
}

function memberMatches(member: MemberItem, query: string) {
  if (!query) return true
  return `${member.name || ''} ${member.nickname || ''} ${member.studentId || ''}`.toLowerCase().includes(query)
}

export default function AuthorEditPanel({ currentUser, currentName = '', directNameKey, onCancel, onSubmit }: AuthorEditPanelProps) {
  const [directName, setDirectName] = useState(currentName)
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<MemberItem[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isAdmin = currentUser?.role === 'ADMIN'

  useEffect(() => {
    if (!isAdmin) return undefined
    let mounted = true
    Promise.resolve()
      .then(() => {
        if (!mounted) return []
        setLoadingMembers(true)
        setError('')
        return listMembers()
      })
      .then((data) => { if (mounted) setMembers(asArray(data)) })
      .catch((err) => { if (mounted) setError(err?.message || '회원 목록을 불러오지 못했습니다.') })
      .finally(() => { if (mounted) setLoadingMembers(false) })
    return () => { mounted = false }
  }, [isAdmin])

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((member) => memberMatches(member, q)).slice(0, 8)
  }, [members, query])

  async function submit(event) {
    event.preventDefault()
    const studentId = selectedMember?.studentId ? String(selectedMember.studentId) : ''
    const name = directName.trim()
    if (!studentId && !name) {
      setError('표시 이름을 입력하거나 회원을 선택해주세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit(studentId ? { studentId } : { [directNameKey]: name })
    } catch (err) {
      setError(err?.message || '작성자 변경에 실패했습니다.')
      return
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form panel" onSubmit={submit}>
      <label>
        표시 이름 직접 변경
        <input
          value={directName}
          onChange={(event) => {
            setDirectName(event.target.value)
            setSelectedMember(null)
          }}
          maxLength={100}
          placeholder="목록에 표시할 이름"
        />
      </label>
      {isAdmin && (
        <div className="stack compact-stack">
          <label>
            실제 회원으로 작성자 재지정
            <span className="search-row">
              <Search size={16} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 또는 학번 검색" />
            </span>
          </label>
          {loadingMembers && <p className="muted">회원 목록을 불러오는 중입니다.</p>}
          {!loadingMembers && filteredMembers.length > 0 && (
            <div className="segments author-member-results">
              {filteredMembers.map((member) => {
                const studentId = String(member.studentId || '')
                const selected = selectedMember && String(selectedMember.studentId || '') === studentId
                return (
                  <button
                    type="button"
                    key={String(member.id || studentId || memberLabel(member))}
                    className={selected ? 'active' : ''}
                    onClick={() => setSelectedMember(member)}
                  >
                    {selected && <UserCheck size={14} aria-hidden="true" />}
                    {memberLabel(member)}{studentId ? ` · ${studentId}` : ''}
                  </button>
                )
              })}
            </div>
          )}
          {selectedMember && (
            <p className="form-warning">
              <AlertTriangle size={15} aria-hidden="true" />
              선택한 회원에게 실제 소유권이 이전됩니다. 표시 이름만 바꾸려면 회원 선택을 해제하고 위 이름만 저장하세요.
              <button type="button" className="link-button" onClick={() => setSelectedMember(null)}>선택 해제</button>
            </p>
          )}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="button-row">
        <button type="button" className="button secondary" onClick={onCancel}>취소</button>
        <button type="submit" className="button primary" disabled={saving || (!selectedMember && !directName.trim())}>
          {saving ? '변경 중...' : '작성자 저장'}
        </button>
      </div>
    </form>
  )
}
