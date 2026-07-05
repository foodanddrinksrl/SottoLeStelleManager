const tabs = ['dashboard', 'calendario', 'dipendenti', 'riepilogo', 'storico', 'impostazioni'];

export function Navigation({ tab, onChange }: { tab: string; onChange: (tab: string) => void }) {
  return (
    <nav className="nav no-print">
      {tabs.map((t) => (
        <button key={t} className={tab === t ? 'active' : ''} onClick={() => onChange(t)}>
          {t[0].toUpperCase() + t.slice(1)}
        </button>
      ))}
    </nav>
  );
}
