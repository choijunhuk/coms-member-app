import { useEffect, useRef, useState } from 'react'

const TRIGGER_DISTANCE = 70
const RESISTANCE = 0.5

export function usePullToRefresh(onRefresh, { enabled = true } = {}) {
  const ref = useRef(null)
  const startYRef = useRef(null)
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || !enabled) return undefined

    function onTouchStart(event) {
      if (node.scrollTop > 0 || refreshing) return
      startYRef.current = event.touches?.[0]?.clientY ?? null
    }

    function onTouchMove(event) {
      if (startYRef.current === null) return
      const delta = (event.touches?.[0]?.clientY ?? 0) - startYRef.current
      if (delta <= 0) {
        setDistance(0)
        return
      }
      setDistance(Math.min(delta * RESISTANCE, 120))
    }

    async function onTouchEnd() {
      const triggered = distance >= TRIGGER_DISTANCE
      startYRef.current = null
      setDistance(0)
      if (!triggered) return
      try {
        setRefreshing(true)
        await onRefresh?.()
      } finally {
        setRefreshing(false)
      }
    }

    node.addEventListener('touchstart', onTouchStart, { passive: true })
    node.addEventListener('touchmove', onTouchMove, { passive: true })
    node.addEventListener('touchend', onTouchEnd, { passive: true })
    node.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('touchend', onTouchEnd)
      node.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [distance, enabled, onRefresh, refreshing])

  return { ref, distance, refreshing, triggered: distance >= TRIGGER_DISTANCE }
}
