import { CircleCheck, TriangleAlert } from 'lucide-react';
import type { CSSProperties } from 'react';
import { today } from '../lib/dates';
import { LEAD_DAYS, deadlineLabel, urgency } from '../lib/goals';
import { formatMoney } from '../lib/money';
import type { Goal } from '../store/types';

interface Props {
  goals: Goal[];
  currency: string;
  onOpen: (goal: Goal) => void;
}

export function GoalList({ goals, currency, onOpen }: Props) {
  const now = today();
  return (
    <ul className="goals">
      {goals.map((g) => {
        const share = Math.min(1, g.saved / g.target);
        const done = share === 1;
        const pressing = urgency(g, now, LEAD_DAYS) !== 'none';
        return (
          <li key={g.id}>
            <button
              type="button"
              className={`goal${done ? ' is-done' : ''}`}
              data-goal={g.id}
              style={{ '--fill': `${share * 100}%` } as CSSProperties}
              onClick={() => onOpen(g)}
            >
              <span className="goal__name">
                {done && <CircleCheck aria-hidden="true" />}
                {pressing && <TriangleAlert className="goal__alert" aria-hidden="true" />}
                {g.name}
              </span>
              <span className="split__share">{Math.floor(share * 100)} %</span>
              <span className="split__amount">{formatMoney(g.saved, currency)}</span>
              <span className="budget">
                <span className="budget__bar">
                  <span />
                </span>
                <span className="budget__text">{done ? 'Atteint' : `sur ${formatMoney(g.target, currency)}`}</span>
              </span>
              {g.deadline && !done && (
                <span className={`goal__due${pressing ? ' is-pressing' : ''}`}>{deadlineLabel(g.deadline, now, pressing)}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
