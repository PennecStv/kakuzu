import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { THEMES } from './ascii/themes';
import { AsciiBackground } from './components/AsciiBackground';
import { BottomNav, type Tab } from './components/BottomNav';
import { CategoryForm } from './components/CategoryForm';
import { Explosion } from './components/Explosion';
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

/** The tabs as the bar lays them out: a page slides in from the side of its tab. */
const TAB_ORDER: Tab[] = ['home', 'history', 'categories', 'settings'];

/** The page sliding out, pinned where it was on screen while the next one slides in. */
interface Leaving {
  tab: Tab;
  back: boolean;
  top: number;
  left: number;
  width: number;
}

export function App() {
  const theme = useStore((s) => s.settings.theme);
  const motion = useStore((s) => s.settings.motion);
  const currency = useStore((s) => s.settings.currency);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const restoreTransaction = useStore((s) => s.restoreTransaction);

  const [tab, setTab] = useState<Tab>('home');
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const pages = useRef<HTMLElement>(null);
  const [period, setPeriod] = useState(() => monthOf(today()));
  const [txSheet, setTxSheet] = useState<{ editing?: Transaction; kind?: Kind } | null>(null);
  const [catSheet, setCatSheet] = useState<{ kind: Kind; editing?: Category } | null>(null);
  const [goalSheet, setGoalSheet] = useState<{ editing?: Goal } | null>(null);
  const [blast, setBlast] = useState<{ key: number; goalId: string } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const lastQuip = useRef<string>(undefined);

  const notify = useCallback((text: string, action?: ToastMessage['action']) => setToast({ id: Date.now(), text, action }), []);
  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', THEMES[theme].accent);
  }, [theme]);

  const go = (next: Tab) => {
    const box = pages.current?.getBoundingClientRect();
    if (next !== tab && box && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const back = TAB_ORDER.indexOf(next) < TAB_ORDER.indexOf(tab);
      setLeaving({ tab, back, top: box.top, left: box.left, width: box.width });
    }
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const openTransaction = (t?: Transaction) => setTxSheet({ editing: t });

  const removeTransaction = (t: Transaction) => {
    deleteTransaction(t.id);
    setTxSheet(null);
    notify('Opération supprimée', { label: 'Annuler', run: () => restoreTransaction(t) });
  };

  const screens: Record<Tab, () => ReactNode> = {
    home: () => (
      <Home
        period={period}
        onPeriod={setPeriod}
        onOpen={openTransaction}
        onAdd={(kind) => setTxSheet({ kind })}
        onSeeAll={() => go('history')}
        onGoal={(editing) => setGoalSheet({ editing })}
      />
    ),
    history: () => <History period={period} onPeriod={setPeriod} onOpen={openTransaction} onGoal={(editing) => setGoalSheet({ editing })} />,
    categories: () => <Categories period={period} onEdit={(kind, editing) => setCatSheet({ kind, editing })} />,
    settings: () => <Settings notify={notify} />,
  };

  return (
    <>
      <AsciiBackground theme={theme} motion={motion} />

      <div className="app">
        {/* Pages stay in tab order in the DOM: moving a node would restart its animations and drop focus. */}
        <main ref={pages}>
          {TAB_ORDER.filter((t) => t === tab || t === leaving?.tab).map((t) => {
            const out = t !== tab && leaving;
            const slide = out ? `page--leaving page--to-${out.back ? 'right' : 'left'}` : leaving ? `page--from-${leaving.back ? 'left' : 'right'}` : '';
            return (
              <div
                key={t}
                className={`page ${slide}`}
                style={out ? { top: out.top, left: out.left, width: out.width } : undefined}
                inert={Boolean(out)}
                onAnimationEnd={(e) => out && e.target === e.currentTarget && setLeaving(null)}
              >
                <header className="top">
                  <h1>{t === 'home' ? <Wordmark /> : TITLES[t]}</h1>
                </header>
                <div className="screen">{screens[t]()}</div>
              </div>
            );
          })}
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
            onDone={(message, reached) => {
              setGoalSheet(null);
              if (!reached) return notify(message);
              setToast({ id: Date.now(), text: message, tone: 'income' });
              if (goalSheet?.editing) setBlast({ key: Date.now(), goalId: goalSheet.editing.id });
            }}
          />
        )}
      </Sheet>

      {blast && (
        // The theme's accent leads, then ink, the gain green and gold.
        <Explosion
          key={blast.key}
          goalId={blast.goalId}
          colors={[THEMES[theme].accent, '#e9ecf3', '#5cc28a', '#e0a526']}
          onEnd={() => setBlast(null)}
        />
      )}

      <Toast toast={toast} onDone={clearToast} />
    </>
  );
}
