import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { type CSSProperties, type ChangeEvent, useRef, useState } from 'react';
import { THEMES } from '../ascii/themes';
import { Dropdown } from '../components/Dropdown';
import { ThemeIcon } from '../components/ThemeIcon';
import { decodeCsv, parseCsv, toCsv } from '../lib/csv';
import { currencySymbol } from '../lib/money';
import { today } from '../lib/dates';
import { readXlsx } from '../lib/xlsx';
import { type Backup, readBackup } from '../store/backup';
import { allowNotifications, canNotify } from '../native/notifications';
import { CURRENCIES, REMINDER_DAYS, REMINDER_HOURS, homeOrder } from '../store/defaults';
import { type SheetImport, readSheets } from '../store/sheet';
import { useStore } from '../store/store';
import type { HomeCard } from '../store/types';

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  // Safari and Firefox read the URL after the click returns: revoke it later.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const CARD_NAMES: Record<HomeCard, string> = {
  balance: 'Solde',
  split: 'Par catégorie',
  goals: 'Objectifs',
  trend: 'Évolution sur 6 mois',
  recent: 'Dernières opérations',
};

const count = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

async function readSpreadsheet(file: File) {
  const data = await file.arrayBuffer();
  if (/\.csv$/i.test(file.name)) return [{ name: '', rows: parseCsv(decodeCsv(data)) }];
  return readXlsx(data).catch(() => {
    throw new Error('Fichier illisible. Enregistrez-le en .xlsx ou en .csv.');
  });
}

function SheetFormat() {
  return (
    <div id="sheet-format" className="sheet-format">
      <p>Fichier .xlsx ou .csv. Les opérations s’ajoutent à celles déjà présentes.</p>
      <p>Une ligne d’en-tête, puis une opération par ligne. Colonnes lues, dans n’importe quel ordre :</p>
      <dl>
        <dt>Date</dt>
        <dd>14/11/2026 ou 2026-11-14. Obligatoire.</dd>
        <dt>Montant</dt>
        <dd>23,40, sans signe. Obligatoire.</dd>
        <dt>Type</dt>
        <dd>Dépense ou Revenu. Sans cette colonne, nommez la feuille Dépenses ou Revenus.</dd>
        <dt>Catégorie</dt>
        <dd>Créée si elle n’existe pas. Vide : Autres.</dd>
        <dt>Note</dt>
        <dd>Facultative.</dd>
      </dl>
      <div className="sheet-format__table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Catégorie</th>
              <th>Montant</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>14/11/2026</td>
              <td>Dépense</td>
              <td>Courses</td>
              <td>23,40</td>
              <td>Marché</td>
            </tr>
            <tr>
              <td>01/11/2026</td>
              <td>Revenu</td>
              <td>Salaire</td>
              <td>1850</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>L’export CSV ci-dessus suit ce format.</p>
    </div>
  );
}

