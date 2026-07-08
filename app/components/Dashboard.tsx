export function Dashboard({
  totals,
  employeeCount,
  week,
  onOpenCalendar,
  onOpenEmployees,
  onOpenHistory,
  onOpenSummary,
  onOpenWhatsApp,
  onSaveTurno,
  onReplicaSettimana,
  onPdfCollaboratori,
  onPdfDirezione,
  onOpenMagazzino,
}: {
  totals: any;
  employeeCount: number;
  week: number;
  onOpenCalendar: () => void;
  onOpenEmployees: () => void;
  onOpenHistory: () => void;
  onOpenSummary: () => void;
  onOpenWhatsApp: () => void;
  onSaveTurno: () => void;
  onReplicaSettimana: () => void;
  onPdfCollaboratori: () => void;
  onPdfDirezione: () => void;
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
        <div className="card module-card">
          <h2>👥 Risorse Umane</h2>
          <p className="muted">Turni, collaboratori, storico, WhatsApp e PDF.</p>

          <div className="actions">
            <button className="btn green" onClick={onOpenCalendar}>📅 Calendario</button>
            <button className="btn" onClick={onOpenEmployees}>👥 Dipendenti</button>
            <button className="btn" onClick={onOpenSummary}>📊 Riepilogo</button>
            <button className="btn" onClick={onOpenHistory}>📚 Storico</button>
            <button className="btn" onClick={onOpenWhatsApp}>📲 WhatsApp</button>
            <button className="btn light" onClick={onSaveTurno}>Salva turno</button>
            <button className="btn green" onClick={onReplicaSettimana}>Replica settimana successiva</button>
            <button className="btn light" onClick={onPdfCollaboratori}>PDF Collaboratori</button>
            <button className="btn gold" onClick={onPdfDirezione}>PDF Direzione</button>
          </div>
        </div>

        <div className="card module-card">
          <h2>📦 Magazzino</h2>
          <p className="muted">Prodotti, carico merce, scorte e ordini fornitori.</p>

          <div className="actions">
            <button className="btn gold" onClick={onOpenMagazzino}>📦 Apri magazzino</button>
            <button className="btn" onClick={onOpenMagazzino}>📥 Carica merce</button>
            <button className="btn" onClick={onOpenMagazzino}>🚚 Ordini fornitori</button>
          </div>
        </div>
      </div>
    </section>
  );
}