export function asArray(value) {
  return Array.isArray(value) ? value : []
}

export function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

export function plainText(value) {
  if (!value) return ''
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function preview(value, limit = 90) {
  const text = plainText(value)
  if (!text) return '내용 미리보기가 없습니다.'
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

export function generationFromStudentId(studentId) {
  const match = String(studentId || '').match(/^(\d{2})/)
  if (!match) return '확인 필요'
  const entryYear = Number(`20${match[1]}`)
  if (!Number.isFinite(entryYear) || entryYear < 1969) return '확인 필요'
  return `${entryYear - 1969 + 1}기`
}
