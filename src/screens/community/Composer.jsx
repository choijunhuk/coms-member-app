import { useState } from 'react'
import { Send } from 'lucide-react'
import { categoryLabels } from '../../utils/helpers.js'

export default function Composer({ onSubmit }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = title.trim().length >= 2 && content.trim().length >= 2 && !saving

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      await onSubmit({ title: title.trim(), content: content.trim(), category, anonymousName: '' })
      setTitle('')
      setContent('')
    } catch (err) {
      setError(err.message || '글 작성 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form panel" onSubmit={submit}>
      <label>제목<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></label>
      <label>분류<select value={category} onChange={(event) => setCategory(event.target.value)}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>내용<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} maxLength={5000} /></label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="button primary" disabled={!canSubmit}><Send size={17} aria-hidden="true" />등록</button>
    </form>
  )
}
