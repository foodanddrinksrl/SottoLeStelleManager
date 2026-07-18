'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  caricaDocumentiAcquisto,
  filtraPerCompetenzaGestionale,
  totalePerCategoria,
  type DocumentoAcquistoSalvato,
} from '../lib/acquistiStorage';

type RispostaIncassiDashboard = {
  ok: boolean;
  riepilogo?: {
    totaleIncasso: number;
    totaleCoperti: number;
    numeroGiornate: number;
  };
  messaggio?: string;
};

function euro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function dataIsoLocale(data: Date): string {
  const anno = data.getFullYear();
  const mese = String(data.getMonth() + 1).padStart(2, '0');
  const giorno = String(data.getDate()).padStart(2, '0');

  return `${anno}-${mese}-${giorno}`;
}

function intervalloSettimanaAttuale() {
  const oggi = new Date();

  const giornoSettimana = oggi.getDay();
  const giorniDaLunedi =
    giornoSettimana === 0 ? 6 : giornoSettimana - 1;

  const lunedi = new Date(oggi);
  lunedi.setHours(0, 0, 0, 0);
  lunedi.setDate(oggi.getDate() - giorniDaLunedi);

  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);

  return {
    dataDa: dataIsoLocale(lunedi),
    dataA: dataIsoLocale(domenica),
  };
}

function intervalloMeseCorrente() {
  const oggi = new Date();

  const primoGiorno = new Date(
    oggi.getFullYear(),
    oggi.getMonth(),
    1
  );

  const ultimoGiorno = new Date(
    oggi.getFullYear(),
    oggi.getMonth() + 1,
    0
  );

  return {
    dataDa: dataIsoLocale(primoGiorno),
    dataA: dataIsoLocale(ultimoGiorno),
  };
}

