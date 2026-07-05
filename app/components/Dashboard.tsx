import type { Totals } from '../types';

export function Dashboard({ totals, employeeCount, week, onOpenCalendar, onOpenEmployees, onOpenHistory }: { totals: Totals; employeeCount: number; week: number; onOpenCalendar: () => void; onOpenEmployees: () => void; onOpenHistory: () => void }) {
  return (
    <section>
      <div className="dashboard">
        <div className="kpi gold"><span>Settimana</span><strong>{week}</strong></div>
        <div className="kpi"><span>Turni totali</span><strong>{totals.turni}</strong></div>
        <div className="kpi green"><span>Costo settimana</span><strong>€ {totals.costo.toFixed(0)}</strong></div>
        <div className="kpi"><span>Dipendenti</span><strong>{employeeCount}</strong></div>
      </div>
      <div className="card">
        <h2>Avvio rapido</h2>
        <div className="actions">
          <button className="btn primary" onClick={onOpenCalendar}>Apri calendario</button>
          <button className="btn" onClick={onOpenEmployees}>Gestisci dipendenti</button>
          <button className="btn" onClick={onOpenHistory}>Storico turni</button>
        </div>
      </div>
    </section>
  );
}
