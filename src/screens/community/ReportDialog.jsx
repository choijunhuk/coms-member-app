import { useState } from 'react'
import { AlertTriangle, Send, X } from 'lucide-react'

const REASONS = [
  { id: 'SPAM', label: '스팸/광고' },
  { id: 'ABUSE', label: '비방·욕설' },
  { id: 'PRIVACY', label: '개인정보 노출' },
  { id: 'PROFANITY', label: '음란·혐오 표현' },
  { id: 'MISLEADING', label: '잘못된 정보' },
  { id: 'OTHER', label: '기타' },
]

export default function ReportDialog({ onClose, onSubmit }) {
  const [reason, setReason] = useState('SPAM')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(reason, detail.trim())
      onClose()
    } catch (err) {
      setError(err?.message || '신고 접수 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="panel report-dialog" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="section-title">
          <h2><AlertTriangle size={16} aria-hidden="true" /> 게시글 신고</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="닫기"><X size={14} /></button>
        </div>
        <p className="muted">신고 사유를 선택해주세요. 같은 글은 한 번만 신고할 수 있고, 운영진이 확인합니다.</p>
        <div className="report-reasons">
          {REASONS.map((option) => (
            <label key={option.id} className={`report-reason${reason === option.id ? ' active' : ''}`}>
              <input type="radio" name="report-reason" value={option.id} checked={reason === option.id} onChange={() => setReason(option.id)} />
              {option.label}
            </label>
          ))}
        </div>
        <label>상세 설명 (선택)
          <textarea value={detail} onChange={(event) => setDetail(event.target.value)} rows={3} maxLength={500} placeholder="운영진이 빠르게 판단할 수 있도록 구체적으로 알려주세요." />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="button primary" disabled={submitting}><Send size={16} aria-hidden="true" /> 신고 접수</button>
      </form>
    </div>
  )
}
