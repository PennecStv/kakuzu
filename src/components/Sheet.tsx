import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom sheet on a native modal <dialog>: focus trap, Escape and inert page come for free. */
export function Sheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // React's autoFocus runs before the dialog shows, while nothing in it can take the focus.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={(e) => {
        // React passes close up its tree: a sheet opened from another one would close both.
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        // A click on the dialog box itself, outside the panel, is a click on the backdrop.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet__panel">
        <div className="sheet__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
            <X aria-hidden="true" />
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}
