import { useState } from 'react'
import { DoorOpen, Eye, EyeOff, Loader2 } from 'lucide-react'
import { getClubRoom } from '../services/siteApi'

// 동아리방 출입 비밀번호 — 회원(USER) 이상만 (백엔드 /api/club-room 게이트).
// 준회원/비공개 상태는 403/빈값으로 떨어지므로 카드가 스스로 숨는다.
// Fetches lazily on first reveal so the code never rides along in boot traffic.
export default function ClubRoomCard() {
  const [state, setState] = useState<'idle' | 'loading' | 'shown' | 'hidden-code' | 'unavailable'>('idle')
  const [code, setCode] = useState('')

  async function reveal() {
    if (state === 'hidden-code') {
      setState('shown')
      return
    }
    setState('loading')
    try {
      const data = await getClubRoom()
      const doorCode = String(data?.doorCode || '')
      if (!doorCode) {
        setState('unavailable')
        return
      }
      setCode(doorCode)
      setState('shown')
    } catch {
      // 403 (준회원) or network — hide quietly, the card explains nothing.
      setState('unavailable')
    }
  }

  if (state === 'unavailable') return null

  return (
    <section className="panel club-room-card">
      <div className="section-title"><h2><DoorOpen size={14} aria-hidden="true" /> 동아리방</h2></div>
      <div className="club-room-row">
        <span className="club-room-code">{state === 'shown' ? code : '••••••••'}</span>
        <button type="button" className="button secondary compact" onClick={() => (state === 'shown' ? setState('hidden-code') : reveal())} disabled={state === 'loading'}>
          {state === 'loading'
            ? <Loader2 className="spin" size={14} aria-hidden="true" />
            : state === 'shown' ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          {state === 'shown' ? '가리기' : '비밀번호 보기'}
        </button>
      </div>
      <p className="muted club-room-hint">출입 비밀번호는 외부에 공유하지 마세요.</p>
    </section>
  )
}
