import { Download } from 'lucide-react'
import { asArray, plainText } from '../../utils/format.js'
import { mediaSrc } from '../../utils/helpers.js'
import { postBlocks } from '../../utils/postBlocks.js'
import PollBlock from './PollBlock.jsx'
import Polls from './Polls.jsx'

export default function PostContent({ post, pollVote }) {
  const blocks = postBlocks(post)
  const hasPollBlock = blocks.some((block) => block.type === 'poll')

  return (
    <div className="post-content">
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          const text = plainText(block.content)
          return text ? <p className="body-text" key={index}>{text}</p> : null
        }
        if (block.type === 'image') {
          const src = mediaSrc(block.url)
          return src ? <img key={index} className="post-image" src={src} alt={block.name || '이미지'} loading="lazy" /> : null
        }
        if (block.type === 'video') {
          const src = mediaSrc(block.url)
          return src ? <video key={index} className="post-video" src={src} controls preload="metadata" /> : null
        }
        if (block.type === 'file') {
          const href = mediaSrc(block.url)
          return href ? <a key={index} className="file-link" href={href} target="_blank" rel="noreferrer"><Download size={14} />{block.name || '첨부파일'}</a> : null
        }
        if (block.type === 'externalEmbed') {
          if (block.kind === 'image' && block.url) return <img key={index} className="post-image" src={block.url} alt={block.title || '외부 이미지'} loading="lazy" />
          if (block.kind === 'video' && block.url) return <video key={index} className="post-video" src={block.url} controls preload="metadata" />
          if (block.url) return <a key={index} className="file-link" href={block.url} target="_blank" rel="noreferrer">{block.title || block.url}</a>
          return null
        }
        if (block.type === 'poll') {
          const result = asArray(post.pollResults).find((item) => item.pollId === block.pollId)
          return <PollBlock key={block.pollId || index} block={block} result={result} pollVote={pollVote} />
        }
        return null
      })}
      {!hasPollBlock && <Polls polls={post.pollResults} pollVote={pollVote} />}
    </div>
  )
}
