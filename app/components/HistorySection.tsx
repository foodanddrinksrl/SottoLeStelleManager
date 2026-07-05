import type { Dipendente, Snapshot, WeekInfo } from '../types';
import { itDate } from '../lib/schedule';

export function HistorySection({
  history,
  setHistory,
  openSnapshot,
}: {
  history: Snapshot[];
  setHistory: (history: Snapshot[]) => void;
  openSnapshot: (snapshot: Snapshot) => void;
}) {
  return (
    <section>
      {history.length === 0 && <div className="history-card">Nessun turno salvato.</div>}
      {history.map((h) => (
        <div className="history-card" key={h.id}>
          <h3>Settimana {h.weekInfo.week} · {h.weekInfo.month} {h.weekInfo.year}</h3>
          <p className="muted">Dal {itDate(h.weekInfo.start)} al {itDate(h.weekInfo.end)} · Salvato {h.savedAt}</p>
          <button className="btn primary" onClick={() => openSnapshot(h)}>Apri</button>{' '}
          <button className="btn danger" onClick={() => setHistory(history.filter((x) => x.id !== h.id))}>Elimina</button>
        </div>
      ))}
    </section>
  );
}
