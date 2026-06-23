export function SkeletonLine({ width = '100%', height = 14 }: any) {
  return <span className="skeleton-line" style={{ width, height }} />
}

export function SkeletonCard({ rows = 3 }: any) {
  return (
    <div className="skeleton-card">
      <SkeletonLine width="50%" height={16} />
      <SkeletonLine width="80%" height={12} />
      {Array.from({ length: Math.max(0, rows - 2) }).map((_, idx) => (
        <SkeletonLine key={idx} width={`${60 + ((idx * 13) % 35)}%`} height={12} />
      ))}
    </div>
  )
}

export default function SkeletonList({ count = 3 }: any) {
  return (
    <div className="stack">
      {Array.from({ length: count }).map((_, idx) => <SkeletonCard key={idx} rows={3} />)}
    </div>
  )
}
