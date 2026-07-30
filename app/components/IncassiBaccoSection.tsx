'use client';

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

type RiepilogoBacco = {
  nomeFile: string;
  periodoDa: string;
  periodoA: string;
  produzioneLorda: number;
  produzioneNetta: number;
  sconti: number;
  coperti: number;
  mediaNettaCoperto: number;
  numeroOperazioni: number;
  totalePagamenti: number;
  categorieImportate: number;
  repartiImportati: number;
  pagamentiImportati: number;
  righeIvaImportate: number;
  importatoIl?: string;
};

type RispostaImportBacco = {
  ok: boolean;
  duplicato?: boolean;
  messaggio?: string;
  riepilogo?: RiepilogoBacco;
};

type ImportBaccoDatabase = {
  nome_file?: string;
  periodo_da?: string;
  periodo_a?: string;
  produzione_lorda?: number;
  produzione_netta?: number;
  sconti?: number;
  coperti?: number;
  media_netta_coperto?: number;
  numero_operazioni?: number;
  totale_pagamenti?: number;
  importato_il?: string;
  bacco_categorie?: unknown[];
  bacco_reparti?: unknown[];
  bacco_pagamenti?: unknown[];
  bacco_iva?: unknown[];
};

type RiepilogoIncassiGiornalieri = {
  totaleIncasso: number;
  totaleCoperti: number;
  giornateImportate: number;
  areeImportate: number;
};

type GiornataIncassoDatabase = {
  data: string;
  incasso_totale?: number;
  coperti?: number;
};

type AreaIncassoDatabase = {
  data: string;
  area: string;
  incasso?: number;
  coperti?: number;
};

type RispostaIncassi = {
  ok: boolean;
  messaggio?: string;
  riepilogo?: {
    totaleIncasso: number;
    totaleCoperti: number;
    numeroGiornate: number;
  };
  giornate?: GiornataIncassoDatabase[];
  aree?: AreaIncassoDatabase[];
};

type RiepilogoArea = {
  area: string;
  incasso: number;
  coperti: number;
  percentuale: number;
};

type TipoPeriodo =
  | 'settimana'
  | 'mese'
  | 'personalizzato';

function euro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dataItaliana(value?: string): string {
  if (!value) return '—';

  const data = new Date(`${value}T00:00:00`);

  return Number.isNaN(data.getTime())
    ? value
    : data.toLocaleDateString('it-IT');
}

function dataOraItaliana(value?: string): string {
  if (!value) return '—';

  const data = new Date(value);

  return Number.isNaN(data.getTime())
    ? value
    : data.toLocaleString('it-IT');
}

function dataLocaleIso(data: Date): string {
  const anno = data.getFullYear();
  const mese = String(
    data.getMonth() + 1
  ).padStart(2, '0');
  const giorno = String(
    data.getDate()
  ).padStart(2, '0');

  return `${anno}-${mese}-${giorno}`;
}

function periodoSettimanaAttuale() {
  const oggi = new Date();
  const giornoSettimana = oggi.getDay();

  const distanzaLunedi =
    giornoSettimana === 0
      ? -6
      : 1 - giornoSettimana;

  const inizio = new Date(oggi);
  inizio.setDate(
    oggi.getDate() + distanzaLunedi
  );

  const fine = new Date(inizio);
  fine.setDate(inizio.getDate() + 6);

  return {
    dataDa: dataLocaleIso(inizio),
    dataA: dataLocaleIso(fine),
  };
}

function periodoMeseCorrente() {
  const oggi = new Date();

  const inizio = new Date(
    oggi.getFullYear(),
    oggi.getMonth(),
    1
  );

  const fine = new Date(
    oggi.getFullYear(),
    oggi.getMonth() + 1,
    0
  );

  return {
    dataDa: dataLocaleIso(inizio),
    dataA: dataLocaleIso(fine),
  };
}