export function Settings({ notify }: { notify: (text: string) => void }) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const importBackup = useStore((s) => s.importBackup);
  const importSheet = useStore((s) => s.importSheet);
  const reset = useStore((s) => s.reset);
  const file = useRef<HTMLInputElement>(null);
  const sheetFile = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [pendingSheet, setPendingSheet] = useState<SheetImport | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, setPending] = useState<ReturnType<typeof readBackup> | null>(null);

  const exportJson = () => {
    const { categories, transactions, goals, recurring } = useStore.getState();
    const backup: Backup = {
      app: 'kakuzu',
      version: 2,
      exportedAt: new Date().toISOString(),
      categories,
      transactions,
      goals,
      recurring,
      settings,
    };
    download(`kakuzu-${today()}.json`, 'application/json', JSON.stringify(backup, null, 2));
  };

  const exportCsv = () => {
    const { categories, transactions } = useStore.getState();
    // The BOM makes Excel read the file as UTF-8.
    download(`kakuzu-${today()}.csv`, 'text/csv;charset=utf-8', `\ufeff${toCsv(transactions, categories, settings.currency)}`);
  };

  const importJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    try {
      setPending(readBackup(await picked.text(), settings));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Import impossible.');
    }
  };

  const pickSheet = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    try {
      setPendingSheet(readSheets(await readSpreadsheet(picked), useStore.getState().categories));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Import impossible.');
    }
  };

  const setReminders = (patch: Partial<typeof settings.reminders>) => setSettings({ reminders: { ...settings.reminders, ...patch } });
  const toggleNotify = async (on: boolean) => {
    if (on && !(await allowNotifications())) {
      notify('Notifications refusées. Autorisez-les dans les réglages du téléphone.');
      return;
    }
    setReminders({ notify: on });
  };

  const order = homeOrder(settings.home);
  const moveCard = (from: number, to: number) => {
    const next = [...order];
    const [card] = next.splice(from, 1);
    if (card) next.splice(to, 0, card);
    setSettings({ home: next });
  };

  const sheetSummary = (p: SheetImport) => {
    const expenses = p.transactions.filter((t) => t.kind === 'expense').length;
    const added = p.categories.length ? ` et ${count(p.categories.length, 'catégorie')}` : '';
    const skipped = p.skipped ? ` ${count(p.skipped, 'ligne')} illisible${p.skipped > 1 ? 's' : ''} ignorée${p.skipped > 1 ? 's' : ''}.` : '';
    return `Ajouter ${count(p.transactions.length, 'opération')} (${count(expenses, 'dépense')}, ${count(p.transactions.length - expenses, 'revenu')})${added} ?${skipped}`;
  };

  return (
    <>
      <section className="card" aria-labelledby="theme-title">
        <h2 id="theme-title" className="card__title">
          Thème
        </h2>
        <div className="themes" role="radiogroup" aria-labelledby="theme-title">
          {Object.values(THEMES).map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={settings.theme === t.id}
              className={`theme${settings.theme === t.id ? ' is-on' : ''}`}
              style={{ '--theme': t.accent } as CSSProperties}
              onClick={() => setSettings({ theme: t.id })}
            >
              <ThemeIcon theme={t.id} className="theme__icon" />
              <span className="theme__name">{t.name}</span>
              <span className="theme__reading">
                {t.reading} <span lang="ja">{t.kanji}</span>
              </span>
            </button>
          ))}
        </div>
        <label className="switch">
          <span>
            Animer le fond
            <small>Désactiver économise la batterie.</small>
          </span>
          <input type="checkbox" checked={settings.motion} onChange={(e) => setSettings({ motion: e.target.checked })} />
        </label>
      </section>

      <section className="card" aria-labelledby="currency-title">
        <h2 id="currency-title" className="card__title">
          Devise
        </h2>
        <Dropdown
          labelledBy="currency-title"
          value={settings.currency}
          // The franc's symbol is its code: no need to print it twice.
          options={CURRENCIES.map((c) => ({ value: c, label: c, detail: currencySymbol(c) === c ? undefined : currencySymbol(c) }))}
          onChange={(currency) => setSettings({ currency })}
        />
        <p className="hint">Change l’affichage seulement, les montants ne sont pas convertis.</p>
      </section>

      <section className="card" aria-labelledby="home-title">
        <h2 id="home-title" className="card__title">
          Accueil
        </h2>
        <div className={`dropdown${ordering ? ' is-open' : ''}`}>
          <button
            type="button"
            className="dropdown__button"
            aria-expanded={ordering}
            aria-controls="home-order"
            onClick={() => setOrdering(!ordering)}
          >
            <span>Ordre des cartes</span>
            <ChevronDown aria-hidden="true" />
          </button>
        </div>
        {ordering && (
          <ol id="home-order" className="order">
            {order.map((card, i) => (
              <li key={card} className="order__row">
                <span>{CARD_NAMES[card]}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Monter ${CARD_NAMES[card]}`}
                  disabled={i === 0}
                  onClick={() => moveCard(i, i - 1)}
                >
                  <ChevronUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Descendre ${CARD_NAMES[card]}`}
                  disabled={i === order.length - 1}
                  onClick={() => moveCard(i, i + 1)}
                >
                  <ChevronDown aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
        <label className="switch">
          <span>
            Reporter le solde
            <small>Le solde d’un mois, même négatif, passe au suivant.</small>
          </span>
          <input type="checkbox" checked={settings.carryOver} onChange={(e) => setSettings({ carryOver: e.target.checked })} />
        </label>
      </section>

      <section className="card" aria-labelledby="reminders-title">
        <h2 id="reminders-title" className="card__title">
          Objectifs
        </h2>
        <p id="reminder-days" className="label">
          Alerter avant la date butoir
        </p>
        <Dropdown
          labelledBy="reminder-days"
          value={String(settings.reminders.days)}
          options={REMINDER_DAYS.map((d) => ({ value: String(d), label: d > 1 ? `${d} jours avant` : 'La veille' }))}
          onChange={(d) => setReminders({ days: Number(d) })}
        />
        <p className="hint">Un objectif pas encore atteint passe en rouge à partir de ce moment.</p>
        {canNotify ? (
          <>
            <label className="switch">
              <span>
                Notifications
                <small>Un rappel sur le téléphone ce jour-là.</small>
              </span>
              <input type="checkbox" checked={settings.reminders.notify} onChange={(e) => void toggleNotify(e.target.checked)} />
            </label>
            {settings.reminders.notify && (
              <>
                <p id="reminder-hour" className="label reminder-hour">
                  Heure du rappel
                </p>
                <Dropdown
                  labelledBy="reminder-hour"
                  value={String(settings.reminders.hour)}
                  options={REMINDER_HOURS.map((h) => ({ value: String(h), label: `${h} h` }))}
                  onChange={(h) => setReminders({ hour: Number(h) })}
                />
              </>
            )}
          </>
        ) : (
          <p className="hint">Les notifications viennent avec l’application Android.</p>
        )}
      </section>

      <section className="card" aria-labelledby="data-title">
        <h2 id="data-title" className="card__title">
          Données
        </h2>
        <p className="hint">Tout reste sur cet appareil. Exportez une sauvegarde de temps en temps pour ne rien perdre.</p>
        <div className="stack">
          <button type="button" className="button" onClick={exportJson}>
            Exporter une sauvegarde (JSON)
          </button>
          <button type="button" className="button" onClick={exportCsv}>
            Exporter pour un tableur (CSV)
          </button>
          {pending ? (
            <div className="confirm">
              <p>
                Remplacer toutes les données actuelles par cette sauvegarde ({pending.transactions.length} opérations,{' '}
                {pending.categories.length} catégories) ?
              </p>
              <div className="form__actions">
                <button type="button" className="button" onClick={() => setPending(null)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="button button--danger"
                  onClick={() => {
                    importBackup(pending);
                    notify(`${pending.transactions.length} opérations importées`);
                    setPending(null);
                  }}
                >
                  Remplacer
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="button" onClick={() => file.current?.click()}>
              Importer une sauvegarde
            </button>
          )}
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={importJson} />
          {pendingSheet ? (
            <div className="confirm">
              <p>{sheetSummary(pendingSheet)}</p>
              <div className="form__actions">
                <button type="button" className="button" onClick={() => setPendingSheet(null)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    importSheet(pendingSheet);
                    notify(`${count(pendingSheet.transactions.length, 'opération')} ajoutée${pendingSheet.transactions.length > 1 ? 's' : ''}`);
                    setPendingSheet(null);
                  }}
                >
                  Ajouter
                </button>
              </div>
            </div>
          ) : (
            <div className="row">
              <button type="button" className="button" onClick={() => sheetFile.current?.click()}>
                Importer un tableur
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Format attendu"
                aria-expanded={format}
                aria-controls="sheet-format"
                onClick={() => setFormat(!format)}
              >
                <Info aria-hidden="true" />
              </button>
            </div>
          )}
          {format && <SheetFormat />}
          <input
            ref={sheetFile}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            hidden
            onChange={pickSheet}
          />
        </div>
      </section>

      <section className="card" aria-labelledby="reset-title">
        <h2 id="reset-title" className="card__title">
          Tout effacer
        </h2>
        {confirmReset ? (
          <>
            <p className="hint">Les opérations, récurrentes ou non, les catégories et les objectifs seront supprimés. Cette action est définitive.</p>
            <div className="form__actions">
              <button type="button" className="button" onClick={() => setConfirmReset(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={() => {
                  reset();
                  setConfirmReset(false);
                  notify('Données effacées');
                }}
              >
                Effacer
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="button button--danger button--wide" onClick={() => setConfirmReset(true)}>
            Effacer toutes les données
          </button>
        )}
      </section>

      <p className="about">Kakuzu {__APP_VERSION__}</p>
    </>
  );
}
