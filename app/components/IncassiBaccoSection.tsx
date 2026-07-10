'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

type RigaBacco = {
  sala: string;
  pagato: number;
  sospeso: number;
  totale: number;
  coperti: number;
  importoCoperti: number;
};

type ReportBacco = {
  periodo: string;
  righe: RigaBacco[];
  totale: number;
  coperti: number;
  importatoIl: string;
  nomeFile: string;
};

const STORAGE_KEY = 'slm_v6_report_bacco';

function numero(value: unknown): number {
  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const pulito = value
      .replace(/[€\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const risultato = Number(pulito);
    return Number.isFinite(risultato) ? risultato : 0;
  }

  return 0;
}

function testo(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizza(value: unknown): string {
  return testo(value).toUpperCase();
}

function euro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function leggiReportBacco(
  matrice: unknown[][],
  nomeFile: string
): ReportBacco {
  const rigaPeriodo = matrice.find((riga) =>
    normalizza(riga[0]).includes('DA DATA')
  );

  const periodo =
    testo(rigaPeriodo?.[0]) || 'Periodo non riconosciuto';

  const indiceIntestazione = matrice.findIndex(
    (riga) =>
      normalizza(riga[0]) === 'SALA' &&
      normalizza(riga[3]) === 'TOTALE'
  );

  if (indiceIntestazione < 0) {
    throw new Error(
      'Il file non sembra essere il report Bacco raggruppato per SALA.'
    );
  }

  const righe: RigaBacco[] = [];

  for (let i = indiceIntestazione + 1; i < matrice.length; i += 1) {
    const nomeSala = testo(matrice[i]?.[0]);
    const nomeNormalizzato = normalizza(nomeSala);

    if (!nomeSala && matrice[i]?.every((cella) => cella == null || cella === '')) {
      continue;
    }

    if (nomeNormalizzato === 'TOTALI') {
      break;
    }

    const totaleRiga = numero(matrice[i]?.[3]);

    if (totaleRiga === 0 && !nomeSala) {
      continue;
    }

    righe.push({
      sala: nomeSala || 'NON CLASSIFICATO',
      pagato: numero(matrice[i]?.[1]),
      sospeso: numero(matrice[i]?.[2]),
      totale: totaleRiga,
      coperti: numero(matrice[i]?.[4]),
      importoCoperti: numero(matrice[i]?.[5]),
    });
  }

  const rigaTotali = matrice.find(
    (riga) => normalizza(riga[0]) === 'TOTALI'
  );

  const totale =
    numero(rigaTotali?.[3]) ||
    righe.reduce((somma, riga) => somma + riga.totale, 0);

  const coperti =
    numero(rigaTotali?.[4]) ||
    righe.reduce((somma, riga) => somma + riga.coperti, 0);

  if (righe.length === 0 || totale <= 0) {
    throw new Error(
      'Non sono stati trovati incassi validi nel report.'
    );
  }

  return {
    periodo,
    righe,
    totale,
    coperti,
    importatoIl: new Date().toLocaleString('it-IT'),
    nomeFile,
  };
}

export function IncassiBaccoSection({
  onBack,
}: {
  onBack: () => void;
}) {
  const [report, setReport] = useState<ReportBacco | null>(null);
  const [errore, setErrore] = useState('');
  const [caricamento, setCaricamento] = useState(false);

  useEffect(() => {
    try {
      const salvato = localStorage.getItem(STORAGE_KEY);

      if (salvato) {
        setReport(JSON.parse(salvato));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const riepilogo = useMemo(() => {
    const righe = report?.righe ?? [];

    const asporto = righe
      .filter((riga) => normalizza(riga.sala).includes('ASPORTO'))
      .reduce((somma, riga) => somma + riga.totale, 0);

    const domicilio = righe
      .filter((riga) => normalizza(riga.sala).includes('DOMICILIO'))
      .reduce((somma, riga) => somma + riga.totale, 0);

    const sala = righe
      .filter((riga) => {
        const nome = normalizza(riga.sala);

        return (
          nome.includes('SALA') ||
          nome.includes('VERANDA')
        );
      })
      .reduce((somma, riga) => somma + riga.totale, 0);

    const classificato = sala + asporto + domicilio;
    const altro = Math.max(0, (report?.totale ?? 0) - classificato);

    return {
      sala,
      asporto,
      domicilio,
      altro,
    };
  }, [report]);

  async function importaFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    setErrore('');
    setCaricamento(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const primoFoglio = workbook.SheetNames[0];

      if (!primoFoglio) {
        throw new Error('Il file Excel non contiene fogli leggibili.');
      }

      const foglio = workbook.Sheets[primoFoglio];

      const matrice = XLSX.utils.sheet_to_json<unknown[]>(foglio, {
        header: 1,
        raw: true,
        defval: null,
      });

      const risultato = leggiReportBacco(matrice, file.name);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(risultato));
      setReport(risultato);
    } catch (error) {
      const messaggio =
        error instanceof Error
          ? error.message
          : 'Errore durante la lettura del report Bacco';

      setErrore(messaggio);
    } finally {
      setCaricamento(false);
    }
  }

  function eliminaReport() {
    const conferma = window.confirm(
      'Vuoi eliminare il report Bacco importato?'
    );

    if (!conferma) return;

    localStorage.removeItem(STORAGE_KEY);
    setReport(null);
    setErrore('');
  }

  return (
    <section>
      <div className="card no-print">
        <div className="actions">
          <button className="btn green" onClick={onBack}>
            ← Controllo di Gestione
          </button>

          <label className="btn gold" style={{ cursor: 'pointer' }}>
            📥 {caricamento ? 'Importazione…' : 'Importa report Bacco'}

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importaFile}
              disabled={caricamento}
              style={{ display: 'none' }}
            />
          </label>

          {report && (
            <button className="btn danger" onClick={eliminaReport}>
              Elimina report
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2>💰 Incassi Bacco</h2>

        <p className="muted">
          Importa il report “Tabella analitica incassi e coperti
          raggruppata per SALA”.
        </p>

        {errore && (
          <p style={{ fontWeight: 700 }}>
            🔴 {errore}
          </p>
        )}

        {!report && !errore && (
          <p className="muted">
            Nessun report ancora importato.
          </p>
        )}
      </div>

      {report && (
        <>
          <div className="dashboard">
            <div className="kpi gold">
              <span>💰 Totale periodo</span>
              <strong>{euro(report.totale)}</strong>
            </div>

            <div className="kpi">
              <span>🍽 Sala</span>
              <strong>{euro(riepilogo.sala)}</strong>
            </div>

            <div className="kpi">
              <span>🥡 Asporto</span>
              <strong>{euro(riepilogo.asporto)}</strong>
            </div>

            <div className="kpi">
              <span>🛵 Domicilio</span>
              <strong>{euro(riepilogo.domicilio)}</strong>
            </div>

            <div className="kpi">
              <span>👥 Coperti</span>
              <strong>{report.coperti}</strong>
            </div>

            <div className="kpi">
              <span>📋 Altro/non classificato</span>
              <strong>{euro(riepilogo.altro)}</strong>
            </div>
          </div>

          <div className="card">
            <h2>Periodo importato</h2>
            <p>{report.periodo}</p>

            <p className="muted">
              File: {report.nomeFile} · Importato il {report.importatoIl}
            </p>
          </div>

          <div className="card">
            <h2>Dettaglio Bacco</h2>

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Area</th>
                    <th>Pagato</th>
                    <th>Sospeso</th>
                    <th>Totale</th>
                    <th>Coperti</th>
                  </tr>
                </thead>

                <tbody>
                  {report.righe.map((riga, indice) => (
                    <tr key={`${riga.sala}-${indice}`}>
                      <td>{riga.sala}</td>
                      <td>{euro(riga.pagato)}</td>
                      <td>{euro(riga.sospeso)}</td>
                      <td>
                        <strong>{euro(riga.totale)}</strong>
                      </td>
                      <td>{riga.coperti}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <th>Totale</th>
                    <th />
                    <th />
                    <th>{euro(report.totale)}</th>
                    <th>{report.coperti}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}