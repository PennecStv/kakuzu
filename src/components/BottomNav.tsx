export type Tab = 'home' | 'history' | 'categories' | 'settings';

const TABS: { id: Tab; glyph: string; label: string }[] = [
  { id: 'home', glyph: '総', label: 'Accueil' },
  { id: 'history', glyph: '録', label: 'Opérations' },
  { id: 'categories', glyph: '類', label: 'Catégories' },
  { id: 'settings', glyph: '設', label: 'Réglages' },
];

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
  onAdd: () => void;
}

export function BottomNav({ tab, onChange, onAdd }: Props) {
  const item = (t: (typeof TABS)[number]) => (
    <button
      key={t.id}
      type="button"
      className={`nav__item${t.id === tab ? ' is-on' : ''}`}
      aria-current={t.id === tab ? 'page' : undefined}
      onClick={() => onChange(t.id)}
    >
      <span className="nav__glyph" aria-hidden="true">
        {t.glyph}
      </span>
      <span>{t.label}</span>
    </button>
  );

  return (
    <nav className="nav" aria-label="Navigation principale">
      {TABS.slice(0, 2).map(item)}
      <button type="button" className="nav__add" onClick={onAdd} aria-label="Ajouter une opération">
        +
      </button>
      {TABS.slice(2).map(item)}
    </nav>
  );
}
