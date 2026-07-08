const prodotti = [
  { nome: 'Farina', categoria: 'Pizzeria', giacenza: 8, minima: 5, unita: 'sacchi', fornitore: 'Caputo' },
  { nome: 'Mozzarella', categoria: 'Cucina', giacenza: 12, minima: 10, unita: 'kg', fornitore: 'Caseificio' },
  { nome: 'Pomodoro', categoria: 'Pizzeria', giacenza: 6, minima: 8, unita: 'cartoni', fornitore: 'Fornitore food' },
  { nome: 'Birra', categoria: 'Sala', giacenza: 20, minima: 12, unita: 'casse', fornitore: 'Bevande' },
];

export function MagazzinoSection() {
  const daRiordinare = prodotti.filter((p) => p.giacenza <= p.minima).length;

  return (
    <section>
      <div className="dashboard">
        <div className="kpi gold"><span>Prodotti</span><strong>{prodotti.length}</strong></div>
        <div className="kpi danger"><span>Da riordinare</span><strong>{daRiordinare}</strong></div>
        <div className="kpi green"><span>Valore stimato</span><strong>€ 0</strong></div>
        <div className="kpi"><span>Ordini aperti</span><strong>0</strong></div>
      </div>

      <div className="card">
        <h2>📦 Magazzino</h2>
        <p className="muted">Prodotti, giacenze, scorte minime e fornitori.</p>

        <div className="actions no-print">
          <button className="btn green">+ Nuovo prodotto</button>
          <button className="btn gold">📥 Carica magazzino</button>
          <button className="btn light">📤 Scarico prodotti</button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Categoria</th>
              <th>Giacenza</th>
              <th>Scorta minima</th>
              <th>Fornitore</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {prodotti.map((p) => (
              <tr key={p.nome}>
                <td>{p.nome}</td>
                <td>{p.categoria}</td>
                <td>{p.giacenza} {p.unita}</td>
                <td>{p.minima} {p.unita}</td>
                <td>{p.fornitore}</td>
                <td>
                  {p.giacenza <= p.minima ? '⚠️ Riordinare' : '✅ OK'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}