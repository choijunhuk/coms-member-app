import { useState, type ChangeEvent } from 'react'
import { Send, Upload, X } from 'lucide-react'
import { WORK_TYPE_OPTIONS } from '../../services/clubEventApi'

const MAX_ENTRY_FILE_SIZE = 25 * 1024 * 1024

type EntrySubmitFormProps = {
  submitting?: boolean
  onSubmit: (meta: Record<string, string>, files: File[]) => void | Promise<void>
  onClose: () => void
}

// Work-submission form for a voting club event. Files go up as ZIP archives
// (same backend constraint as post attachments).
export default function EntrySubmitForm({ submitting, onSubmit, onClose }: EntrySubmitFormProps) {
  const [title, setTitle] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [description, setDescription] = useState('')
  const [workType, setWorkType] = useState('OTHER')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')

  function pickFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked: File[] = Array.from(event.target.files || [])
    event.target.value = ''
    if (!picked.length) return
    if (picked.some((file) => file.size > MAX_ENTRY_FILE_SIZE)) {
      setError('파일 크기는 한 개당 25MB까지 가능합니다.')
      return
    }
    if (picked.some((file) => !/\.zip$/i.test(file.name) && file.type !== 'application/zip')) {
      setError('작품 파일은 ZIP 압축파일만 업로드할 수 있습니다.')
      return
    }
    setError('')
    setFiles((current) => [...current, ...picked])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (title.trim().length < 2 || !files.length) return
    setError('')
    try {
      await onSubmit({ title: title.trim(), authorName: authorName.trim(), description: description.trim(), workType }, files)
    } catch (err) {
      setError(err?.message || '작품 제출 중 오류가 발생했습니다.')
    }
  }

  return (
    <form className="form panel entry-form" onSubmit={handleSubmit}>
      <label>작품 제목<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="작품 제목" /></label>
      <label>작성자 (선택)<input value={authorName} onChange={(event) => setAuthorName(event.target.value)} maxLength={40} placeholder="비우면 내 이름" /></label>
      <label>분류<select value={workType} onChange={(event) => setWorkType(event.target.value)}>{WORK_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>설명 (선택)<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={500} placeholder="작품 설명" /></label>
      <label className="image-picker">
        <Upload size={15} aria-hidden="true" /> {files.length ? `파일 ${files.length}개 첨부됨` : 'ZIP 파일 첨부 (필수, 개당 25MB)'}
        <input type="file" accept=".zip,application/zip" multiple onChange={pickFiles} hidden />
      </label>
      {files.length > 0 && (
        <ul className="attach-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" className="icon-button" onClick={() => setFiles((c) => c.filter((_, i) => i !== index))} aria-label="파일 제거"><X size={14} /></button></li>
          ))}
        </ul>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="button-row">
        <button type="button" className="button secondary" onClick={onClose}>취소</button>
        <button type="submit" className="button primary" disabled={submitting || title.trim().length < 2 || !files.length}>
          <Send size={16} aria-hidden="true" /> {submitting ? '제출 중...' : '작품 제출'}
        </button>
      </div>
    </form>
  )
}
