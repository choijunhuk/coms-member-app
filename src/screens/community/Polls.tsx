import { asArray } from '../../utils/format'
import { pollTotals } from '../../utils/postBlocks'
import { Section } from '../../components/ui'

export default function Polls({ polls, pollVote }: { polls: unknown; pollVote: (pollId: unknown, optionIndex: number) => void }) {
  const items = asArray(polls)
  if (!items.length) return null
  return (
    <Section title="투표">
      {items.map((poll) => (
        <div className="poll" key={poll.pollId}>
          {pollTotals(poll).counts.map((count, index) => <button key={index} className={poll.myOption === index ? 'active' : ''} disabled={poll.closed || (poll.myOption !== null && poll.myOption !== undefined)} onClick={() => pollVote(poll.pollId, index)}>선택 {index + 1}<span>{count}표</span></button>)}
        </div>
      ))}
    </Section>
  )
}
