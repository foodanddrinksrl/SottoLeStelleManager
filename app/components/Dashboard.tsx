// app/components/Dashboard.tsx
'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  caricaDocumentiAcquisto,
  totalePerCategoria,
  type DocumentoAcquistoSalvato,
} from '../lib/acquistiStorage';

import {
  ricalcolaControlloGestione,
} from '../lib/controlloGestione/ricalcolaControlloGestione';

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

function filtraDocumentiPerPeriodo({
  documenti,
  dataDa,
  dataA,
}: {
  documenti: DocumentoAcquistoSalvato[];
  dataDa: string;
  dataA: string;
}): DocumentoAcquistoSalvato[] {
  if (!dataDa || !dataA) {
    return [];
  }

  return documenti.filter((documento) => {
    const dataDocumento = documento.dataDocumento || '';

    return (
      dataDocumento >= dataDa &&
      dataDocumento <= dataA
    );
  });
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
  const [caricamentoIncassi, setCaricamentoIncassi] = useState(false);
  const [erroreIncassi, setErroreIncassi] = useState('');

  const [documentiAcquisto, setDocumentiAcquisto] = useState<
    DocumentoAcquistoSalvato[]
  >([]);

  const personale = Number(totals?.costo || 0);

  function aggiornaAcquistiDashboard() {
    setDocumentiAcquisto(caricaDocumentiAcquisto());
  }

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
        { cache: 'no-store' }
      );

      const esito =
        (await risposta.json()) as RispostaIncassiDashboard;

      if (!risposta.ok || !esito.ok) {
        throw new Error(
          esito.messaggio ||
            'Impossibile leggere gli incassi Bacco.'
        );
      }

      setIncasso(Number(esito.riepilogo?.totaleIncasso || 0));
      setCoperti(Number(esito.riepilogo?.totaleCoperti || 0));
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

    aggiornaAcquistiDashboard();
  }

  useEffect(() => {
    aggiornaDatiDashboard();

    const aggiornaTutto = () => {
      aggiornaDatiDashboard();
    };

    window.addEventListener('focus', aggiornaTutto);
    window.addEventListener('storage', aggiornaTutto);
    window.addEventListener('slm:acquisti-updated', aggiornaTutto);
    window.addEventListener('slm:bacco-updated', aggiornaTutto);

    return () => {
      window.removeEventListener('focus', aggiornaTutto);
      window.removeEventListener('storage', aggiornaTutto);
      window.removeEventListener('slm:acquisti-updated', aggiornaTutto);
      window.removeEventListener('slm:bacco-updated', aggiornaTutto);
    };
  }, [periodoDashboard.dataDa, periodoDashboard.dataA]);

  const documentiPeriodo = useMemo(() => {
    return filtraDocumentiPerPeriodo({
      documenti: documentiAcquisto,
      dataDa: periodoDashboard.dataDa,
      dataA: periodoDashboard.dataA,
    });
  }, [
    documentiAcquisto,
    periodoDashboard.dataDa,
    periodoDashboard.dataA,
  ]);

  const materiePrime = useMemo(() => {
    return totalePerCategoria(
      documentiPeriodo,
      'Materie prime'
    );
  }, [documentiPeriodo]);

  const materialeConsumo = useMemo(() => {
    return totalePerCategoria(
      documentiPeriodo,
      'Materiale di consumo'
    );
  }, [documentiPeriodo]);

  const utenze = useMemo(() => {
    return totalePerCategoria(documentiPeriodo, 'Utenze');
  }, [documentiPeriodo]);

  const affitti = useMemo(() => {
    return totalePerCategoria(documentiPeriodo, 'Affitti');
  }, [documentiPeriodo]);

  const consulenze = useMemo(() => {
    return totalePerCategoria(documentiPeriodo, 'Consulenze');
  }, [documentiPeriodo]);

  const manutenzioni = useMemo(() => {
    return totalePerCategoria(
      documentiPeriodo,
      'Manutenzioni e riparazioni'
    );
  }, [documentiPeriodo]);

  const altriCosti = useMemo(() => {
    return (
      totalePerCategoria(documentiPeriodo, 'Costi straordinari') +
      totalePerCategoria(documentiPeriodo, 'Altri costi') +
      totalePerCategoria(documentiPeriodo, 'Bibite') +
      totalePerCategoria(documentiPeriodo, 'Imballaggi') +
      totalePerCategoria(documentiPeriodo, 'Detergenti') +
      totalePerCategoria(documentiPeriodo, 'Legna')
    );
  }, [documentiPeriodo]);

  const scontrinoMedioBacco =
    coperti > 0 ? incasso / coperti : 0;

  const mediaGiornalieraBacco =
    numeroGiornate > 0 ? incasso / numeroGiornate : 0;

  const controlloGestione = useMemo(() => {
    return ricalcolaControlloGestione({
      periodoCorrente: {
        fatturato: incasso,
        coperti,
        numeroGiornate,
        scontrinoMedioBacco,
        mediaGiornalieraBacco,
        costi: {
          materiePrime,
          personale,
          materialiConsumo: materialeConsumo,
          utenze,
          affitto: affitti,
          servizi: consulenze,
          manutenzioni,
          altriCosti,
        },
      },
    });
  }, [
    incasso,
    coperti,
    numeroGiornate,
    scontrinoMedioBacco,
    mediaGiornalieraBacco,
    materiePrime,
    personale,
    materialeConsumo,
    utenze,
    affitti,
    consulenze,
    manutenzioni,
    altriCosti,
  ]);

  const coloreSalute =
    controlloGestione.salute.livello === 'positivo'
      ? '🟢'
      : controlloGestione.salute.livello === 'attenzione'
        ? '🟠'
        : controlloGestione.salute.livello === 'critico'
          ? '🔴'
          : '⚪';

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
            const intervallo = intervalloSettimanaAttuale();

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
            const intervallo = intervalloMeseCorrente();

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

      <p className="muted" style={{ marginTop: 16 }}>
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
          <strong>{euro(scontrinoMedioBacco)}</strong>
          <small>Dati Bacco</small>
        </div>

        <div className="kpi">
          <span>📅 Media giornaliera</span>
          <strong>{euro(mediaGiornalieraBacco)}</strong>
          <small>
            {numeroGiornate}{' '}
            {numeroGiornate === 1 ? 'giornata' : 'giornate'}
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
              ? `${controlloGestione.percentuali.materiePrime.toFixed(1)}%`
              : euro(materiePrime)}
          </strong>

          <small>
            {euro(materiePrime)} · {documentiPeriodo.length}{' '}
            documenti nel periodo
          </small>
        </button>

        <button
          className="kpi module-button"
          onClick={onOpenPersonale}
        >
          <span>👨 Personale</span>

          <strong>
            {incasso > 0
              ? `${controlloGestione.percentuali.personale.toFixed(1)}%`
              : euro(personale)}
          </strong>

          <small>{euro(personale)}</small>
        </button>

        <button
          className="kpi module-button"
          onClick={onOpenMaterialiConsumo}
        >
          <span>🧻 Materiale consumo</span>

          <strong>
            {incasso > 0
              ? `${controlloGestione.percentuali.materialiConsumo.toFixed(1)}%`
              : euro(materialeConsumo)}
          </strong>

          <small>{euro(materialeConsumo)}</small>
        </button>

        <button
          className="kpi module-button"
          onClick={onOpenCostiFissi}
        >
          <span>🏢 Costi fissi</span>

          <strong>
            {euro(
              utenze +
                affitti +
                consulenze +
                manutenzioni +
                altriCosti
            )}
          </strong>

          <small>Utenze, affitti e altri costi</small>
        </button>

        <button
          className="kpi green module-button"
          onClick={onOpenUtile}
        >
          <span>📈 Margine operativo</span>

          <strong>
            {incasso > 0
              ? `${controlloGestione.percentuali.margine.toFixed(1)}%`
              : '—'}
          </strong>

          <small>
            {euro(controlloGestione.margineOperativo)}
          </small>
        </button>
      </div>

      <div className="card">
        <h2>🚦 Salute Aziendale</h2>

        <p style={{ fontSize: 30, fontWeight: 800 }}>
          {coloreSalute} {controlloGestione.salute.titolo}
        </p>

        <p>
          Punteggio:{' '}
          <strong>
            {controlloGestione.salute.punteggio}/100
          </strong>
        </p>

        <p className="muted">
          {controlloGestione.salute.sintesi}
        </p>

        {controlloGestione.salute.attenzioni.length > 0 && (
          <>
            <h3>⚠️ Da controllare</h3>

            <ul>
              {controlloGestione.salute.attenzioni.map((voce) => (
                <li key={voce}>{voce}</li>
              ))}
            </ul>
          </>
        )}

        {controlloGestione.salute.azioniConsigliate.length > 0 && (
          <>
            <h3>💡 Azioni consigliate</h3>

            <ul>
              {controlloGestione.salute.azioniConsigliate.map((voce) => (
                <li key={voce}>{voce}</li>
              ))}
            </ul>
          </>
        )}
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
          Collaboratori attivi <strong>{employeeCount}</strong> · Turni{' '}
          <strong>{totals.turni}</strong>
        </p>
      </div>
    </section>
  );
}
