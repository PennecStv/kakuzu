import { type FormEvent, useState } from 'react';
import { today } from '../lib/dates';
import { currencySymbol, parseAmount, toInput } from '../lib/money';
import { categoriesOf, useStore } from '../store/store';
import type { Kind, Transaction } from '../store/types';
import { CategoryIcon } from './CategoryIcon';
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

  const [kind, setKind] = useState<Kind>(editing?.kind ?? initialKind);
  const [amount, setAmount] = useState(editing ? toInput(editing.amount, currency) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [date, setDate] = useState(editing?.date ?? today());
  const [note, setNote] = useState(editing?.note ?? '');
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
    else addTransaction(entry);
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

      <fieldset className="field">
        <legend>Catégorie</legend>
        <div className="picker">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`picker__item${c.id === selected?.id ? ' is-on' : ''}`}
              aria-pressed={c.id === selected?.id}
              onClick={() => setCategoryId(c.id)}
            >
              <CategoryIcon category={c} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </fieldset>

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
