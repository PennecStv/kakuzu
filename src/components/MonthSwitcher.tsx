import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type MonthKey, monthLabel, monthOf, shiftMonth, today } from '../lib/dates';

interface Props {
  month: MonthKey;
  onChange: (month: MonthKey) => void;
}

export function MonthSwitcher({ month, onChange }: Props) {
  const current = monthOf(today());
  return (
    <div className="month">
      <button type="button" className="icon-button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mois précédent">
        <ChevronLeft aria-hidden="true" />
      </button>
      <button
        type="button"
        className="month__label"
        onClick={() => onChange(current)}
        disabled={month === current}
        aria-label={month === current ? monthLabel(month) : `${monthLabel(month)}, revenir au mois en cours`}
      >
        {monthLabel(month)}
      </button>
      <button type="button" className="icon-button" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Mois suivant">
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}
