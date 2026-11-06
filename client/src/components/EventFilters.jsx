const PRICE = [['', 'Any'], ['free', 'Free'], ['paid', 'Paid']];
const MODE = [['', 'Any'], ['in_person', 'In person'], ['online', 'Online'], ['hybrid', 'Hybrid']];
const VENUE = [['', 'Any'], ['auditorium', 'Auditorium'], ['sports', 'Sports'], ['hub', 'Hub'], ['academic', 'Academic']];

function Group({ title, children }) {
  return (
    <fieldset className="border-b border-onyx pb-4">
      <legend className="label-caps mb-2">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Options({ options, value, onPick }) {
  return options.map(([val, label]) => (
    <button key={val || 'any'} type="button" aria-pressed={value === val} className={value === val ? 'chip chip-on' : 'chip'} onClick={() => onPick(val)}>
      {label}
    </button>
  ));
}

// `values` = current filters from the URL, `setParams` = changes the URL.
export default function EventFilters({ facets, values, setParams }) {
  const selected = values.category ? values.category.split(',') : [];

  function toggleCategory(slug) {
    const next = selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug];
    setParams({ category: next.join(',') });
  }

  return (
    <aside className="card h-fit space-y-4 p-4 shadow-tactile" aria-label="Filters">
      <h2 className="font-syne text-xl font-extrabold">Filters</h2>

      <fieldset className="border-b border-onyx pb-4">
        <legend className="label-caps mb-2">Category</legend>
        <div className="space-y-2">
          {(facets?.categories || []).map((c) => (
            <label key={c.slug} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-onyx" checked={selected.includes(c.slug)} onChange={() => toggleCategory(c.slug)} />
                {c.name}
              </span>
              <span className="font-mono text-xs text-ink-muted">{c.count}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Group title="Price"><Options options={PRICE} value={values.price} onPick={(v) => setParams({ price: v })} /></Group>
      <Group title="Mode"><Options options={MODE} value={values.mode} onPick={(v) => setParams({ mode: v })} /></Group>
      <Group title="Venue type"><Options options={VENUE} value={values.venueType} onPick={(v) => setParams({ venueType: v })} /></Group>
    </aside>
  );
}