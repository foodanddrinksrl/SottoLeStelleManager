'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function TestSupabase() {
  const [messaggio, setMessaggio] = useState('');
  const [caricamento, setCaricamento] = useState(false);

  async function eseguiTest() {
    setCaricamento(true);
    setMessaggio('Connessione in corso...');

    const valoreTest = {
      messaggio: 'Ciao Luigi',
      verificatoIl: new Date().toISOString(),
    };

    const { error: erroreScrittura } = await supabase
      .from('settings')
      .upsert(
        {
          key: 'connection_test',
          value: valoreTest,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'key',
        }
      );

    if (erroreScrittura) {
      setMessaggio(
        `❌ Errore scrittura: ${erroreScrittura.message}`
      );
      setCaricamento(false);
      return;
    }

    const { data, error: erroreLettura } = await supabase
      .from('settings')
      .select('key, value, updated_at')
      .eq('key', 'connection_test')
      .single();

    if (erroreLettura) {
      setMessaggio(
        `❌ Errore lettura: ${erroreLettura.message}`
      );
      setCaricamento(false);
      return;
    }

    setMessaggio(
      `✅ Supabase collegato: ${
        data.value?.messaggio || 'dato letto correttamente'
      }`
    );

    setCaricamento(false);
  }

  return (
    <div className="card no-print">
      <h2>🧪 Test collegamento Supabase</h2>

      <p className="muted">
        Verifica temporanea di scrittura e lettura dal database.
      </p>

      <div className="actions">
        <button
          className="btn green"
          onClick={eseguiTest}
          disabled={caricamento}
        >
          {caricamento
            ? '⏳ Test in corso...'
            : '🔵 Avvia test Supabase'}
        </button>
      </div>

      {messaggio && (
        <p style={{ marginTop: 16 }}>
          <strong>{messaggio}</strong>
        </p>
      )}
    </div>
  );
}