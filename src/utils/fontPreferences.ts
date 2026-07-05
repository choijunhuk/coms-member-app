// App-wide font family preference, ported from the web (services/fontPreferences).
// Built-in fonts load from public CDNs; custom fonts come from the prod backend
// (/api/fonts) as @font-face rules. The choice is stored locally for instant
// apply and synced to the profile (selectedBuiltinFontKey / selectedFontId) so
// web and app agree.

import { listFonts } from '../services/fontApi'
import { mediaSrc } from './helpers'
import { readStoredValue, writeStoredValue } from './deviceStorage'

const FONT_KEY = 'coms.fontFamily:v1'

export const DEFAULT_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Apple SD Gothic Neo', 'Segoe UI', 'Malgun Gothic', sans-serif"

export const BUILT_IN_FONTS = [
  { id: 'b:pretendard', name: 'Pretendard', family: 'Pretendard Variable', stylesheet: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css' },
  { id: 'b:noto-sans-kr', name: 'Noto Sans KR', family: 'Noto Sans KR', stylesheet: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap' },
  { id: 'b:ibm-plex-sans-kr', name: 'IBM Plex Sans KR', family: 'IBM Plex Sans KR', stylesheet: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;700&display=swap' },
  { id: 'b:nanum-gothic', name: 'Nanum Gothic', family: 'Nanum Gothic', stylesheet: 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap' },
  { id: 'b:gowun-dodum', name: 'Gowun Dodum', family: 'Gowun Dodum', stylesheet: 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap' },
  { id: 'b:nanum-myeongjo', name: 'Nanum Myeongjo', family: 'Nanum Myeongjo', stylesheet: 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap' },
]

export function sanitizeFontFamily(name) {
  return String(name || '')
    // eslint-disable-next-line no-control-regex
    .replace(/["\\\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, '')
    .trim()
    .slice(0, 64)
}

// Unlike the web (same-origin paths), the app runs on a capacitor:// origin, so
// custom font files resolve through mediaSrc to the prod backend (absolute
// https when VITE_API_BASE_URL is set — always the case in app builds). A
// root-relative /api path is kept for dev-proxy browser runs. Reject anything
// that can escape a CSS url("...") literal or uses another scheme.
export function safeFontUrl(raw) {
  const value = mediaSrc(String(raw || '').trim())
  if (!value || /["()\s\\<>]/.test(value)) return null
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) return encodeURI(value)
  return null
}

export function buildFontFaceCss(fonts) {
  return (Array.isArray(fonts) ? fonts : [])
    .map((font) => {
      const family = sanitizeFontFamily(font.name)
      const url = safeFontUrl(font.fileUrl)
      if (!family || !url) return ''
      return `@font-face{font-family:"${family}";src:url("${url}") format("woff2"),url("${url}");font-display:swap;}`
    })
    .filter(Boolean)
    .join('\n')
}

export function fontFamilyValue(font) {
  if (!font) return DEFAULT_FONT_FAMILY
  const family = sanitizeFontFamily(font.family || font.name)
  return family ? `"${family}", ${DEFAULT_FONT_FAMILY}` : DEFAULT_FONT_FAMILY
}

export function readFontPreference() {
  return readStoredValue(FONT_KEY) || ''
}

export function writeFontPreference(value) {
  writeStoredValue(FONT_KEY, String(value || ''))
}

function injectBuiltinFontStylesheets() {
  if (typeof document === 'undefined') return
  BUILT_IN_FONTS.forEach((font) => {
    const linkId = `builtin-font-${font.id}`
    if (document.getElementById(linkId)) return
    const link = document.createElement('link')
    link.id = linkId
    link.rel = 'stylesheet'
    link.href = font.stylesheet
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
}

function injectCustomFontFaces(fonts) {
  if (typeof document === 'undefined') return
  const css = buildFontFaceCss(fonts)
  if (!css) return
  let styleTag = document.getElementById('custom-font-faces')
  if (!styleTag) {
    styleTag = document.createElement('style')
    styleTag.id = 'custom-font-faces'
    document.head.appendChild(styleTag)
  }
  styleTag.textContent = css
}

function setFontVariable(font) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (font) root.style.setProperty('--app-font-family', fontFamilyValue(font))
  else root.style.removeProperty('--app-font-family')
}

// Resolve the effective font id: local choice wins, then the profile fields the
// web writes. Empty string = explicit "default", null/undefined = no choice yet.
export function effectiveFontId(user) {
  const local = readStoredValue(FONT_KEY)
  if (local !== null && local !== undefined) return String(local)
  const fromProfile = user?.selectedBuiltinFontKey ?? user?.selectedFontId
  return fromProfile === null || fromProfile === undefined ? '' : String(fromProfile)
}

// Apply the current preference to the document. Fetches the custom font list
// only when a non-builtin id is selected.
export async function applyFontPreference(user) {
  const id = effectiveFontId(user)
  if (!id) {
    setFontVariable(null)
    return
  }
  if (id.startsWith('b:')) {
    injectBuiltinFontStylesheets()
    setFontVariable(BUILT_IN_FONTS.find((font) => font.id === id) || null)
    return
  }
  const fonts = await listFonts()
  const font = fonts.find((item) => String(item.id) === id)
  if (font) injectCustomFontFaces([font])
  setFontVariable(font || null)
}
