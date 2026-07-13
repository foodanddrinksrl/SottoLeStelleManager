'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  caricaBolleRicevimento,
  eliminaRicevimento,
  type BollaRicevimentoSalvata,
} from '../../lib/ricevimentoStorage';

type StoricoRicevimentiProps = {
  onBack?: () => void;
};

function euro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dataIt(value: string): string {
  if (!value) return '—';

  return new Date(`${value}T00:00:00`).toLocaleDateString(
    'it-IT'
  );
}

function oggiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function primoGiornoMeseIso(): string {
  const data = new Date();
  data.setDate(1);
  return data.toISOString().slice(0, 10);
}

function statoLabel(
  stato: BollaRicevimentoSalvata['statoAbbinamento']
): string {
  switch (stato) {
    case 'abbinata':
      return '✅ Abbinata';
    case 'con-differenze':
      return '⚠️ Con differenze';
    case 'chiusa':
      return '🔒 Chiusa';
    default:
      return '🕒 In attesa fattura';
  }
}

export function StoricoRicevimenti({
  onBack,
}: StoricoRicevimentiProps) {
  const [bolle, setBolle] = useState<
    BollaRicevimentoSalvata[]
  >([]);

  const [dataDa, setDataDa] = useState(
    primoGiornoMeseIso()
  );
  const [dataA, setDataA] = useState(oggiIso());
  const [fornitore, setFornitore] = useState('');
  const [bollaApertaId, setBollaApertaId] =
    useState('');

  useEffect(() => {
    setBolle(caricaBolleRicevimento());
  }, []);

  const fornitoriDisponibili = useMemo(() => {
    return Array.from(
      new Set(
        bolle
          .map((bolla) => bolla.fornitore.trim())
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b, 'it', {
        sensitivity: 'base',
      })
    );
  }, [bolle]);

  const bolleFiltrate = useMemo(() => {
    const testoFornitore = fornitore
      .trim()
      .toLowerCase();

    return bolle
      .filter((bolla) => {
        if (
          dataDa &&
          bolla.dataDocumento &&
          bolla.dataDocumento < dataDa
        ) {
          return false;
        }

        if (
          dataA &&
          bolla.dataDocumento &&
          bolla.dataDocumento > dataA
        ) {
          return false;
        }

        if (
          testoFornitore &&
          !bolla.fornitore
            .toLowerCase()
            .includes(testoFornitore)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) =>
        b.dataDocumento.localeCompare(a.dataDocumento)
      );
  }, [bolle, dataDa, dataA, fornitore]);

  const totalePeriodo = useMemo(() => {
    return bolleFiltrate.reduce(
      (somma, bolla) =>
        somma + Number(bolla.totaleDocumento || 0),
      0
    );
  }, [bolleFiltrate]);

  const totaleQuantita = useMemo(() => {
    return bolleFiltrate.reduce(
      (sommaBolle, bolla) =>
        sommaBolle +
        bolla.righe.reduce(
          (sommaRighe, riga) =>
            sommaRighe +
            Number(riga.quantita || 0),
          0
        ),
      0
    );
  }, [bolleFiltrate]);

  const bollaAperta =
    bolleFiltrate.find(
      (bolla) => bolla.id === bollaApertaId
    ) || null;

  function azzeraFiltri() {
    setDataDa('');
    setDataA('');
    setFornitore('');
    setBollaApertaId('');
  }

  function eliminaBolla(
    bolla: BollaRicevimentoSalvata
  ) {
    const conferma = window.confirm(
      `Vuoi eliminare il ricevimento di ${
        bolla.fornitore
      } del ${dataIt(
        bolla.dataDocumento
      )} per ${euro(
        bolla.totaleDocumento
      )}? Verranno eliminati anche i movimenti di magazzino collegati.`
    );

    if (!conferma) return;

    eliminaRicevimento(bolla.id);
    setBolle(caricaBolleRicevimento());

    if (bollaApertaId === bolla.id) {
      setBollaApertaId('');
    }
  }

  return (
    <section>
      <div className="card no-print">
        <div className="actions">
          {onBack && (
            <button
              className="btn"
              onClick={onBack}
            >
              ← Torna agli acquisti
            </button>
          )}

          <button
            className="btn"
            onClick={() =>
              setBolle(caricaBolleRicevimento())
            }
          >
            🔄 Aggiorna
          </button>

          <button
            className="btn"
            onClick={() => window.print()}
          >
            🖨️ Stampa riepilogo
          </button>
        </div>
      </div>

      <div className="card">
        <h2>📚 Archivio Ricevimenti</h2>

        <p className="muted">
          Controlla le bolle ricevute e confronta i conti
          consegnati dai fornitori per periodo.
        </p>
      </div>

      <div className="card no-print">
        <h2>🔎 Ricerca per periodo e fornitore</h2>

        <div className="dashboard">
          <label className="kpi">
            <span>📅 Dal</span>

            <input
              type="date"
              value={dataDa}
              onChange={(event) =>
                setDataDa(event.target.value)
              }
            />
          </label>

          <label className="kpi">
            <span>📅 Al</span>

            <input
              type="date"
              value={dataA}
              onChange={(event) =>
                setDataA(event.target.value)
              }
            />
          </label>

          <label className="kpi">
            <span>🏪 Fornitore</span>

            <input
              list="fornitori-ricevimenti"
              value={fornitore}
              placeholder="Tutti i fornitori"
              onChange={(event) =>
                setFornitore(event.target.value)
              }
            />

            <datalist id="fornitori-ricevimenti">
              {fornitoriDisponibili.map((nome) => (
                <option key={nome} value={nome} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="actions">
          <button
            className="btn"
            onClick={azzeraFiltri}
          >
            ✖ Azzera filtri
          </button>
        </div>
      </div>

      <div className="dashboard">
        <div className="kpi green">
          <span>📄 Documenti trovati</span>
          <strong>{bolleFiltrate.length}</strong>
        </div>

        <div className="kpi gold">
          <span>💰 Totale periodo</span>
          <strong>{euro(totalePeriodo)}</strong>
        </div>

        <div className="kpi">
          <span>⚖️ Quantità complessiva</span>
          <strong>{totaleQuantita.toFixed(3)}</strong>
        </div>

        <div className="kpi">
          <span>🏪 Fornitori presenti</span>

          <strong>
            {
              new Set(
                bolleFiltrate.map(
                  (bolla) => bolla.fornitore
                )
              ).size
            }
          </strong>
        </div>
      </div>

      <div className="card">
        <h2>📋 Ricevimenti registrati</h2>

        {bolleFiltrate.length === 0 ? (
          <p className="muted">
            Nessun ricevimento trovato con i filtri
            selezionati.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Fornitore</th>
                  <th>Numero</th>
                  <th>Articoli</th>
                  <th>Totale</th>
                  <th>Stato</th>
                  <th className="no-print">Azioni</th>
                </tr>
              </thead>

              <tbody>
                {bolleFiltrate.map((bolla) => (
                  <tr key={bolla.id}>
                    <td>
                      {dataIt(bolla.dataDocumento)}
                    </td>

                    <td>
                      <strong>
                        {bolla.fornitore}
                      </strong>
                    </td>

                    <td>
                      {bolla.numeroDocumento || '—'}
                    </td>

                    <td>{bolla.righe.length}</td>

                    <td>
                      <strong>
                        {euro(
                          bolla.totaleDocumento
                        )}
                      </strong>
                    </td>

                    <td>
                      {statoLabel(
                        bolla.statoAbbinamento
                      )}
                    </td>

                    <td className="no-print">
                      <div className="actions">
                        <button
                          className="btn"
                          onClick={() =>
                            setBollaApertaId(
                              bollaApertaId ===
                                bolla.id
                                ? ''
                                : bolla.id
                            )
                          }
                        >
                          {bollaApertaId ===
                          bolla.id
                            ? '▲ Chiudi'
                            : '▼ Dettaglio'}
                        </button>

                        <button
                          className="btn danger"
                          onClick={() =>
                            eliminaBolla(bolla)
                          }
                        >
                          🗑️ Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <th colSpan={4}>
                    Totale documenti filtrati
                  </th>

                  <th>{euro(totalePeriodo)}</th>
                  <th />
                  <th className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {bollaAperta && (
        <div className="card">
          <h2>
            📦 Dettaglio ricevimento –{' '}
            {bollaAperta.fornitore}
          </h2>

          <div className="dashboard">
            <div className="kpi">
              <span>📅 Data</span>

              <strong>
                {dataIt(
                  bollaAperta.dataDocumento
                )}
              </strong>
            </div>

            <div className="kpi">
              <span>📄 Numero</span>

              <strong>
                {bollaAperta.numeroDocumento ||
                  '—'}
              </strong>
            </div>

            <div className="kpi">
              <span>🧾 Partita IVA</span>

              <strong>
                {bollaAperta.partitaIvaFornitore ||
                  '—'}
              </strong>
            </div>

            <div className="kpi gold">
              <span>💰 Totale</span>

              <strong>
                {euro(
                  bollaAperta.totaleDocumento
                )}
              </strong>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Descrizione</th>
                  <th>Categoria</th>
                  <th>Quantità</th>
                  <th>Unità</th>
                  <th>Prezzo unitario</th>
                  <th>Totale riga</th>
                  <th>Magazzino</th>
                </tr>
              </thead>

              <tbody>
                {bollaAperta.righe.map(
                  (riga) => (
                    <tr key={riga.id}>
                      <td>
                        <strong>
                          {riga.descrizione}
                        </strong>
                      </td>

                      <td>{riga.categoria}</td>
                      <td>{riga.quantita}</td>

                      <td>
                        {riga.unitaMisura || '—'}
                      </td>

                      <td>
                        {riga.prezzoUnitario > 0
                          ? euro(
                              riga.prezzoUnitario
                            )
                          : 'Da definire'}
                      </td>

                      <td>
                        {riga.totaleRiga > 0
                          ? euro(riga.totaleRiga)
                          : 'Da definire'}
                      </td>

                      <td>
                        {riga.aggiornaMagazzino
                          ? '✅ Sì'
                          : '🚫 No'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <p className="muted">
            Registrata il{' '}
            {bollaAperta.confermataIl || '—'}.
            Stato fattura:{' '}
            {statoLabel(
              bollaAperta.statoAbbinamento
            )}
          </p>
        </div>
      )}
    </section>
  );
}
