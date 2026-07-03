import { useState, type ChangeEvent } from 'react'
import { Film, Image as ImageIcon, ListPlus, Paperclip, Plus, Send, Trash2, X, Youtube } from 'lucide-react'
import { categoryOptionsForUser } from '../../utils/helpers'
import { buildComposerContent, createEmptyPollDraft, normalizedPollOptions, pollDraftStatus } from '../../utils/pollDraft'
import { externalBlockFromUrl } from '../../utils/externalEmbed'
import type { CurrentUser } from '../../contract/types'

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_IMAGES = 6
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const MAX_FILE_SIZE = 25 * 1024 * 1024

type ComposerSubmitInput = {
  payload: { title: string; content: string; category: string; anonymousName: string }
  images: File[]
  videos: File[]
  files: File[]
  // Everything App needs to re-serialize content once media has upload ids.
  extras: { text: string; poll: unknown; embeds: unknown[] }
}

type ComposerProps = {
  onSubmit: (input: ComposerSubmitInput) => void | Promise<void>
  currentUser?: CurrentUser | null
}

export default function Composer({ onSubmit, currentUser }: ComposerProps) {
  const categoryOptions = categoryOptionsForUser(currentUser)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [anonymousName, setAnonymousName] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [embeds, setEmbeds] = useState<{ url: string; block: { kind?: string; [key: string]: unknown } }[]>([])
  const [embedUrl, setEmbedUrl] = useState('')
  const [pollDraft, setPollDraft] = useState(createEmptyPollDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isAnonymous = category === 'ANONYMOUS'
  const pollStatus = pollDraftStatus(pollDraft)
  const pollOptions = normalizedPollOptions(pollDraft.options)
  const canSubmit = title.trim().length >= 2 && content.trim().length >= 2 && pollStatus.valid && !saving

  function pickImages(event: ChangeEvent<HTMLInputElement>) {
    const files: File[] = Array.from(event.target.files || [])
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
    setVideos([])
    setFiles([])
    setEmbeds([])
    setEmbedUrl('')
  }

  function pickVideos(event: ChangeEvent<HTMLInputElement>) {
    const picked: File[] = Array.from(event.target.files || [])
    event.target.value = ''
    if (!picked.length) return
    if (picked.some((file) => file.size > MAX_VIDEO_SIZE)) {
      setError('영상 크기는 한 개당 100MB까지 가능합니다.')
      return
    }
    setError('')
    setVideos((current) => [...current, ...picked])
  }

  function pickFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked: File[] = Array.from(event.target.files || [])
    event.target.value = ''
    if (!picked.length) return
    if (picked.some((file) => file.size > MAX_FILE_SIZE)) {
      setError('첨부파일 크기는 한 개당 25MB까지 가능합니다.')
      return
    }
    // Backend only accepts ZIP archives for post file attachments.
    if (picked.some((file) => !/\.zip$/i.test(file.name) && file.type !== 'application/zip')) {
      setError('첨부파일은 ZIP 압축파일만 업로드할 수 있습니다.')
      return
    }
    setError('')
    setFiles((current) => [...current, ...picked])
  }

  function addEmbed() {
    const block = externalBlockFromUrl(embedUrl)
    if (!block) {
      setError('유효한 링크(https://...)를 입력해주세요.')
      return
    }
    setError('')
    setEmbeds((current) => [...current, { url: embedUrl.trim(), block }])
    setEmbedUrl('')
  }

  function setPollEnabled(enabled) {
    setPollDraft((current) => ({ ...current, enabled }))
  }

  function setPollQuestion(question) {
    setPollDraft((current) => ({ ...current, question }))
  }

  function setPollOption(index, value) {
    setPollDraft((current) => ({
      ...current,
      options: current.options.map((option, i) => (i === index ? value : option)),
    }))
  }

  function addPollOption() {
    setPollDraft((current) => (
      current.options.length >= 10 ? current : { ...current, options: [...current.options, ''] }
    ))
  }

  function removePollOption(index) {
    setPollDraft((current) => {
      if (current.options.length <= 2) return current
      return { ...current, options: current.options.filter((_, i) => i !== index) }
    })
  }

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        payload: {
          // content here excludes video/file blocks — those need upload ids the
          // App fills in after creating the post (App re-builds content via extras).
          title: title.trim(),
          content: buildComposerContent({ text: content, poll: pollDraft, media: embeds.map((entry) => entry.block) }),
          category,
          anonymousName: isAnonymous ? anonymousName.trim() : '',
        },
        images,
        videos,
        files,
        extras: { text: content, poll: pollDraft, embeds: embeds.map((entry) => entry.block) },
      })
      setTitle('')
      setContent('')
      setAnonymousName('')
      setPollDraft(createEmptyPollDraft())
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
      <label>분류<select value={category} onChange={(event) => setCategory(event.target.value)}>{categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {isAnonymous && (
        <label>표시 이름 (비워두면 "익명")
          <input value={anonymousName} onChange={(event) => setAnonymousName(event.target.value)} maxLength={20} placeholder="예: 익명 회원" />
        </label>
      )}
      <label>내용 (**굵게**, _기울임_, [링크](https://...) 지원)<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} maxLength={5000} /></label>
      <section className="poll-composer">
        <label className="toggle-row">
          <input type="checkbox" checked={pollDraft.enabled} onChange={(event) => setPollEnabled(event.target.checked)} />
          <span><ListPlus size={15} aria-hidden="true" />투표 추가</span>
        </label>
        {pollDraft.enabled && (
          <div className="poll-composer-body">
            <label>투표 질문<input value={pollDraft.question} onChange={(event) => setPollQuestion(event.target.value)} maxLength={160} placeholder="예: 다음 모임 시간은?" /></label>
            <div className="poll-option-editor">
              {pollDraft.options.map((option, index) => (
                <label key={index} className="poll-option-row">
                  <span>선택 {index + 1}</span>
                  <input value={option} onChange={(event) => setPollOption(index, event.target.value)} maxLength={80} placeholder={index === 0 ? '찬성' : index === 1 ? '반대' : '선택지'} />
                  <button type="button" className="icon-button" onClick={() => removePollOption(index)} disabled={pollDraft.options.length <= 2} aria-label={`선택 ${index + 1} 제거`}><Trash2 size={13} /></button>
                </label>
              ))}
            </div>
            <button type="button" className="button secondary compact" onClick={addPollOption} disabled={pollDraft.options.length >= 10}><Plus size={15} aria-hidden="true" />선택지 추가</button>
            {!pollStatus.valid && <p className="form-error">{pollStatus.reason}</p>}
            {pollStatus.valid && (
              <div className="poll-composer-preview" aria-label="투표 미리보기">
                <div className="poll-head">
                  <strong>{pollDraft.question.trim()}</strong>
                  <span>미리보기</span>
                </div>
                <div className="poll">
                  {pollOptions.map((label, index) => (
                    <button type="button" key={`${label}-${index}`} disabled>
                      <span className="poll-label">{label}</span>
                      <span>0표 · 0%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      <label className="image-picker">
        <ImageIcon size={15} aria-hidden="true" /> {images.length ? `이미지 ${images.length}장 첨부됨 (추가 ${Math.max(0, MAX_IMAGES - images.length)}장 가능)` : `이미지 첨부 (선택, 최대 ${MAX_IMAGES}장)`}
        <input type="file" accept="image/*" multiple onChange={pickImages} hidden />
      </label>
      {previews.length > 0 && (
        <div className="image-preview-grid">
          {previews.map((src, index) => (
            <div className="image-preview" key={src}>
              <img src={src} alt="" loading="lazy" decoding="async" />
              <button type="button" className="icon-button" onClick={() => removeImage(index)} aria-label="이미지 제거"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <label className="image-picker">
        <Film size={15} aria-hidden="true" /> {videos.length ? `영상 ${videos.length}개 첨부됨` : '영상 첨부 (선택, 개당 100MB)'}
        <input type="file" accept="video/*" multiple onChange={pickVideos} hidden />
      </label>
      {videos.length > 0 && (
        <ul className="attach-list">
          {videos.map((file, index) => (
            <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" className="icon-button" onClick={() => setVideos((c) => c.filter((_, i) => i !== index))} aria-label="영상 제거"><X size={14} /></button></li>
          ))}
        </ul>
      )}
      <label className="image-picker">
        <Paperclip size={15} aria-hidden="true" /> {files.length ? `파일 ${files.length}개 첨부됨` : 'ZIP 파일 첨부 (선택, 개당 25MB)'}
        <input type="file" accept=".zip,application/zip" multiple onChange={pickFiles} hidden />
      </label>
      {files.length > 0 && (
        <ul className="attach-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" className="icon-button" onClick={() => setFiles((c) => c.filter((_, i) => i !== index))} aria-label="파일 제거"><X size={14} /></button></li>
          ))}
        </ul>
      )}
      <div className="embed-picker">
        <label><Youtube size={15} aria-hidden="true" /> 유튜브 · 링크 첨부</label>
        <div className="inline-form">
          <input value={embedUrl} onChange={(event) => setEmbedUrl(event.target.value)} placeholder="https://youtu.be/... 또는 링크" inputMode="url" />
          <button type="button" className="button secondary compact" onClick={addEmbed} disabled={!embedUrl.trim()}>추가</button>
        </div>
      </div>
      {embeds.length > 0 && (
        <ul className="attach-list">
          {embeds.map((entry, index) => (
            <li key={`${entry.url}-${index}`}><span>{entry.block?.kind === 'youtube' ? '▶ ' : '🔗 '}{entry.url}</span><button type="button" className="icon-button" onClick={() => setEmbeds((c) => c.filter((_, i) => i !== index))} aria-label="링크 제거"><X size={14} /></button></li>
          ))}
        </ul>
      )}
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="button primary" disabled={!canSubmit}><Send size={17} aria-hidden="true" />등록</button>
    </form>
  )
}
