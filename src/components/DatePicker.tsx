import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { type DayKey, dateFieldLabel, fullDay, monthGrid, monthLabel, monthOf, shiftMonth, shiftPeriod, today } from '../lib/dates';
import { Sheet } from './Sheet';

interface Props {
  /** Id of the element that names the field. */
  labelledBy: string;
  /** Title of the window the calendar opens in. */
  title: string;
  /** Empty when no day is picked. */
  value: DayKey | '';
  /** Shown while no day is picked. */
  placeholder?: string;
  onChange: (day: DayKey) => void;
}

/**
 * A date field in the app's own style, instead of the system picker: a button that opens a
 * calendar in a sheet. One tap on a day picks it and closes.
 */
export function DatePicker({ labelledBy, title, value, placeholder = '', onChange }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`date-field${value ? '' : ' is-empty'}`}
        aria-haspopup="dialog"
        aria-labelledby={`${labelledBy} ${id}-value`}
        onClick={() => setOpen(true)}
      >
        <span id={`${id}-value`}>{value ? dateFieldLabel(value) : placeholder}</span>
        <CalendarDays aria-hidden="true" />
      </button>
      <Sheet open={open} title={title} onClose={() => setOpen(false)}>
        <Calendar
          value={value}
          onPick={(day) => {
            onChange(day);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const KEY_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

function Calendar({ value, onPick }: { value: DayKey | ''; onPick: (day: DayKey) => void }) {
  const now = today();
  const [month, setMonth] = useState(monthOf(value || now));
  // The one day the Tab key reaches; the arrows move it.
  const [cursor, setCursor] = useState<DayKey>(value || now);
  const grid = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const days = monthGrid(month);
  const reachable = monthOf(cursor) === month ? cursor : `${month}-01`;

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${cursor}"]`)?.focus();
  }, [cursor]);

  const keys = (e: KeyboardEvent) => {
    const step = KEY_STEPS[e.key];
    const months = e.key === 'PageUp' ? -1 : e.key === 'PageDown' ? 1 : 0;
    if (step === undefined && months === 0) return;
    e.preventDefault();
    const next = step === undefined ? `${shiftMonth(monthOf(reachable), months)}-01` : shiftPeriod(reachable, step);
    moved.current = true;
    setCursor(next);
    setMonth(monthOf(next));
  };

  return (
    <div className="calendar">
      <div className="month">
        <button type="button" className="icon-button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mois précédent">
          <ChevronLeft aria-hidden="true" />
        </button>
        <p className="calendar__month" aria-live="polite">
          {monthLabel(month)}
        </p>
        <button type="button" className="icon-button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mois suivant">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="calendar__weekdays" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div ref={grid} className="calendar__grid" onKeyDown={keys}>
        {days.map((day, i) =>
          day ? (
            <button
              key={day}
              type="button"
              className="calendar__day"
              data-day={day}
              data-autofocus={day === reachable ? '' : undefined}
              tabIndex={day === reachable ? 0 : -1}
              aria-label={fullDay(day)}
              aria-pressed={day === value}
              aria-current={day === now ? 'date' : undefined}
              onClick={() => onPick(day)}
            >
              {Number(day.slice(8))}
            </button>
          ) : (
            <span key={`blank-${i}`} />
          ),
        )}
      </div>

      <div className="form__actions">
        <button type="button" className="button" onClick={() => onPick(now)}>
          Aujourd'hui
        </button>
      </div>
    </div>
  );
}
