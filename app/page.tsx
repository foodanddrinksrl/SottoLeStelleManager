'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarSection } from './components/CalendarSection';
import { Dashboard } from './components/Dashboard';
import { EmployeesSection } from './components/EmployeesSection';
import { HistorySection } from './components/HistorySection';
import { Navigation } from './components/Navigation';
import { SettingsSection } from './components/SettingsSection';
import { Summary } from './components/Summary';
import { TopBar } from './components/TopBar';
import {
  addDays,
  calculateSummary,
  calculateTotals,
  defaultClosed,
  defaultDayRests,
  defaultEmployees,
  defaultSchedule,
  k,
  makeWeekInfo,
  itDate,
} from './lib/schedule';
import type { Dipendente, Reparto, Snapshot, WeekInfo } from './types';

export default function Page() {
  const [logged, setLogged] = useState(false);
  const [user, setUser] = useState('Luigi');
  const [pass, setPass] = useState('');
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

    setLogged(localStorage.getItem('slm_v3_logged') === '1');
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

  if (false && !logged) {
    return (
      <div className="login">
        <div className="login-card">
          <div className="brand">SLS</div>
          <h1>Sotto le Stelle Manager</h1>
          <p className="muted">Accesso Luigi / Roberta. Prossima fase: Supabase per login online.</p>
          <select value={user} onChange={(e) => setUser(e.target.value)}>
            <option>Luigi</option>
            <option>Roberta</option>
          </select>
          <input type="password" placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} />
          <button
            className="btn primary"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => {
              if (pass.length >= 3) {
                localStorage.setItem('slm_v3_logged', '1');
                setLogged(true);
              } else {
                alert('Inserisci una password di almeno 3 caratteri.');
              }
            }}
          >
            Entra
          </button>
        </div>
      </div>
    );
  }

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
    const snap = { id: Date.now(), savedAt: new Date().toLocaleString('it-IT'), weekInfo, employees, schedule, closed, dayRests };
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
      <TopBar
        user={user}
        weekInfo={weekInfo}
        onSave={saveTurno}
        onReplica={replicaSettimanaSuccessiva}
        onExportCollaboratori={() => exportPdf('collaboratori')}
        onExportDirezione={() => exportPdf('direzione')}
        onLogout={() => {
          localStorage.removeItem('slm_v3_logged');
          setLogged(false);
        }}
      />

      <Navigation tab={tab} onChange={setTab} />

      <main className="container">
        {tab === 'dashboard' && (
          <Dashboard
            totals={totals}
            employeeCount={employees.length}
            week={weekInfo.week}
            onOpenCalendar={() => setTab('calendario')}
            onOpenEmployees={() => setTab('dipendenti')}
            onOpenHistory={() => setTab('storico')}
          />
        )}

        {tab === 'calendario' && (
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
        )}

        {tab === 'dipendenti' && <EmployeesSection employees={employees} setEmployees={setEmployees} />}

        {tab === 'riepilogo' && <Summary summary={summary} totals={totals} />}

        {tab === 'storico' && <HistorySection history={history} setHistory={setHistory} openSnapshot={openSnapshot} />}

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
