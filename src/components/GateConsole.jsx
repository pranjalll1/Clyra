'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
const fmtTime = (d) => (d ? timeFmt.format(new Date(d)) : '');

// What the big result banner says for each answer from the server.
const RESULT = {
  valid: { tone: 'bg-lime', title: 'Access granted', sub: 'Valid ticket' },
  duplicate: { tone: 'bg-coral-light', title: 'Already checked in', sub: 'This ticket was already used' },
  invalid: { tone: 'bg-coral', title: 'Invalid ticket', sub: 'Not a CLyRA ticket, or the code was not found' },
  wrong_event: { tone: 'bg-coral', title: 'Wrong event', sub: 'This ticket is for a different event' },
  cancelled: { tone: 'bg-coral', title: 'Ticket cancelled', sub: 'The student cancelled this registration' },
};

export default function GateConsole() {
  const { id } = useParams();

  const [roster, setRoster] = useState(null); // { event, items, stats }
  const [rosterError, setRosterError] = useState(null);
  const [q, setQ] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [camError, setCamError] = useState('');
  const [manualCode, setManualCode] = useState('');

  const videoRef = useRef(null);
  const busyRef = useRef(false);
  const lastScanRef = useRef({ code: '', at: 0 });
  const submitRef = useRef(null);

  const loadRoster = useCallback(async () => {
    try {
      setRoster(await api(`/events/${id}/roster?q=${encodeURIComponent(q)}`));
      setRosterError(null);
    } catch (e) {
      setRosterError(e);
    }
  }, [id, q]);

  // Load the roster on open, and again (after a short pause) when the search text changes.
  useEffect(() => {
    const t = setTimeout(loadRoster, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadRoster, q]);

  // body is { code } from a scan or typed entry, or { registrationId } from the roster button.
  const submit = useCallback(async (body) => {
    if (busyRef.current) return; // ignore scans while one is still being checked
    busyRef.current = true;
    setBusy(true);
    try {
      const d = await api(`/events/${id}/check-in`, { method: 'POST', body });
      setResult({ ...d, at: new Date() });
      loadRoster();
    } catch (e) {
      setResult({ result: 'error', message: e.message, at: new Date() });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [id, loadRoster]);
  submitRef.current = submit; // the camera callback below always calls the latest version

  async function revert(registrationId) {
    try {
      await api(`/events/${id}/check-in/${registrationId}`, { method: 'DELETE' });
      setResult(null);
    } catch (e) {
      setResult({ result: 'error', message: e.message, at: new Date() });
    }
    loadRoster();
  }

  // Start or stop the camera scanner.
  useEffect(() => {
    if (!cameraOn) return undefined;
    let scanner;
    let cancelled = false;
    (async () => {
      try {
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled || !videoRef.current) return;
        scanner = new QrScanner(
          videoRef.current,
          (res) => {
            const code = res.data;
            const last = lastScanRef.current;
            const now = Date.now();
            if (last.code === code && now - last.at < 4000) return; // same QR still in front of the camera
            lastScanRef.current = { code, at: now };
            submitRef.current({ code });
          },
          { returnDetailedScanResult: true, preferredCamera: 'environment', highlightScanRegion: true, maxScansPerSecond: 5 }
        );
        await scanner.start();
      } catch {
        setCamError('Could not start the camera. Allow camera access in the browser, or type the ticket code below.');
        setCameraOn(false);
      }
    })();
    return () => { cancelled = true; scanner?.destroy(); };
  }, [cameraOn]);

  function submitManual(e) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    submit({ code: manualCode });
    setManualCode('');
  }

  if (rosterError && !roster) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="card p-8 text-center shadow-tactile">
          <p className="font-syne text-3xl font-extrabold">{rosterError.status === 404 ? 'Event not found' : 'Something went wrong'}</p>
          <p className="mt-2 text-sm">{rosterError.status === 404 ? 'It does not exist, or you do not manage it.' : rosterError.message}</p>
          <Link href="/organizer" className="btn-primary mt-6 inline-block">Back to your events</Link>
        </div>
      </section>
    );
  }
  if (!roster) return <p className="label-caps mx-auto max-w-7xl px-4 py-10">Loading gate...</p>;

  const { event, items, stats } = roster;
  const remaining = Math.max(0, stats.registered - stats.checkedIn);
  const pct = stats.registered ? Math.round((stats.checkedIn / stats.registered) * 100) : 0;
  const view = result ? (RESULT[result.result] || { tone: 'bg-coral', title: 'Something went wrong', sub: result.message || '' }) : null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <Link href="/organizer" className="font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4">← Your events</Link>
      <p className="sticker mt-4 inline-block -rotate-1">Live check-in</p>
      <h1 className="mt-3 break-words font-syne text-3xl font-extrabold leading-none tracking-tighter md:text-5xl">{event.title}</h1>
      <p className="label-caps mt-2 text-ink-muted">{event.shortCode}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-4 shadow-tactile">
          <p className="label-caps text-ink-muted">Checked in</p>
          <p className="mt-1 font-syne text-5xl font-extrabold leading-none">
            {stats.checkedIn} <span className="text-xl text-ink-muted">/ {stats.registered}</span>
          </p>
          <div className="mt-3 h-2 border border-onyx bg-surface"><div className="h-full bg-lime" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="card p-4 shadow-tactile">
          <p className="label-caps text-ink-muted">Still to arrive</p>
          <p className="mt-1 font-syne text-5xl font-extrabold leading-none">{remaining}</p>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-ink-muted">Registered but not scanned</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* LEFT: camera, result, manual code */}
        <div className="space-y-4">
          <div className="card shadow-tactile">
            <div className="relative aspect-video border-b-[1.5px] border-onyx bg-onyx">
              <video ref={videoRef} className={`h-full w-full object-cover ${cameraOn ? '' : 'hidden'}`} muted playsInline />
              {!cameraOn && (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-surface">
                  <p className="font-mono text-xs uppercase tracking-wider">Camera is off</p>
                  <button type="button" onClick={() => { setCamError(''); setCameraOn(true); }} className="btn-primary">Start camera</button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">{cameraOn ? 'Point at a student QR code' : 'Scan or type a ticket code'}</p>
              {cameraOn && <button type="button" className="chip" onClick={() => setCameraOn(false)}>Stop camera</button>}
            </div>
          </div>
          {camError && <p role="alert" className="card border-coral-dark bg-coral-light p-3 text-sm">{camError}</p>}

          <div aria-live="assertive">
            {view && (
              <div className={`card p-4 shadow-tactile ${view.tone}`}>
                <p className="font-syne text-2xl font-extrabold">{view.title}</p>
                <p className="text-sm">{view.sub}</p>
                {result.attendee && (
                  <div className="mt-3 border-t border-onyx pt-3 text-sm">
                    <p className="font-bold">{result.attendee.name}</p>
                    <p className="font-mono text-xs uppercase tracking-wider">
                      {result.attendee.ticketCode}
                      {result.result === 'duplicate' && result.attendee.checkedInAt ? ` · first scanned ${fmtTime(result.attendee.checkedInAt)}` : ` · ${fmtTime(result.at)}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={submitManual} className="card flex flex-wrap gap-2 p-3">
            <label className="flex-1">
              <span className="sr-only">Ticket code</span>
              <input className="field" placeholder="Type ticket code, e.g. TK-8F3K2Q9X" value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
            </label>
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">Check in</button>
          </form>
        </div>

        {/* RIGHT: roster */}
        <div className="card h-fit p-4 shadow-tactile">
          <h2 className="font-syne text-xl font-extrabold">Roster</h2>
          <label className="mt-3 block">
            <span className="sr-only">Search attendees</span>
            <input className="field" type="search" placeholder="Search by name, email or ticket..." value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {rosterError && <p role="alert" className="mt-3 text-sm text-coral-dark">Could not refresh the roster.</p>}

          <ul className="mt-4 divide-y divide-onyx border-y border-onyx">
            {items.map((a) => (
              <li key={a.registrationId} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${a.checkedInAt ? 'bg-lime-muted' : ''}`}>
                <div className="min-w-0 px-1">
                  <p className="truncate font-syne text-lg font-extrabold leading-tight">{a.name}</p>
                  <p className="truncate font-mono text-xs text-ink-muted">{a.ticketCode}{a.department ? ` · ${a.department}` : ''}</p>
                  <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider">{a.checkedInAt ? `Checked in ${fmtTime(a.checkedInAt)}` : 'Not arrived'}</p>
                </div>
                {a.checkedInAt ? (
                  <button type="button" className="btn-ghost" onClick={() => revert(a.registrationId)}>Revert</button>
                ) : (
                  <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={() => submit({ registrationId: a.registrationId })}>Manual check-in</button>
                )}
              </li>
            ))}
          </ul>
          {items.length === 0 && <p className="py-6 text-center text-sm">{q ? 'No attendee matches.' : 'No registrations for this event yet.'}</p>}
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-ink-muted">Showing up to 100 attendees</p>
        </div>
      </div>
    </section>
  );
}