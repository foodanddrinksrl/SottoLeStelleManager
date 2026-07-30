'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Dashboard } from './components/Dashboard';
import { ControlloGestioneSection } from './components/ControlloGestioneSection';
import { CalendarSection } from './components/CalendarSection';
import { EmployeesSection } from './components/EmployeesSection';
import { IncassiBaccoSection } from './components/IncassiBaccoSection';
import { HistorySection } from './components/HistorySection';
import { MagazzinoSection } from './components/MagazzinoSection';
import { SettingsSection } from './components/SettingsSection';
import { Summary } from './components/Summary';
import { TopNavigation } from './components/TopNavigation';
import { WhatsAppSection } from './components/WhatsAppSection';
import { MarketingSection } from './components/MarketingSection';
import { PdfCollaboratori } from './components/PdfCollaboratori';
import {
  addDays,
  calculateSummary,
  calculateTotals,
  defaultClosed,
  defaultDayRests,
  defaultEmployees,
  defaultSchedule,
  itDate,
  makeWeekInfo,
  k,
} from './lib/schedule';

import type {
  Dipendente,
  Reparto,
  Snapshot,
  WeekInfo,
} from './types';
type ModalitaPeriodoDashboard =
  | 'settimana'
  | 'mese'
  | 'personalizzato';

type PeriodoDashboard = {
  modalita: ModalitaPeriodoDashboard;
  dataDa: string;
  dataA: string;
};

function dataIsoLocale(data: Date): string {
  const anno = data.getFullYear();
  const mese = String(data.getMonth() + 1).padStart(2, '0');
  const giorno = String(data.getDate()).padStart(2, '0');

  return `${anno}-${mese}-${giorno}`;
}

