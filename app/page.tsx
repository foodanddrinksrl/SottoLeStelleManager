'use client';

import { useEffect, useMemo, useState } from 'react';

type Reparto = 'Pizzeria' | 'Cucina' | 'Sala';
type Dipendente = { nome: string; reparto: Reparto; costoTurno: number; riposo?: string };
type WeekInfo = { start: string; end: string; year: number; month: string; week: number };
type Snapshot = { id: number; label: string; savedAt: string; weekInfo: WeekInfo; employees: Dipendente[]; schedule: Record<string,string[]>; closed: Record<string,boolean>; dayRests: Record<string,string> };

const giorni = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const reparti: Reparto[] = ['Pizzeria','Cucina','Sala'];

const defaultEmployees: Dipendente[] = [
  {nome:'Rosario', reparto:'Pizzeria', costoTurno:50, riposo:'Martedì'},
  {nome:'Luca', reparto:'Pizzeria', costoTurno:50, riposo:'Mercoledì'},
  {nome:'Luigi', reparto:'Pizzeria', costoTurno:50, riposo:'Lunedì'},
  {nome:'Gabriele', reparto:'Pizzeria', costoTurno:50},
  {nome:'Extra', reparto:'Pizzeria', costoTurno:50},
  {nome:'Roberta', reparto:'Cucina', costoTurno:50, riposo:'Lunedì'},
  {nome:'Rosa', reparto:'Cucina', costoTurno:50, riposo:'Giovedì'},
  {nome:'Gesuè', reparto:'Cucina', costoTurno:50, riposo:'Mercoledì'},
  {nome:'Miguel', reparto:'Cucina', costoTurno:50},
  {nome:'Extra', reparto:'Cucina', costoTurno:50},
  {nome:'Maddalena', reparto:'Sala', costoTurno:50},
  {nome:'Miguel', reparto:'Sala', costoTurno:50},
  {nome:'Luigi', reparto:'Sala', costoTurno:50, riposo:'Lunedì'},
  {nome:'Rosa', reparto:'Sala', costoTurno:50, riposo:'Giovedì'},
  {nome:'Extra', reparto:'Sala', costoTurno:50}
];

const defaultSchedule: Record<string,string[]> = {
  'Lunedì_Cena_Pizzeria':['Rosario','Luca'], 'Lunedì_Cena_Cucina':['Rosa','Gesuè'], 'Lunedì_Cena_Sala':['Maddalena','Miguel'],
  'Martedì_Cena_Pizzeria':['Luigi','Luca','Gabriele'], 'Martedì_Cena_Cucina':['Roberta','Rosa','Gesuè'], 'Martedì_Cena_Sala':['Rosa','Miguel'],
  'Mercoledì_Cena_Pizzeria':['Rosario','Gabriele'], 'Mercoledì_Cena_Cucina':['Rosa','Extra'], 'Mercoledì_Cena_Sala':['Maddalena','Miguel'],
  'Giovedì_Cena_Pizzeria':['Rosario','Luca'], 'Giovedì_Cena_Cucina':['Roberta','Gesuè'], 'Giovedì_Cena_Sala':['Luigi','Miguel'],
  'Venerdì_Cena_Pizzeria':['Rosario','Luca','Gabriele'], 'Venerdì_Cena_Cucina':['Rosa','Gesuè'], 'Venerdì_Cena_Sala':['Maddalena','Miguel'],
  'Sabato_Cena_Pizzeria':['Rosario','Luca','Gabriele'], 'Sabato_Cena_Cucina':['Rosa','Roberta','Gesuè'], 'Sabato_Cena_Sala':['Miguel','Maddalena'],
  'Domenica_Cena_Pizzeria':['Rosario','Luca'], 'Domenica_Cena_Cucina':['Rosa','Miguel'], 'Domenica_Cena_Sala':['Maddalena']
};

const defaultClosed = Object.fromEntries(giorni.map(g => [`${g}_Pranzo`, true]));
const defaultDayRests: Record<string,string> = {'Lunedì':'Luigi, Roberta','Martedì':'Rosario','Mercoledì':'Luca, Gesuè','Giovedì':'Rosa'};

