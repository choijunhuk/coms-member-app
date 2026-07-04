// Very small allowlist markdown transformer for body text.
// Supports **bold**, _italic_, and [label](https://url) only.
// Escapes HTML first; the returned tokens are safe to render via dangerouslySetInnerHTML.

import { emojifySync } from './emoji'

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
