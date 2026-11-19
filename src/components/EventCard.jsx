import Link from 'next/link';
import { formatWhen, formatPrice, MODE_LABEL } from '@/lib/format';

export default function EventCard({ event }) {
  const free = event.price?.isFree !== false;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="card flex flex-col shadow-tactile transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-tactile-sm"
    >
      <div className="relative aspect-[16/9] border-b-[1.5px] border-onyx bg-surface-muted">
        {event.posterUrl ? (
          <img src={event.posterUrl} alt={event.posterAlt || ''} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div aria-hidden="true" className="flex h-full items-center justify-center font-syne text-5xl font-extrabold text-onyx/20">
            {event.title.slice(0, 2).toUpperCase()}
          </div>
        )}
        {event.categoryName && <span className="sticker absolute left-2 top-2">{event.categoryName}</span>}
        <span className={`absolute right-2 top-2 border border-onyx px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider ${free ? 'bg-surface' : 'bg-coral'}`}>
          {formatPrice(event.price)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="label-caps text-ink-muted">{formatWhen(event.startAt)}</p>
        <h3 className="font-syne text-xl font-extrabold leading-tight tracking-tight">{event.title}</h3>
        <p className="text-sm text-onyx">
          {event.venueName || MODE_LABEL[event.mode]}
          {event.venueName && event.mode !== 'in_person' ? ` · ${MODE_LABEL[event.mode]}` : ''}
        </p>
        {event.organizationName && (
          <p className="mt-auto border-t border-onyx pt-2 font-mono text-xs uppercase tracking-wider text-ink-muted">
            {event.organizationName}
          </p>
        )}
      </div>
    </Link>
  );
}