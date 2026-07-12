'use client';

import type {
  DocumentoRicevimento,
  RigaRicevimento,
} from './types';

type ConfermaCaricoProps = {
  documento: DocumentoRicevimento;

  onIndietro: () => void;
  onConferma: () => void;

  salvataggioInCorso?: boolean;
};

function euro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function dataIt(value: string): string {
  if (!value) return '—';

  return new Date(`${value}T00:00:00`).toLocaleDateString(
    'it-IT'
  );
}

function calcolaTotaleRiga(riga: RigaRicevimento): number {
  if (riga.totaleRiga > 0) {
    return riga.totaleRiga;
  }

  return riga.quantita * riga.prezzoUnitario;
}

export function ConfermaCarico({
  documento,
  onIndietro,
  onConferma,
  salvataggioInCorso = false,
}: ConfermaCaricoProps) {
  const righeMagazzino = documento.righe.filter(
    (riga) => riga.aggiornaMagazzino
  );

  const righeEscluse = documento.righe.filter(
    (riga) => !riga.aggiornaMagazzino
  );

  const righeDaClassificare = documento.righe.filter(
    (riga) => riga.categoria === 'Da classificare'
  );

  const valoreCarico = righeMagazzino.reduce(
    (somma, riga) => somma + calcolaTotaleRiga(riga),
    0
  );

  const totaleQuantita = righeMagazzino.reduce(
    (somma, riga) => somma + Number(riga.quantita || 0),
    0
  );

  const puoConfermare =
    documento.fornitore.trim().length > 0 &&
    documento.dataDocumento.trim().length > 0 &&
    righeMagazzino.length > 0 &&
    righeDaClassificare.length === 0;

  return (
    <section>
      <div className="card">
        <h2>✅ Conferma ricevimento merci</h2>

        <p className="muted">
          Controlla il riepilogo. Alla conferma verranno
          registrati il documento e i movimenti di carico.
        </p>
      </div>

      <div className="dashboard">
        <div className="kpi">
          <span>🏪 Fornitore</span>
          <strong>{documento.fornitore || '—'}</strong>
        </div>

        <div className="kpi">
          <span>📅 Data documento</span>
          <strong>{dataIt(documento.dataDocumento)}</strong>
        </div>

        <div className="kpi">
          <span>📄 Numero documento</span>
          <strong>{documento.numeroDocumento || '—'}</strong>
        </div>

        <div className="kpi gold">
          <span>💰 Totale documento</span>
          <strong>{euro(documento.totaleDocumento)}</strong>
        </div>
      </div>

      <div className="dashboard">
        <div className="kpi green">
          <span>📦 Articoli da caricare</span>
          <strong>{righeMagazzino.length}</strong>
        </div>

        <div className="kpi">
          <span>⚖️ Quantità complessiva</span>
          <strong>{totaleQuantita.toFixed(3)}</strong>
        </div>

        <div className="kpi">
          <span>💶 Valore carico</span>
          <strong>{euro(valoreCarico)}</strong>
        </div>

        <div className="kpi">
          <span>🚫 Articoli esclusi</span>
          <strong>{righeEscluse.length}</strong>
        </div>
      </div>

      {righeDaClassificare.length > 0 && (
        <div className="card">
          <h2>⚠️ Classificazione incompleta</h2>

          <p>
            Ci sono ancora{' '}
            <strong>{righeDaClassificare.length}</strong>{' '}
            articoli da classificare.
          </p>

          <p className="muted">
            Torna alla schermata precedente e assegna una
            categoria prima di confermare il carico.
          </p>
        </div>
      )}

      <div className="card">
        <h2>📦 Articoli che entreranno in magazzino</h2>

        {righeMagazzino.length === 0 ? (
          <p className="muted">
            Nessun articolo è stato selezionato per il
            magazzino.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Descrizione</th>
                  <th>Categoria</th>
                  <th>Quantità</th>
                  <th>Unità</th>
                  <th>Prezzo unitario</th>
                  <th>Totale</th>
                  <th>Confronto prezzo</th>
                </tr>
              </thead>

              <tbody>
                {righeMagazzino.map((riga) => (
                  <tr key={riga.id}>
                    <td>
                      <strong>{riga.descrizione}</strong>

                      {riga.codiceArticolo && (
                        <div className="muted">
                          Codice: {riga.codiceArticolo}
                        </div>
                      )}
                    </td>

                    <td>{riga.categoria}</td>

                    <td>{riga.quantita}</td>

                    <td>{riga.unitaMisura || '—'}</td>

                    <td>{euro(riga.prezzoUnitario)}</td>

                    <td>
                      <strong>
                        {euro(calcolaTotaleRiga(riga))}
                      </strong>
                    </td>

                    <td>
                      {riga.ultimoPrezzo <= 0 ? (
                        <span>Primo acquisto</span>
                      ) : riga.variazionePercentuale > 10 ? (
                        <span>
                          🔴 +{riga.variazionePercentuale.toFixed(1)}%
                        </span>
                      ) : riga.variazionePercentuale > 3 ? (
                        <span>
                          🟠 +{riga.variazionePercentuale.toFixed(1)}%
                        </span>
                      ) : riga.variazionePercentuale < -3 ? (
                        <span>
                          🟢 {riga.variazionePercentuale.toFixed(1)}%
                        </span>
                      ) : (
                        <span>🟢 Prezzo nella media</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <th colSpan={5}>Valore totale carico</th>
                  <th>{euro(valoreCarico)}</th>
                  <th />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {righeEscluse.length > 0 && (
        <div className="card">
          <h2>🚫 Articoli esclusi dal magazzino</h2>

          <p className="muted">
            Queste righe resteranno nel documento, ma non
            genereranno movimenti di carico.
          </p>

          {righeEscluse.map((riga) => (
            <div
              key={riga.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                padding: '10px 0',
                borderBottom:
                  '1px solid rgba(212,170,35,0.25)',
                flexWrap: 'wrap',
              }}
            >
              <strong>{riga.descrizione}</strong>

              <span>
                {riga.quantita} {riga.unitaMisura}
              </span>

              <span>{euro(calcolaTotaleRiga(riga))}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>🔄 Operazioni automatiche</h2>

        <p>Alla conferma il gestionale dovrà:</p>

        <div className="quick-grid">
          <div className="card">
            <strong>📦 Caricare il magazzino</strong>
            <p className="muted">
              Quantità e valore degli articoli selezionati.
            </p>
          </div>

          <div className="card">
            <strong>📥 Registrare l’acquisto</strong>
            <p className="muted">
              Fornitore, documento, righe e importi.
            </p>
          </div>

          <div className="card">
            <strong>🏪 Aggiornare il fornitore</strong>
            <p className="muted">
              Articoli acquistati e ultimi prezzi.
            </p>
          </div>

          <div className="card">
            <strong>📊 Aggiornare il controllo</strong>
            <p className="muted">
              Acquisti e percentuale delle materie prime.
            </p>
          </div>
        </div>
      </div>

      <div className="card no-print">
        <div className="actions">
          <button
            className="btn"
            onClick={onIndietro}
            disabled={salvataggioInCorso}
          >
            ← Torna alla verifica
          </button>

          <button
            className="btn green"
            onClick={onConferma}
            disabled={!puoConfermare || salvataggioInCorso}
          >
            {salvataggioInCorso
              ? '⏳ Registrazione in corso…'
              : '✅ Conferma ricevimento'}
          </button>
        </div>

        {!puoConfermare && (
          <p className="muted">
            Per confermare servono fornitore, data documento,
            almeno un articolo da caricare e nessuna riga da
            classificare.
          </p>
        )}
      </div>
    </section>
  );
}