import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type Period, type Unit, periodLabel, shiftPeriod, today, unitOf, withUnit } from '../lib/dates';
import { Segmented } from './Segmented';

interface Props {
  period: Period;
  onChange: (period: Period) => void;
}

const COPY: Record<Unit, { previous: string; next: string; back: string }> = {
  day: { previous: 'Jour précédent', next: 'Jour suivant', back: 'revenir à aujourd’hui' },
  month: { previous: 'Mois précédent', next: 'Mois suivant', back: 'revenir au mois en cours' },
  year: { previous: 'Année précédente', next: 'Année suivante', back: 'revenir à l’année en cours' },
};

export function PeriodSwitcher({ period, onChange }: Props) {
  const unit = unitOf(period);
  const current = withUnit(today(), unit);
  const label = periodLabel(period);
  return (
    <div className="period">
      <div className="month">
        <button type="button" className="icon-button" onClick={() => onChange(shiftPeriod(period, -1))} aria-label={COPY[unit].previous}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="month__label"
          onClick={() => onChange(current)}
          disabled={period === current}
          aria-label={period === current ? label : `${label}, ${COPY[unit].back}`}
        >
          {label}
        </button>
        <button type="button" className="icon-button" onClick={() => onChange(shiftPeriod(period, 1))} aria-label={COPY[unit].next}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <Segmented
        label="Période"
        value={unit}
        onChange={(u) => onChange(withUnit(period, u))}
        options={[
          { value: 'day', label: 'Jour' },
          { value: 'month', label: 'Mois' },
          { value: 'year', label: 'Année' },
        ]}
      />
    </div>
  );
}
