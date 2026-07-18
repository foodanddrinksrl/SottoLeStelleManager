'use client';

import {
  ChangeEvent,
  useEffect,
  useState,
} from 'react';

type RiepilogoBacco = {
  nomeFile: string;
  periodoDa: string;
  periodoA: string;
  produzioneLorda: number;
  produzioneNetta: number;
  sconti: number;
  coperti: number;
  mediaNettaCoperto: number;
  numeroOperazioni: number;
  totalePagamenti: number;
  categorieImportate: number;
  repartiImportati: number;
  pagamentiImportati: number;
  righeIvaImportate: number;
  importatoIl?: string;
};

type RispostaImportBacco = {
  ok: boolean;
  duplicato?: boolean;
  messaggio?: string;
  riepilogo?: RiepilogoBacco;
};

type ImportBaccoDatabase = {
  nome_file?: string;
  periodo_da?: string;
  periodo_a?: string;
  produzione_lorda?: number;
  produzione_netta?: number;
  sconti?: number;
  coperti?: number;
  media_netta_coperto?: number;
  numero_operazioni?: number;
  totale_pagamenti?: number;
  importato_il?: string;
  bacco_categorie?: unknown[];
  bacco_reparti?: unknown[];
  bacco_pagamenti?: unknown[];
  bacco_iva?: unknown[];
};

type RiepilogoIncassiGiornalieri = {
  totaleIncasso: number;
  totaleCoperti: number;
  giornateImportate: number;
  areeImportate: number;
};

function euro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dataItaliana(value?: string): string {
  if (!value) return '—';
  const data = new Date(`${value}T00:00:00`);
  return Number.isNaN(data.getTime())
    ? value
    : data.toLocaleDateString('it-IT');
}

function dataOraItaliana(value?: string): string {
  if (!value) return '—';
  const data = new Date(value);
  return Number.isNaN(data.getTime())
    ? value
    : data.toLocaleString('it-IT');
}

function convertiImportDatabase(
  importazione: ImportBaccoDatabase
): RiepilogoBacco {
  return {
    nomeFile: importazione.nome_file || 'Report Bacco',
    periodoDa: importazione.periodo_da || '',
    periodoA: importazione.periodo_a || '',
    produzioneLorda: Number(importazione.produzione_lorda || 0),
    produzioneNetta: Number(importazione.produzione_netta || 0),
    sconti: Number(importazione.sconti || 0),
    coperti: Number(importazione.coperti || 0),
    mediaNettaCoperto: Number(importazione.media_netta_coperto || 0),
    numeroOperazioni: Number(importazione.numero_operazioni || 0),
    totalePagamenti: Number(importazione.totale_pagamenti || 0),
    categorieImportate: importazione.bacco_categorie?.length || 0,
    repartiImportati: importazione.bacco_reparti?.length || 0,
    pagamentiImportati: importazione.bacco_pagamenti?.length || 0,
    righeIvaImportate: importazione.bacco_iva?.length || 0,
    importatoIl: importazione.importato_il,
  };
}