function pad(n:number){ return String(n).padStart(2,'0'); }
function isoDate(d:Date){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function addDays(iso:string, days:number){ const d = new Date(iso+'T00:00:00'); d.setDate(d.getDate()+days); return isoDate(d); }
function itDate(iso:string){ return new Date(iso+'T00:00:00').toLocaleDateString('it-IT'); }
function monthName(iso:string){ return new Date(iso+'T00:00:00').toLocaleDateString('it-IT',{month:'long'}); }
function weekNumber(date:Date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate()+4-day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((+d - +yearStart)/86400000)+1)/7);
}
function makeWeekInfo(date = new Date()): WeekInfo {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate()-day+1);
  const start = isoDate(d);
  return { start, end:addDays(start,6), year:d.getFullYear(), month:monthName(start), week:weekNumber(d) };
}
function key(g:string,t:string,r:string){ return `${g}_${t}_${r}`; }
function closedKey(g:string,t:string){ return `${g}_${t}`; }
function emoji(r:Reparto){ return r==='Pizzeria'?'🍕':r==='Cucina'?'🍝':'🍽'; }

export default function Page(){
  const [logged, setLogged] = useState(false);
  const [user, setUser] = useState('Luigi');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('calendario');
  const [employees, setEmployees] = useState<Dipendente[]>(defaultEmployees);
  const [schedule, setSchedule] = useState<Record<string,string[]>>(defaultSchedule);
  const [closed, setClosed] = useState<Record<string,boolean>>(defaultClosed);
  const [dayRests, setDayRests] = useState<Record<string,string>>(defaultDayRests);
  const [weekInfo, setWeekInfo] = useState<WeekInfo>(makeWeekInfo());
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [printMode, setPrintMode] = useState<'collaboratori'|'direzione'>('collaboratori');

  useEffect(() => {
    const load = (k:string, fallback:any) => {
      try { return JSON.parse(localStorage.getItem(k) || '') || fallback; } catch { return fallback; }
    };
    setLogged(localStorage.getItem('slm_logged') === '1');
    setEmployees(load('slm_employees', defaultEmployees));
    setSchedule(load('slm_schedule', defaultSchedule));
    setClosed(load('slm_closed', defaultClosed));
    setDayRests(load('slm_rests', defaultDayRests));
    setWeekInfo(load('slm_week', makeWeekInfo()));
    setHistory(load('slm_history', []));
  }, []);

  useEffect(() => {
    localStorage.setItem('slm_employees', JSON.stringify(employees));
    localStorage.setItem('slm_schedule', JSON.stringify(schedule));
    localStorage.setItem('slm_closed', JSON.stringify(closed));
    localStorage.setItem('slm_rests', JSON.stringify(dayRests));
    localStorage.setItem('slm_week', JSON.stringify(weekInfo));
    localStorage.setItem('slm_history', JSON.stringify(history));
  }, [employees, schedule, closed, dayRests, weekInfo, history]);

  const summary = useMemo(() => {
    const stats: Record<string, any> = {};
    giorni.forEach(g => ['Pranzo','Cena'].forEach(t => {
      if(closed[closedKey(g,t)]) return;
      reparti.forEach(r => (schedule[key(g,t,r)] || []).filter(Boolean).forEach(nome => {
        const k = `${nome}__${r}`;
        if(!stats[k]) stats[k] = { nome, reparto:r, pranzi:0, cene:0, ore:0 };
        if(t==='Pranzo'){ stats[k].pranzi++; stats[k].ore += 4; }
        if(t==='Cena'){ stats[k].cene++; stats[k].ore += 5.5; }
      }));
    }));
    return Object.values(stats).map((s:any) => {
      const emp = employees.find(e => e.nome.toLowerCase() === s.nome.toLowerCase() && e.reparto === s.reparto)
        || employees.find(e => e.nome.toLowerCase() === s.nome.toLowerCase());
      const turni = s.pranzi + s.cene;
      const costoTurno = emp?.costoTurno || 0;
      return { ...s, riposo: emp?.riposo || '', costoTurno, turni, costo: turni * costoTurno };
    });
  }, [schedule, closed, employees]);

  function login(){
    if((user === 'Luigi' || user === 'Roberta') && password.trim().length >= 3){
      localStorage.setItem('slm_logged','1');
      setLogged(true);
    } else {
      alert('Inserisci Luigi o Roberta e una password di almeno 3 caratteri.');
    }
  }

  if(!logged){
    return <div className="login"><div className="login-card">
      <h1>🍕 Sotto le Stelle Manager</h1>
      <p className="muted">Accesso iniziale locale. In futuro collegheremo Supabase per login online.</p>
      <select value={user} onChange={e=>setUser(e.target.value)} style={{width:'100%', padding:12, borderRadius:12, marginBottom:10}}>
        <option>Luigi</option>
        <option>Roberta</option>
      </select>
      <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="btn primary" style={{width:'100%'}} onClick={login}>Entra</button>
    </div></div>
  }

  function addSelect(g:string,t:string,r:Reparto){
    setSchedule(s => ({...s, [key(g,t,r)]: [...(s[key(g,t,r)] || []), '']}));
  }
  function updateSelect(g:string,t:string,r:Reparto,i:number,value:string){
    setSchedule(s => {
      const arr = [...(s[key(g,t,r)] || [])];
      arr[i] = value;
      return {...s, [key(g,t,r)]: arr.filter(Boolean)};
    });
  }
  function removeSelect(g:string,t:string,r:Reparto,i:number){
    setSchedule(s => {
      const arr = [...(s[key(g,t,r)] || [])];
      arr.splice(i,1);
      return {...s, [key(g,t,r)]: arr};
    });
  }
  function saveTurno(){
    const snap: Snapshot = {
      id: Date.now(),
      label: `Settimana ${weekInfo.week}`,
      savedAt: new Date().toLocaleString('it-IT'),
      weekInfo,
      employees,
      schedule,
      closed,
      dayRests
    };
    setHistory(h => {
      const idx = h.findIndex(x => x.weekInfo.start === weekInfo.start);
      if(idx >= 0){
        const copy = [...h];
        copy[idx] = {...snap, id: copy[idx].id};
        return copy;
      }
      return [snap, ...h];
    });
    alert('Turno salvato nello storico.');
  }
  function exportPdf(mode:'collaboratori'|'direzione'){
    setPrintMode(mode);
    setTimeout(() => window.print(), 100);
  }

  const total = summary.reduce((a:any,b:any)=>({
    pranzi:a.pranzi+b.pranzi, cene:a.cene+b.cene, turni:a.turni+b.turni, costo:a.costo+b.costo
  }), {pranzi:0,cene:0,turni:0,costo:0});

  return <div className="app-shell">
    <header className="topbar">
      <div><h1>Sotto le Stelle Manager</h1><p>Benvenuto {user} · Settimana {weekInfo.week}</p></div>
      <div className="actions no-print">
        <button className="btn light" onClick={saveTurno}>Salva turno</button>
        <button className="btn light" onClick={()=>exportPdf('collaboratori')}>PDF Collaboratori</button>
        <button className="btn light" onClick={()=>exportPdf('direzione')}>PDF Direzione</button>
        <button className="btn light" onClick={()=>{localStorage.removeItem('slm_logged'); setLogged(false)}}>Esci</button>
      </div>
    </header>

    <nav className="nav no-print">
      {['calendario','dipendenti','riepilogo','storico'].map(t => <button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}
    </nav>

    <main className="container">
      {tab === 'calendario' && <section>
        <div className="card no-print">
          <div className="actions">
            <label className="field"><span>Dal</span><input type="date" value={weekInfo.start} onChange={e=>setWeekInfo(makeWeekInfo(new Date(e.target.value+'T00:00:00')))} /></label>
            <label className="field"><span>Al</span><input value={weekInfo.end} readOnly /></label>
            <label className="field"><span>Settimana</span><input value={weekInfo.week} readOnly /></label>
          </div>
        </div>

        <div className="grid7">
          {giorni.map(g => <div className="day" key={g}>
            <h3>{g}</h3>
            <div className="shift no-print">
              <label className="field"><span>Riposo</span><input value={dayRests[g] || ''} onChange={e=>setDayRests({...dayRests,[g]:e.target.value})} /></label>
            </div>
            {['Pranzo','Cena'].map(t => <div className="shift" key={t}>
              <div className="shift-title"><span>{t}</span><label className="no-print"><input type="checkbox" checked={!!closed[closedKey(g,t)]} onChange={e=>setClosed({...closed,[closedKey(g,t)]:e.target.checked})} /> Chiuso</label></div>
              {closed[closedKey(g,t)] ? <div className="closed">CHIUSO</div> : reparti.map(r => {
                const selected = schedule[key(g,t,r)]?.length ? schedule[key(g,t,r)] : [''];
                const options = employees.filter(e=>e.reparto===r && e.nome).map(e=>e.nome);
                return <div className="reparto" key={r}><strong>{emoji(r)} {r}</strong>
                  {selected.map((name, i) => <div className="select-row" key={i}>
                    <select value={name} onChange={e=>updateSelect(g,t,r,i,e.target.value)}>
                      <option value="">Seleziona</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <button className="small no-print" onClick={()=>removeSelect(g,t,r,i)}>×</button>
                  </div>)}
                  <button className="small no-print" onClick={()=>addSelect(g,t,r)}>+ {r}</button>
                </div>
              })}
            </div>)}
          </div>)}
        </div>
      </section>}

      {tab === 'dipendenti' && <section>
        <div className="actions card">
          {reparti.map(r => <button key={r} className="btn primary" onClick={()=>setEmployees([...employees,{nome:'',reparto:r,costoTurno:50,riposo:''}])}>+ {r}</button>)}
        </div>
        {reparti.map(r => <div className="card" key={r}>
          <h2>{emoji(r)} {r}</h2>
          {employees.filter(e=>e.reparto===r).map((e) => {
            const idx = employees.indexOf(e);
            return <div className="employee-row" key={idx}>
              <input placeholder="Nome" value={e.nome} onChange={ev=>{const c=[...employees]; c[idx].nome=ev.target.value; setEmployees(c)}} />
              <input type="number" placeholder="Costo turno" value={e.costoTurno} onChange={ev=>{const c=[...employees]; c[idx].costoTurno=Number(ev.target.value); setEmployees(c)}} />
              <input placeholder="Riposo" value={e.riposo || ''} onChange={ev=>{const c=[...employees]; c[idx].riposo=ev.target.value; setEmployees(c)}} />
              <button className="btn danger" onClick={()=>setEmployees(employees.filter((_,i)=>i!==idx))}>Elimina</button>
            </div>
          })}
        </div>)}
      </section>}

      {tab === 'riepilogo' && <Summary summary={summary} total={total} />}

      {tab === 'storico' && <section>
        {history.length === 0 && <div className="history-card">Nessun turno salvato.</div>}
        {history.map(h => <div className="history-card" key={h.id}>
          <h3>Settimana {h.weekInfo.week} · {h.weekInfo.month} {h.weekInfo.year}</h3>
          <p className="muted">Dal {itDate(h.weekInfo.start)} al {itDate(h.weekInfo.end)} · Salvato {h.savedAt}</p>
          <div className="actions">
            <button className="btn primary" onClick={()=>{setWeekInfo(h.weekInfo); setEmployees(h.employees); setSchedule(h.schedule); setClosed(h.closed); setDayRests(h.dayRests); setTab('calendario')}}>Apri</button>
            <button className="btn" onClick={()=>{setPrintMode('collaboratori'); setTimeout(()=>window.print(),100)}}>PDF Collaboratori</button>
            <button className="btn" onClick={()=>{setPrintMode('direzione'); setTimeout(()=>window.print(),100)}}>PDF Direzione</button>
            <button className="btn danger" onClick={()=>setHistory(history.filter(x=>x.id!==h.id))}>Elimina</button>
          </div>
        </div>)}
      </section>}

      <div className="print-only">
        <h1>{printMode === 'direzione' ? 'Report Direzione' : 'Turni Collaboratori'} · Settimana {weekInfo.week}</h1>
        <p>Dal {itDate(weekInfo.start)} al {itDate(weekInfo.end)}</p>
      </div>
      {printMode === 'direzione' && <div className="print-only"><Summary summary={summary} total={total} /></div>}
    </main>
  </div>
}

function Summary({summary,total}:{summary:any[],total:any}){
  return <table className="summary"><thead><tr><th>Nome</th><th>Reparto</th><th>Riposo</th><th>Pranzi</th><th>Cene</th><th>Turni</th><th>Costo turno</th><th>Costo</th></tr></thead>
    <tbody>{summary.map((s,i)=><tr key={i}><td>{s.nome}</td><td>{s.reparto}</td><td>{s.riposo}</td><td>{s.pranzi}</td><td>{s.cene}</td><td><strong>{s.turni}</strong></td><td>€ {s.costoTurno.toFixed(2)}</td><td><strong>€ {s.costo.toFixed(2)}</strong></td></tr>)}</tbody>
    <tfoot><tr><th colSpan={3}>Totali</th><th>{total.pranzi}</th><th>{total.cene}</th><th>{total.turni}</th><th></th><th>€ {total.costo.toFixed(2)}</th></tr></tfoot>
  </table>
}
