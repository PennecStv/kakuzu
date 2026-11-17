import { Pipette } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { parseAmount, toInput } from '../lib/money';
import { IconPicker } from './CategoryIcon';
import type { IconId } from '../store/icons';
import { fallbackCategory, useStore } from '../store/store';
import type { Category, Kind } from '../store/types';

interface Props {
  kind: Kind;
  editing?: Category;
  onDone: (message: string) => void;
}

/**
 * Category colors, the same in every theme: the eight slots of the validated palette in
 * tokens.css, then four more hues that fill its gaps. The pipette gives any other color.
 */
const SWATCHES: [number | string, string][] = [
  [0, 'Bleu'],
  [1, 'Orange'],
  [2, 'Émeraude'],
  [3, 'Ocre'],
  [4, 'Rose'],
  [5, 'Vert'],
  [6, 'Lavande'],
  [7, 'Rouge'],
  ['#a5a50e', 'Olive'],
  ['#1bb3ba', 'Turquoise'],
  ['#19ade2', 'Cyan'],
  ['#cc77df', 'Violet'],
];

export function CategoryForm({ kind, editing, onDone }: Props) {
  const currency = useStore((s) => s.settings.currency);
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState<IconId>(editing?.icon ?? 'tag');
  const [color, setColor] = useState<number | string>(editing?.color ?? 0);
  const [budget, setBudget] = useState(editing?.budget ? toInput(editing.budget, currency) : '');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const fallback = fallbackCategory(categories, kind, editing?.id);
  const custom = typeof color === 'string' && !SWATCHES.some(([value]) => value === color);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Donnez un nom à la catégorie.');
      return;
    }
    const limit = budget.trim() ? parseAmount(budget, currency) : null;
    if (budget.trim() && limit === null) {
      setError('Budget invalide.');
      return;
    }
    const data = { name: name.trim(), icon, color, budget: limit ?? undefined };
    if (editing) updateCategory(editing.id, data);
    else addCategory({ ...data, kind });
    onDone(editing ? 'Catégorie modifiée' : 'Catégorie créée');
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span>Nom</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          maxLength={24}
          autoFocus={!editing}
        />
      </label>

      <fieldset className="field">
        <legend>Icône</legend>
        <IconPicker value={icon} onChange={setIcon} />
      </fieldset>

      <fieldset className="field">
        <legend>Couleur</legend>
        <div className="swatches">
          {SWATCHES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={value === color ? 'is-on' : ''}
              style={{ background: typeof value === 'number' ? `var(--cat-${value})` : value }}
              aria-label={label}
              aria-pressed={value === color}
              onClick={() => setColor(value)}
            />
          ))}
          <label className={`swatches__custom${custom ? ' is-on' : ''}`} style={custom ? { background: color } : undefined}>
            <Pipette aria-hidden="true" />
            <input
              type="color"
              aria-label="Autre couleur"
              value={typeof color === 'string' ? color : '#8a93a8'}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      {kind === 'expense' && (
        <label className="field">
          <span>Budget mensuel</span>
          <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Aucun" />
        </label>
      )}

      <p className="form__error" role="alert">
        {error}
      </p>

      {confirming && editing && fallback ? (
        <div className="confirm">
          <p>
            Les opérations de « {editing.name} » passeront dans « {fallback.name} ».
          </p>
          <div className="form__actions">
            <button type="button" className="button" onClick={() => setConfirming(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="button button--danger"
              onClick={() => {
                deleteCategory(editing.id, fallback.id);
                onDone('Catégorie supprimée');
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <div className="form__actions">
          {editing && fallback && (
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
