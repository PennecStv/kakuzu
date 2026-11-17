import { useEffect } from 'react';
import type { Kind } from '../store/types';

export interface ToastMessage {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  /** Shown above the text, in bold: the amount just added. */
  figure?: string;
  /** Colors the message green for money in, red for money out. */
  tone?: Kind;
}

interface Props {
  toast: ToastMessage | null;
  onDone: () => void;
}

export function Toast({ toast, onDone }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDone, 5000);
    return () => window.clearTimeout(timer);
  }, [toast, onDone]);

  return (
    <div className="toast-zone" role="status" aria-live="polite">
      {toast && (
        <div className={`toast${toast.tone ? ` toast--${toast.tone}` : ''}`} key={toast.id}>
          <span className="toast__text">
            {toast.figure && <strong>{toast.figure}</strong>}
            {toast.text}
          </span>
          {toast.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.action?.run();
                onDone();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