function convertiImportDatabase(
  importazione: ImportBaccoDatabase
): RiepilogoBacco {
  return {
    nomeFile:
      importazione.nome_file ||
      'Report Bacco',
    periodoDa:
      importazione.periodo_da || '',
    periodoA:
      importazione.periodo_a || '',
    produzioneLorda:
      Number(
        importazione.produzione_lorda || 0
      ),
    produzioneNetta:
      Number(
        importazione.produzione_netta || 0
      ),
    sconti:
      Number(importazione.sconti || 0),
    coperti:
      Number(importazione.coperti || 0),
    mediaNettaCoperto:
      Number(
        importazione.media_netta_coperto || 0
      ),
    numeroOperazioni:
      Number(
        importazione.numero_operazioni || 0
      ),
    totalePagamenti:
      Number(
        importazione.totale_pagamenti || 0
      ),
    categorieImportate:
      importazione.bacco_categorie?.length || 0,
    repartiImportati:
      importazione.bacco_reparti?.length || 0,
    pagamentiImportati:
      importazione.bacco_pagamenti?.length || 0,
    righeIvaImportate:
      importazione.bacco_iva?.length || 0,
    importatoIl:
      importazione.importato_il,
  };
}

function nomeAreaVisuale(
  area: string
): string {
  const normalizzata =
    area.toUpperCase().trim();

  if (
    normalizzata.includes('ASPORTO')
  ) {
    return '🍕 Asporto';
  }

  if (
    normalizzata.includes('DOMICILIO')
  ) {
    return '🛵 Domicilio';
  }

  if (
    normalizzata.includes('SALA GRANDE')
  ) {
    return '🍽️ Sala grande';
  }

  if (
    normalizzata.includes('PEDANA')
  ) {
    return '🍽️ Sala pedana';
  }

  if (
    normalizzata.includes('VERANDA')
  ) {
    return '🌿 Veranda';
  }

  return `🍽️ ${area}`;
}

