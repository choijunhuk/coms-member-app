import { useState } from 'react'
import { Image as ImageIcon, Send, X } from 'lucide-react'
import { categoryLabels } from '../../utils/helpers.js'

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_IMAGES = 6

export default function Composer({ onSubmit }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = title.trim().length >= 2 && content.trim().length >= 2 && !saving

  function pickImages(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
      setError('이미지 크기는 한 장당 8MB까지 가능합니다.')
      event.target.value = ''
      return
    }
    const total = images.length + files.length
    const accepted = files.slice(0, Math.max(0, MAX_IMAGES - images.length))
    if (total > MAX_IMAGES) {
      setError(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`)
    } else {
      setError('')
    }
    const nextPreviews = accepted.map((file) => URL.createObjectURL(file))
    setImages((current) => [...current, ...accepted])
    setPreviews((current) => [...current, ...nextPreviews])
    event.target.value = ''
  }

  function removeImage(index) {
    const url = previews[index]
    if (url) URL.revokeObjectURL(url)
    setImages((current) => current.filter((_, i) => i !== index))
    setPreviews((current) => current.filter((_, i) => i !== index))
  }

  function clearAll() {
    previews.forEach((url) => URL.revokeObjectURL(url))
    setImages([])
    setPreviews([])
  }

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        payload: { title: title.trim(), content: content.trim(), category, anonymousName: '' },
        images,
      })
      setTitle('')
      setContent('')
      clearAll()
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
      <label>내용 (**굵게**, _기울임_, [링크](https://...) 지원)<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} maxLength={5000} /></label>
      <label className="image-picker">
        <ImageIcon size={15} aria-hidden="true" /> {images.length ? `이미지 ${images.length}장 첨부됨 (추가 ${Math.max(0, MAX_IMAGES - images.length)}장 가능)` : `이미지 첨부 (선택, 최대 ${MAX_IMAGES}장)`}
        <input type="file" accept="image/*" multiple onChange={pickImages} hidden />
      </label>
      {previews.length > 0 && (
        <div className="image-preview-grid">
          {previews.map((src, index) => (
            <div className="image-preview" key={src}>
              <img src={src} alt="" />
              <button type="button" className="icon-button" onClick={() => removeImage(index)} aria-label="이미지 제거"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="button primary" disabled={!canSubmit}><Send size={17} aria-hidden="true" />등록</button>
    </form>
  )
}
