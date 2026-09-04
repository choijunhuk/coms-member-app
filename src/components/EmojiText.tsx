import { useEffect, useState, type ElementType } from 'react'
import { emojify } from '../utils/emoji'
import { escapeHtml, renderPlainTextWithEmoji } from '../utils/markdown'

type EmojiTextProps = {
  as?: ElementType
  text?: string
  className?: string
  [key: string]: unknown
}

export default function EmojiText({ as = 'span', text, className, ...rest }: EmojiTextProps) {
  const Tag = as
  const textValue = String(text || '')
  const [resolved, setResolved] = useState<{ text: string; html: string } | null>(null)

  useEffect(() => {
    let active = true
    void emojify(escapeHtml(textValue)).then((html) => {
      if (active) setResolved({ text: textValue, html })
    })
    return () => {
      active = false
    }
  }, [textValue])

  const html = resolved?.text === textValue ? resolved.html : renderPlainTextWithEmoji(textValue)
  return <Tag className={className} {...rest} dangerouslySetInnerHTML={{ __html: html }} />
}
