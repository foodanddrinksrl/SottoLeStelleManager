'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  caricaDocumentiAcquisto,
  filtraPerCompetenzaGestionale,
  totalePerCategoria,
  type DocumentoAcquistoSalvato,
} from '../lib/acquistiStorage';

type ReportBaccoSalvato = {
  totale: number;
};

function euro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function Dashboard({
  totals,
  employeeCount,
  week,
  onOpenCalendar,
  onOpenMagazzino,
  onOpenBilancio,
}: {
  totals: any;
  employeeCount: number;
  week: number;
  onOpenCalendar: () => void;
  onOpenMagazzino: () => void;
  onOpenBilancio: () => void;
}) {
  const [incasso, setIncasso] = useState(0);
  const [documentiAcquisto, setDocumentiAcquisto] = useState<
    DocumentoAcquistoSalvato[]
  >([]);

  const personale = totals?.costo || 0;

  function aggiornaDatiDashboard() {
    try {
      const reportSalvato = localStorage.getItem(
        'slm_v6_report_bacco'
      );

      if (reportSalvato) {
        const report: ReportBaccoSalvato =
          JSON.parse(reportSalvato);

        setIncasso(Number(report.totale) || 0);
      } else {
        setIncasso(0);
      }
    } catch {
      setIncasso(0);
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
  }, []);

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

      <div className="dashboard">
        <div className="kpi">
          <span>💰 Incasso periodo</span>

          <strong>
            {incasso > 0 ? euro(incasso) : 'Da importare'}
          </strong>
        </div>

        <div className="kpi">
          <span>📦 Materie Prime</span>

          <strong>
            {incasso > 0
              ? `${percMaterie.toFixed(1)}%`
              : '—'}
          </strong>

          <small>{euro(materiePrime)}</small>
        </div>

        <div className="kpi">
          <span>👨 Personale</span>

          <strong>
            {incasso > 0
              ? `${percPersonale.toFixed(1)}%`
              : '—'}
          </strong>

          <small>{euro(personale)}</small>
        </div>

        <div className="kpi green">
          <span>💵 Margine provvisorio</span>

          <strong>
            {incasso > 0
              ? `${margineProvvisorio.toFixed(1)}%`
              : '—'}
          </strong>
        </div>
      </div>

      <div className="card">
        <h2>🚦 Stato Azienda</h2>

        <p style={{ fontSize: 30, fontWeight: 800 }}>
          {incasso === 0
            ? '⚪ Importa il report Bacco'
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