export function Dashboard({
  totals,
  employeeCount,
  week,
  periodoDashboard,
  setPeriodoDashboard,
  onOpenCalendar,
  onOpenMagazzino,
  onOpenBilancio,
  onOpenIncassi,
  onOpenMateriePrime,
  onOpenPersonale,
  onOpenMaterialiConsumo,
  onOpenCostiFissi,
  onOpenUtile,
}: {
  totals: any;
  employeeCount: number;
  week: number;
  periodoDashboard: {
    modalita: 'settimana' | 'mese' | 'personalizzato';
    dataDa: string;
    dataA: string;
  };
  setPeriodoDashboard: React.Dispatch<
    React.SetStateAction<{
      modalita: 'settimana' | 'mese' | 'personalizzato';
      dataDa: string;
      dataA: string;
    }>
  >;
  onOpenCalendar: () => void;
  onOpenMagazzino: () => void;
  onOpenBilancio: () => void;
  onOpenIncassi: () => void;
  onOpenMateriePrime: () => void;
  onOpenPersonale: () => void;
  onOpenMaterialiConsumo: () => void;
  onOpenCostiFissi: () => void;
  onOpenUtile: () => void;
}) {
  const [incasso, setIncasso] = useState(0);
  const [coperti, setCoperti] = useState(0);
  const [numeroGiornate, setNumeroGiornate] = useState(0);
  const [caricamentoIncassi, setCaricamentoIncassi] =
    useState(false);
  const [erroreIncassi, setErroreIncassi] = useState('');

  const [documentiAcquisto, setDocumentiAcquisto] = useState<
    DocumentoAcquistoSalvato[]
  >([]);

  const personale = totals?.costo || 0;

  async function aggiornaDatiDashboard() {
    setCaricamentoIncassi(true);
    setErroreIncassi('');

    try {
      const parametri = new URLSearchParams({
        dataDa: periodoDashboard.dataDa,
        dataA: periodoDashboard.dataA,
      });

      const risposta = await fetch(
        `/api/bacco/incassi?${parametri.toString()}`,
        {
          cache: 'no-store',
        }
      );

      const esito =
        (await risposta.json()) as RispostaIncassiDashboard;

      if (!risposta.ok || !esito.ok) {
        throw new Error(
          esito.messaggio ||
            'Impossibile leggere gli incassi Bacco.'
        );
      }

      setIncasso(
        Number(esito.riepilogo?.totaleIncasso || 0)
      );

      setCoperti(
        Number(esito.riepilogo?.totaleCoperti || 0)
      );

      setNumeroGiornate(
        Number(esito.riepilogo?.numeroGiornate || 0)
      );
    } catch (error) {
      console.error(
        'Errore caricamento incassi Bacco:',
        error
      );

      setIncasso(0);
      setCoperti(0);
      setNumeroGiornate(0);

      setErroreIncassi(
        error instanceof Error
          ? error.message
          : 'Errore durante il caricamento degli incassi.'
      );
    } finally {
      setCaricamentoIncassi(false);
    }

    setDocumentiAcquisto(caricaDocumentiAcquisto());
  }

  useEffect(() => {
    aggiornaDatiDashboard();

    window.addEventListener('focus', aggiornaDatiDashboard);
    window.addEventListener('storage', aggiornaDatiDashboard);

    return () => {
      window.removeEventListener(
        'focus',
        aggiornaDatiDashboard
      );

      window.removeEventListener(
        'storage',
        aggiornaDatiDashboard
      );
    };
  }, [
    periodoDashboard.dataDa,
    periodoDashboard.dataA,
  ]);

  const anno = new Date().getFullYear();
  const mese = new Date().getMonth() + 1;

  const documentiMese = useMemo(() => {
    return filtraPerCompetenzaGestionale({
      documenti: documentiAcquisto,
      anno,
      mese,
    });
  }, [documentiAcquisto, anno, mese]);

  const materiePrime = useMemo(() => {
    return totalePerCategoria(
      documentiMese,
      'Materie prime'
    );
  }, [documentiMese]);

  const scontrinoMedio =
    coperti > 0 ? incasso / coperti : 0;

  const mediaGiornaliera =
    numeroGiornate > 0 ? incasso / numeroGiornate : 0;

  const percMaterie =
    incasso > 0 ? (materiePrime / incasso) * 100 : 0;

  const percPersonale =
    incasso > 0 ? (personale / incasso) * 100 : 0;

  const margineProvvisorio = Math.max(
    0,
    100 - percMaterie - percPersonale
  );

  return (
    <section>
      <div className="card">
        <h2>🏠 Centro Direzionale</h2>

        <p className="muted">
          Controllo rapido della pizzeria senza aspettare il
          commercialista.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 20,
        }}
      >
        <button
          className={
            periodoDashboard.modalita === 'settimana'
              ? 'btn gold'
              : 'btn green'
          }
          onClick={() => {
            const intervallo =
              intervalloSettimanaAttuale();

            setPeriodoDashboard({
              modalita: 'settimana',
              dataDa: intervallo.dataDa,
              dataA: intervallo.dataA,
            });
          }}
        >
          📅 Settimana attuale
        </button>

        <button
          className={
            periodoDashboard.modalita === 'mese'
              ? 'btn gold'
              : 'btn green'
          }
          onClick={() => {
            const intervallo =
              intervalloMeseCorrente();

            setPeriodoDashboard({
              modalita: 'mese',
              dataDa: intervallo.dataDa,
              dataA: intervallo.dataA,
            });
          }}
        >
          📆 Mese corrente
        </button>

        <button
          className={
            periodoDashboard.modalita === 'personalizzato'
              ? 'btn gold'
              : 'btn green'
          }
          onClick={() =>
            setPeriodoDashboard((periodo) => ({
              ...periodo,
              modalita: 'personalizzato',
            }))
          }
        >
          🗓 Periodo personalizzato
        </button>
      </div>

      {periodoDashboard.modalita === 'personalizzato' && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'end',
            marginTop: 16,
          }}
        >
          <label>
            <span
              style={{
                display: 'block',
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              Dal
            </span>

            <input
              type="date"
              value={periodoDashboard.dataDa}
              onChange={(event) =>
                setPeriodoDashboard((periodo) => ({
                  ...periodo,
                  dataDa: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span
              style={{
                display: 'block',
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              Al
            </span>

            <input
              type="date"
              value={periodoDashboard.dataA}
              min={periodoDashboard.dataDa}
              onChange={(event) =>
                setPeriodoDashboard((periodo) => ({
                  ...periodo,
                  dataA: event.target.value,
                }))
              }
            />
          </label>
        </div>
      )}

      <p
        className="muted"
        style={{ marginTop: 16 }}
      >
        Periodo visualizzato:{' '}
        <strong>
          {new Date(
            `${periodoDashboard.dataDa}T00:00:00`
          ).toLocaleDateString('it-IT')}
        </strong>{' '}
        –{' '}
        <strong>
          {new Date(
            `${periodoDashboard.dataA}T00:00:00`
          ).toLocaleDateString('it-IT')}
        </strong>
      </p>

      {caricamentoIncassi && (
        <div className="card">
          <p className="muted">
            Aggiornamento dati Bacco in corso...
          </p>
        </div>
      )}

      {erroreIncassi && (
        <div className="card">
          <p style={{ fontWeight: 700 }}>
            ⚠️ {erroreIncassi}
          </p>
        </div>
      )}

      <div className="dashboard">
        <div className="kpi">
          <span>💰 Incasso periodo</span>
          <strong>{euro(incasso)}</strong>
          <small>Dati Bacco</small>
        </div>

        <div className="kpi">
          <span>🍽️ Coperti</span>
          <strong>{coperti}</strong>
          <small>Nel periodo selezionato</small>
        </div>

        <div className="kpi">
          <span>🧾 Scontrino medio</span>
          <strong>{euro(scontrinoMedio)}</strong>
          <small>Incasso ÷ coperti</small>
        </div>

        <div className="kpi">
          <span>📅 Media giornaliera</span>
          <strong>{euro(mediaGiornaliera)}</strong>
          <small>
            {numeroGiornate}{' '}
            {numeroGiornate === 1
              ? 'giornata'
              : 'giornate'}
          </small>
        </div>
      </div>

      <div className="dashboard">
        <button
          className="kpi module-button"
          onClick={onOpenIncassi}
        >
          <span>💰 Dettaglio Incassi</span>
          <strong>{euro(incasso)}</strong>
          <small>▶ Apri importazioni e aree</small>
        </button>

        <button
          className="kpi module-button"
          onClick={onOpenMateriePrime}
        >
          <span>📦 Materie Prime</span>

          <strong>
            {incasso > 0
              ? `${percMaterie.toFixed(1)}%`
              : '—'}
          </strong>

          <small>{euro(materiePrime)}</small>
        </button>

        <button
          className="kpi module-button"
          onClick={onOpenPersonale}
        >
          <span>👨 Personale</span>

          <strong>
            {incasso > 0
              ? `${percPersonale.toFixed(1)}%`
              : '—'}
          </strong>

          <small>{euro(personale)}</small>
        </button>

        <button
          className="kpi module-button"
          onClick={onOpenMaterialiConsumo}
        >
          <span>🧻 Materiale consumo</span>
          <strong>—</strong>
          <small>Da collegare</small>
        </button>

        <button
          className="kpi module-button"
          onClick={onOpenCostiFissi}
        >
          <span>🏢 Costi fissi</span>
          <strong>—</strong>
          <small>Da collegare</small>
        </button>

        <button
          className="kpi green module-button"
          onClick={onOpenUtile}
        >
          <span>📈 Margine provvisorio</span>

          <strong>
            {incasso > 0
              ? `${margineProvvisorio.toFixed(1)}%`
              : '—'}
          </strong>

          <small>▶ Dettaglio</small>
        </button>
      </div>

      <div className="card">
        <h2>🚦 Stato Azienda</h2>

        <p style={{ fontSize: 30, fontWeight: 800 }}>
          {incasso === 0
            ? '⚪ Nessun incasso nel periodo selezionato'
            : percMaterie <= 30
              ? '🟢 Materie prime sotto controllo'
              : percMaterie <= 33
                ? '🟠 Materie prime da controllare'
                : '🔴 Materie prime troppo alte'}
        </p>

        <p className="muted">
          L'obiettivo è mantenere le materie prime sotto il
          30% del fatturato.
        </p>
      </div>

      <div className="quick-grid">
        <button
          className="card module-card module-button"
          onClick={onOpenCalendar}
        >
          <h2>👥 Risorse Umane</h2>

          <p className="muted">
            Turni, dipendenti, storico e gestione personale.
          </p>

          <strong>▶ Entra</strong>
        </button>

        <button
          className="card module-card module-button"
          onClick={onOpenBilancio}
        >
          <h2>📊 Bilancio Gestionale</h2>

          <p className="muted">
            Materie prime, costi fissi, consumi, utile e KPI.
          </p>

          <strong>▶ Entra</strong>
        </button>
      </div>

      <div className="card">
        <h2>📌 Settimana {week}</h2>

        <p className="muted">
          Collaboratori attivi{' '}
          <strong>{employeeCount}</strong> · Turni{' '}
          <strong>{totals.turni}</strong>
        </p>
      </div>
    </section>
  );
}
