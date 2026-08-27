// Very small allowlist markdown transformer for body text.
// Supports **bold**, _italic_, and [label](https://url) only.
// Escapes HTML first; the returned tokens are safe to render via dangerouslySetInnerHTML.

import { emojifySync } from './emoji'
// Circular with format.ts (it imports stripMarkdown) — safe: both sides only
// touch the import inside function bodies, never at module-init time.
import { decodeEntities } from './format'

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, (ch) => ESCAPE[ch])
}

const URL_RE = /^https?:\/\/[^\s)]+$/

export function renderMarkdownToHtml(input) {
  const escaped = escapeHtml(input)
  // Links first so the bold/italic transforms don't break the URL.
  const withLinks = escaped.replace(/\[([^\]]{1,80})\]\(([^)]{1,200})\)/g, (full, label, href) => {
    if (!URL_RE.test(href)) return full
    return `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`
  })
  const withBold = withLinks.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  const withItalic = withBold.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>')
  const withBreaks = withItalic.replace(/\n/g, '<br />')
  return emojifySync(withBreaks)
}

export function renderPlainTextWithEmoji(input) {
  return emojifySync(escapeHtml(input))
}

// --- Safe rendering for web-authored HTML posts ---
// Web TipTap posts store sanitized HTML. Rendering them through plainTextLines
// flattened bold/lists/links to plain text, so the app showed a degraded copy
// of every web-formatted post. This renders a safe allowlisted subset instead:
// escape everything, then re-open ONLY known formatting tags (attributes are
// dropped), plus validated http(s) links. Nothing else survives escaping.

const SAFE_HTML_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'mark', 'h1', 'h2', 'h3']

export function looksLikeHtml(input) {
  return /<([a-z][a-z0-9]*)\b[^>]*>/i.test(String(input || ''))
}

export function renderSafeHtml(input) {
  // Decode entities first so sanitizer output (&nbsp;, &amp;) displays as text,
  // then escape the whole string — anything an entity decoded into (including
  // a smuggled <script>) is re-escaped and never re-opened below.
  const escaped = escapeHtml(decodeEntities(String(input || '')))
  let html = escaped
  for (const tag of SAFE_HTML_TAGS) {
    // (?=[\s&/]) keeps `p` from matching the start of `pre`; attributes up to
    // the closing bracket are matched but discarded.
    html = html
      .replace(new RegExp(`&lt;${tag}(?=[\\s&/])((?:(?!&gt;).)*?)/?&gt;`, 'gi'), tag === 'br' ? '<br />' : `<${tag}>`)
      .replace(new RegExp(`&lt;/${tag}&gt;`, 'gi'), `</${tag}>`)
  }
  html = html.replace(/&lt;a\s((?:(?!&gt;).)*?)&gt;([\s\S]*?)&lt;\/a&gt;/gi, (full, attrs, label) => {
    const href = /href=&quot;(.*?)&quot;/i.exec(attrs)?.[1]?.replace(/&amp;/g, '&')
    if (!href || !/^https?:\/\//i.test(href)) return label
    return `<a href="${href.replace(/&/g, '&amp;').replace(/"/g, '')}" target="_blank" rel="noreferrer">${label}</a>`
  })
  return emojifySync(html)
}

// Strip markdown markers down to their visible text, for list previews that
// show plain text rather than HTML. Covers what our composer renders (**bold**,
// _italic_, [label](url)) plus markers members paste in from elsewhere
// (headings, code, quotes, lists, ~~strike~~, ==highlight==) so a preview never
// shows raw syntax next to the text.
export function stripMarkdown(input) {
  return String(input || '')
    .replace(/```[^\n`]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/!\[([^\]]{0,80})\]\(([^)]{1,200})\)/g, '$1')
    .replace(/\[([^\]]{1,80})\]\(([^)]{1,200})\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '')
    .replace(/^[-*+]\s+(?:\[[ xX]\]\s+)?/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/~~([^~\n]+)~~/g, '$1')
    .replace(/==([^=\n]+)==/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1$2')
}
