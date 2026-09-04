import type { ElementType } from 'react'
import { useTwemoji } from '../hooks/useTwemoji'
import { renderPlainTextWithEmoji } from '../utils/markdown'

type EmojiTextProps = {
  as?: ElementType
  text?: string
  className?: string
  [key: string]: unknown
}

export default function EmojiText({ as = 'span', text, className, ...rest }: EmojiTextProps) {
  const Tag = as
  // Re-renders once the shared Twemoji parser finishes loading; emojifySync
  // (inside renderPlainTextWithEmoji) picks it up automatically once ready.
  useTwemoji()
  const html = renderPlainTextWithEmoji(String(text || ''))
  return <Tag className={className} {...rest} dangerouslySetInnerHTML={{ __html: html }} />
}
