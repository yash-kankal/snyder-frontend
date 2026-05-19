export default function MovieDetailsSkeleton() {
  return (
    <main className="relative">
      <div className="wrapper detail-wrapper">

        {/* Title row */}
        <div className="detail-title-row" style={{ marginBottom: 20 }}>
          <div className="skeleton-line" style={{ width: 340, height: 40, borderRadius: 10 }} />
          <div className="skeleton-line" style={{ width: 1, height: 32, borderRadius: 4, margin: '0 16px' }} />
          <div className="skeleton-line" style={{ width: 48, height: 32, borderRadius: 10 }} />
          <div className="skeleton-line" style={{ width: 80, height: 28, borderRadius: 20 }} />
          <div className="skeleton-line" style={{ width: 80, height: 28, borderRadius: 20 }} />
        </div>

        {/* Hero grid */}
        <div className="detail-hero">
          {/* Poster */}
          <div className="detail-hero-poster">
            <div className="skeleton-poster" style={{ borderRadius: 16 }} />
          </div>

          {/* Trailer placeholder */}
          <div className="detail-bento-trailer skeleton-block" />

          {/* Overview card */}
          <div className="detail-card detail-bento-overview" style={{ gap: 14 }}>
            {/* Meta row */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[90, 80, 90, 50, 60, 70].map((w, i) => (
                <div key={i} className="skeleton-line" style={{ width: w, height: 14, borderRadius: 6 }} />
              ))}
            </div>
            {/* Overview text lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[100, 96, 100, 88, 60].map((w, i) => (
                <div key={i} className="skeleton-line" style={{ width: `${w}%`, height: 13, borderRadius: 5 }} />
              ))}
            </div>
          </div>
        </div>

        {/* Cast section */}
        <div className="detail-section">
          <div className="skeleton-line" style={{ width: 80, height: 24, borderRadius: 8, marginBottom: 20 }} />
          <div className="people-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div className="skeleton-line" style={{ width: 80, height: 80, borderRadius: '50%' }} />
                <div className="skeleton-line" style={{ width: 70, height: 12, borderRadius: 5 }} />
                <div className="skeleton-line" style={{ width: 50, height: 11, borderRadius: 5 }} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
