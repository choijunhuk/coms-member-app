const MAX_OPTIONS = 10

export function createEmptyPollDraft() {
  return {
    enabled: false,
    question: '',
    options: ['', ''],
  }
}

export function normalizedPollOptions(options) {
  return (Array.isArray(options) ? options : [])
    .map((option) => String(option || '').trim())
    .filter(Boolean)
    .slice(0, MAX_OPTIONS)
}

export function pollDraftStatus(poll) {
  if (!poll?.enabled) return { valid: true, reason: '' }
  if (!String(poll.question || '').trim()) return { valid: false, reason: '투표 질문을 입력해주세요.' }
  if (normalizedPollOptions(poll.options).length < 2) return { valid: false, reason: '투표 선택지는 2개 이상 필요합니다.' }
  return { valid: true, reason: '' }
}

export function buildPollBlock(poll, idSeed = '') {
  const status = pollDraftStatus(poll)
  if (!status.valid) return null
  return {
    type: 'poll',
    pollId: idSeed || `poll-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    question: String(poll.question || '').trim(),
    options: normalizedPollOptions(poll.options).map((label) => ({ label })),
  }
}

export function buildComposerContent({ text, poll, idSeed = '' }) {
  const normalizedText = String(text || '').trim()
  if (!poll?.enabled) return normalizedText
  const pollBlock = buildPollBlock(poll, idSeed)
  if (!pollBlock) return normalizedText
  return JSON.stringify([
    { type: 'text', content: normalizedText },
    pollBlock,
  ])
}
