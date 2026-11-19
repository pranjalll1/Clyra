const fmt = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
});

export const formatWhen = (iso) => (iso ? fmt.format(new Date(iso)) : 'Date TBA');

export const formatPrice = (p) => (!p || p.isFree ? 'Free' : `₹${Number(p.amountINR).toLocaleString('en-IN')}`);

export const MODE_LABEL = { in_person: 'In person', online: 'Online', hybrid: 'Hybrid' };
const dateFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

export const formatDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : 'TBA');

// "6:00 PM – 9:00 PM" for same-day events, "6:00 PM – Thu, 5 Nov 2026, 6:00 PM" for multi-day ones.
export function formatWindow(startIso, endIso) {
  if (!startIso || !endIso) return 'TBA';
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (s.toDateString() === e.toDateString()) return `${timeFmt.format(s)} – ${timeFmt.format(e)}`;
  return `${timeFmt.format(s)} – ${formatDate(endIso)}, ${timeFmt.format(e)}`;
}