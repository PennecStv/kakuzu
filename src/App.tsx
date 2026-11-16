import { useCallback, useEffect, useState } from 'react';
import { THEMES } from './ascii/themes';
import { AsciiBackground } from './components/AsciiBackground';
import { BottomNav, type Tab } from './components/BottomNav';
import { CategoryForm } from './components/CategoryForm';
import { Sheet } from './components/Sheet';
import { Toast, type ToastMessage } from './components/Toast';
import { ThemeIcon } from './components/ThemeIcon';
import { TransactionForm } from './components/TransactionForm';
import { Wordmark } from './components/Wordmark';
import { monthOf, today } from './lib/dates';
import { Categories } from './screens/Categories';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';
import { useStore } from './store/store';
import type { Category, Kind, ThemeId, Transaction } from './store/types';

const TITLES: Record<Exclude<Tab, 'home'>, string> = {
  history: 'Opérations',
  categories: 'Catégories',
  settings: 'Réglages',
};

const THEME_ORDER = Object.keys(THEMES) as ThemeId[];

export function App() {
  const theme = useStore((s) => s.settings.theme);
  const motion = useStore((s) => s.settings.motion);
  const setSettings = useStore((s) => s.setSettings);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const restoreTransaction = useStore((s) => s.restoreTransaction);

  const [tab, setTab] = useState<Tab>('home');
  const [month, setMonth] = useState(() => monthOf(today()));
  const [txSheet, setTxSheet] = useState<{ editing?: Transaction } | null>(null);
  const [catSheet, setCatSheet] = useState<{ kind: Kind; editing?: Category } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((text: string, action?: ToastMessage['action']) => setToast({ id: Date.now(), text, action }), []);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', THEMES[theme].accent);
  }, [theme]);

  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const openTransaction = (t?: Transaction) => setTxSheet({ editing: t });

  const removeTransaction = (t: Transaction) => {
    deleteTransaction(t.id);
    setTxSheet(null);
    notify('Opération supprimée', { label: 'Annuler', run: () => restoreTransaction(t) });
  };

  const current = THEMES[theme];
  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];

  return (
    <>
      <AsciiBackground theme={theme} motion={motion} />

      <div className="app">
        <header className="top">
          <h1>{tab === 'home' ? <Wordmark /> : TITLES[tab]}</h1>
          <button
            type="button"
            className="theme-chip"
            onClick={() => setSettings({ theme: nextTheme })}
            aria-label={`Thème ${current.name}, passer à ${THEMES[nextTheme].name}`}
          >
            <ThemeIcon theme={theme} />
          </button>
        </header>

        <main className="screen">
          {tab === 'home' && (
            <Home
              month={month}
              onMonth={setMonth}
              onOpen={openTransaction}
              onAdd={() => openTransaction()}
              onSeeAll={() => go('history')}
            />
          )}
          {tab === 'history' && <History month={month} onMonth={setMonth} onOpen={openTransaction} />}
          {tab === 'categories' && <Categories month={month} onEdit={(kind, editing) => setCatSheet({ kind, editing })} />}
          {tab === 'settings' && <Settings notify={notify} />}
        </main>
      </div>

      <BottomNav tab={tab} onChange={go} onAdd={() => openTransaction()} />

      <Sheet
        open={txSheet !== null}
        title={txSheet?.editing ? 'Modifier l’opération' : 'Nouvelle opération'}
        onClose={() => setTxSheet(null)}
      >
        <TransactionForm
          key={txSheet?.editing?.id ?? 'new'}
          editing={txSheet?.editing}
          onDelete={removeTransaction}
          onSaved={(t) => {
            notify(txSheet?.editing ? 'Opération modifiée' : 'Opération ajoutée');
            setTxSheet(null);
            setMonth(monthOf(t.date));
          }}
        />
      </Sheet>

      <Sheet
        open={catSheet !== null}
        title={catSheet?.editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        onClose={() => setCatSheet(null)}
      >
        {catSheet && (
          <CategoryForm
            key={catSheet.editing?.id ?? 'new'}
            kind={catSheet.kind}
            editing={catSheet.editing}
            onDone={(message) => {
              setCatSheet(null);
              notify(message);
            }}
          />
        )}
      </Sheet>

      <Toast toast={toast} onDone={clearToast} />
    </>
  );
}
