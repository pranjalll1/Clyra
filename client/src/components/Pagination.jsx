export default function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  // Show up to 5 page numbers around the current page.
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center gap-2">
      <button className="chip" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
      {pages.map((n) => (
        <button key={n} className={n === page ? 'chip chip-on' : 'chip'} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>
          {n}
        </button>
      ))}
      <button className="chip" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      <span className="ml-2 font-mono text-xs uppercase tracking-wider text-ink-muted">Page {page} of {totalPages}</span>
    </nav>
  );
}