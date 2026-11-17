import { type FormEvent, useState } from 'react';
import { currencySymbol, formatMoney, parseAmount, toInput } from '../lib/money';
import { useStore } from '../store/store';
import type { Goal } from '../store/types';

interface Props {
  /** Absent for a new goal. */
  editing?: Goal;
  /** `reached` when a payment just took the goal to its target. */
  onDone: (message: string, reached?: boolean) => void;
}

export function GoalForm({ editing, onDone }: Props) {
  const currency = useStore((s) => s.settings.currency);
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);

  const [amount, setAmount] = useState('');
  const [moveError, setMoveError] = useState('');
  const [name, setName] = useState(editing?.name ?? '');
  const [target, setTarget] = useState(editing ? toInput(editing.target, currency) : '');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const move = (goal: Goal, sign: 1 | -1) => {
    const minor = parseAmount(amount, currency);
    if (minor === null) {
      setMoveError('Montant invalide.');
      return;
    }
    if (sign < 0 && minor > goal.saved) {
      setMoveError(`Il n’y a que ${formatMoney(goal.saved, currency)} de côté.`);
      return;
    }
    const saved = goal.saved + sign * minor;
    updateGoal(goal.id, { saved });
    if (goal.saved < goal.target && saved >= goal.target) onDone(`Objectif atteint : ${goal.name}`, true);
    else onDone(`${formatMoney(minor, currency)} ${sign > 0 ? 'versés' : 'retirés'}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Donnez un nom à l’objectif.');
      return;
    }
    const minor = parseAmount(target, currency);
    if (minor === null) {
      setError('Montant visé invalide.');
      return;
    }
    if (editing) updateGoal(editing.id, { name: name.trim(), target: minor });
    else addGoal({ name: name.trim(), target: minor, saved: 0 });
    onDone(editing ? 'Objectif modifié' : 'Objectif créé');
  };

  return (
    <>
      {editing && (
        <div className="form goal-move">
          <p className="label">
            {formatMoney(editing.saved, currency)} de côté sur {formatMoney(editing.target, currency)}
          </p>
          <label className="amount">
            <span className="visually-hidden">Montant à verser ou retirer</span>
            <input
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setMoveError('');
              }}
              aria-invalid={moveError !== ''}
            />
            <span className="amount__currency">{currencySymbol(currency)}</span>
          </label>
          <p className="form__error" role="alert">
            {moveError}
          </p>
          <div className="form__actions">
            <button type="button" className="button" onClick={() => move(editing, -1)}>
              Retirer
            </button>
            <button type="button" className="button button--primary" onClick={() => move(editing, 1)}>
              Verser
            </button>
          </div>
        </div>
      )}

      <form className="form" onSubmit={submit} noValidate>
        <label className="field">
          <span>Nom</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            maxLength={32}
            placeholder="PC neuf, Livret A"
            autoFocus={!editing}
          />
        </label>

        <label className="field">
          <span>Montant visé</span>
          <input
            inputMode="decimal"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setError('');
            }}
            placeholder={`500 ${currencySymbol(currency)}`}
          />
        </label>

        <p className="form__error" role="alert">
          {error}
        </p>

        {confirming && editing ? (
          <div className="confirm">
            <p>Supprimer l’objectif « {editing.name} » ?</p>
            <div className="form__actions">
              <button type="button" className="button" onClick={() => setConfirming(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={() => {
                  deleteGoal(editing.id);
                  onDone('Objectif supprimé');
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="form__actions">
            {editing && (
              <button type="button" className="button button--danger" onClick={() => setConfirming(true)}>
                Supprimer
              </button>
            )}
            {/* "Verser" is the main action of an existing goal. */}
            <button type="submit" className={editing ? 'button' : 'button button--primary'}>
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        )}
      </form>
    </>
  );
}
