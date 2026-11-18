import { type FormEvent, useState } from 'react';
import { type MonthKey, monthLabel, monthOf, shiftMonth, today } from '../lib/dates';
import { currencySymbol, parseAmount, toInput } from '../lib/money';
import { categoriesOf, useStore } from '../store/store';
import type { Kind, Recurring } from '../store/types';
import { CategoryPicker } from './CategoryPicker';
import { Segmented } from './Segmented';

interface Props {
  /** Absent for a new recurring entry. */
  editing?: Recurring;
  onDone: (message: string) => void;
}

export function RecurringForm({ editing, onDone }: Props) {
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const addRecurring = useStore((s) => s.addRecurring);
  const updateRecurring = useStore((s) => s.updateRecurring);
  const deleteRecurring = useStore((s) => s.deleteRecurring);
  const postRecurring = useStore((s) => s.postRecurring);

  const thisMonth = monthOf(today());
  const [kind, setKind] = useState<Kind>(editing?.kind ?? 'expense');
  const [amount, setAmount] = useState(editing ? toInput(editing.amount, currency) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [start, setStart] = useState<MonthKey>(thisMonth);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const choices = categoriesOf(categories, kind);
  const selected = choices.find((c) => c.id === categoryId) ?? choices[0];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseAmount(amount, currency);
    if (minor === null) {
      setError('Montant invalide.');
      return;
    }
    if (!selected) {
      setError('Créez d’abord une catégorie.');
      return;
    }
    const fields = { kind, amount: minor, categoryId: selected.id, note: note.trim() };
    if (editing) {
      updateRecurring(editing.id, fields);
      onDone('Opération récurrente modifiée');
      return;
    }
    addRecurring({ ...fields, next: start });
    onDone(postRecurring(thisMonth) ? `Opération récurrente créée et ajoutée en ${monthLabel(thisMonth)}` : 'Opération récurrente créée');
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Segmented
        label="Type d’opération"
        value={kind}
        onChange={(k) => {
          setKind(k);
          setCategoryId('');
        }}
        options={[
          { value: 'expense', label: 'Dépense' },
          { value: 'income', label: 'Revenu' },
        ]}
      />

      <label className="amount">
        <span className="visually-hidden">Montant chaque mois</span>
        <input
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          aria-invalid={error !== ''}
          aria-describedby="recurring-error"
          autoFocus={!editing}
        />
        <span className="amount__currency">{currencySymbol(currency)}</span>
      </label>
      <p id="recurring-error" className="form__error" role="alert">
        {error}
      </p>

      <CategoryPicker categories={choices} selected={selected} onSelect={setCategoryId} />

      <label className="field">
        <span>Note</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Loyer, salaire" maxLength={80} />
      </label>

      {editing ? (
        <p className="hint">
          Prochain ajout le 1er {monthLabel(editing.next)}. Les opérations déjà ajoutées ne changent pas : modifiez-les depuis
          la liste des opérations.
        </p>
      ) : (
        <div className="field">
          <span>Premier ajout, le 1er du mois</span>
          <Segmented
            label="Premier ajout"
            value={start}
            onChange={setStart}
            options={[
              { value: thisMonth, label: 'Ce mois-ci' },
              { value: shiftMonth(thisMonth, 1), label: 'Le mois prochain' },
            ]}
          />
        </div>
      )}

      {confirming && editing ? (
        <div className="confirm">
          <p>Supprimer « {editing.note || selected?.name} » ? Les opérations déjà ajoutées restent.</p>
          <div className="form__actions">
            <button type="button" className="button" onClick={() => setConfirming(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="button button--danger"
              onClick={() => {
                deleteRecurring(editing.id);
                onDone('Opération récurrente supprimée');
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
          <button type="submit" className="button button--primary">
            {editing ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      )}
    </form>
  );
}
