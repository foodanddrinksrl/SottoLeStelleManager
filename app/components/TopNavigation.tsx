'use client';

type TopNavigationProps = {
  activeTab: string;
  onDashboard: () => void;
  onRisorseUmane: () => void;
  onBilancioGestionale: () => void;
};

export function TopNavigation({
  activeTab,
  onDashboard,
  onRisorseUmane,
  onBilancioGestionale,
}: TopNavigationProps) {
  return (
    <nav className="nav no-print">
      <button
        className={activeTab === 'dashboard' ? 'active' : ''}
        onClick={onDashboard}
      >
        🏠 Dashboard
      </button>

      <button
        className={
          [
            'calendario',
            'dipendenti',
            'riepilogo',
            'storico',
            'whatsapp',
          ].includes(activeTab)
            ? 'active'
            : ''
        }
        onClick={onRisorseUmane}
      >
        👥 Risorse Umane
      </button>

      <button
        className={activeTab === 'bilancio' ? 'active' : ''}
        onClick={onBilancioGestionale}
      >
        📊 Bilancio Gestionale
      </button>
    </nav>
  );
}