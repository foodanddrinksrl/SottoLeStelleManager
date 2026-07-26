'use client';

import { useState } from 'react';

type MarketingView =
  | 'home'
  | 'campagne';

export function MarketingSection() {
  const [view, setView] =
    useState<MarketingView>('home');

  if (view === 'campagne') {
    return (
      <section>
        <div className="card">
          <div className="actions">
            <button
              type="button"
              className="btn green"
              onClick={() => setView('home')}
            >
              ← Centro Marketing
            </button>
          </div>
        </div>

        <div className="card">
          <h2>📢 Campagne WhatsApp</h2>

          <p className="muted">
            Crea, prepara e gestisci le campagne da inviare
            ai clienti di Sotto le Stelle.
          </p>
        </div>

        <div className="dashboard">
          <div className="kpi">
            <span>📨 Campagne create</span>
            <strong>0</strong>
            <small>Nessuna campagna presente</small>
          </div>

          <div className="kpi">
            <span>👥 Destinatari</span>
            <strong>0</strong>
            <small>Clienti selezionati</small>
          </div>

          <div className="kpi">
            <span>📅 Programmate</span>
            <strong>0</strong>
            <small>Nessun invio programmato</small>
          </div>

          <div className="kpi">
            <span>✅ Inviate</span>
            <strong>0</strong>
            <small>Storico campagne</small>
          </div>
        </div>

        <div className="card">
          <button
            type="button"
            className="btn gold"
          >
            ➕ Crea nuova campagna
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="card">
        <h2>📣 Centro Marketing</h2>

        <p className="muted">
          Gestisci clienti, campagne WhatsApp, promozioni e
          fidelizzazione.
        </p>
      </div>

      <div className="quick-grid">
        <button
          type="button"
          className="card module-card module-button"
        >
          <h2>👥 Clienti</h2>

          <p className="muted">
            Anagrafica clienti e segmentazione.
          </p>

          <strong>▶ Entra</strong>
        </button>

        <button
          type="button"
          className="card module-card module-button"
          onClick={() => setView('campagne')}
        >
          <h2>📢 Campagne</h2>

          <p className="muted">
            Crea e gestisci campagne WhatsApp.
          </p>

          <strong>▶ Entra</strong>
        </button>

        <button
          type="button"
          className="card module-card module-button"
        >
          <h2>🎂 Compleanni</h2>

          <p className="muted">
            Gestione auguri e coupon automatici.
          </p>

          <strong>▶ Entra</strong>
        </button>

        <button
          type="button"
          className="card module-card module-button"
        >
          <h2>📊 Statistiche</h2>

          <p className="muted">
            Analisi campagne e prenotazioni.
          </p>

          <strong>▶ Entra</strong>
        </button>
      </div>
    </section>
  );
}