import { confirmDialog } from '../../components/ConfirmDialog'
import { asArray } from '../../utils/format'
import { pollResultRows, pollSummaryText } from '../../utils/pollResults'

type PollBlockData = { pollId?: string; question?: string; [key: string]: unknown }
type PollResult = { closed?: boolean; myOption?: number | null; [key: string]: unknown }

type PollBlockProps = {
  block: PollBlockData
  result?: PollResult
  pollVote: (pollId: unknown, optionIndex: number) => void
  // Present only when the viewer authored the post — closes the poll for everyone.
  closePoll?: (pollId: unknown) => void | Promise<void>
}

export default function PollBlock({ block, result, pollVote, closePoll }: PollBlockProps) {
  const closed = Boolean(result?.closed)
  const voted = result?.myOption !== null && result?.myOption !== undefined
  const disabled = closed || voted
  const rows = pollResultRows(block, result)

  return (
    <section className="poll-card">
      <div className="poll-head">
        <strong>{block.question || '투표'}</strong>
        <span>{pollSummaryText(result)}</span>
      </div>
      <div className="poll">
        {asArray(rows).map((row) => {
          return (
            <button
              key={`${block.pollId}-${row.index}`}
              type="button"
              className={row.selected ? 'active' : ''}
              disabled={disabled}
              onClick={() => pollVote(block.pollId, row.index)}
            >
              <span className="poll-progress" style={{ width: `${row.percent}%` }} aria-hidden="true" />
              <span className="poll-label">
                {row.imageUrl && <img src={row.imageUrl} alt="" loading="lazy" decoding="async" />}
                <span>{row.label}</span>
                {row.selected && <b>내 선택</b>}
                {row.leading && <b>최다</b>}
              </span>
              <span className="poll-count">{row.count.toLocaleString('ko-KR')}표 · {row.percent}%</span>
            </button>
          )
        })}
      </div>
      {disabled && <p className="poll-note">{closed ? '종료된 투표입니다.' : '이미 참여한 투표입니다.'}</p>}
      {closePoll && !closed && (
        <button
          type="button"
          className="button secondary compact"
          onClick={async () => {
            if (!(await confirmDialog({ message: '이 투표를 종료할까요? 종료하면 더 이상 참여할 수 없습니다.', tone: 'danger', confirmText: '투표 종료' }))) return
            await closePoll(block.pollId)
          }}
        >
          투표 종료
        </button>
      )}
    </section>
  )
}