function periodoSettimanaAttuale(): PeriodoDashboard {
  const oggi = new Date();

  const giornoSettimana = oggi.getDay();
  const giorniDaLunedi =
    giornoSettimana === 0 ? 6 : giornoSettimana - 1;

  const lunedi = new Date(oggi);
  lunedi.setDate(oggi.getDate() - giorniDaLunedi);

  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);

  return {
    modalita: 'settimana',
    dataDa: dataIsoLocale(lunedi),
    dataA: dataIsoLocale(domenica),
  };
}
export default function Page() {
  const [tab, setTab] = useState('dashboard');
  useEffect(() => {
  const tabValide = [
  'dashboard',
  'calendario',
  'dipendenti',
  'riepilogo',
  'storico',
  'whatsapp-turni',
  'marketing',
  'bilancio',
  'impostazioni',
  'magazzino',
];

  if (!tabValide.includes(tab)) {
    setTab('calendario');
  }
}, [tab]);
  const [dashboardView, setDashboardView] = useState<
  | 'home'
  | 'incassi'
  | 'materie'
  | 'personale'
  | 'consumi'
  | 'costi'
  | 'utile'
>('home');
const [periodoDashboard, setPeriodoDashboard] =
  useState<PeriodoDashboard>(
    periodoSettimanaAttuale()
  );
  const [employees, setEmployees] = useState<Dipendente[]>([]);
  const [schedule, setSchedule] = useState<Record<string, string[]>>(defaultSchedule);
  const [closed, setClosed] = useState<Record<string, boolean>>(defaultClosed);
  const [dayRests, setDayRests] = useState<Record<string, string>>(defaultDayRests);
  const [weekInfo, setWeekInfo] = useState<WeekInfo>(makeWeekInfo());
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [printMode, setPrintMode] = useState<'collaboratori' | 'direzione'>('collaboratori');
  const pdfContainerRef =
  useRef<HTMLDivElement | null>(null);

const [pdfLoading, setPdfLoading] =
  useState(false);

  useEffect(() => {
    let componenteAttivo = true;

    async function caricaStatoGestionale() {
      try {
        const risposta = await fetch('/api/gestionale', {
          method: 'GET',
          cache: 'no-store',
        });

        const risultato = await risposta.json();

        if (!risposta.ok || !risultato.ok) {
          throw new Error(
            risultato.error ||
              'Impossibile caricare lo stato del gestionale.'
          );
        }

        if (!componenteAttivo) return;

        const stato = risultato.stato || {};

        setEmployees(
          Array.isArray(stato.employees) &&
            stato.employees.length > 0
            ? stato.employees
            : defaultEmployees
        );

        setSchedule(
          stato.schedule &&
            Object.keys(stato.schedule).length > 0
            ? stato.schedule
            : defaultSchedule
        );

        setClosed(
          stato.closed &&
            Object.keys(stato.closed).length > 0
            ? stato.closed
            : defaultClosed
        );

        setDayRests(
          stato.rests &&
            Object.keys(stato.rests).length > 0
            ? stato.rests
            : defaultDayRests
        );

        setWeekInfo(
          stato.weekInfo &&
            Object.keys(stato.weekInfo).length > 0
            ? stato.weekInfo
            : makeWeekInfo()
        );

        setHistory(
          Array.isArray(stato.history)
            ? stato.history
            : []
        );
      } catch (errore) {
        console.error(
          'Errore caricamento gestionale:',
          errore
        );

        if (!componenteAttivo) return;

        setEmployees(defaultEmployees);
        setSchedule(defaultSchedule);
        setClosed(defaultClosed);
        setDayRests(defaultDayRests);
        setWeekInfo(makeWeekInfo());
        setHistory([]);

        alert(
          'Non è stato possibile caricare i dati da Supabase. ' +
            'Sono stati caricati i dati iniziali.'
        );
      } finally {
        if (componenteAttivo) {
          setStorageLoaded(true);
        }
      }
    }

    caricaStatoGestionale();

    return () => {
      componenteAttivo = false;
    };
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;

    const timerSalvataggio = window.setTimeout(
      async () => {
        try {
          const risposta = await fetch(
            '/api/gestionale',
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                employees,
                schedule,
                closed,
                rests: dayRests,
                weekInfo,
                history,
              }),
            }
          );

          const risultato = await risposta.json();

          if (!risposta.ok || !risultato.ok) {
            throw new Error(
              risultato.error ||
                'Impossibile salvare il gestionale.'
            );
          }
        } catch (errore) {
          console.error(
            'Errore salvataggio gestionale:',
            errore
          );
        }
      },
      700
    );

    return () => {
      window.clearTimeout(timerSalvataggio);
    };
  }, [
    storageLoaded,
    employees,
    schedule,
    closed,
    dayRests,
    weekInfo,
    history,
  ]);

  const summary = useMemo(() => calculateSummary(schedule, closed, employees), [schedule, closed, employees]);
  const totals = useMemo(() => calculateTotals(summary), [summary]);

  function addSelect(g: string, t: string, r: Reparto) {
    setSchedule((s) => ({ ...s, [k(g, t, r)]: [...(s[k(g, t, r)] || []), ''] }));
  }

  function updateSelect(g: string, t: string, r: Reparto, i: number, value: string) {
    setSchedule((s) => {
      const arr = [...(s[k(g, t, r)] || [])];
      arr[i] = value;
      return { ...s, [k(g, t, r)]: arr.filter(Boolean) };
    });
  }

  function removeSelect(g: string, t: string, r: Reparto, i: number) {
    setSchedule((s) => {
      const arr = [...(s[k(g, t, r)] || [])];
      arr.splice(i, 1);
      return { ...s, [k(g, t, r)]: arr };
    });
  }

  function saveTurno() {
    const snap = {
      id: Date.now(),
      savedAt: new Date().toLocaleString('it-IT'),
      weekInfo,
      employees,
      schedule,
      closed,
      dayRests,
    };

    setHistory((h) => {
      const idx = h.findIndex((x) => x.weekInfo.start === weekInfo.start);
      if (idx >= 0) {
        const c = [...h];
        c[idx] = { ...snap, id: c[idx].id };
        return c;
      }
      return [snap, ...h];
    });

    alert('Turno salvato nello storico.');
  }

  function replicaSettimanaSuccessiva() {
    const nuovaSettimana = makeWeekInfo(new Date(addDays(weekInfo.start, 7) + 'T00:00:00'));
    setWeekInfo(nuovaSettimana);
    setSchedule({ ...schedule });
    setClosed({ ...closed });
    setDayRests({ ...dayRests });
    setTab('calendario');
    alert('Settimana replicata alla settimana successiva.');
  }
