import { useState } from 'react'
import { Image as ImageIcon, Send, X } from 'lucide-react'
import { categoryLabels } from '../../utils/helpers.js'

export default function Composer({ onSubmit }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = title.trim().length >= 2 && content.trim().length >= 2 && !saving

  function pickImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      setError('이미지 크기는 8MB까지 가능합니다.')
      event.target.value = ''
      return
    }
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview)
    setImage(null)
    setPreview('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        payload: { title: title.trim(), content: content.trim(), category, anonymousName: '' },
        image,
      })
      setTitle('')
      setContent('')
      clearImage()
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
      <label className="image-picker">
        <ImageIcon size={15} aria-hidden="true" /> {image ? image.name : '이미지 첨부 (선택)'}
        <input type="file" accept="image/*" onChange={pickImage} hidden />
      </label>
      {preview && (
        <div className="image-preview">
          <img src={preview} alt="" />
          <button type="button" className="icon-button" onClick={clearImage} aria-label="이미지 제거"><X size={14} /></button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="button primary" disabled={!canSubmit}><Send size={17} aria-hidden="true" />등록</button>
    </form>
  )
}
