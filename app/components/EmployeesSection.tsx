import type { Dipendente } from '../types';
import { emoji, reparti } from '../lib/schedule';

export function EmployeesSection({ employees, setEmployees }: { employees: Dipendente[]; setEmployees: (employees: Dipendente[]) => void }) {
  return (
    <section>
      <div className="card no-print actions">
        {reparti.map((r) => (
          <button key={r} className="btn primary" onClick={() => setEmployees([...employees, { nome: '', reparto: r, costoTurno: 50, riposo: '' }])}>+ {r}</button>
        ))}
      </div>
      {reparti.map((r) => (
        <div className="card" key={r}>
          <h2>{emoji(r)} {r}</h2>
          {employees.filter((e) => e.reparto === r).map((e) => {
            const idx = employees.indexOf(e);
            return (
              <div className="employee-row" key={idx}>
                <input value={e.nome} placeholder="Nome" onChange={(ev) => { const c = [...employees]; c[idx].nome = ev.target.value; setEmployees(c); }} />
                <input type="number" value={e.costoTurno} onChange={(ev) => { const c = [...employees]; c[idx].costoTurno = Number(ev.target.value); setEmployees(c); }} />
                <input value={e.riposo || ''} placeholder="Riposo" onChange={(ev) => { const c = [...employees]; c[idx].riposo = ev.target.value; setEmployees(c); }} />
                <button className="btn danger" onClick={() => setEmployees(employees.filter((_, i) => i !== idx))}>Elimina</button>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
