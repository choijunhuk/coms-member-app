import { asArray } from '../../utils/format.js'
import { pollOptionImageUrl, pollOptionLabel, pollTotals } from '../../utils/postBlocks.js'

export default function PollBlock({ block, result, pollVote }) {
  const { counts, total } = pollTotals(result)
  const closed = Boolean(result?.closed)
  const voted = result?.myOption !== null && result?.myOption !== undefined
  const disabled = closed || voted

  return (
    <section className="poll-card">
      <div className="poll-head">
        <strong>{block.question || '투표'}</strong>
        <span>{closed ? '종료' : total > 0 ? `총 ${total}표` : '진행 중'}</span>
      </div>
      <div className="poll">
        {asArray(block.options).map((option, index) => {
          const label = pollOptionLabel(option) || `선택 ${index + 1}`
          const imageUrl = pollOptionImageUrl(option)
          const count = counts[index] || 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const selected = result?.myOption === index
          return (
            <button key={`${block.pollId}-${index}`} type="button" className={selected ? 'active' : ''} disabled={disabled} onClick={() => pollVote(block.pollId, index)}>
              <span className="poll-label">
                {imageUrl && <img src={imageUrl} alt="" loading="lazy" />}
                {label}
              </span>
              <span>{count}표 · {pct}%</span>
            </button>
          )
        })}
      </div>
      {disabled && <p className="poll-note">{closed ? '종료된 투표입니다.' : '이미 참여한 투표입니다.'}</p>}
    </section>
  )
}
