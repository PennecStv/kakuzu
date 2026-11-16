import { type CSSProperties, type ChangeEvent, useRef, useState } from 'react';
import { THEMES } from '../ascii/themes';
import { toCsv } from '../lib/csv';
import { today } from '../lib/dates';
import { useInstall } from '../pwa';
import { type Backup, readBackup } from '../store/backup';
import { CURRENCIES } from '../store/defaults';
import { useStore } from '../store/store';

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function Settings({ notify }: { notify: (text: string) => void }) {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const importBackup = useStore((s) => s.importBackup);
  const reset = useStore((s) => s.reset);
  const install = useInstall();
  const file = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const exportJson = () => {
    const { categories, transactions } = useStore.getState();
    const backup: Backup = { app: 'kakuzu', version: 1, exportedAt: new Date().toISOString(), categories, transactions, settings };
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
      const backup = readBackup(await picked.text(), settings);
      importBackup(backup);
      notify(`${backup.transactions.length} opérations importées`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Import impossible.');
    }
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
              <span className="theme__kanji" aria-hidden="true">
                {t.kanji}
              </span>
              <span className="theme__name">{t.name}</span>
              <span className="theme__reading">{t.reading}</span>
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
        <select
          className="select"
          aria-labelledby="currency-title"
          value={settings.currency}
          onChange={(e) => setSettings({ currency: e.target.value })}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="hint">Change l’affichage seulement, les montants ne sont pas convertis.</p>
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
          <button type="button" className="button" onClick={() => file.current?.click()}>
            Importer une sauvegarde
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={importJson} />
        </div>
      </section>

      {install.kind !== 'unavailable' && (
        <section className="card" aria-labelledby="install-title">
          <h2 id="install-title" className="card__title">
            Application
          </h2>
          {install.kind === 'installed' && <p className="hint">Kakuzu est installée sur cet appareil.</p>}
          {install.kind === 'prompt' && (
            <button type="button" className="button button--primary button--wide" onClick={install.install}>
              Installer sur l’écran d’accueil
            </button>
          )}
          {install.kind === 'ios' && (
            <p className="hint">Dans Safari : bouton Partager, puis « Sur l’écran d’accueil ».</p>
          )}
        </section>
      )}

      <section className="card" aria-labelledby="reset-title">
        <h2 id="reset-title" className="card__title">
          Tout effacer
        </h2>
        {confirmReset ? (
          <>
            <p className="hint">Les opérations et catégories seront supprimées. Cette action est définitive.</p>
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

      <p className="about">
        Kakuzu {__APP_VERSION__} · sans pub, sans compte, sans serveur.
      </p>
    </>
  );
}
