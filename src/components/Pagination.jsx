function getPageNumbers(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const set = new Set([1, totalPages])
  for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) {
    set.add(i)
  }
  const sorted = [...set].sort((a, b) => a - b)
  const result = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) result.push('…')
    result.push(p)
    prev = p
  }
  return result
}

export default function Pagination({ page, totalPages, onPageChange }) {
  const pages = getPageNumbers(page, totalPages)

  return (
    <div className="pagination">
      <button
        className="pagination-arrow"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        ←
      </button>

      <div className="pagination-pages">
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`dots-${i}`} className="pagination-dots">···</span>
          ) : (
            <button
              key={p}
              className={`pagination-page${p === page ? ' active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        className="pagination-arrow"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        →
      </button>
    </div>
  )
}
