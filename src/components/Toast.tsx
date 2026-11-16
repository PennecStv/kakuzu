import { useEffect } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
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
        <div className="toast" key={toast.id}>
          <span>{toast.text}</span>
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
