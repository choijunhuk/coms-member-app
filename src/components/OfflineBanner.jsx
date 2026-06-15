import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

function readOnlineState() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

export default function OfflineBanner() {
  const [online, setOnline] = useState(readOnlineState())

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null
  return (
    <div className="offline-banner" role="status">
      <WifiOff size={14} aria-hidden="true" /> 오프라인 — 마지막 동기화된 내용을 보고 있습니다.
    </div>
  )
}
