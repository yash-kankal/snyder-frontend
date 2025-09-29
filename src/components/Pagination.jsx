
export default function Pagination({ page, totalPages, onPageChange }) {

  const makePages = () => {
    const pages = new Set([1, totalPages]);
    for (let p = page - 2; p <= page + 2; p++) {
      if (p >= 1 && p <= totalPages) pages.add(p);
    }
    return [...pages].sort((a, b) => a - b);
  };

  const pages = makePages();

  const Button = ({ disabled, children, onClick, ariaLabel }) => (
    <button
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-2 rounded-md border text-sm
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10"}
      `}
    >
      {children}
    </button>
  );

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination Navigation">
      <Button
        ariaLabel="Go to previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Prev
      </Button>

      {pages.map((p, i) => {
        const prev = pages[i - 1];
        const showEllipsis = i > 0 && p - prev > 1;
        return (
          <span key={p} className="flex items-center">
            {showEllipsis && <span className="px-2 select-none">…</span>}
            <button
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={`min-w-9 px-3 py-2 rounded-md border text-sm mx-0.5
                ${p === page ? "bg-white/10 font-semibold" : "hover:bg-white/10"}
              `}
            >
              {p}
            </button>
          </span>
        );
      })}

      <Button
        ariaLabel="Go to next page"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
