'use client';

import type {
  CategoriaMerce,
  RigaRicevimento,
} from './types';

import { categorieMerce } from './types';

type LetturaAIProps = {
  fornitore: string;
  partitaIvaFornitore: string;
  numeroDocumento: string;
  dataDocumento: string;

  imponibile: number;
  iva: number;
  totaleDocumento: number;

  righe: RigaRicevimento[];
  avvisi: string[];

  onFornitoreChange: (value: string) => void;
  onPartitaIvaChange: (value: string) => void;
  onNumeroDocumentoChange: (value: string) => void;
  onDataDocumentoChange: (value: string) => void;

  onRigaChange: (
    id: string,
    campo: keyof RigaRicevimento,
    valore: string | number | boolean
  ) => void;

  onAggiungiRiga: () => void;
  onEliminaRiga: (id: string) => void;

  onAnnulla: () => void;
  onContinua: () => void;
};

function euro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function coloreAffidabilita(value: number): string {
  if (value >= 85) return '🟢';
  if (value >= 60) return '🟠';
  return '🔴';
}

export function LetturaAI({
  fornitore,
  partitaIvaFornitore,
  numeroDocumento,
  dataDocumento,
  imponibile,
  iva,
  totaleDocumento,
  righe,
  avvisi,
  onFornitoreChange,
  onPartitaIvaChange,
  onNumeroDocumentoChange,
  onDataDocumentoChange,
  onRigaChange,
  onAggiungiRiga,
  onEliminaRiga,
  onAnnulla,
  onContinua,
}: LetturaAIProps) {
  const totaleRighe = righe.reduce(
    (somma, riga) => somma + Number(riga.totaleRiga || 0),
    0
  );

  const righeDaControllare = righe.filter(
    (riga) =>
      riga.categoria === 'Da classificare' ||
      riga.affidabilitaAI < 70 ||
      !riga.descrizione.trim()
  ).length;

  const puoContinuare =
    fornitore.trim().length > 0 &&
    dataDocumento.trim().length > 0 &&
    righe.length > 0;

  return (
    <section>
      <div className="card">
        <h2>🤖 Lettura AI della bolla</h2>

        <p className="muted">
          Controlla i dati riconosciuti. Puoi correggere ogni campo prima
          di confermare il carico.
        </p>

        {avvisi.length > 0 && (
          <div
            style={{
              border: '1px solid rgba(212,170,35,0.45)',
              borderRadius: 12,
              padding: 16,
              marginTop: 16,
            }}
          >
            <h3>⚠️ Avvisi</h3>

            {avvisi.map((avviso, index) => (
              <p key={`${avviso}-${index}`}>{avviso}</p>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>📄 Dati documento</h2>

        <div className="form-grid">
          <label className="field">
            <span>Fornitore</span>

            <input
              type="text"
              value={fornitore}
              placeholder="Es. BIG FOOD SRL"
              onChange={(event) =>
                onFornitoreChange(event.target.value)
              }
            />
          </label>

          <label className="field">
            <span>Partita IVA</span>

            <input
              type="text"
              value={partitaIvaFornitore}
              placeholder="Facoltativa"
              onChange={(event) =>
                onPartitaIvaChange(event.target.value)
              }
            />
          </label>

          <label className="field">
            <span>Numero bolla</span>

            <input
              type="text"
              value={numeroDocumento}
              placeholder="Es. 245"
              onChange={(event) =>
                onNumeroDocumentoChange(event.target.value)
              }
            />
          </label>

          <label className="field">
            <span>Data documento</span>

            <input
              type="date"
              value={dataDocumento}
              onChange={(event) =>
                onDataDocumentoChange(event.target.value)
              }
            />
          </label>
        </div>
      </div>

      <div className="dashboard">
        <div className="kpi">
          <span>💶 Imponibile</span>
          <strong>{euro(imponibile)}</strong>
        </div>

        <div className="kpi">
          <span>🧾 IVA</span>
          <strong>{euro(iva)}</strong>
        </div>

        <div className="kpi gold">
          <span>💰 Totale documento</span>
          <strong>{euro(totaleDocumento)}</strong>
        </div>

        <div className="kpi">
          <span>📦 Totale righe</span>
          <strong>{euro(totaleRighe)}</strong>
        </div>

        <div className="kpi">
          <span>⚠️ Da controllare</span>
          <strong>{righeDaControllare}</strong>
        </div>
      </div>

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2>📋 Articoli riconosciuti</h2>

            <p className="muted">
              Correggi descrizione, quantità, prezzo e categoria quando
              necessario.
            </p>
          </div>

          <button
            className="btn gold"
            onClick={onAggiungiRiga}
          >
            ➕ Aggiungi riga
          </button>
        </div>

        {righe.length === 0 ? (
          <p className="muted">
            Nessun articolo riconosciuto. Aggiungi almeno una riga.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Descrizione</th>
                  <th>Codice</th>
                  <th>Quantità</th>
                  <th>Unità</th>
                  <th>Prezzo unitario</th>
                  <th>Totale</th>
                  <th>IVA</th>
                  <th>Categoria</th>
                  <th>Magazzino</th>
                  <th>Affidabilità</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {righe.map((riga) => (
                  <tr key={riga.id}>
                    <td>
                      <input
                        type="text"
                        value={riga.descrizione}
                        placeholder="Descrizione articolo"
                        onChange={(event) =>
                          onRigaChange(
                            riga.id,
                            'descrizione',
                            event.target.value
                          )
                        }
                        style={{ minWidth: 220 }}
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={riga.codiceArticolo}
                        placeholder="Facoltativo"
                        onChange={(event) =>
                          onRigaChange(
                            riga.id,
                            'codiceArticolo',
                            event.target.value
                          )
                        }
                        style={{ minWidth: 110 }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={riga.quantita}
                        onChange={(event) =>
                          onRigaChange(
                            riga.id,
                            'quantita',
                            Number(event.target.value)
                          )
                        }
                        style={{ width: 90 }}
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        value={riga.unitaMisura}
                        placeholder="kg, pz..."
                        onChange={(event) =>
                          onRigaChange(
                            riga.id,
                            'unitaMisura',
                            event.target.value
                          )
                        }
                        style={{ width: 80 }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={riga.prezzoUnitario}
                        onChange={(event) =>
                          onRigaChange(
                            riga.id,
                            'prezzoUnitario',
                            Number(event.target.value)
                          )
                        }
                        style={{ width: 110 }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={riga.totaleRiga}
                        onChange={(event) =>
                          onRigaChange(
                            riga.id,
                            'totaleRiga',
                            Number(event.target.value)
                          )
                        }
                        style={{ width: 110 }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={riga.aliquotaIva}
                        onChange={(event) =>
                          onRigaChange(
                            riga.id,
                            'aliquotaIva',
                            Number(event.target.value)
                          )
                        }
                        style={{ width: 75 }}
                      />
                    </td>

                    <td>
                      <select
                        value={riga.categoria}
                        onChange={(event) =>
                          onRigaChange(
                            riga.id,
                            'categoria',
                            event.target.value as CategoriaMerce
                          )
                        }
                        style={{ minWidth: 170 }}
                      >
                        {categorieMerce.map((categoria) => (
                          <option
                            key={categoria}
                            value={categoria}
                          >
                            {categoria}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={riga.aggiornaMagazzino}
                          onChange={(event) =>
                            onRigaChange(
                              riga.id,
                              'aggiornaMagazzino',
                              event.target.checked
                            )
                          }
                        />

                        Carica
                      </label>
                    </td>

                    <td>
                      <span>
                        {coloreAffidabilita(
                          riga.affidabilitaAI
                        )}{' '}
                        {riga.affidabilitaAI}%
                      </span>
                    </td>

                    <td>
                      <button
                        className="btn danger small"
                        onClick={() => onEliminaRiga(riga.id)}
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <th colSpan={5}>Totale articoli</th>
                  <th>{euro(totaleRighe)}</th>
                  <th colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>🧠 Interpretazione AI</h2>

        <p className="muted">
          Le abbreviazioni e le correzioni confermate alimenteranno il
          vocabolario intelligente del gestionale.
        </p>

        {righe.map((riga) => (
          <div
            key={`interpretazione-${riga.id}`}
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
            <span>
              <strong>{riga.descrizione || 'Riga senza nome'}</strong>
            </span>

            <span>
              Categoria: <strong>{riga.categoria}</strong>
            </span>

            <span>
              Fiducia AI:{' '}
              <strong>{riga.affidabilitaAI}%</strong>
            </span>
          </div>
        ))}
      </div>

      <div className="card no-print">
        <div className="actions">
          <button className="btn" onClick={onAnnulla}>
            ← Torna all’anteprima
          </button>

          <button
            className="btn green"
            onClick={onContinua}
            disabled={!puoContinuare}
          >
            Continua al carico →
          </button>
        </div>

        {!puoContinuare && (
          <p className="muted">
            Inserisci almeno fornitore, data documento e una riga
            articolo.
          </p>
        )}
      </div>
    </section>
  );
}