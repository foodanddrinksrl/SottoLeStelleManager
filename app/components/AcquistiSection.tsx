'use client';

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  analizzaFattureEstratte,
  estraiFattureDaFile,
  type FatturaElettronicaAnalizzata,
  type RisultatoAnalisiFatture,
} from '../lib/fattureElettroniche';

import {
  applicaSegno,
  caricaDocumentiAcquisto,
  creaChiaveDuplicato,
  importaDocumentiSenzaDuplicati,
  memorizzaClassificazione,
  trovaClassificazioneMemorizzata,
  segnoTipoDocumento,
  type CategoriaGestionale,
  type DocumentoAcquistoSalvato,
  type RigaAcquistoSalvata,
  type ScadenzaAcquistoSalvata,
} from '../lib/acquistiStorage';

import {
  aggiornaArchivioFornitori,
  caricaArchivioFornitori,
  type FornitoreSalvato,
} from '../lib/fornitoriStorage';

import { RicevimentoMerci } from './ricevimento/RicevimentoMerci';

type Categoria = CategoriaGestionale;

type SezioneCentroAcquisti =
  | 'fatture'
  | 'ricevimento'
  | 'fornitori'
  | 'prezzi'
  | 'pagamenti'
  | 'statistiche';

type BozzaInterfaccia = {
  versione: 1 | 2;
  nomeArchivio: string;
  salvataIl: string;
  analisi: RisultatoAnalisiFatture;
  categorieRighe: Record<string, Categoria>;
};

const BOZZA_UI_KEY = 'slm_v6_bozza_acquisti_ui';

const categorie: Categoria[] = [
  'Da classificare',
  'Materie prime',
  'Materiale di consumo',
  'Bibite',
  'Imballaggi',
  'Detergenti',
  'Legna',
  'Utenze',
  'Affitti',
  'Consulenze',
  'Manutenzioni e riparazioni',
  'Costi straordinari',
  'Altri costi',
];

function euro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function dataIt(value: string): string {
  if (!value) return '—';

  return new Date(`${value}T00:00:00`).toLocaleDateString('it-IT');
}

function chiaveRiga(
  fattura: FatturaElettronicaAnalizzata,
  numeroLinea: number
): string {
  return `${fattura.id}__${numeroLinea}`;
}

