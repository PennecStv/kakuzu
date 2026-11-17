import { ChartPie, type LucideIcon, Plus, ReceiptText, Settings, Shapes } from 'lucide-react';

export type Tab = 'home' | 'history' | 'categories' | 'settings';

const TABS: { id: Tab; Icon: LucideIcon; label: string }[] = [
  { id: 'home', Icon: ChartPie, label: 'Accueil' },
  { id: 'history', Icon: ReceiptText, label: 'Suivi' },
  { id: 'categories', Icon: Shapes, label: 'Catégories' },
  { id: 'settings', Icon: Settings, label: 'Réglages' },
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
      <t.Icon className="nav__icon" aria-hidden="true" />
      <span>{t.label}</span>
    </button>
  );

  return (
    <nav className="nav" aria-label="Navigation principale">
      {TABS.slice(0, 2).map(item)}
      <button type="button" className="nav__add" onClick={onAdd} aria-label="Ajouter une opération">
        <Plus aria-hidden="true" />
      </button>
      {TABS.slice(2).map(item)}
    </nav>
  );
}
