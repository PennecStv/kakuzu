import { Check, ChevronDown } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

interface Props<T extends string> {
  /** Id of the element that names the control. */
  labelledBy: string;
  value: T;
  /** `detail` is shown after the label, quieter: a currency's symbol. */
  options: readonly { value: T; label: string; detail?: string }[];
  onChange: (value: T) => void;
}

/**
 * A select in the app's own style, instead of the system picker: a button that opens a list
 * under it. Arrows, Home and End move, Enter or Space picks, Escape or a tap outside closes.
 */
export function Dropdown<T extends string>({ labelledBy, value, options, onChange }: Props<T>) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  const pick = (next: T) => {
    onChange(next);
    close();
  };

  const keys = (e: KeyboardEvent) => {
    const last = options.length - 1;
    const to = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: last }[e.key];
    const chosen = options[active];
    if (to !== undefined) setActive(Math.min(last, Math.max(0, to)));
    else if ((e.key === 'Enter' || e.key === ' ') && chosen) pick(chosen.value);
    else if (e.key === 'Escape') close();
    else if (e.key === 'Tab') setOpen(false);
    else return;
    if (e.key !== 'Tab') e.preventDefault();
  };

  return (
    <div ref={root} className={`dropdown${open ? ' is-open' : ''}`}>
      <button
        ref={button}
        type="button"
        className="dropdown__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelledBy} ${id}-value`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();
          show();
        }}
      >
        <span id={`${id}-value`}>
          {current?.label}
          {current?.detail && <span className="dropdown__detail">{current.detail}</span>}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={list}
          className="dropdown__list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelledBy}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={keys}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={i === active ? 'is-active' : ''}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(o.value)}
            >
              <span>
                {o.label}
                {o.detail && <span className="dropdown__detail">{o.detail}</span>}
              </span>
              {o.value === value && <Check aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
