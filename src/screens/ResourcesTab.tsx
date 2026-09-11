import { useMemo, useState } from 'react'
import { Download, Eye, Paperclip, Pencil, Plus, Search, ThumbsUp, Trash2, Upload, UserPen, X } from 'lucide-react'
import { useTwemoji } from '../hooks/useTwemoji'
import { createArchivePosts, deleteFile, downloadUrl, inlineUrl, updateArchiveAuthor, updateArchiveFile, voteFile } from '../services/archiveApi'
import { confirmDialog } from '../components/ConfirmDialog'
import { ArchiveCategory } from '../contract/enums'
import { asArray, formatDate } from '../utils/format'
import { canEditArchiveFile, canModerateCommunity, fileCategoryLabels, latest } from '../utils/helpers'
import { looksLikeHtml, renderMarkdownToHtml, renderSafeHtml } from '../utils/markdown'
import { postBodyText, postPreviewText, replaceContentTextPreservingBlocks } from '../utils/postBlocks'
import { readRecentResourceIds, rememberResource } from '../utils/resourceHistory'
import AuthorEditPanel from '../components/AuthorEditPanel'
import { Detail, Empty, ListItem, Section } from '../components/ui'
import type { ArchiveFile, CurrentUser } from '../contract/types'

// Descriptions written through the archive-post flow arrive as block JSON —
// rendered raw they read as `[{"type":"text",...`. Normalize both list preview
// and detail body through the same block-aware helpers the community uses.
function descriptionPreview(file) {
  return file.description ? postPreviewText({ content: file.description }) : (file.originalName || '')
}

function descriptionBodyHtml(file) {
  const raw = String(file.description || '')
  if (!raw) return ''
  if (looksLikeHtml(raw)) return renderSafeHtml(raw)
  const text = postBodyText({ content: raw })
  return text ? renderMarkdownToHtml(text) : ''
}

const UPLOAD_CATEGORY_OPTIONS = Object.values(ArchiveCategory)

function UploadForm({ onDone }: { onDone: (message: string) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploadCategory, setUploadCategory] = useState('GENERAL')
  const [picked, setPicked] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addFiles(event) {
    const files = Array.from(event.target.files || []) as File[]
    if (files.length) setPicked((prev) => [...prev, ...files])
    // Reset so re-selecting the same file fires onChange again.
    event.target.value = ''
  }

  async function submit(event) {
    event.preventDefault()
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    if (picked.length === 0) { setError('파일을 선택해주세요.'); return }
    setSaving(true)
    setError('')
    try {
      const results = await createArchivePosts(picked, {
        title: title.trim(),
        description: description.trim(),
        category: uploadCategory,
      })
      const succeeded = results.filter((result) => result.ok)
      const failed = results.filter((result) => !result.ok)
      if (succeeded.length === 0) {
        setError(failed[0]?.error?.message || '업로드 중 오류가 발생했습니다.')
        return
      }
      onDone(failed.length
        ? `자료 ${succeeded.length}건 업로드 완료 (실패: ${failed.map((result) => result.file.name).join(', ')})`
        : `자료 ${succeeded.length}건이 업로드되었습니다.`)
    } catch (err) {
      setError(err.message || '업로드 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form panel" onSubmit={submit}>
      <label>제목<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></label>
      <label>분류<select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)}>{UPLOAD_CATEGORY_OPTIONS.map((value) => <option key={value} value={value}>{fileCategoryLabels[value] || value}</option>)}</select></label>
      <label>설명 (선택)<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={2000} /></label>
      <label className="image-picker">
        <Paperclip size={15} aria-hidden="true" /> {picked.length ? `파일 ${picked.length}개 선택됨` : '파일 선택 (여러 개 가능)'}
        <input type="file" multiple onChange={addFiles} hidden />
      </label>
      {picked.length > 0 && (
        <ul className="attach-list">
          {picked.map((file, index) => (
            <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" className="icon-button" onClick={() => setPicked((prev) => prev.filter((_, i) => i !== index))} aria-label="파일 제거"><X size={14} /></button></li>
          ))}
        </ul>
      )}
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="button primary" disabled={saving || !title.trim() || picked.length === 0}><Upload size={16} aria-hidden="true" />{saving ? '업로드 중...' : '업로드'}</button>
    </form>
  )
}

type ResourcesTabProps = {
  files: ArchiveFile[]
  currentUser?: CurrentUser | null
  // Called after any mutation (upload, author change, delete) so the parent can
  // refetch — the list is owned by the dashboard query, not by this screen.
  onChanged?: () => void
}

