import { asArray } from './format'
import { pollOptionImageUrl, pollOptionLabel, pollTotals } from './postBlocks'

export function pollResultRows(block, result) {
  const { counts, total } = pollTotals(result)
  const maxCount = Math.max(0, ...counts)
  return asArray(block?.options).map((option, index) => {
    const count = Number(counts[index] || 0)
    return {
      index,
      label: pollOptionLabel(option) || `선택 ${index + 1}`,
      imageUrl: pollOptionImageUrl(option),
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
      selected: result?.myOption === index,
      leading: total > 0 && count === maxCount,
    }
  })
}

export function pollSummaryText(result) {
  const { total } = pollTotals(result)
  if (total === 0) return '아직 투표 전'
  return `${result?.closed ? '종료 · ' : ''}총 ${total.toLocaleString('ko-KR')}표`
}