export function IncassiBaccoSection({
  onBack,
}: {
  onBack: () => void;
}) {
  const [report, setReport] = useState<RiepilogoBacco | null>(null);
  const [riepilogoIncassi, setRiepilogoIncassi] =
    useState<RiepilogoIncassiGiornalieri | null>(null);
  const [errore, setErrore] = useState('');
  const [messaggio, setMessaggio] = useState('');
  const [caricamentoProduzione, setCaricamentoProduzione] =
    useState(false);
  const [caricamentoIncassi, setCaricamentoIncassi] =
    useState(false);

  useEffect(() => {
    async function caricaUltimoImport() {
      try {
        const risposta = await fetch('/api/bacco', {
          cache: 'no-store',
        });

        const esito = (await risposta.json()) as {
          ok: boolean;
          messaggio?: string;
          importazioni?: ImportBaccoDatabase[];
        };

        if (!risposta.ok || !esito.ok) {
          throw new Error(
            esito.messaggio ||
              'Impossibile leggere gli import Bacco.'
          );
        }

        const ultimoImport = esito.importazioni?.[0];
        if (ultimoImport) {
          setReport(convertiImportDatabase(ultimoImport));
        }
      } catch (error) {
        setErrore(
          error instanceof Error
            ? error.message
            : 'Errore durante la lettura dei dati Bacco.'
        );
      }
    }

    caricaUltimoImport();
  }, []);

  async function importaProduzione(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setErrore(
        'Seleziona il report Produzione Bacco in formato XLSX.'
      );
      return;
    }

    setErrore('');
    setMessaggio('');
    setCaricamentoProduzione(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const risposta = await fetch('/api/bacco', {
        method: 'POST',
        body: formData,
      });

      const esito =
        (await risposta.json()) as RispostaImportBacco;

      if (!risposta.ok || !esito.ok) {
        throw new Error(
          esito.messaggio ||
            'Errore durante l’importazione della produzione Bacco.'
        );
      }

      if (!esito.riepilogo) {
        throw new Error(
          'Il server non ha restituito il riepilogo Bacco.'
        );
      }

      setReport({
        ...esito.riepilogo,
        importatoIl: new Date().toISOString(),
      });

      setMessaggio(
        esito.messaggio ||
          'Produzione Bacco importata correttamente.'
      );
    } catch (error) {
      setErrore(
        error instanceof Error
          ? error.message
          : 'Errore durante l’importazione della produzione Bacco.'
      );
    } finally {
      setCaricamentoProduzione(false);
    }
  }

  async function importaIncassiGiornalieri(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setErrore(
        'Seleziona il report degli incassi giornalieri in formato XLSX.'
      );
      return;
    }

    setErrore('');
    setMessaggio('');
    setCaricamentoIncassi(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const risposta = await fetch('/api/bacco/incassi', {
        method: 'POST',
        body: formData,
      });

      const esito = (await risposta.json()) as {
        ok: boolean;
        duplicato?: boolean;
        messaggio?: string;
        riepilogo?: RiepilogoIncassiGiornalieri;
      };

      if (!risposta.ok || !esito.ok) {
        throw new Error(
          esito.messaggio ||
            'Errore durante l’importazione degli incassi giornalieri.'
        );
      }

      if (esito.riepilogo) {
        setRiepilogoIncassi(esito.riepilogo);
      }

      setMessaggio(
        esito.messaggio ||
          'Incassi giornalieri importati correttamente.'
      );
    } catch (error) {
      setErrore(
        error instanceof Error
          ? error.message
          : 'Errore durante l’importazione degli incassi giornalieri.'
      );
    } finally {
      setCaricamentoIncassi(false);
    }
  }

  const importazioneInCorso =
    caricamentoProduzione || caricamentoIncassi;

  return (
    <section>
      <div className="card no-print">
        <div className="actions">
          <button
            className="btn green"
            onClick={onBack}
            disabled={importazioneInCorso}
          >
            ← Controllo di Gestione
          </button>

          <label className="btn gold" style={{ cursor: 'pointer' }}>
            📅{' '}
            {caricamentoIncassi
              ? 'Importazione incassi…'
              : 'Importa incassi giornalieri'}
            <input
              type="file"
              accept=".xlsx"
              onChange={importaIncassiGiornalieri}
              disabled={importazioneInCorso}
              style={{ display: 'none' }}
            />
          </label>

          <label className="btn gold" style={{ cursor: 'pointer' }}>
            🍕{' '}
            {caricamentoProduzione
              ? 'Importazione produzione…'
              : 'Importa produzione/venduto'}
            <input
              type="file"
              accept=".xlsx"
              onChange={importaProduzione}
              disabled={importazioneInCorso}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h2>📊 Centro Analisi Bacco</h2>
        <p className="muted">
          Usa “Incassi giornalieri” per la dashboard per data e per area.
          Usa “Produzione/venduto” per categorie, articoli, magazzino e food cost.
        </p>

        {messaggio && (
          <p style={{ fontWeight: 700 }}>🟢 {messaggio}</p>
        )}

        {errore && (
          <p style={{ fontWeight: 700 }}>🔴 {errore}</p>
        )}

        {!report && !riepilogoIncassi && !errore && (
          <p className="muted">Nessun report Bacco ancora importato.</p>
        )}
      </div>

      {riepilogoIncassi && (
        <div className="card">
          <h2>📅 Ultimo import incassi giornalieri</h2>
          <div className="dashboard">
            <div className="kpi gold">
              <span>💰 Totale incasso</span>
              <strong>{euro(riepilogoIncassi.totaleIncasso)}</strong>
            </div>
            <div className="kpi">
              <span>👥 Coperti</span>
              <strong>{riepilogoIncassi.totaleCoperti}</strong>
            </div>
            <div className="kpi">
              <span>📆 Giornate</span>
              <strong>{riepilogoIncassi.giornateImportate}</strong>
            </div>
            <div className="kpi">
              <span>🍽 Righe per area</span>
              <strong>{riepilogoIncassi.areeImportate}</strong>
            </div>
          </div>
        </div>
      )}

      {report && (
        <>
          <div className="dashboard">
            <div className="kpi gold">
              <span>💰 Produzione netta</span>
              <strong>{euro(report.produzioneNetta)}</strong>
            </div>
            <div className="kpi">
              <span>💵 Produzione lorda</span>
              <strong>{euro(report.produzioneLorda)}</strong>
            </div>
            <div className="kpi">
              <span>🏷️ Sconti</span>
              <strong>{euro(report.sconti)}</strong>
            </div>
            <div className="kpi">
              <span>👥 Coperti</span>
              <strong>{report.coperti}</strong>
            </div>
            <div className="kpi">
              <span>🍽️ Media per coperto</span>
              <strong>{euro(report.mediaNettaCoperto)}</strong>
            </div>
            <div className="kpi">
              <span>🧾 Operazioni</span>
              <strong>{report.numeroOperazioni}</strong>
            </div>
          </div>

          <div className="card">
            <h2>Periodo produzione importato</h2>
            <p>
              Dal <strong>{dataItaliana(report.periodoDa)}</strong>{' '}
              al <strong>{dataItaliana(report.periodoA)}</strong>
            </p>
            <p className="muted">
              File: {report.nomeFile}
              {report.importatoIl
                ? ` · Importato il ${dataOraItaliana(report.importatoIl)}`
                : ''}
            </p>
          </div>

          <div className="card">
            <h2>Contenuto produzione acquisito</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Sezione</th>
                    <th>Righe importate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Categorie di vendita</td>
                    <td>{report.categorieImportate}</td>
                  </tr>
                  <tr>
                    <td>Reparti</td>
                    <td>{report.repartiImportati}</td>
                  </tr>
                  <tr>
                    <td>Forme di pagamento</td>
                    <td>{report.pagamentiImportati}</td>
                  </tr>
                  <tr>
                    <td>Righe IVA</td>
                    <td>{report.righeIvaImportate}</td>
                  </tr>
                  <tr>
                    <td>Totale pagamenti</td>
                    <td><strong>{euro(report.totalePagamenti)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
