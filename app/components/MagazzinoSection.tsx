export function MagazzinoSection() {
  return (
    <section className="card">
      <h2>📦 Magazzino</h2>
      <p className="muted">Prima versione: prodotti, giacenze, scorte minime e fornitori.</p>

      <div className="actions no-print">
        <button className="btn green">+ Nuovo prodotto</button>
        <button className="btn light">Carica magazzino</button>
        <button className="btn light">Scarico prodotti</button>
      </div>
    </section>
  );
}