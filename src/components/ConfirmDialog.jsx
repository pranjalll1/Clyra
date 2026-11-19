'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// A centred "are you sure?" card. tone="danger" makes the confirm button coral.
// `children` is optional extra content (for example a reason box).
// `confirmDisabled` keeps the confirm button off until the form inside is valid.
export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', tone = 'primary', busy = false, confirmDisabled = false, onConfirm, onClose, children,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-onyx/60 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="card w-full max-w-md bg-surface p-6 shadow-tactile-lg">
        <h2 id="confirm-title" className="font-syne text-2xl font-extrabold leading-tight">{title}</h2>
        {message && <p className="mt-3 text-sm">{message}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Go back</button>
          <button
            ref={confirmRef}
            type="button"
            className={`${tone === 'danger' ? 'btn-coral' : 'btn-primary'} disabled:opacity-50`}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
const ConfirmContext = createContext(null);

// Promise-based confirm: const ok = await confirm({ title, message, confirmLabel, tone });
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { options, resolve } or null

  const confirm = useCallback(
    (options = {}) => new Promise((resolve) => setState({ options, resolve })),
    []
  );

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={!!state}
        title={state?.options.title}
        message={state?.options.message}
        confirmLabel={state?.options.confirmLabel}
        tone={state?.options.tone}
        onConfirm={() => close(true)}
        onClose={() => close(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return confirm;
}