function generaId(suffisso: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${suffisso}`;
}

function salvaBozzaLocale(bozza: BozzaInterfaccia): void {
  localStorage.setItem(BOZZA_UI_KEY, JSON.stringify(bozza));
}

function caricaBozzaLocale(): BozzaInterfaccia | null {
  try {
    const valore = localStorage.getItem(BOZZA_UI_KEY);

    if (!valore) return null;

    const bozza = JSON.parse(valore) as BozzaInterfaccia;

    return bozza?.versione === 1 || bozza?.versione === 2
      ? bozza
      : null;
  } catch {
    return null;
  }
}

function eliminaBozzaLocale(): void {
  localStorage.removeItem(BOZZA_UI_KEY);
}

export function AcquistiSection({ onBack }: { onBack: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [sezione, setSezione] =
    useState<SezioneCentroAcquisti>('fatture');

  const [analisi, setAnalisi] =
    useState<RisultatoAnalisiFatture | null>(null);

  const [nomeArchivio, setNomeArchivio] = useState('');

  const [categorieRighe, setCategorieRighe] = useState<
    Record<string, Categoria>
  >({});


  const [fatturaAperta, setFatturaAperta] =
    useState<string | null>(null);

  const [errore, setErrore] = useState('');
  const [caricamento, setCaricamento] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [bozzaRipristinata, setBozzaRipristinata] = useState(false);

  const [archivioSalvato, setArchivioSalvato] =
    useState<DocumentoAcquistoSalvato[]>([]);

  const [archivioFornitori, setArchivioFornitori] =
    useState<FornitoreSalvato[]>([]);

  useEffect(() => {
    const documentiEsistenti = caricaDocumentiAcquisto();
    const fornitoriEsistenti = caricaArchivioFornitori();

    setArchivioSalvato(documentiEsistenti);

    if (fornitoriEsistenti.length === 0 && documentiEsistenti.length > 0) {
      setArchivioFornitori(
        aggiornaArchivioFornitori(documentiEsistenti)
      );
    } else {
      setArchivioFornitori(fornitoriEsistenti);
    }

    const bozza = caricaBozzaLocale();

    if (!bozza) return;

    setNomeArchivio(bozza.nomeArchivio);
    setAnalisi(bozza.analisi);
    setCategorieRighe(bozza.categorieRighe || {});
    setBozzaRipristinata(true);
    setMessaggio(
      `Bozza ripristinata automaticamente. Salvata il ${bozza.salvataIl}.`
    );
  }, []);

  const riepilogoCategorie = useMemo(() => {
    const mappa = new Map<Categoria, number>();

    if (!analisi) return [];

    analisi.fatture.forEach((fattura) => {
      const segno = segnoTipoDocumento(fattura.tipoDocumento);

      fattura.righe.forEach((riga) => {
        const categoria =
          categorieRighe[chiaveRiga(fattura, riga.numeroLinea)] ||
          (riga.categoriaProposta as Categoria) ||
          'Da classificare';

        const valore = Math.abs(riga.prezzoTotale) * segno;

        mappa.set(categoria, (mappa.get(categoria) || 0) + valore);
      });
    });

    return Array.from(mappa.entries())
      .map(([categoria, totale]) => ({ categoria, totale }))
      .sort((a, b) => Math.abs(b.totale) - Math.abs(a.totale));
  }, [analisi, categorieRighe]);

  const finanzaFornitori = useMemo(() => {
    if (!analisi) return [];

    const mappa = new Map<
      string,
      {
        fornitore: string;
        numeroFatture: number;
        totaleFatture: number;
        totaleScadenze: number;
        prossimaScadenza: string;
      }
    >();

    analisi.fatture.forEach((fattura) => {
      const segno = segnoTipoDocumento(fattura.tipoDocumento);

      const corrente = mappa.get(fattura.fornitore) || {
        fornitore: fattura.fornitore,
        numeroFatture: 0,
        totaleFatture: 0,
        totaleScadenze: 0,
        prossimaScadenza: '',
      };

      corrente.numeroFatture += 1;
      corrente.totaleFatture += Math.abs(fattura.totale) * segno;

      fattura.pagamenti.forEach((pagamento) => {
        corrente.totaleScadenze += Math.abs(pagamento.importo) * segno;

        if (
          pagamento.dataScadenza &&
          (!corrente.prossimaScadenza ||
            pagamento.dataScadenza < corrente.prossimaScadenza)
        ) {
          corrente.prossimaScadenza = pagamento.dataScadenza;
        }
      });

      mappa.set(fattura.fornitore, corrente);
    });

    return Array.from(mappa.values()).sort(
      (a, b) => Math.abs(b.totaleFatture) - Math.abs(a.totaleFatture)
    );
  }, [analisi]);

  const scadenze = useMemo(() => {
    if (!analisi) return { totale: 0, scadute: 0, prossimi7: 0 };

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    const fra7 = new Date(oggi);
    fra7.setDate(fra7.getDate() + 7);

    let totale = 0;
    let scadute = 0;
    let prossimi7 = 0;

    analisi.fatture.forEach((fattura) => {
      const segno = segnoTipoDocumento(fattura.tipoDocumento);

      fattura.pagamenti.forEach((pagamento) => {
        const importo = Math.abs(pagamento.importo) * segno;

        totale += importo;

        if (!pagamento.dataScadenza) return;

        const data = new Date(`${pagamento.dataScadenza}T00:00:00`);

        if (data < oggi) scadute += importo;
        else if (data <= fra7) prossimi7 += importo;
      });
    });

    return { totale, scadute, prossimi7 };
  }, [analisi]);

  const statisticheArchivio = useMemo(() => {
    return {
      numeroDocumenti: archivioSalvato.length,
      totaleNetto: archivioSalvato.reduce(
        (somma, documento) => somma + documento.totale,
        0
      ),
      noteCredito: archivioSalvato.filter(
        (documento) => documento.segno === -1
      ).length,
      fornitori: archivioFornitori.length,
      articoli: archivioFornitori.reduce(
        (somma, fornitore) => somma + fornitore.articoli.length,
        0
      ),
    };
  }, [archivioSalvato, archivioFornitori]);

  async function importa(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    setCaricamento(true);
    setErrore('');
    setMessaggio('');
    setAnalisi(null);
    setFatturaAperta(null);
    setCategorieRighe({});
    setBozzaRipristinata(false);

    try {
      const archivio = await estraiFattureDaFile(file);
      const risultato = analizzaFattureEstratte(archivio.fatture);

      if (!risultato.fatture.length) {
        throw new Error('Nessuna fattura valida riconosciuta.');
      }

      const iniziali: Record<string, Categoria> = {};
      risultato.fatture.forEach((fattura) => {
        fattura.righe.forEach((riga) => {
          const memorizzata = trovaClassificazioneMemorizzata({
            partitaIva: fattura.partitaIva,
            codiceArticolo: riga.codiceValore || '',
            descrizione: riga.descrizione,
          });

          const proposta = memorizzata ||
            (categorie.includes(riga.categoriaProposta as Categoria)
              ? (riga.categoriaProposta as Categoria)
              : 'Da classificare');

          iniziali[chiaveRiga(fattura, riga.numeroLinea)] = proposta;
        });
      });

      setNomeArchivio(archivio.nomeArchivio);
      setCategorieRighe(iniziali);
      setAnalisi(risultato);
      setMessaggio(
        'Archivio letto. Controlla le categorie e salva la bozza oppure conferma l’importazione.'
      );
    } catch (error) {
      setErrore(
        error instanceof Error
          ? error.message
          : 'Errore durante l’importazione.'
      );
    } finally {
      setCaricamento(false);
    }
  }

  function aggiornaCategoria(
    fattura: FatturaElettronicaAnalizzata,
    numeroLinea: number,
    categoria: Categoria
  ) {
    setCategorieRighe((precedenti) => ({
      ...precedenti,
      [chiaveRiga(fattura, numeroLinea)]: categoria,
    }));
  }

  function salvaBozza() {
    if (!analisi) {
      alert('Non c’è alcuna importazione da salvare.');
      return;
    }

    const salvataIl = new Date().toLocaleString('it-IT');

    salvaBozzaLocale({
      versione: 2,
      nomeArchivio,
      salvataIl,
      analisi,
      categorieRighe,
    });

    setBozzaRipristinata(false);
    setMessaggio(`Bozza salvata correttamente il ${salvataIl}.`);
  }

  function eliminaBozza() {
    const conferma = window.confirm(
      'Vuoi eliminare la bozza corrente? Le fatture già importate definitivamente non saranno cancellate.'
    );

    if (!conferma) return;

    eliminaBozzaLocale();
    setAnalisi(null);
    setNomeArchivio('');
    setCategorieRighe({});
    setFatturaAperta(null);
    setMessaggio('Bozza eliminata.');
    setBozzaRipristinata(false);
  }

  function creaDocumentiDaImportare(): DocumentoAcquistoSalvato[] {
    if (!analisi) return [];

    return analisi.fatture.map((fattura) => {
      const segno = segnoTipoDocumento(fattura.tipoDocumento);

      const righe: RigaAcquistoSalvata[] = fattura.righe.map((riga) => {
        const categoria =
          categorieRighe[chiaveRiga(fattura, riga.numeroLinea)] ||
          'Da classificare';

        return {
          id: generaId(`riga-${fattura.id}-${riga.numeroLinea}`),
          numeroLinea: riga.numeroLinea,
          codiceArticolo: riga.codiceValore || '',
          descrizione: riga.descrizione,
          quantita: riga.quantita,
          unitaMisura: riga.unitaMisura,
          prezzoUnitario: riga.prezzoUnitario,
          imponibile: Math.abs(riga.prezzoTotale),
          aliquotaIva: riga.aliquotaIva,
          categoria,
          affidabilita: riga.affidabilita,
        };
      });

      const scadenze: ScadenzaAcquistoSalvata[] = fattura.pagamenti.map(
        (pagamento, indice) => ({
          id: generaId(`scadenza-${fattura.id}-${indice}`),
          dataScadenza: pagamento.dataScadenza,
          importo: Math.abs(pagamento.importo) * segno,
          modalitaPagamento: pagamento.modalitaPagamento,
          iban: pagamento.iban,
          stato: 'Da pagare',
        })
      );

      return {
        id: fattura.id,
        chiaveDuplicato: creaChiaveDuplicato({
          partitaIva: fattura.partitaIva,
          numeroDocumento: fattura.numeroDocumento,
          dataDocumento: fattura.data,
          tipoDocumento: fattura.tipoDocumento,
        }),
        tipoDocumento: fattura.tipoDocumento,
        segno,
        fornitore: fattura.fornitore,
        partitaIva: fattura.partitaIva,
        numeroDocumento: fattura.numeroDocumento,
        dataDocumento: fattura.data,
        dataRicezione: '',
        dataImportazione: new Date().toISOString(),
        imponibile: applicaSegno(
          fattura.imponibile,
          fattura.tipoDocumento
        ),
        iva: applicaSegno(fattura.iva, fattura.tipoDocumento),
        totale: applicaSegno(fattura.totale, fattura.tipoDocumento),
        origine: 'ZIP/XML',
        righe,
        scadenze,
      };
    });
  }

  function confermaImportazione() {
    if (!analisi) {
      alert('Non c’è alcuna importazione da confermare.');
      return;
    }

    const nonClassificate = Object.values(categorieRighe).filter(
      (categoria) => categoria === 'Da classificare'
    ).length;


    if (nonClassificate > 0) {
      const continua = window.confirm(
        `Restano ${nonClassificate} righe da classificare. Vuoi importare comunque? Potrai completarle in seguito.`
      );

      if (!continua) return;
    }


    const documenti = creaDocumentiDaImportare();

    analisi.fatture.forEach((fattura) => {
      fattura.righe.forEach((riga) => {
        const categoria =
          categorieRighe[chiaveRiga(fattura, riga.numeroLinea)] ||
          'Da classificare';

        if (categoria === 'Da classificare') return;

        memorizzaClassificazione({
          partitaIva: fattura.partitaIva,
          codiceArticolo: riga.codiceValore || '',
          descrizione: riga.descrizione,
          categoria,
        });
      });
    });

    const chiaviEsistenti = new Set(
      archivioSalvato.map((documento) => documento.chiaveDuplicato)
    );

    const documentiNuovi = documenti.filter(
      (documento) => !chiaviEsistenti.has(documento.chiaveDuplicato)
    );

    const risultato = importaDocumentiSenzaDuplicati(documenti);
    const fornitoriAggiornati = aggiornaArchivioFornitori(documentiNuovi);

    setArchivioSalvato(risultato.documentiFinali);
    setArchivioFornitori(fornitoriAggiornati);
    eliminaBozzaLocale();
    setAnalisi(null);
    setNomeArchivio('');
    setCategorieRighe({});
    setFatturaAperta(null);
    setBozzaRipristinata(false);

    setMessaggio(
      `Importazione completata: ${risultato.importati} documenti nuovi, ${risultato.duplicati} duplicati ignorati.`
    );
  }

  function menuCentroAcquisti() {
    const voci: Array<{
      id: SezioneCentroAcquisti;
      etichetta: string;
    }> = [
      { id: 'fatture', etichetta: '📄 Fatture XML' },
      { id: 'ricevimento', etichetta: '📦 Ricevimento Merci' },
      { id: 'fornitori', etichetta: '🏪 Fornitori' },
      { id: 'prezzi', etichetta: '📈 Prezzi' },
      { id: 'pagamenti', etichetta: '💳 Pagamenti' },
      { id: 'statistiche', etichetta: '📊 Statistiche' },
    ];

    return (
      <div className="card no-print">
        <div className="actions">
          {voci.map((voce) => (
            <button
              key={voce.id}
              className={sezione === voce.id ? 'btn gold' : 'btn'}
              onClick={() => setSezione(voce.id)}
            >
              {voce.etichetta}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (sezione === 'ricevimento') {
    return (
      <section>
        {menuCentroAcquisti()}
        <RicevimentoMerci onBack={() => setSezione('fatture')} />
      </section>
    );
  }

  if (sezione === 'fornitori') {
    return (
      <section>
        {menuCentroAcquisti()}

        <div className="card">
          <h2>🏪 Archivio Fornitori</h2>
          <p className="muted">
            Anagrafica costruita automaticamente dalle fatture confermate.
          </p>
        </div>

        <div className="dashboard">
          <div className="kpi green">
            <span>Fornitori attivi</span>
            <strong>{archivioFornitori.filter((f) => f.attivo).length}</strong>
          </div>

          <div className="kpi">
            <span>Articoli catalogati</span>
            <strong>
              {archivioFornitori.reduce(
                (somma, fornitore) => somma + fornitore.articoli.length,
                0
              )}
            </strong>
          </div>

          <div className="kpi gold">
            <span>Saldo netto fornitori</span>
            <strong>
              {euro(
                archivioFornitori.reduce(
                  (somma, fornitore) => somma + fornitore.saldoNetto,
                  0
                )
              )}
            </strong>
          </div>
        </div>

        <div className="card">
          {archivioFornitori.length === 0 ? (
            <p className="muted">
              Nessun fornitore ancora disponibile. Conferma almeno una
              importazione XML.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fornitore</th>
                    <th>Partita IVA</th>
                    <th>Documenti</th>
                    <th>Acquistato</th>
                    <th>Note credito</th>
                    <th>Saldo netto</th>
                    <th>Ultimo acquisto</th>
                    <th>Articoli</th>
                  </tr>
                </thead>

                <tbody>
                  {archivioFornitori.map((fornitore) => (
                    <tr key={fornitore.id}>
                      <td><strong>{fornitore.ragioneSociale}</strong></td>
                      <td>{fornitore.partitaIva || '—'}</td>
                      <td>{fornitore.numeroDocumenti}</td>
                      <td>{euro(fornitore.totaleAcquistato)}</td>
                      <td>{euro(fornitore.totaleNoteCredito)}</td>
                      <td><strong>{euro(fornitore.saldoNetto)}</strong></td>
                      <td>{dataIt(fornitore.ultimoAcquisto)}</td>
                      <td>{fornitore.articoli.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (sezione === 'prezzi') {
    const articoli = archivioFornitori
      .flatMap((fornitore) =>
        fornitore.articoli.map((articolo) => ({
          ...articolo,
          fornitore: fornitore.ragioneSociale,
        }))
      )
      .sort((a, b) => a.descrizione.localeCompare(b.descrizione));

    return (
      <section>
        {menuCentroAcquisti()}

        <div className="card">
          <h2>📈 Catalogo articoli e prezzi</h2>
          <p className="muted">
            Ultimo prezzo, media, minimo e massimo ricavati dalle fatture.
          </p>
        </div>

        <div className="card">
          {articoli.length === 0 ? (
            <p className="muted">Nessun articolo ancora catalogato.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Articolo</th>
                    <th>Fornitore</th>
                    <th>Categoria</th>
                    <th>Ultimo prezzo</th>
                    <th>Prezzo medio</th>
                    <th>Minimo</th>
                    <th>Massimo</th>
                    <th>Ultimo acquisto</th>
                  </tr>
                </thead>

                <tbody>
                  {articoli.map((articolo) => (
                    <tr key={`${articolo.fornitore}-${articolo.id}`}>
                      <td><strong>{articolo.descrizione}</strong></td>
                      <td>{articolo.fornitore}</td>
                      <td>{articolo.categoria}</td>
                      <td>{euro(articolo.ultimoPrezzo)}</td>
                      <td>{euro(articolo.prezzoMedio)}</td>
                      <td>{euro(articolo.prezzoMinimo)}</td>
                      <td>{euro(articolo.prezzoMassimo)}</td>
                      <td>{dataIt(articolo.ultimoAcquisto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (sezione === 'pagamenti') {
    const scadenzeSalvate = archivioSalvato
      .flatMap((documento) =>
        documento.scadenze.map((scadenza) => ({
          ...scadenza,
          fornitore: documento.fornitore,
          numeroDocumento: documento.numeroDocumento,
          dataDocumento: documento.dataDocumento,
        }))
      )
      .sort((a, b) =>
        (a.dataScadenza || '9999-12-31').localeCompare(
          b.dataScadenza || '9999-12-31'
        )
      );

    return (
      <section>
        {menuCentroAcquisti()}

        <div className="card">
          <h2>💳 Pagamenti e scadenze</h2>
          <p className="muted">
            Situazione finanziaria ricavata dai documenti XML confermati.
          </p>
        </div>

        <div className="dashboard">
          <div className="kpi gold">
            <span>Totale scadenze</span>
            <strong>
              {euro(
                scadenzeSalvate.reduce(
                  (somma, scadenza) => somma + scadenza.importo,
                  0
                )
              )}
            </strong>
          </div>

          <div className="kpi">
            <span>Da pagare</span>
            <strong>
              {euro(
                scadenzeSalvate
                  .filter((s) => s.stato === 'Da pagare')
                  .reduce((somma, s) => somma + s.importo, 0)
              )}
            </strong>
          </div>

          <div className="kpi green">
            <span>Pagate</span>
            <strong>
              {euro(
                scadenzeSalvate
                  .filter((s) => s.stato === 'Pagata')
                  .reduce((somma, s) => somma + s.importo, 0)
              )}
            </strong>
          </div>
        </div>

        <div className="card">
          {scadenzeSalvate.length === 0 ? (
            <p className="muted">Nessuna scadenza disponibile.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Scadenza</th>
                    <th>Fornitore</th>
                    <th>Documento</th>
                    <th>Importo</th>
                    <th>Modalità</th>
                    <th>Stato</th>
                  </tr>
                </thead>

                <tbody>
                  {scadenzeSalvate.map((scadenza) => (
                    <tr key={scadenza.id}>
                      <td>{dataIt(scadenza.dataScadenza)}</td>
                      <td>{scadenza.fornitore}</td>
                      <td>{scadenza.numeroDocumento}</td>
                      <td><strong>{euro(scadenza.importo)}</strong></td>
                      <td>{scadenza.modalitaPagamento || '—'}</td>
                      <td>{scadenza.stato}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (sezione === 'statistiche') {
    const totaleMateriePrime = archivioSalvato.reduce(
      (totale, documento) =>
        totale +
        documento.righe
          .filter((riga) => riga.categoria === 'Materie prime')
          .reduce(
            (somma, riga) => somma + riga.imponibile * documento.segno,
            0
          ),
      0
    );

    return (
      <section>
        {menuCentroAcquisti()}

        <div className="card">
          <h2>📊 Statistiche Acquisti</h2>
          <p className="muted">
            Riepilogo dell'archivio definitivo già confermato.
          </p>
        </div>

        <div className="dashboard">
          <div className="kpi gold">
            <span>Totale netto acquisti</span>
            <strong>{euro(statisticheArchivio.totaleNetto)}</strong>
          </div>

          <div className="kpi">
            <span>Materie prime nette</span>
            <strong>{euro(totaleMateriePrime)}</strong>
          </div>

          <div className="kpi">
            <span>Documenti</span>
            <strong>{statisticheArchivio.numeroDocumenti}</strong>
          </div>

          <div className="kpi">
            <span>Note di credito</span>
            <strong>{statisticheArchivio.noteCredito}</strong>
          </div>

          <div className="kpi">
            <span>Fornitori</span>
            <strong>{statisticheArchivio.fornitori}</strong>
          </div>

          <div className="kpi green">
            <span>Articoli catalogati</span>
            <strong>{statisticheArchivio.articoli}</strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      {menuCentroAcquisti()}

      <div className="card no-print">
        <div className="actions">
          <button className="btn green" onClick={onBack}>
            ← Controllo di Gestione
          </button>

          <button
            className="btn gold"
            onClick={() => inputRef.current?.click()}
            disabled={caricamento}
          >
            {caricamento ? '⏳ Lettura fatture…' : '📦 Importa ZIP/XML'}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".zip,.xml,application/zip,text/xml,application/xml"
            onChange={importa}
            style={{ display: 'none' }}
          />

          {analisi && (
            <>
              <button className="btn gold" onClick={salvaBozza}>
                💾 Salva bozza
              </button>

              <button className="btn green" onClick={confermaImportazione}>
                ✅ Conferma e importa
              </button>

              <button className="btn danger" onClick={eliminaBozza}>
                Elimina bozza
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h2>📥 Centro Acquisti</h2>
        <p className="muted">
          Classificazione gestionale, pagamenti, note di credito e archivio
          automatico di fornitori e articoli. La data documento determina
          sempre il periodo del controllo di gestione.
        </p>
      </div>

      {messaggio && (
        <div className="card">
          <h2>{bozzaRipristinata ? '🔄 Bozza ripristinata' : '✅ Operazione completata'}</h2>
          <p>{messaggio}</p>
        </div>
      )}

      {errore && (
        <div className="card">
          <h2>🔴 Errore</h2>
          <p>{errore}</p>
        </div>
      )}

      <div className="card">
        <h2>🗄️ Archivio definitivo</h2>

        <div className="dashboard">
          <div className="kpi green">
            <span>Documenti salvati</span>
            <strong>{statisticheArchivio.numeroDocumenti}</strong>
          </div>

          <div className="kpi gold">
            <span>Totale netto</span>
            <strong>{euro(statisticheArchivio.totaleNetto)}</strong>
          </div>

          <div className="kpi">
            <span>Note di credito</span>
            <strong>{statisticheArchivio.noteCredito}</strong>
          </div>

          <div className="kpi">
            <span>Fornitori in archivio</span>
            <strong>{statisticheArchivio.fornitori}</strong>
          </div>

          <div className="kpi">
            <span>Articoli catalogati</span>
            <strong>{statisticheArchivio.articoli}</strong>
          </div>
        </div>
      </div>

      {analisi && (
        <>
          <div className="card">
            <h2>✅ Archivio in lavorazione</h2>

            <p>
              File: <strong>{nomeArchivio}</strong>
            </p>

            <div className="dashboard">
              <div className="kpi green">
                <span>📄 Documenti</span>
                <strong>{analisi.fatture.length}</strong>
              </div>

              <div className="kpi">
                <span>🧾 Righe articolo</span>
                <strong>
                  {analisi.fatture.reduce(
                    (somma, fattura) => somma + fattura.righe.length,
                    0
                  )}
                </strong>
              </div>

              <div className="kpi gold">
                <span>💰 Totale netto anteprima</span>
                <strong>
                  {euro(
                    analisi.fatture.reduce(
                      (somma, fattura) =>
                        somma +
                        applicaSegno(
                          fattura.totale,
                          fattura.tipoDocumento
                        ),
                      0
                    )
                  )}
                </strong>
              </div>

              <div className="kpi">
                <span>💳 Scadenze XML</span>
                <strong>{euro(scadenze.totale)}</strong>
              </div>

              <div className="kpi">
                <span>⏰ Entro 7 giorni</span>
                <strong>{euro(scadenze.prossimi7)}</strong>
              </div>

              <div className="kpi">
                <span>🔴 Scaduto</span>
                <strong>{euro(scadenze.scadute)}</strong>
              </div>
            </div>
          </div>


          <div className="quick-grid">
            <div className="card">
              <h2>📊 Suddivisione gestionale</h2>

              {riepilogoCategorie.map((riga) => (
                <div
                  key={riga.categoria}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(212,170,35,0.25)',
                  }}
                >
                  <strong>{riga.categoria}</strong>
                  <span>{euro(riga.totale)}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h2>💳 Riepilogo finanziario</h2>

              <p>
                Totale scadenze: <strong>{euro(scadenze.totale)}</strong>
              </p>
              <p>
                Entro 7 giorni: <strong>{euro(scadenze.prossimi7)}</strong>
              </p>
              <p>
                Scaduto: <strong>{euro(scadenze.scadute)}</strong>
              </p>
            </div>
          </div>

          <div className="card">
            <h2>🏪 Fornitori e pagamenti</h2>

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fornitore</th>
                    <th>Documenti</th>
                    <th>Totale netto</th>
                    <th>Scadenze dichiarate</th>
                    <th>Prossima scadenza</th>
                  </tr>
                </thead>

                <tbody>
                  {finanzaFornitori.map((fornitore) => (
                    <tr key={fornitore.fornitore}>
                      <td>
                        <strong>{fornitore.fornitore}</strong>
                      </td>
                      <td>{fornitore.numeroFatture}</td>
                      <td>{euro(fornitore.totaleFatture)}</td>
                      <td>{euro(fornitore.totaleScadenze)}</td>
                      <td>{dataIt(fornitore.prossimaScadenza)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>📄 Fatture e classificazione</h2>

            {analisi.fatture.map((fattura) => {
              const aperta = fatturaAperta === fattura.id;
              const segno = segnoTipoDocumento(fattura.tipoDocumento);

              const daClassificare = fattura.righe.filter(
                (riga) =>
                  categorieRighe[
                    chiaveRiga(fattura, riga.numeroLinea)
                  ] === 'Da classificare'
              ).length;

              return (
                <div
                  key={fattura.id}
                  style={{
                    padding: '14px 0',
                    borderBottom: '1px solid rgba(212,170,35,0.25)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <strong>{fattura.fornitore}</strong>

                      <div className="muted">
                        Documento {dataIt(fattura.data)} ·{' '}
                        {fattura.numeroDocumento} ·{' '}
                        {fattura.tipoDocumento}
                        {segno === -1 ? ' · 🔻 Nota di credito' : ''}
                        {' · '}
                        {euro(
                          applicaSegno(
                            fattura.totale,
                            fattura.tipoDocumento
                          )
                        )}
                        {' · '}
                        {fattura.righe.length} righe
                        {daClassificare
                          ? ` · ⚠️ ${daClassificare} da classificare`
                          : ' · ✅ classificata'}
                      </div>

                    </div>

                    <button
                      className="btn gold"
                      onClick={() =>
                        setFatturaAperta(aperta ? null : fattura.id)
                      }
                    >
                      {aperta
                        ? 'Chiudi dettaglio'
                        : daClassificare > 0
                          ? 'Classifica'
                          : 'Visualizza'}
                    </button>
                  </div>

                  {aperta && (
                    <div style={{ overflowX: 'auto', marginTop: 15 }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Riga</th>
                            <th>Codice</th>
                            <th>Descrizione</th>
                            <th>Quantità</th>
                            <th>Prezzo unitario</th>
                            <th>Totale netto</th>
                            <th>IVA</th>
                            <th>Categoria</th>
                            <th>Affidabilità</th>
                          </tr>
                        </thead>

                        <tbody>
                          {fattura.righe.map((riga) => {
                            const categoria =
                              categorieRighe[
                                chiaveRiga(fattura, riga.numeroLinea)
                              ] || 'Da classificare';

                            return (
                              <tr key={riga.numeroLinea}>
                                <td>{riga.numeroLinea}</td>
                                <td>{riga.codiceValore || '—'}</td>
                                <td>{riga.descrizione}</td>
                                <td>
                                  {riga.quantita} {riga.unitaMisura}
                                </td>
                                <td>{euro(riga.prezzoUnitario)}</td>
                                <td>
                                  <strong>
                                    {euro(
                                      Math.abs(riga.prezzoTotale) * segno
                                    )}
                                  </strong>
                                </td>
                                <td>
                                  {riga.aliquotaIva
                                    ? `${riga.aliquotaIva}%`
                                    : riga.naturaIva || '—'}
                                </td>
                                <td>
                                  <select
                                    value={categoria}
                                    onChange={(event) =>
                                      aggiornaCategoria(
                                        fattura,
                                        riga.numeroLinea,
                                        event.target.value as Categoria
                                      )
                                    }
                                  >
                                    {categorie.map((voce) => (
                                      <option key={voce} value={voce}>
                                        {voce}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  {riga.affidabilita
                                    ? `${riga.affidabilita}%`
                                    : 'Da verificare'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {fattura.pagamenti.length > 0 && (
                        <div style={{ marginTop: 18 }}>
                          <h3>Scadenze della fattura</h3>

                          <table className="table">
                            <thead>
                              <tr>
                                <th>Modalità</th>
                                <th>Scadenza</th>
                                <th>Importo netto</th>
                                <th>IBAN</th>
                              </tr>
                            </thead>

                            <tbody>
                              {fattura.pagamenti.map(
                                (pagamento, indice) => (
                                  <tr key={`${fattura.id}-${indice}`}>
                                    <td>
                                      {pagamento.modalitaPagamento || '—'}
                                    </td>
                                    <td>
                                      {dataIt(pagamento.dataScadenza)}
                                    </td>
                                    <td>
                                      {euro(
                                        Math.abs(pagamento.importo) * segno
                                      )}
                                    </td>
                                    <td>{pagamento.iban || '—'}</td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
