'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ControlloGestioneSection } from './components/ControlloGestioneSection';
import { CalendarSection } from './components/CalendarSection';
import { EmployeesSection } from './components/EmployeesSection';
import { HistorySection } from './components/HistorySection';
import { MagazzinoSection } from './components/MagazzinoSection';
import { SettingsSection } from './components/SettingsSection';
import { Summary } from './components/Summary';
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
import type { Dipendente, Reparto, Snapshot, WeekInfo } from './types';

export default function Page() {
  const [tab, setTab] = useState('dashboard');
  const [employees, setEmployees] = useState<Dipendente[]>(defaultEmployees);
  const [schedule, setSchedule] = useState<Record<string, string[]>>(defaultSchedule);
  const [closed, setClosed] = useState<Record<string, boolean>>(defaultClosed);
  const [dayRests, setDayRests] = useState<Record<string, string>>(defaultDayRests);
  const [weekInfo, setWeekInfo] = useState<WeekInfo>(makeWeekInfo());
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [printMode, setPrintMode] = useState<'collaboratori' | 'direzione'>('collaboratori');

  useEffect(() => {
    const load = (key: string, fallback: any) => {
      try {
        return JSON.parse(localStorage.getItem(key) || '') || fallback;
      } catch {
        return fallback;
      }
    };

    setEmployees(load('slm_v3_employees', defaultEmployees));
    setSchedule(load('slm_v3_schedule', defaultSchedule));
    setClosed(load('slm_v3_closed', defaultClosed));
    setDayRests(load('slm_v3_rests', defaultDayRests));
    setWeekInfo(load('slm_v3_week', makeWeekInfo()));
    setHistory(load('slm_v3_history', []));
  }, []);

  useEffect(() => {
    localStorage.setItem('slm_v3_employees', JSON.stringify(employees));
    localStorage.setItem('slm_v3_schedule', JSON.stringify(schedule));
    localStorage.setItem('slm_v3_closed', JSON.stringify(closed));
    localStorage.setItem('slm_v3_rests', JSON.stringify(dayRests));
    localStorage.setItem('slm_v3_week', JSON.stringify(weekInfo));
    localStorage.setItem('slm_v3_history', JSON.stringify(history));
  }, [employees, schedule, closed, dayRests, weekInfo, history]);

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

  function exportPdf(mode: 'collaboratori' | 'direzione') {
    setPrintMode(mode);
    setTimeout(() => window.print(), 150);
  }

  function openSnapshot(snapshot: Snapshot) {
    setWeekInfo(snapshot.weekInfo);
    setEmployees(snapshot.employees);
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

      <nav className="nav no-print">
        {['dashboard'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <main className="container">
        {tab === 'dashboard' && (
          <Dashboard
            totals={totals}
            employeeCount={employees.length}
            week={weekInfo.week}
            onOpenCalendar={() => setTab('calendario')}
            onOpenMagazzino={() => setTab('magazzino')}
            onOpenBilancio={() => setTab('bilancio')}
          />
        )}

        {tab === 'calendario' && (
          <>
            <div className="card no-print" style={{ marginBottom: 20 }}>
              <div className="actions">
                <button className="btn green" onClick={() => setTab('dashboard')}>⬅ Dashboard</button>
                <button className="btn gold" onClick={() => setTab('dipendenti')}>👥 Dipendenti</button>
                <button className="btn gold" onClick={() => setTab('riepilogo')}>📊 Riepilogo</button>
                <button className="btn gold" onClick={() => setTab('storico')}>📚 Storico</button>
                <button className="btn gold" onClick={() => setTab('whatsapp')}>📲 WhatsApp</button>
                <button className="btn gold" onClick={saveTurno}>💾 Salva turno</button>
                <button className="btn green" onClick={replicaSettimanaSuccessiva}>🔁 Replica settimana</button>
                <button className="btn gold" onClick={() => exportPdf('collaboratori')}>PDF Collaboratori</button>
                <button className="btn gold" onClick={() => exportPdf('direzione')}>PDF Direzione</button>
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
          </>
        )}

        {tab === 'dipendenti' && <EmployeesSection employees={employees} setEmployees={setEmployees} />}

        {tab === 'riepilogo' && <Summary summary={summary} totals={totals} />}

        {tab === 'storico' && (
          <HistorySection history={history} setHistory={setHistory} openSnapshot={openSnapshot} />
        )}

        {tab === 'bilancio' && <ControlloGestioneSection />}

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
    </div>
  );
}