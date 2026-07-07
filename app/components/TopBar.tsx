import type { WeekInfo } from '../types';
import { itDate } from '../lib/schedule';

export function TopBar({
  user,
  weekInfo,
  onSave,
  onReplica,
  onExportCollaboratori,
  onExportDirezione,
  onWhatsapp,
  onLogout,
}: {
  user: string;
  weekInfo: WeekInfo;
  onSave: () => void;
  onReplica: () => void;
  onExportCollaboratori: () => void;
  onExportDirezione: () => void;
  onWhatsapp: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <div>
        <h1>🍕 Sotto le Stelle Manager</h1>
        <p>
          {user} · Settimana {weekInfo.week} · dal {itDate(weekInfo.start)} al {itDate(weekInfo.end)}
        </p>
      </div>
      <div className="actions no-print">
        <button className="btn light" onClick={onSave}>Salva turno</button>
        <button className="btn green" onClick={onReplica}>Replica settimana successiva</button>
        <button className="btn whatsapp" onClick={onWhatsapp}>📲 Invia turni WhatsApp</button>
        <button className="btn light" onClick={onExportCollaboratori}>PDF Collaboratori</button>
        <button className="btn gold" onClick={onExportDirezione}>PDF Direzione</button>
        <button className="btn light" onClick={onLogout}>Esci</button>
      </div>
    </header>
  );
}
