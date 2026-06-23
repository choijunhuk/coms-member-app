import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { networkBannerMessage } from '../utils/networkStatus'

function readOnlineState() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

export default function OfflineBanner({ slow = false }: any) {
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

  const message = networkBannerMessage({ online, slow })
  if (!message) return null
  return (
    <div className="offline-banner" role="status">
      <WifiOff size={14} aria-hidden="true" /> {message}
    </div>
  )
}
