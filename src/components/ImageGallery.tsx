import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { mediaSrc } from '../utils/helpers'
import type { CommunityPost } from '../contract/types'

function uniqueImageUrls(post) {
  const set = new Set()
  const out = []
  const push = (url) => {
    if (!url) return
    const resolved = mediaSrc(url)
    if (!resolved || set.has(resolved)) return
    set.add(resolved)
    out.push(resolved)
  }
  if (Array.isArray(post?.imageInfos)) post.imageInfos.forEach((info) => push(info?.url))
  if (Array.isArray(post?.imageUrls)) post.imageUrls.forEach(push)
  if (post?.imageUrl) push(post.imageUrl)
  return out
}

export default function ImageGallery({ post }: { post?: CommunityPost }) {
  const images = uniqueImageUrls(post)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

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
    if (activeIndex === null) return undefined
    if (typeof window === 'undefined') return undefined
    function onKey(event) {
      if (event.key === 'Escape') setActiveIndex(null)
      if (event.key === 'ArrowRight') setActiveIndex((i) => (i + 1) % images.length)
      if (event.key === 'ArrowLeft') setActiveIndex((i) => (i - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex, images.length])

  if (images.length === 0) return null

  return (
    <>
      <div className={images.length > 1 ? 'image-gallery image-gallery-multi' : 'image-gallery'}>
        {images.map((src, index) => (
          <button key={src} type="button" className="image-gallery-thumb" onClick={() => setActiveIndex(index)} aria-label={`이미지 ${index + 1} 크게 보기`}>
            <img src={src} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
      {activeIndex !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setActiveIndex(null)}>
          <button type="button" className="lightbox-close" onClick={() => setActiveIndex(null)} aria-label="닫기"><X size={20} /></button>
          {images.length > 1 && (
            <button
              type="button"
              className="lightbox-nav lightbox-prev"
              onClick={(event) => { event.stopPropagation(); setActiveIndex((i) => (i - 1 + images.length) % images.length) }}
              aria-label="이전 이미지"
            >
              <ChevronLeft size={28} />
            </button>
          )}
          <img className="lightbox-image" src={images[activeIndex]} alt="" onClick={(event) => event.stopPropagation()} />
          {images.length > 1 && (
            <button
              type="button"
              className="lightbox-nav lightbox-next"
              onClick={(event) => { event.stopPropagation(); setActiveIndex((i) => (i + 1) % images.length) }}
              aria-label="다음 이미지"
            >
              <ChevronRight size={28} />
            </button>
          )}
          <span className="lightbox-counter">{activeIndex + 1} / {images.length}</span>
        </div>
      )}
    </>
  )
}
