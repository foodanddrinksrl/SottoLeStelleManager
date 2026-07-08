export function Dashboard({
  totals,
  employeeCount,
  week,
  onOpenCalendar,
  onOpenEmployees,
  onOpenHistory,
}: {
  totals: any;
  employeeCount: number;
  week: number;
  onOpenCalendar: () => void;
  onOpenEmployees: () => void;
  onOpenHistory: () => void;
}) {
  return (
    <section>
      <div className="dashboard">
        <div className="kpi gold">
          <span>Settimana</span>
          <strong>{week}</strong>
        </div>

        <div className="kpi">
          <span>Turni totali</span>
          <strong>{totals.turni}</strong>
        </div>

        <div className="kpi green">
          <span>Costo personale</span>
          <strong>€ {totals.costo.toFixed(0)}</strong>
        </div>

        <div className="kpi">
          <span>Collaboratori</span>
          <strong>{employeeCount}</strong>
        </div>
      </div>

      <div className="quick-grid">
        <div className="card module-card">
          <h2>👥 Risorse Umane</h2>
          <p className="muted">Turni, collaboratori, storico e costi personale.</p>

          <div className="actions">
            <button className="btn green" onClick={onOpenCalendar}>📅 Calendario turni</button>
            <button className="btn" onClick={onOpenEmployees}>👥 Dipendenti</button>
            <button className="btn" onClick={onOpenHistory}>📚 Storico turni</button>
          </div>
        </div>

        <div className="card module-card">
          <h2>📦 Magazzino</h2>
          <p className="muted">Prodotti, carico merce, scorte e ordini fornitori.</p>

          <div className="actions">
            <button className="btn gold">📦 Apri magazzino</button>
            <button className="btn">📥 Carica merce</button>
            <button className="btn">🚚 Ordini fornitori</button>
          </div>
        </div>
      </div>
    </section>
  );
}