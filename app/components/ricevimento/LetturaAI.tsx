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
      !riga.descrizione.trim() ||
      Number(riga.quantita || 0) <= 0
  ).length;

  const puoContinuare =
    fornitore.trim().length > 0 &&
    dataDocumento.trim().length > 0 &&
    righe.length > 0 &&
    righeDaControllare === 0;

  return (
    <section>
      <div className="card">
        <h2>🧾 Controlla la bolla</h2>

        <p className="muted">
          Verifica i dati e gli articoli. Quando è tutto corretto premi
          il pulsante verde in fondo alla pagina.
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
            <h3>⚠️ Da sapere</h3>

            {avvisi.map((avviso, index) => (
              <p key={`${avviso}-${index}`}>{avviso}</p>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>📄 Dati della bolla</h2>

        <div className="form-grid">
          <label className="field">
            <span>Fornitore *</span>

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
              placeholder="Facoltativo"
              onChange={(event) =>
                onNumeroDocumentoChange(event.target.value)
              }
            />
          </label>

          <label className="field">
            <span>Data documento *</span>

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
        <div className="kpi gold">
          <span>💰 Totale articoli</span>
          <strong>{euro(totaleRighe)}</strong>
        </div>

        <div className="kpi">
          <span>📦 Articoli inseriti</span>
          <strong>{righe.length}</strong>
        </div>

        <div className="kpi">
          <span>⚠️ Da completare</span>
          <strong>{righeDaControllare}</strong>
        </div>

        <div className="kpi">
          <span>🧾 Totale documento</span>
          <strong>
            {totaleDocumento > 0 ? euro(totaleDocumento) : 'Da calcolare'}
          </strong>
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
            <h2>📦 Merce ricevuta</h2>

            <p className="muted">
              Inserisci descrizione, quantità, unità, prezzo e categoria.
            </p>
          </div>

          <button
            className="btn gold"
            onClick={onAggiungiRiga}
            style={{ minHeight: 48, fontWeight: 800 }}
          >
            ➕ Aggiungi articolo
          </button>
        </div>

        {righe.length === 0 ? (
          <p className="muted">
            Nessun articolo inserito. Premi “Aggiungi articolo”.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {righe.map((riga, index) => (
              <div
                key={riga.id}
                style={{
                  border: '1px solid rgba(212,170,35,0.35)',
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 14,
                  }}
                >
                  <h3 style={{ margin: 0 }}>
                    Articolo {index + 1}
                  </h3>

                  <button
                    className="btn danger small"
                    onClick={() => onEliminaRiga(riga.id)}
                  >
                    🗑 Elimina
                  </button>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Descrizione *</span>

                    <input
                      type="text"
                      value={riga.descrizione}
                      placeholder="Es. Mozzarella"
                      onChange={(event) =>
                        onRigaChange(
                          riga.id,
                          'descrizione',
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Codice articolo</span>

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
                    />
                  </label>

                  <label className="field">
                    <span>Quantità *</span>

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
                    />
                  </label>

                  <label className="field">
                    <span>Unità di misura</span>

                    <input
                      type="text"
                      value={riga.unitaMisura}
                      placeholder="kg, pz, lt..."
                      onChange={(event) =>
                        onRigaChange(
                          riga.id,
                          'unitaMisura',
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Prezzo unitario</span>

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
                    />
                  </label>

                  <label className="field">
                    <span>Totale riga</span>

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
                    />
                  </label>

                  <label className="field">
                    <span>IVA %</span>

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
                    />
                  </label>

                  <label className="field">
                    <span>Categoria *</span>

                    <select
                      value={riga.categoria}
                      onChange={(event) =>
                        onRigaChange(
                          riga.id,
                          'categoria',
                          event.target.value as CategoriaMerce
                        )
                      }
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
                  </label>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
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
                    style={{
                      width: 20,
                      height: 20,
                    }}
                  />

                  📦 Aggiorna il magazzino con questo articolo
                </label>

                <div
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <span className="muted">
                    Categoria: <strong>{riga.categoria}</strong>
                  </span>

                  <span>
                    Totale: <strong>{euro(riga.totaleRiga)}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card no-print">
        <div
          className="actions"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            className="btn"
            onClick={onAnnulla}
            style={{ minHeight: 52 }}
          >
            ← Torna alla foto
          </button>

          <button
            className="btn green"
            onClick={onContinua}
            disabled={!puoContinuare}
            style={{
              minHeight: 58,
              paddingLeft: 28,
              paddingRight: 28,
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            📦 CONTROLLA E CONFERMA
          </button>
        </div>

        {!puoContinuare && (
          <p className="muted" style={{ marginTop: 14 }}>
            Completa fornitore, data, descrizione, quantità e categoria
            di tutti gli articoli.
          </p>
        )}
      </div>
    </section>
  );
}
