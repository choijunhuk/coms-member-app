import type { ElementType } from 'react'
import { renderPlainTextWithEmoji } from '../utils/markdown'

type EmojiTextProps = {
  as?: ElementType
  text?: string
  className?: string
  [key: string]: unknown
}

export default function EmojiText({ as = 'span', text, className, ...rest }: EmojiTextProps) {
  const Tag = as
  return <Tag className={className} {...rest} dangerouslySetInnerHTML={{ __html: renderPlainTextWithEmoji(text) }} />
}
