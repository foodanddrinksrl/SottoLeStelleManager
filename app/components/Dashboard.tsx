export function Dashboard({
  totals,
  employeeCount,
  week,
  onOpenCalendar,
  onOpenMagazzino,
}: {
  totals: any;
  employeeCount: number;
  week: number;
  onOpenCalendar: () => void;
  onOpenMagazzino: () => void;
}) {
  return (
    <section>
      <div className="dashboard">
        <div className="kpi gold"><span>Settimana</span><strong>{week}</strong></div>
        <div className="kpi"><span>Turni totali</span><strong>{totals.turni}</strong></div>
        <div className="kpi green"><span>Costo personale</span><strong>€ {totals.costo.toFixed(0)}</strong></div>
        <div className="kpi"><span>Collaboratori</span><strong>{employeeCount}</strong></div>
      </div>

      <div className="quick-grid">
        <button className="card module-card module-button" onClick={onOpenCalendar}>
          <h2>👥 Risorse Umane</h2>
          <p className="muted">Turni, dipendenti, riepilogo costi, storico e WhatsApp.</p>
          <strong>Apri modulo →</strong>
        </button>

        <button className="card module-card module-button" onClick={onOpenMagazzino}>
          <h2>📦 Magazzino</h2>
          <p className="muted">Prodotti, carico merce, scorte e ordini fornitori.</p>
          <strong>Apri modulo →</strong>
        </button>
      </div>
    </section>
  );
}