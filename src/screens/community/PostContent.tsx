import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { asArray, plainText } from '../../utils/format'
import { mediaSrc } from '../../utils/helpers'
import { renderMarkdownToHtml } from '../../utils/markdown'
import { postBlocks } from '../../utils/postBlocks'
import PollBlock from './PollBlock'
import Polls from './Polls'
import type { CommunityPost } from '../../contract/types'

function safeExternalHref(url) {
  return /^https?:\/\//i.test(String(url || '')) ? url : ''
}

function collectImageUrls(blocks) {
  const urls = []
  for (const block of blocks) {
    if (block.type === 'image' && block.url) urls.push(mediaSrc(block.url))
    else if (block.type === 'externalEmbed' && block.kind === 'image' && block.url) urls.push(block.url)
  }
  return urls
}

export default function PostContent({ post, pollVote }: { post: CommunityPost; pollVote: (pollId: unknown, optionIndex: number) => void }) {
  const blocks = postBlocks(post)
  const hasPollBlock = blocks.some((block) => block.type === 'poll')
  const images = collectImageUrls(blocks)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const imageCount = images.length

  useEffect(() => {
    if (activeIndex === null) return undefined
    if (typeof document === 'undefined') return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [activeIndex])

  useEffect(() => {
    if (activeIndex === null || imageCount === 0) return undefined
    if (typeof window === 'undefined') return undefined
    function onKey(event) {
      if (event.key === 'Escape') setActiveIndex(null)
      if (event.key === 'ArrowRight') setActiveIndex((index) => (index + 1) % imageCount)
      if (event.key === 'ArrowLeft') setActiveIndex((index) => (index - 1 + imageCount) % imageCount)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex, imageCount])

  const blockImageIndex = (() => {
    const map = new Array(blocks.length).fill(-1)
    let next = 0
    blocks.forEach((block, idx) => {
      if (block.type === 'image' && block.url) {
        map[idx] = next
        next += 1
      } else if (block.type === 'externalEmbed' && block.kind === 'image' && block.url) {
        map[idx] = next
        next += 1
      }
    })
    return map
  })()

  return (
    <div className="post-content">
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          const text = plainText(block.content)
          if (!text) return null
          return <p className="body-text" key={index} dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(text) }} />
        }
        if (block.type === 'image') {
          const src = mediaSrc(block.url)
          if (!src) return null
          const galleryIndex = blockImageIndex[index]
          return (
            <button type="button" key={index} className="image-thumb-button" onClick={() => setActiveIndex(galleryIndex)} aria-label={`이미지 ${galleryIndex + 1} 크게 보기`}>
              <img className="post-image" src={src} alt={block.name || '이미지'} loading="lazy" decoding="async" />
            </button>
          )
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
          if (block.kind === 'image' && block.url) {
            const src = safeExternalHref(block.url)
            if (!src) return null
            const galleryIndex = blockImageIndex[index]
            return (
              <button type="button" key={index} className="image-thumb-button" onClick={() => setActiveIndex(galleryIndex)} aria-label={`이미지 ${galleryIndex + 1} 크게 보기`}>
                <img className="post-image" src={src} alt={block.title || '외부 이미지'} loading="lazy" decoding="async" />
              </button>
            )
          }
          if (block.kind === 'video' && block.url) {
            const src = safeExternalHref(block.url)
            return src ? <video key={index} className="post-video" src={src} controls preload="metadata" /> : null
          }
          if (block.url) {
            const href = safeExternalHref(block.url)
            return href
              ? <a key={index} className="file-link" href={href} target="_blank" rel="noreferrer">{block.title || block.url}</a>
              : <span key={index} className="file-link">{block.title || block.url}</span>
          }
          return null
        }
        if (block.type === 'poll') {
          const result = asArray(post.pollResults).find((item) => item.pollId === block.pollId)
          return <PollBlock key={block.pollId || index} block={block} result={result} pollVote={pollVote} />
        }
        return null
      })}
      {!hasPollBlock && <Polls polls={post.pollResults} pollVote={pollVote} />}
      {activeIndex !== null && imageCount > 0 && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setActiveIndex(null)}>
          <button type="button" className="lightbox-close" onClick={() => setActiveIndex(null)} aria-label="닫기"><X size={20} /></button>
          {imageCount > 1 && (
            <button
              type="button"
              className="lightbox-nav lightbox-prev"
              onClick={(event) => { event.stopPropagation(); setActiveIndex((index) => (index - 1 + imageCount) % imageCount) }}
              aria-label="이전 이미지"
            >
              <ChevronLeft size={28} />
            </button>
          )}
          <img className="lightbox-image" src={images[activeIndex]} alt="" onClick={(event) => event.stopPropagation()} />
          {imageCount > 1 && (
            <button
              type="button"
              className="lightbox-nav lightbox-next"
              onClick={(event) => { event.stopPropagation(); setActiveIndex((index) => (index + 1) % imageCount) }}
              aria-label="다음 이미지"
            >
              <ChevronRight size={28} />
            </button>
          )}
          <span className="lightbox-counter">{activeIndex + 1} / {imageCount}</span>
        </div>
      )}
    </div>
  )
}
