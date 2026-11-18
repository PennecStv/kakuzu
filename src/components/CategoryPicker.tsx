import type { Category } from '../store/types';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  categories: Category[];
  selected: Category | undefined;
  onSelect: (id: string) => void;
}

export function CategoryPicker({ categories, selected, onSelect }: Props) {
  return (
    <fieldset className="field">
      <legend>Catégorie</legend>
      <div className="picker">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`picker__item${c.id === selected?.id ? ' is-on' : ''}`}
            aria-pressed={c.id === selected?.id}
            onClick={() => onSelect(c.id)}
          >
            <CategoryIcon category={c} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
