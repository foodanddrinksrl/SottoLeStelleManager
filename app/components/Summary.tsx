import type { SummaryRow, Totals } from '../types';

export function Summary({ summary, totals }: { summary: SummaryRow[]; totals: Totals }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Reparto</th>
          <th>Riposo</th>
          <th>Pranzi</th>
          <th>Cene</th>
          <th>Turni</th>
          <th>Costo turno</th>
          <th>Costo</th>
        </tr>
      </thead>
      <tbody>
        {summary.length ? (
          summary.map((s, i) => (
            <tr key={i}>
              <td>{s.nome}</td>
              <td>{s.reparto}</td>
              <td>{s.riposo}</td>
              <td>{s.pranzi}</td>
              <td>{s.cene}</td>
              <td>
                <strong>{s.turni}</strong>
              </td>
              <td>€ {s.costoTurno.toFixed(2)}</td>
              <td>
                <strong>€ {s.costo.toFixed(2)}</strong>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={8}>Nessun turno inserito.</td>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr>
          <th colSpan={3}>Totali</th>
          <th>{totals.pranzi}</th>
          <th>{totals.cene}</th>
          <th>{totals.turni}</th>
          <th></th>
          <th>€ {totals.costo.toFixed(2)}</th>
        </tr>
      </tfoot>
    </table>
  );
}
