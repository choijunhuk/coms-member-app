export function networkBannerMessage({ online = true, slow = false } = {}) {
  if (!online) return '오프라인 — 마지막 동기화된 내용을 보고 있습니다.'
  if (slow) return '동기화가 지연되고 있습니다. 현재 화면은 최근 저장된 내용일 수 있습니다.'
  return ''
}
