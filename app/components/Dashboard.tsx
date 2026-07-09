export function Dashboard({
  totals,
  employeeCount,
  week,
  onOpenCalendar,
  onOpenMagazzino,
  onOpenBilancio,
}: {
  totals: any;
  employeeCount: number;
  week: number;
  onOpenCalendar: () => void;
  onOpenMagazzino: () => void;
  onOpenBilancio: () => void;
}) {

  const incasso = 30645;
  const materiePrime = 9404;
  const personale = totals?.costo || 2300;

  const percMaterie = (materiePrime / incasso) * 100;
  const percPersonale = (personale / incasso) * 100;
  const utile = 47;

  const euro = (v:number)=>
    new Intl.NumberFormat("it-IT",{
      style:"currency",
      currency:"EUR",
      maximumFractionDigits:0
    }).format(v);

  return (

<section>

<div className="card">
<h2>🏠 Centro Direzionale</h2>

<p className="muted">
Controllo rapido della pizzeria senza aspettare il commercialista.
</p>

</div>

<div className="dashboard">

<div className="kpi">
<span>💰 Incasso mese</span>
<strong>{euro(incasso)}</strong>
</div>

<div className="kpi">
<span>📦 Materie Prime</span>
<strong>{percMaterie.toFixed(1)}%</strong>
<small>{euro(materiePrime)}</small>
</div>

<div className="kpi">
<span>👨 Personale</span>
<strong>{percPersonale.toFixed(1)}%</strong>
<small>{euro(personale)}</small>
</div>

<div className="kpi green">
<span>💵 Margine stimato</span>
<strong>{utile}%</strong>
</div>

</div>

<div className="card">

<h2>🚦 Stato Azienda</h2>

<p style={{fontSize:30,fontWeight:800}}>

{percMaterie<=30
? "🟢 Situazione sotto controllo"
: "🔴 Materie Prime troppo alte"}

</p>

<p className="muted">

L'obiettivo è mantenere le materie prime sotto il 30% del fatturato.

</p>

</div>

<div className="quick-grid">

<button
className="card module-card module-button"
onClick={onOpenCalendar}
>

<h2>👥 Risorse Umane</h2>

<p className="muted">

Turni, dipendenti, storico e gestione personale.

</p>

<strong>▶ Entra</strong>

</button>

<button
className="card module-card module-button"
onClick={onOpenBilancio}
>

<h2>📊 Bilancio Gestionale</h2>

<p className="muted">

Materie prime, costi fissi, consumi, utile e KPI.

</p>

<strong>▶ Entra</strong>

</button>

</div>

<div className="card">

<h2>📌 Settimana {week}</h2>

<p className="muted">

Collaboratori attivi

<strong> {employeeCount}</strong>

•

Turni

<strong> {totals.turni}</strong>

</p>

</div>

</section>

  );
}