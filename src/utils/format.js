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

// COM's 1기 = 1967년 입학생 기준. 학번은 10자리, 앞 4자리가 입학연도.
const COMS_FOUNDING_YEAR = 1967

export function generationFromStudentId(studentId) {
  const match = String(studentId || '').match(/^(\d{4})/)
  if (!match) return '기수 미상'
  const entryYear = Number(match[1])
  if (!Number.isFinite(entryYear) || entryYear < COMS_FOUNDING_YEAR) return '기수 미상'
  return `${entryYear - COMS_FOUNDING_YEAR + 1}기`
}
