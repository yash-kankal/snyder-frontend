export default function CardSkeleton() {
  return (
    <div className="movie-card skeleton-card">
      <div className="skeleton-poster" />
      <div className="mt-4">
        <div className="skeleton-line" style={{ width: '80%', height: 13 }} />
      </div>
      <div className="content mt-2" style={{ gap: 6 }}>
        <div className="skeleton-line" style={{ width: 28, height: 11 }} />
        <div className="skeleton-line" style={{ width: 6, height: 11 }} />
        <div className="skeleton-line" style={{ width: 22, height: 11 }} />
        <div className="skeleton-line" style={{ width: 6, height: 11 }} />
        <div className="skeleton-line" style={{ width: 32, height: 11 }} />
      </div>
    </div>
  )
}
