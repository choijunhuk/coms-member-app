import { stripMarkdown } from './markdown'

export function asArray(value) {
  return Array.isArray(value) ? value : []
}

export function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

// Web posts store sanitized editor HTML, so previews must both strip tags AND
// decode the entities the sanitizer leaves behind (&nbsp;, &amp;, …) — otherwise
// the entity text leaks into list previews. Decoding happens after tag removal,
// and the result is only ever rendered as a React text node, never as HTML.
const NAMED_ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function codePointOrEmpty(code) {
  return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, hex) => codePointOrEmpty(parseInt(hex, 16)))
    .replace(/&#(\d{1,7});/g, (_, dec) => codePointOrEmpty(Number(dec)))
    .replace(/&(nbsp|amp|lt|gt|quot|apos);/g, (_, name) => NAMED_ENTITIES[name])
}

export function plainText(value) {
  if (!value) return ''
  return decodeEntities(String(value).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

// Like plainText, but keeps line structure: <br>/</p>/</div> become newlines and
// author newlines survive. Used where lines still matter — markdown stripping in
// preview() and seeding the edit form (flattening there loses the author's breaks).
export function plainTextLines(value) {
  if (!value) return ''
  const withBreaks = String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    // Paragraph/div boundaries keep a blank line so web-authored paragraph
    // breaks survive the edit-form round trip instead of collapsing forever.
    .replace(/<\/(p|div)>/gi, '\n\n')
    .replace(/<[^>]*>/g, ' ')
  return decodeEntities(withBreaks)
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function preview(value, limit = 90) {
  // stripMarkdown first, while newlines still exist — its line-anchored rules
  // (headings, quotes, list markers) can't match after plainText flattens
  // everything onto one line.
  const text = plainText(stripMarkdown(value == null ? '' : String(value)))
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
