'use client';

import { useState } from 'react';
import { IncassiBaccoSection } from './IncassiBaccoSection';
import { AcquistiSection } from './AcquistiSection';

type SezioneControllo =
  | 'home'
  | 'incassi'
  | 'acquisti'
  | 'personale'
  | 'costi'
  | 'magazzino'
  | 'kpi';

export function ControlloGestioneSection() {
  const [sezione, setSezione] = useState<SezioneControllo>('home');

  if (sezione === 'incassi') {
    return (
      <IncassiBaccoSection
        onBack={() => setSezione('home')}
      />
    );
  }

  if (sezione === 'acquisti') {
    return (
      <AcquistiSection
        onBack={() => setSezione('home')}
      />
    );
  }

  return (
    <section>
      <div className="card">
        <h2>📊 Controllo di Gestione</h2>

        <p className="muted">
          Controllo economico della pizzeria.
        </p>
      </div>

      <div className="quick-grid">
        <button
          className="card module-card module-button"
          onClick={() => setSezione('incassi')}
        >
          <h2>💰 Incassi</h2>

          <p className="muted">
            Importazione automatica del report Bacco.
          </p>

          <strong>▶ Entra</strong>
        </button>

        <button
          className="card module-card module-button"
          onClick={() => setSezione('acquisti')}
        >
          <h2>📥 Acquisti</h2>

          <p className="muted">
            Fatture, bolle, fornitori, scadenze e categorie.
          </p>

          <strong>▶ Entra</strong>
        </button>

        <button className="card module-card module-button">
          <h2>👨‍🍳 Personale</h2>

          <p className="muted">
            Costi del personale collegati ai turni.
          </p>

          <strong>Prossimamente</strong>
        </button>

        <button className="card module-card module-button">
          <h2>🏠 Costi Fissi</h2>

          <p className="muted">
            Affitti, utenze e consulenze.
          </p>

          <strong>Prossimamente</strong>
        </button>

        <button className="card module-card module-button">
          <h2>📦 Magazzino</h2>

          <p className="muted">
            Magazzino iniziale, finale e valorizzazione.
          </p>

          <strong>Prossimamente</strong>
        </button>

        <button className="card module-card module-button">
          <h2>📈 KPI e Bilancio</h2>

          <p className="muted">
            Indicatori economici e margini.
          </p>

          <strong>Prossimamente</strong>
        </button>
      </div>
    </section>
  );
}