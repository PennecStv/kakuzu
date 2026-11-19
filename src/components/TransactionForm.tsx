import { type FormEvent, useState } from 'react';
import { monthLabel, monthOf, shiftMonth, today } from '../lib/dates';
import { currencySymbol, parseAmount, toInput } from '../lib/money';
import { recurringAfter } from '../lib/recurring';
import { categoriesOf, useStore } from '../store/store';
import type { Kind, Transaction } from '../store/types';
import { CategoryPicker } from './CategoryPicker';
import { Segmented } from './Segmented';

interface Props {
  /** Absent for a new entry. */
  editing?: Transaction;
  /** Starting kind of a new entry. */
  kind?: Kind;
  onSaved: (t: Pick<Transaction, 'date' | 'kind' | 'amount'>) => void;
  onDelete: (t: Transaction) => void;
}

export function TransactionForm({ editing, kind: initialKind = 'expense', onSaved, onDelete }: Props) {
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const addRecurring = useStore((s) => s.addRecurring);
  const postRecurring = useStore((s) => s.postRecurring);

  const [kind, setKind] = useState<Kind>(editing?.kind ?? initialKind);
  const [amount, setAmount] = useState(editing ? toInput(editing.amount, currency) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [date, setDate] = useState(editing?.date ?? today());
  const [note, setNote] = useState(editing?.note ?? '');
  const [monthly, setMonthly] = useState(false);
  const [error, setError] = useState('');

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
    const entry = { kind, amount: minor, categoryId: selected.id, date: date || today(), note: note.trim() };
    if (editing) updateTransaction(editing.id, entry);
    else if (monthly) {
      addTransaction({ ...entry, recurringId: addRecurring(recurringAfter(entry)) });
      // An entry dated in a past month leaves the months since to fill in.
      postRecurring(monthOf(today()));
    } else addTransaction(entry);
    onSaved(entry);
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
        <span className="visually-hidden">Montant</span>
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
          aria-describedby="amount-error"
          autoFocus={!editing}
        />
        <span className="amount__currency">{currencySymbol(currency)}</span>
      </label>
      <p id="amount-error" className="form__error" role="alert">
        {error}
      </p>

      <CategoryPicker categories={choices} selected={selected} onSelect={setCategoryId} />

      <div className="form__row">
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field field--grow">
          <span>Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facultatif" maxLength={80} />
        </label>
      </div>

      {!editing && (
        <label className="switch">
          <span>
            Chaque mois
            <small>Puis le 1er de chaque mois, dès {monthLabel(shiftMonth(monthOf(date || today()), 1))}.</small>
          </span>
          <input type="checkbox" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} />
        </label>
      )}

      <div className="form__actions">
        {editing && (
          <button type="button" className="button button--danger" onClick={() => onDelete(editing)}>
            Supprimer
          </button>
        )}
        <button type="submit" className="button button--primary">
          {editing ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
}