export function IncassiBaccoSection({
  onBack,
}: {
  onBack: () => void;
}) {
  const meseCorrente =
    periodoMeseCorrente();

  const [report, setReport] =
    useState<RiepilogoBacco | null>(
      null
    );

  const [
    riepilogoIncassi,
    setRiepilogoIncassi,
  ] =
    useState<RiepilogoIncassiGiornalieri | null>(
      null
    );

  const [datiIncassi, setDatiIncassi] =
    useState<RispostaIncassi | null>(
      null
    );

  const [
    tipoPeriodo,
    setTipoPeriodo,
  ] =
    useState<TipoPeriodo>('mese');

  const [
    dataPersonalizzataDa,
    setDataPersonalizzataDa,
  ] = useState(meseCorrente.dataDa);

  const [
    dataPersonalizzataA,
    setDataPersonalizzataA,
  ] = useState(meseCorrente.dataA);

  const [errore, setErrore] =
    useState('');

  const [messaggio, setMessaggio] =
    useState('');

  const [
    caricamentoProduzione,
    setCaricamentoProduzione,
  ] = useState(false);

  const [
    caricamentoIncassi,
    setCaricamentoIncassi,
  ] = useState(false);

  const periodoSelezionato =
    useMemo(() => {
      if (
        tipoPeriodo === 'settimana'
      ) {
        return periodoSettimanaAttuale();
      }

      if (
        tipoPeriodo ===
        'personalizzato'
      ) {
        return {
          dataDa:
            dataPersonalizzataDa,
          dataA:
            dataPersonalizzataA,
        };
      }

      return periodoMeseCorrente();
    }, [
      tipoPeriodo,
      dataPersonalizzataDa,
      dataPersonalizzataA,
    ]);

  async function caricaDati() {
    try {
      setErrore('');

      const urlIncassi =
        `/api/bacco/incassi?dataDa=` +
        `${periodoSelezionato.dataDa}` +
        `&dataA=` +
        `${periodoSelezionato.dataA}`;

      const [
        rispostaProduzione,
        rispostaIncassi,
      ] = await Promise.all([
        fetch('/api/bacco', {
          cache: 'no-store',
        }),
        fetch(urlIncassi, {
          cache: 'no-store',
        }),
      ]);

      const esitoProduzione =
        (await rispostaProduzione.json()) as {
          ok: boolean;
          messaggio?: string;
          importazioni?: ImportBaccoDatabase[];
        };

      if (
        !rispostaProduzione.ok ||
        !esitoProduzione.ok
      ) {
        throw new Error(
          esitoProduzione.messaggio ||
            'Impossibile leggere gli import Bacco.'
        );
      }

      const ultimoImport =
        esitoProduzione.importazioni?.[0];

      if (ultimoImport) {
        setReport(
          convertiImportDatabase(
            ultimoImport
          )
        );
      }

      const esitoIncassi =
        (await rispostaIncassi.json()) as RispostaIncassi;

      if (
        !rispostaIncassi.ok ||
        !esitoIncassi.ok
      ) {
        throw new Error(
          esitoIncassi.messaggio ||
            'Impossibile leggere gli incassi Bacco.'
        );
      }

      setDatiIncassi(esitoIncassi);

      if (
        esitoIncassi.riepilogo
      ) {
        setRiepilogoIncassi({
          totaleIncasso:
            Number(
              esitoIncassi.riepilogo
                .totaleIncasso || 0
            ),
          totaleCoperti:
            Number(
              esitoIncassi.riepilogo
                .totaleCoperti || 0
            ),
          giornateImportate:
            Number(
              esitoIncassi.riepilogo
                .numeroGiornate || 0
            ),
          areeImportate:
            esitoIncassi.aree?.length || 0,
        });
      } else {
        setRiepilogoIncassi({
          totaleIncasso: 0,
          totaleCoperti: 0,
          giornateImportate: 0,
          areeImportate: 0,
        });
      }
    } catch (error) {
      setErrore(
        error instanceof Error
          ? error.message
          : 'Errore durante la lettura dei dati Bacco.'
      );
    }
  }

  useEffect(() => {
    caricaDati();
  }, [
    periodoSelezionato.dataDa,
    periodoSelezionato.dataA,
  ]);

  const riepilogoAree =
    useMemo<RiepilogoArea[]>(() => {
      const mappa = new Map<
        string,
        {
          incasso: number;
          coperti: number;
        }
      >();

      for (
        const riga of
        datiIncassi?.aree || []
      ) {
        const area = (
          riga.area ||
          'NON CLASSIFICATO'
        )
          .toUpperCase()
          .trim();

        const esistente =
          mappa.get(area) || {
            incasso: 0,
            coperti: 0,
          };

        esistente.incasso +=
          Number(riga.incasso || 0);

        esistente.coperti +=
          Number(riga.coperti || 0);

        mappa.set(
          area,
          esistente
        );
      }

      const totale =
        Array.from(
          mappa.values()
        ).reduce(
          (somma, valore) =>
            somma + valore.incasso,
          0
        );

      return Array.from(
        mappa.entries()
      )
        .map(
          ([area, valore]) => ({
            area,
            incasso:
              valore.incasso,
            coperti:
              valore.coperti,
            percentuale:
              totale > 0
                ? (
                    valore.incasso /
                    totale
                  ) * 100
                : 0,
          })
        )
        .sort(
          (a, b) =>
            b.incasso - a.incasso
        );
    }, [datiIncassi]);

  const tabellaGiornaliera =
    useMemo(() => {
      const date = new Map<
        string,
        {
          data: string;
          asporto: number;
          domicilio: number;
          salaGrande: number;
          salaPedana: number;
          veranda: number;
          altreAree: number;
          coperti: number;
          totale: number;
        }
      >();

      for (
        const giornata of
        datiIncassi?.giornate || []
      ) {
        date.set(
          giornata.data,
          {
            data:
              giornata.data,
            asporto: 0,
            domicilio: 0,
            salaGrande: 0,
            salaPedana: 0,
            veranda: 0,
            altreAree: 0,
            coperti:
              Number(
                giornata.coperti ||
                  0
              ),
            totale:
              Number(
                giornata.incasso_totale ||
                  0
              ),
          }
        );
      }

      for (
        const riga of
        datiIncassi?.aree || []
      ) {
        const record =
          date.get(riga.data) || {
            data: riga.data,
            asporto: 0,
            domicilio: 0,
            salaGrande: 0,
            salaPedana: 0,
            veranda: 0,
            altreAree: 0,
            coperti: 0,
            totale: 0,
          };

        const area = (
          riga.area || ''
        ).toUpperCase();

        const incasso =
          Number(riga.incasso || 0);

        if (
          area.includes(
            'ASPORTO'
          )
        ) {
          record.asporto +=
            incasso;
        } else if (
          area.includes(
            'DOMICILIO'
          )
        ) {
          record.domicilio +=
            incasso;
        } else if (
          area.includes(
            'SALA GRANDE'
          )
        ) {
          record.salaGrande +=
            incasso;
        } else if (
          area.includes(
            'PEDANA'
          )
        ) {
          record.salaPedana +=
            incasso;
        } else if (
          area.includes(
            'VERANDA'
          )
        ) {
          record.veranda +=
            incasso;
        } else {
          record.altreAree +=
            incasso;
        }

        date.set(
          riga.data,
          record
        );
      }

      return Array.from(
        date.values()
      ).sort((a, b) =>
        a.data.localeCompare(
          b.data
        )
      );
    }, [datiIncassi]);

  async function importaProduzione(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith('.xlsx')
    ) {
      setErrore(
        'Seleziona il report Produzione Bacco in formato XLSX.'
      );
      return;
    }

    setErrore('');
    setMessaggio('');
    setCaricamentoProduzione(
      true
    );

    try {
      const formData =
        new FormData();

      formData.append(
        'file',
        file
      );

      const risposta =
        await fetch(
          '/api/bacco',
          {
            method: 'POST',
            body: formData,
          }
        );

      const esito =
        (await risposta.json()) as RispostaImportBacco;

      if (
        !risposta.ok ||
        !esito.ok
      ) {
        throw new Error(
          esito.messaggio ||
            'Errore durante l’importazione della produzione Bacco.'
        );
      }

      if (!esito.riepilogo) {
        throw new Error(
          'Il server non ha restituito il riepilogo Bacco.'
        );
      }

      setReport({
        ...esito.riepilogo,
        importatoIl:
          new Date().toISOString(),
      });

      setMessaggio(
        esito.messaggio ||
          'Produzione Bacco importata correttamente.'
      );
    } catch (error) {
      setErrore(
        error instanceof Error
          ? error.message
          : 'Errore durante l’importazione della produzione Bacco.'
      );
    } finally {
      setCaricamentoProduzione(
        false
      );
    }
  }

  async function importaIncassiGiornalieri(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith('.xlsx')
    ) {
      setErrore(
        'Seleziona il report degli incassi giornalieri in formato XLSX.'
      );
      return;
    }

    setErrore('');
    setMessaggio('');
    setCaricamentoIncassi(
      true
    );

    try {
      const formData =
        new FormData();

      formData.append(
        'file',
        file
      );

      const risposta =
        await fetch(
          '/api/bacco/incassi',
          {
            method: 'POST',
            body: formData,
          }
        );

      const esito =
        (await risposta.json()) as {
          ok: boolean;
          duplicato?: boolean;
          messaggio?: string;
          riepilogo?: RiepilogoIncassiGiornalieri;
        };

      if (
        !risposta.ok ||
        !esito.ok
      ) {
        throw new Error(
          esito.messaggio ||
            'Errore durante l’importazione degli incassi giornalieri.'
        );
      }

      if (esito.riepilogo) {
        setRiepilogoIncassi(
          esito.riepilogo
        );
      }

      setMessaggio(
        esito.messaggio ||
          'Incassi giornalieri importati correttamente.'
      );

      await caricaDati();
    } catch (error) {
      setErrore(
        error instanceof Error
          ? error.message
          : 'Errore durante l’importazione degli incassi giornalieri.'
      );
    } finally {
      setCaricamentoIncassi(
        false
      );
    }
  }

  const importazioneInCorso =
    caricamentoProduzione ||
    caricamentoIncassi;

  return (
    <section>
      <div className="card no-print">
        <div className="actions">
          <button
            className="btn green"
            onClick={onBack}
            disabled={
              importazioneInCorso
            }
          >
            ← Controllo di Gestione
          </button>

          <label
            className="btn gold"
            style={{
              cursor: 'pointer',
            }}
          >
            📅{' '}
            {caricamentoIncassi
              ? 'Importazione incassi…'
              : 'Importa incassi giornalieri'}

            <input
              type="file"
              accept=".xlsx"
              onChange={
                importaIncassiGiornalieri
              }
              disabled={
                importazioneInCorso
              }
              style={{
                display: 'none',
              }}
            />
          </label>

          <label
            className="btn gold"
            style={{
              cursor: 'pointer',
            }}
          >
            🍕{' '}
            {caricamentoProduzione
              ? 'Importazione produzione…'
              : 'Importa produzione/venduto'}

            <input
              type="file"
              accept=".xlsx"
              onChange={
                importaProduzione
              }
              disabled={
                importazioneInCorso
              }
              style={{
                display: 'none',
              }}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h2>
          📊 Centro Analisi Bacco
        </h2>

        <p className="muted">
          Incassi separati per
          area, coperti e dettaglio
          giornaliero. La
          produzione/venduto resta
          disponibile per categorie,
          articoli, magazzino e food
          cost.
        </p>

        {messaggio && (
          <p
            style={{
              fontWeight: 700,
            }}
          >
            🟢 {messaggio}
          </p>
        )}

        {errore && (
          <p
            style={{
              fontWeight: 700,
            }}
          >
            🔴 {errore}
          </p>
        )}
      </div>

      <div className="card no-print">
        <div className="actions">
          <button
            className={
              tipoPeriodo ===
              'settimana'
                ? 'btn gold'
                : 'btn green'
            }
            onClick={() =>
              setTipoPeriodo(
                'settimana'
              )
            }
          >
            📅 Settimana attuale
          </button>

          <button
            className={
              tipoPeriodo === 'mese'
                ? 'btn gold'
                : 'btn green'
            }
            onClick={() =>
              setTipoPeriodo('mese')
            }
          >
            🗓️ Mese corrente
          </button>

          <button
            className={
              tipoPeriodo ===
              'personalizzato'
                ? 'btn gold'
                : 'btn green'
            }
            onClick={() =>
              setTipoPeriodo(
                'personalizzato'
              )
            }
          >
            🗂️ Periodo
            personalizzato
          </button>
        </div>

        {tipoPeriodo ===
          'personalizzato' && (
          <div
            className="actions"
            style={{
              marginTop: 14,
            }}
          >
            <label>
              Dal:{' '}
              <input
                type="date"
                value={
                  dataPersonalizzataDa
                }
                onChange={(
                  event
                ) =>
                  setDataPersonalizzataDa(
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label>
              Al:{' '}
              <input
                type="date"
                value={
                  dataPersonalizzataA
                }
                onChange={(
                  event
                ) =>
                  setDataPersonalizzataA(
                    event.target
                      .value
                  )
                }
              />
            </label>
          </div>
        )}

        <p
          style={{
            marginTop: 14,
          }}
        >
          Periodo visualizzato:{' '}
          <strong>
            {dataItaliana(
              periodoSelezionato.dataDa
            )}
            {' — '}
            {dataItaliana(
              periodoSelezionato.dataA
            )}
          </strong>
        </p>
      </div>

      {riepilogoIncassi && (
        <>
          <div className="card">
            <h2>
              💰 Riepilogo incassi
              verificati
            </h2>

            <div className="dashboard">
              <div className="kpi gold">
                <span>
                  💰 Totale incasso
                </span>

                <strong>
                  {euro(
                    riepilogoIncassi
                      .totaleIncasso
                  )}
                </strong>
              </div>

              <div className="kpi">
                <span>
                  👥 Coperti
                </span>

                <strong>
                  {
                    riepilogoIncassi
                      .totaleCoperti
                  }
                </strong>
              </div>

              <div className="kpi">
                <span>
                  🧾 Scontrino medio
                </span>

                <strong>
                  {euro(
                    riepilogoIncassi
                      .totaleCoperti >
                      0
                      ? riepilogoIncassi
                          .totaleIncasso /
                          riepilogoIncassi
                            .totaleCoperti
                      : 0
                  )}
                </strong>
              </div>

              <div className="kpi">
                <span>
                  📆 Giornate
                </span>

                <strong>
                  {
                    riepilogoIncassi
                      .giornateImportate
                  }
                </strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>
              🍽️ Incassi per
              reparto / area
            </h2>

            <div className="dashboard">
              {riepilogoAree.map(
                (riga) => (
                  <div
                    className="kpi"
                    key={riga.area}
                  >
                    <span>
                      {nomeAreaVisuale(
                        riga.area
                      )}
                    </span>

                    <strong>
                      {euro(
                        riga.incasso
                      )}
                    </strong>

                    <small>
                      {riga.percentuale.toFixed(
                        1
                      )}
                      % del totale
                      {riga.coperti >
                      0
                        ? ` · ${riga.coperti} coperti`
                        : ''}
                    </small>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="card">
            <h2>
              📅 Dettaglio
              giornaliero per reparto
            </h2>

            <div
              style={{
                overflowX: 'auto',
              }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Asporto</th>
                    <th>Domicilio</th>
                    <th>
                      Sala grande
                    </th>
                    <th>Pedana</th>
                    <th>Veranda</th>
                    <th>
                      Altre aree
                    </th>
                    <th>Coperti</th>
                    <th>Totale</th>
                  </tr>
                </thead>

                <tbody>
                  {tabellaGiornaliera.map(
                    (riga) => (
                      <tr
                        key={
                          riga.data
                        }
                      >
                        <td>
                          <strong>
                            {dataItaliana(
                              riga.data
                            )}
                          </strong>
                        </td>

                        <td>
                          {euro(
                            riga.asporto
                          )}
                        </td>

                        <td>
                          {euro(
                            riga.domicilio
                          )}
                        </td>

                        <td>
                          {euro(
                            riga.salaGrande
                          )}
                        </td>

                        <td>
                          {euro(
                            riga.salaPedana
                          )}
                        </td>

                        <td>
                          {euro(
                            riga.veranda
                          )}
                        </td>

                        <td>
                          {euro(
                            riga.altreAree
                          )}
                        </td>

                        <td>
                          {riga.coperti}
                        </td>

                        <td>
                          <strong>
                            {euro(
                              riga.totale
                            )}
                          </strong>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {report && (
        <>
          <div className="dashboard">
            <div className="kpi gold">
              <span>
                💰 Produzione netta
              </span>

              <strong>
                {euro(
                  report.produzioneNetta
                )}
              </strong>
            </div>

            <div className="kpi">
              <span>
                💵 Produzione lorda
              </span>

              <strong>
                {euro(
                  report.produzioneLorda
                )}
              </strong>
            </div>

            <div className="kpi">
              <span>🏷️ Sconti</span>

              <strong>
                {euro(report.sconti)}
              </strong>
            </div>

            <div className="kpi">
              <span>
                👥 Coperti
                produzione
              </span>

              <strong>
                {report.coperti}
              </strong>
            </div>

            <div className="kpi">
              <span>
                🍽️ Media per
                coperto
              </span>

              <strong>
                {euro(
                  report.mediaNettaCoperto
                )}
              </strong>
            </div>

            <div className="kpi">
              <span>
                🧾 Operazioni
              </span>

              <strong>
                {
                  report.numeroOperazioni
                }
              </strong>
            </div>
          </div>

          <div className="card">
            <h2>
              Periodo produzione
              importato
            </h2>

            <p>
              Dal{' '}
              <strong>
                {dataItaliana(
                  report.periodoDa
                )}
              </strong>{' '}
              al{' '}
              <strong>
                {dataItaliana(
                  report.periodoA
                )}
              </strong>
            </p>

            <p className="muted">
              File: {report.nomeFile}
              {report.importatoIl
                ? ` · Importato il ${dataOraItaliana(
                    report.importatoIl
                  )}`
                : ''}
            </p>
          </div>

          <div className="card">
            <h2>
              Contenuto produzione
              acquisito
            </h2>

            <div
              style={{
                overflowX: 'auto',
              }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      Sezione
                    </th>
                    <th>
                      Righe importate
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>
                      Categorie di
                      vendita
                    </td>
                    <td>
                      {
                        report.categorieImportate
                      }
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Reparti
                      produzione
                    </td>
                    <td>
                      {
                        report.repartiImportati
                      }
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Forme di
                      pagamento
                    </td>
                    <td>
                      {
                        report.pagamentiImportati
                      }
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Righe IVA
                    </td>
                    <td>
                      {
                        report.righeIvaImportate
                      }
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Totale
                      pagamenti
                    </td>
                    <td>
                      <strong>
                        {euro(
                          report.totalePagamenti
                        )}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
