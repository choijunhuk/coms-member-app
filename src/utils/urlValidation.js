const HTTP_URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i

export function validateHttpUrl(value, { allowEmpty = false } = {}) {
  const raw = String(value || '').trim()
  if (!raw) {
    return allowEmpty
      ? { ok: true, url: '' }
      : { ok: false, message: '링크를 입력해주세요.' }
  }
  if (!HTTP_URL_RE.test(raw)) {
    return { ok: false, message: '링크는 http(s) 주소만 등록할 수 있습니다.' }
  }
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, message: '링크는 http(s) 주소만 등록할 수 있습니다.' }
    }
    if (url.username || url.password) {
      return { ok: false, message: '계정 정보가 포함된 링크는 등록할 수 없습니다.' }
    }
    return { ok: true, url: url.href }
  } catch {
    return { ok: false, message: '올바른 링크 형식이 아닙니다.' }
  }
}
