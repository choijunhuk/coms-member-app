import { renderPlainTextWithEmoji } from '../utils/markdown'

export default function EmojiText({ as = 'span', text, className, ...rest }: any) {
  const Tag = as
  return <Tag className={className} {...rest} dangerouslySetInnerHTML={{ __html: renderPlainTextWithEmoji(text) }} />
}