async function creaPdfCollaboratori(): Promise<File> {
  const contenitore = pdfContainerRef.current;

  if (!contenitore) {
    throw new Error(
      'Area PDF collaboratori non disponibile.'
    );
  }

  const [{ default: html2canvas }, { jsPDF }] =
    await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

  const canvas = await html2canvas(contenitore, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const larghezzaPagina =
    pdf.internal.pageSize.getWidth();

  const altezzaPagina =
    pdf.internal.pageSize.getHeight();

  const margine = 5;

  const larghezzaDisponibile =
    larghezzaPagina - margine * 2;

  const altezzaDisponibile =
    altezzaPagina - margine * 2;

  const rapportoCanvas =
    canvas.width / canvas.height;

  let larghezzaImmagine =
    larghezzaDisponibile;

  let altezzaImmagine =
    larghezzaImmagine / rapportoCanvas;

  if (altezzaImmagine > altezzaDisponibile) {
    altezzaImmagine = altezzaDisponibile;

    larghezzaImmagine =
      altezzaImmagine * rapportoCanvas;
  }

  const posizioneX =
    (larghezzaPagina - larghezzaImmagine) / 2;

  const immagine = canvas.toDataURL(
    'image/jpeg',
    0.95
  );

  pdf.addImage(
    immagine,
    'JPEG',
    posizioneX,
    margine,
    larghezzaImmagine,
    altezzaImmagine
  );

  const blob = pdf.output('blob');

  const nomeFile =
    `Turni-Collaboratori-Settimana-${weekInfo.week}.pdf`;

  return new File([blob], nomeFile, {
    type: 'application/pdf',
  });
}

async function scaricaPdfCollaboratori() {
  try {
    setPdfLoading(true);

    const file = await creaPdfCollaboratori();

    const url = URL.createObjectURL(file);

    const link = document.createElement('a');

    link.href = url;
    link.download = file.name;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (errore) {
    console.error(errore);

    alert(
      'Non è stato possibile creare il PDF.'
    );
  } finally {
    setPdfLoading(false);
  }
}
async function condividiPdfWhatsApp() {
  try {
    setPdfLoading(true);

    const file = await creaPdfCollaboratori();

    const datiCondivisione = {
      title: `Turni collaboratori - Settimana ${weekInfo.week}`,
      text:
        `Turni collaboratori dal ` +
        `${itDate(weekInfo.start)} al ` +
        `${itDate(weekInfo.end)}`,
      files: [file],
    };

    if (
      navigator.share &&
      (!navigator.canShare ||
        navigator.canShare({ files: [file] }))
    ) {
      await navigator.share(datiCondivisione);
      return;
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement('a');

    link.href = url;
    link.download = file.name;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    alert(
      'PDF scaricato. Ora puoi allegarlo su WhatsApp.'
    );
  } catch (errore) {
    if (
      errore instanceof DOMException &&
      errore.name === 'AbortError'
    ) {
      return;
    }

    console.error(errore);

    alert(
      'Non è stato possibile condividere il PDF.'
    );
  } finally {
    setPdfLoading(false);
  }
}
  function openSnapshot(snapshot: Snapshot) {
    setWeekInfo(snapshot.weekInfo);
  
    setSchedule(snapshot.schedule);
    setClosed(snapshot.closed);
    setDayRests(snapshot.dayRests);
    setTab('calendario');
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <h1>🍕 Sotto le Stelle Manager</h1>
          <p>
            Luigi · Settimana {weekInfo.week} · dal {itDate(weekInfo.start)} al {itDate(weekInfo.end)}
          </p>
        </div>
      </header>

     <TopNavigation
  activeTab={tab}
  onDashboard={() => setTab('dashboard')}
  onRisorseUmane={() => setTab('calendario')}
  onBilancioGestionale={() => setTab('bilancio')}
  onMarketing={() => setTab('marketing')}
/>

      <main className="container">
        
        {tab === 'dashboard' && dashboardView === 'home' && (
  <Dashboard
    totals={totals}
    employeeCount={employees.length}
    week={weekInfo.week}
    periodoDashboard={periodoDashboard}
setPeriodoDashboard={setPeriodoDashboard}
    onOpenCalendar={() => setTab('calendario')}
    onOpenMagazzino={() => setTab('magazzino')}
    onOpenBilancio={() => setTab('bilancio')}
    onOpenIncassi={() => setDashboardView('incassi')}
    onOpenMateriePrime={() => setDashboardView('materie')}
    onOpenPersonale={() => setDashboardView('personale')}
    onOpenMaterialiConsumo={() =>
      setDashboardView('consumi')
    }
    onOpenCostiFissi={() => setDashboardView('costi')}
    onOpenUtile={() => setDashboardView('utile')}
  />
)}
{tab === 'dashboard' && dashboardView === 'incassi' && (
  <IncassiBaccoSection
    onBack={() => setDashboardView('home')}
  />
)}
{tab === 'dashboard' &&
  dashboardView !== 'home' &&
  dashboardView !== 'incassi' && (
  <section>
    <div className="card no-print">
      <div className="actions">
        <button
          className="btn green"
          onClick={() => setDashboardView('home')}
        >
          ← Centro Direzionale
        </button>
      </div>
    </div>

    <div className="card">
      <h2>
        

        {dashboardView === 'materie' &&
          '📦 Dettaglio Materie Prime'}

        {dashboardView === 'personale' &&
          '👥 Dettaglio Personale'}

        {dashboardView === 'consumi' &&
          '🧻 Dettaglio Materiale di Consumo'}

        {dashboardView === 'costi' &&
          '🏢 Dettaglio Costi Fissi'}

        {dashboardView === 'utile' &&
          '📈 Dettaglio Utile'}
      </h2>

      <p className="muted">
        La sezione dettagliata verrà collegata nel passaggio
        successivo.
      </p>
    </div>
  </section>
)}
        {tab === 'calendario' && (
          <>
            <div className="card no-print" style={{ marginBottom: 20 }}>
              <div className="actions">
                <button className="btn green" onClick={() => setTab('dashboard')}>⬅ Dashboard</button>
                <button className="btn gold" onClick={() => setTab('dipendenti')}>👥 Dipendenti</button>
                <button className="btn gold" onClick={() => setTab('riepilogo')}>📊 Riepilogo</button>
                <button className="btn gold" onClick={() => setTab('storico')}>📚 Storico</button>
                <button
  type="button"
  className="btn gold"
  onClick={() => setTab('whatsapp-turni')}
>
  📲 Turni WhatsApp
</button>

<button
  type="button"
  className="btn gold"
  disabled={pdfLoading}
  onClick={condividiPdfWhatsApp}
>
  {pdfLoading
    ? '⏳ Preparazione PDF...'
    : '📤 Condividi PDF'}
</button>
                <button className="btn gold" onClick={saveTurno}>💾 Salva turno</button>
                <button className="btn green" onClick={replicaSettimanaSuccessiva}>🔁 Replica settimana</button>
                <button
 
  type="button"
  className="btn gold"
  disabled={pdfLoading}
  onClick={scaricaPdfCollaboratori}
>
  {pdfLoading
    ? '⏳ Creazione PDF...'
    : '📥 SCARICA PDF COLLABORATORI'}
</button>
                <button
  type="button"
  className="btn danger"
  onClick={() => {
    setPrintMode('direzione');

    window.setTimeout(() => {
      window.print();
    }, 300);
  }}
>
  🖨 STAMPA REPORT DIREZIONE
</button>
              </div>
            </div>

            <CalendarSection
              weekInfo={weekInfo}
              employees={employees}
              schedule={schedule}
              closed={closed}
              dayRests={dayRests}
              setWeekInfo={setWeekInfo}
              setClosed={setClosed}
              setDayRests={setDayRests}
              addSelect={addSelect}
              updateSelect={updateSelect}
              removeSelect={removeSelect}
            />
            <div className="card no-print" style={{ marginTop: 20 }}>
  <h2>✅ Controllo turni settimanali</h2>

  {summary.length === 0 ? (
    <p className="muted">
      Nessun turno ancora assegnato.
    </p>
  ) : (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Collaboratore</th>
            <th>Reparto</th>
            <th>Pranzi</th>
            <th>Cene</th>
            <th>Totale turni</th>
            <th>Costo</th>
          </tr>
        </thead>

        <tbody>
          {summary.map((riga) => (
            <tr key={`${riga.nome}-${riga.reparto}`}>
              <td>{riga.nome}</td>
              <td>{riga.reparto}</td>
              <td>{riga.pranzi}</td>
              <td>{riga.cene}</td>
              <td>
                <strong>{riga.turni}</strong>
              </td>
              <td>
                {riga.costo.toLocaleString('it-IT', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>
          </>
        )}

        {tab === 'dipendenti' && <EmployeesSection employees={employees} setEmployees={setEmployees} />}
        {tab === 'whatsapp-turni' && (
  <WhatsAppSection
    employees={employees}
    schedule={schedule}
    closed={closed}
    weekInfo={weekInfo}
  />
)}

        {tab === 'riepilogo' && <Summary summary={summary} totals={totals} />}

        {tab === 'storico' && (
          <HistorySection history={history} setHistory={setHistory} openSnapshot={openSnapshot} />
        )}

        {tab === 'bilancio' && <ControlloGestioneSection />}
        {tab === 'marketing' && <MarketingSection />}

        {tab === 'impostazioni' && <SettingsSection />}

        <div className="print-only">
          <h1>{printMode === 'direzione' ? 'Report Direzione' : 'Turni Collaboratori'} · Settimana {weekInfo.week}</h1>
          <p>Dal {itDate(weekInfo.start)} al {itDate(weekInfo.end)}</p>
        </div>

        {printMode === 'direzione' && (
          <div className="print-only">
            <Summary summary={summary} totals={totals} />
          </div>
        )}
            </main>

      <div className="pdf-export-container">
        <div ref={pdfContainerRef}>
          <PdfCollaboratori
            weekInfo={weekInfo}
            employees={employees}
            schedule={schedule}
            closed={closed}
            dayRests={dayRests}
          />
        </div>
      </div>
    </div>
  );
}