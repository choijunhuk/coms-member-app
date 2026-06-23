import { useEffect, useRef } from 'react'

const DEFAULT_INTERVAL_MS = 30_000

export function useNotificationPolling({ enabled, refresh, intervalMs = DEFAULT_INTERVAL_MS }: any) {
  const refreshRef = useRef(refresh)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined
    let timer = null
    let visible = typeof document === 'undefined' ? true : !document.hidden

    function tick() {
      if (!visible) return
      try { refreshRef.current?.() } catch (err) { console.warn('Notification poll failed', err) }
    }

    function start() {
      if (timer !== null) return
      timer = window.setInterval(tick, intervalMs)
    }
    function stop() {
      if (timer === null) return
      window.clearInterval(timer)
      timer = null
    }

    function onVisibility() {
      visible = !document.hidden
      if (visible) {
        tick()
        start()
      } else {
        stop()
      }
    }

    start()
    document.addEventListener?.('visibilitychange', onVisibility)
    window.addEventListener?.('focus', tick)
    return () => {
      stop()
      document.removeEventListener?.('visibilitychange', onVisibility)
      window.removeEventListener?.('focus', tick)
    }
  }, [enabled, intervalMs])
}
