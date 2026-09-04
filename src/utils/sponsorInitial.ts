// "60기 박채현" should read 박, not 6: drop a leading 기수 prefix.
export function sponsorInitial(name: string) {
  const raw = name.trim().replace(/^\d{1,3}기\s*/, '')
  return raw ? Array.from(raw)[0] : '후'
}
