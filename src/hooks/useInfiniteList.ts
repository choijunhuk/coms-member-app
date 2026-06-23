import { useEffect, useRef, useState } from 'react'

export function useInfiniteList(items, { initialSize = 20, step = 20 } = {}) {
  const [size, setSize] = useState(initialSize)
  const sentinelRef = useRef(null)
  const total = items.length
  const cycleRef = useRef(items)

  useEffect(() => {
    if (cycleRef.current === items) return undefined
    cycleRef.current = items
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) setSize(Math.min(initialSize, items.length || initialSize))
    })
    return () => {
      cancelled = true
    }
  }, [items, initialSize])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return undefined
    if (typeof IntersectionObserver === 'undefined') return undefined
    if (size >= total) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSize((current) => Math.min(total, current + step))
      }
    }, { rootMargin: '160px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [size, total, step])

  const visible = items.slice(0, size)
  const hasMore = size < total
  return { visible, hasMore, sentinelRef }
}
