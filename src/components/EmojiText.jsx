import { renderPlainTextWithEmoji } from '../utils/markdown.js'

export default function EmojiText({ as = 'span', text, className, ...rest }) {
  const Tag = as
  return <Tag className={className} {...rest} dangerouslySetInnerHTML={{ __html: renderPlainTextWithEmoji(text) }} />
}