export default function ResourcesTab({ files, currentUser, onChanged }: ResourcesTabProps) {
  // Re-renders once the shared Twemoji parser finishes loading, so shortcodes
  // in a file description (rendered via descriptionBodyHtml below) twemoji-ify
  // even if this is the first screen to need them.
  useTwemoji()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  // 자료실 관리는 부회장 이상 (web roleAccess.canManageArchive와 같은 등급).
  const canManageArchive = canModerateCommunity(currentUser)
  const [archiveBusy, setArchiveBusy] = useState('')
  const [archiveError, setArchiveError] = useState('')
  const [editingArchive, setEditingArchive] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDescriptionSeed, setEditDescriptionSeed] = useState('')
  const [editOriginalDescription, setEditOriginalDescription] = useState('')
  const [editCategory, setEditCategory] = useState('GENERAL')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [authorEditing, setAuthorEditing] = useState(false)
  const [voteState, setVoteState] = useState<Record<string, ArchiveFile>>({})
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecentResourceIds())
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
  // Store the id and re-derive from `files` each render so a background
  // refresh updates the open detail (and a removed file closes it).
  const [selectedId, setSelectedId] = useState<ArchiveFile['id'] | null>(null)
  const selected = selectedId === null ? null : (asArray(files).find((file) => file.id === selectedId) ?? null)
  const setSelected = (file: ArchiveFile | null) => setSelectedId(file ? file.id : null)
  const downloadFile = (file) => {
    rememberResource(file.id)
    setRecentIds(readRecentResourceIds())
    window.open(downloadUrl(file.id, file), '_blank', 'noopener,noreferrer')
  }
  const statsFor = (file) => voteState[file.id] || file
  function startArchiveEdit(file) {
    const originalDescription = String(file.description || '')
    const descriptionSeed = postBodyText({ content: originalDescription })
    setEditTitle(String(file.title || ''))
    setEditDescription(descriptionSeed)
    setEditDescriptionSeed(descriptionSeed)
    setEditOriginalDescription(originalDescription)
    setEditCategory(String(file.category || 'GENERAL'))
    setEditFile(null)
    setArchiveError('')
    setEditingArchive(true)
  }
  async function submitArchiveEdit(event) {
    event.preventDefault()
    if (!selected || !editTitle.trim()) return
    setArchiveBusy('edit')
    setArchiveError('')
    try {
      await updateArchiveFile(selected.id, {
        title: editTitle.trim(),
        description: editDescription.trim() === editDescriptionSeed
          ? editOriginalDescription
          : replaceContentTextPreservingBlocks(editOriginalDescription, editDescription),
        category: editCategory,
        file: editFile,
      })
      setEditingArchive(false)
      setEditFile(null)
      onChanged?.()
    } catch (error) {
      setArchiveError(error?.message || '자료 수정에 실패했습니다.')
    } finally {
      setArchiveBusy('')
    }
  }
  async function changeArchiveAuthor(file, payload) {
    setArchiveBusy('author')
    setArchiveError('')
    try {
      await updateArchiveAuthor(file.id, payload)
      setAuthorEditing(false)
      onChanged?.()
    } catch (error) {
      setArchiveError(error?.message || '작성자 변경에 실패했습니다.')
    } finally {
      setArchiveBusy('')
    }
  }
  async function removeArchiveFile(file) {
    if (!(await confirmDialog({ message: '이 자료를 삭제할까요? 되돌릴 수 없습니다.', tone: 'danger', confirmText: '삭제' }))) return
    setArchiveBusy('delete')
    setArchiveError('')
    try {
      await deleteFile(file.id)
      setSelectedId(null)
      onChanged?.()
    } catch (error) {
      setArchiveError(error?.message || '자료 삭제에 실패했습니다.')
    } finally {
      setArchiveBusy('')
    }
  }
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

  if (selected) {
    const stats = statsFor(selected)
    const bodyHtml = descriptionBodyHtml(selected)
    const canEditSelected = canEditArchiveFile(currentUser, selected)
    const canChangeAuthor = canManageArchive
    return (
      <div className="stack">
        <Detail
          title={selected.title}
          meta={`${fileCategoryLabels[selected.category] || '일반'} · ${formatDate(selected.uploadedAt)}`}
          onBack={() => setSelected(null)}
        >
          {editingArchive ? (
            <form className="form panel" onSubmit={submitArchiveEdit}>
              <label>제목<input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={80} /></label>
              <label>분류<select value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>{UPLOAD_CATEGORY_OPTIONS.map((value) => <option key={value} value={value}>{fileCategoryLabels[value] || value}</option>)}</select></label>
              <label>설명 (선택)<textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={4} maxLength={2000} /></label>
              <label className="image-picker">
                <Paperclip size={15} aria-hidden="true" /> {editFile ? editFile.name : '파일 교체 (선택)'}
                <input type="file" onChange={(event) => setEditFile(event.target.files?.[0] || null)} hidden />
              </label>
              {editFile && <p className="muted">새 파일로 교체됩니다. 선택하지 않으면 기존 파일을 유지합니다.</p>}
              <div className="button-row">
                <button type="button" className="button secondary" onClick={() => setEditingArchive(false)}>취소</button>
                <button type="submit" className="button primary" disabled={archiveBusy === 'edit' || !editTitle.trim()}>{archiveBusy === 'edit' ? '저장 중...' : '수정 저장'}</button>
              </div>
            </form>
          ) : (
            bodyHtml
              ? <div className="body-text web-post" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              : <p className="muted">설명이 없습니다.</p>
          )}
          <div className="button-row">
            <button type="button" className="button primary compact" onClick={() => downloadFile(selected)}>
              <Download size={15} aria-hidden="true" /> {selected.originalName || '파일 다운로드'}
            </button>
            <button type="button" className="button secondary compact" onClick={() => window.open(inlineUrl(selected.id, selected), '_blank', 'noopener,noreferrer')}>
              <Eye size={15} aria-hidden="true" /> 바로 보기
            </button>
            {canEditSelected && !editingArchive && (
              <button type="button" className="button secondary compact" onClick={() => startArchiveEdit(selected)} disabled={Boolean(archiveBusy)}>
                <Pencil size={15} aria-hidden="true" /> 수정
              </button>
            )}
            {canChangeAuthor && (
              <button type="button" className="button secondary compact" onClick={() => setAuthorEditing((value) => !value)} disabled={Boolean(archiveBusy)}>
                <UserPen size={15} aria-hidden="true" /> 작성자 변경
              </button>
            )}
            {canManageArchive && (
              <button type="button" className="button danger compact" onClick={() => removeArchiveFile(selected)} disabled={Boolean(archiveBusy)}>
                <Trash2 size={15} aria-hidden="true" /> 삭제
              </button>
            )}
          </div>
          {authorEditing && (
            <AuthorEditPanel
              currentUser={currentUser}
              currentName={String(selected.uploaderName || selected.uploadedBy || '')}
              directNameKey="uploaderName"
              onCancel={() => setAuthorEditing(false)}
              onSubmit={(payload) => changeArchiveAuthor(selected, payload)}
            />
          )}
          {archiveError && <p className="form-error">{archiveError}</p>}
          <div className="stats">
            <span><Eye size={14} />{stats.viewCount || 0}</span>
            <span
              role="button"
              tabIndex={0}
              className={stats.myVote ? 'voted' : ''}
              onClick={() => toggleVote(selected)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleVote(selected) } }}
            ><ThumbsUp size={14} />{stats.upvotes || 0}</span>
          </div>
        </Detail>
      </div>
    )
  }

  return (
    <div className="stack">
      <button type="button" className="button primary" onClick={() => setUploading((value) => !value)}><Plus size={17} />자료 올리기</button>
      {uploading && (
        <UploadForm onDone={(message) => {
          setUploading(false)
          setUploadMessage(message)
          onChanged?.()
        }} />
      )}
      {uploadMessage && <div className="offline-banner" role="status">{uploadMessage}<button type="button" className="link-button" onClick={() => setUploadMessage('')}>닫기</button></div>}
      <div className="search-row"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="자료 검색" /></div>
      <div className="segments">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item === 'ALL' ? '전체' : fileCategoryLabels[item] || item}</button>)}</div>
      {recentFiles.length > 0 && (
        <Section title="최근 다운로드">
          {recentFiles.map((file) => <ListItem key={file.id} title={file.title} meta={fileCategoryLabels[file.category] || '일반'} body={file.originalName} onClick={() => downloadFile(file)}><span className="media-chip"><Download size={14} />다시 열기</span></ListItem>)}
        </Section>
      )}
      <Section title="자료실">
        {filtered.map((file) => {
          const stats = statsFor(file)
          return (
            <ListItem key={file.id} title={file.title} meta={`${fileCategoryLabels[file.category] || '일반'} · ${formatDate(file.uploadedAt)}`} body={descriptionPreview(file)} onClick={() => setSelected(file)}>
              <span className="media-chip"><Download size={14} />{file.originalName || '첨부파일'}</span>
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
