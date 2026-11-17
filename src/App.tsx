import { useCallback, useEffect, useRef, useState } from 'react';
import { THEMES } from './ascii/themes';
import { AsciiBackground } from './components/AsciiBackground';
import { BottomNav, type Tab } from './components/BottomNav';
import { CategoryForm } from './components/CategoryForm';
import { GoalForm } from './components/GoalForm';
import { Sheet } from './components/Sheet';
import { Toast, type ToastMessage } from './components/Toast';
import { TransactionForm } from './components/TransactionForm';
import { Wordmark } from './components/Wordmark';
import { monthOf, today } from './lib/dates';
import { formatMoney } from './lib/money';
import { pickQuip } from './lib/quips';
import { Categories } from './screens/Categories';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';
import { useStore } from './store/store';
import type { Category, Goal, Kind, Transaction } from './store/types';

const TITLES: Record<Exclude<Tab, 'home'>, string> = {
  history: 'Suivi',
  categories: 'Catégories',
  settings: 'Réglages',
};

export function App() {
  const theme = useStore((s) => s.settings.theme);
  const motion = useStore((s) => s.settings.motion);
  const currency = useStore((s) => s.settings.currency);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const restoreTransaction = useStore((s) => s.restoreTransaction);

  const [tab, setTab] = useState<Tab>('home');
  const [period, setPeriod] = useState(() => monthOf(today()));
  const [txSheet, setTxSheet] = useState<{ editing?: Transaction; kind?: Kind } | null>(null);
  const [catSheet, setCatSheet] = useState<{ kind: Kind; editing?: Category } | null>(null);
  const [goalSheet, setGoalSheet] = useState<{ editing?: Goal } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const lastQuip = useRef<string>(undefined);

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

  return (
    <>
      <AsciiBackground theme={theme} motion={motion} />

      <div className="app">
        <header className="top">
          <h1>{tab === 'home' ? <Wordmark /> : TITLES[tab]}</h1>
        </header>

        <main className="screen">
          {tab === 'home' && (
            <Home
              period={period}
              onPeriod={setPeriod}
              onOpen={openTransaction}
              onAdd={(kind) => setTxSheet({ kind })}
              onSeeAll={() => go('history')}
              onGoal={(editing) => setGoalSheet({ editing })}
            />
          )}
          {tab === 'history' && <History period={period} onPeriod={setPeriod} onOpen={openTransaction} onGoal={(editing) => setGoalSheet({ editing })} />}
          {tab === 'categories' && <Categories period={period} onEdit={(kind, editing) => setCatSheet({ kind, editing })} />}
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
          key={txSheet?.editing?.id ?? `new-${txSheet?.kind ?? 'expense'}`}
          editing={txSheet?.editing}
          kind={txSheet?.kind}
          onDelete={removeTransaction}
          onSaved={(t) => {
            if (txSheet?.editing) notify('Opération modifiée');
            else {
              const quip = pickQuip(t.kind, lastQuip.current);
              lastQuip.current = quip;
              const sign = t.kind === 'income' ? '+' : '−';
              setToast({ id: Date.now(), text: quip, figure: `${sign}${formatMoney(t.amount, currency)}`, tone: t.kind });
            }
            setTxSheet(null);
            // Follow the entry to its period, in the unit already picked.
            setPeriod((p) => t.date.slice(0, p.length));
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

      <Sheet open={goalSheet !== null} title={goalSheet?.editing?.name ?? 'Nouvel objectif'} onClose={() => setGoalSheet(null)}>
        {goalSheet && (
          <GoalForm
            key={goalSheet.editing?.id ?? 'new'}
            editing={goalSheet.editing}
            onDone={(message) => {
              setGoalSheet(null);
              notify(message);
            }}
          />
        )}
      </Sheet>

      <Toast toast={toast} onDone={clearToast} />
    </>
  );
}
