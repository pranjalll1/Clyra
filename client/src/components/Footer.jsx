import Link from 'next/link';

const linkCls = 'underline-offset-4 hover:text-lime hover:underline';

export default function Footer() {
  return (
    <footer className="mt-16 border-t-2 border-onyx bg-onyx text-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        <div>
          <p className="font-syne text-3xl font-extrabold tracking-tight">CLYRA</p>
          <p className="mt-3 max-w-sm text-[15px] text-surface/80">
            Find, register for and run events at Lovely Professional University, with venue clash checks, QR tickets and live updates.
          </p>
        </div>

        <nav aria-label="Explore">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-lime">Explore</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li><Link href="/events" className={linkCls}>Browse events</Link></li>
            <li><Link href="/login?tab=register" className={linkCls}>Create an account</Link></li>
            <li><Link href="/login" className={linkCls}>Sign in</Link></li>
            <li><Link href="/organizer" className={linkCls}>Organize an event</Link></li>
          </ul>
        </nav>

        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-lime">Contact</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li><a href="mailto:pranjalsoni1290@gmail.com" className={linkCls}>pranjalsoni1290@gmail.com</a></li>
            <li><a href="https://github.com/pranjalll1" target="_blank" rel="noopener noreferrer" className={linkCls}>GitHub<span className="sr-only"> (opens in a new tab)</span></a></li>
            <li><a href="https://www.linkedin.com/in/pranjal-soni24/" target="_blank" rel="noopener noreferrer" className={linkCls}>LinkedIn<span className="sr-only"> (opens in a new tab)</span></a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-surface/20 px-4 py-4 md:px-6">
        <p className="mx-auto max-w-7xl font-mono text-xs uppercase tracking-wider text-surface/70">&copy; 2026 Clyra &middot; Campus events at LPU</p>
      </div>
    </footer>
  );
}
