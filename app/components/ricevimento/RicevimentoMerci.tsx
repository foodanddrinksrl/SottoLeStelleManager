'use client';

import { useEffect, useState } from 'react';

import { CaricaDocumento } from './CaricaDocumento';
import { AnteprimaDocumento } from './AnteprimaDocumento';
import { LetturaAI } from './LetturaAI';
import { ConfermaCarico } from './ConfermaCarico';

import {
  salvaRicevimentoCompleto,
} from '../../lib/ricevimentoStorage';

import type {
  CategoriaMerce,
  DocumentoRicevimento,
  RigaRicevimento,
  RisultatoLetturaAI,
  StatoRicevimento,
  TipoDocumentoRicevimento,
} from './types';

type DocumentoCaricato = {
  file: File;
  nomeFile: string;
  mimeType: string;
  tipoFile: TipoDocumentoRicevimento;
  anteprimaUrl: string;
};

function generaId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function oggiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function creaRigaVuota(): RigaRicevimento {
  return {
    id: generaId(),

    codiceArticolo: '',
    descrizione: '',

    quantita: 1,
    unitaMisura: 'pz',

    prezzoUnitario: 0,
    totaleRiga: 0,

    aliquotaIva: 0,

    categoria: 'Da classificare',

    prodottoCollegatoId: '',
    aggiornaMagazzino: true,

    ultimoPrezzo: 0,
    prezzoMedio: 0,
    variazionePercentuale: 0,

    affidabilitaAI: 0,
    confermata: false,
  };
}

function creaDocumentoVuoto(): DocumentoRicevimento {
  return {
    id: generaId(),

    tipoFile: 'immagine',
    nomeFile: '',
    mimeType: '',
    anteprimaUrl: '',

    fornitore: '',
    partitaIvaFornitore: '',

    numeroDocumento: '',
    dataDocumento: oggiIso(),

    imponibile: 0,
    iva: 0,
    totaleDocumento: 0,

    righe: [],

    stato: 'vuoto',

    creatoIl: new Date().toLocaleString('it-IT'),
    confermatoIl: '',

    note: '',
  };
}

/*
  Questa funzione prepara il flusso AI.

  Per ora crea una bozza modificabile.
  Nel prossimo step verrà sostituita dalla vera chiamata
  al servizio AI che analizzerà foto e PDF.
*/
async function eseguiLetturaAIProvvisoria(
  documento: DocumentoRicevimento
): Promise<RisultatoLetturaAI> {
  await new Promise((resolve) =>
    setTimeout(resolve, 800)
  );

  return {
    successo: true,

    messaggio:
      'Documento pronto per la verifica manuale.',

    fornitore: documento.fornitore,
    partitaIvaFornitore:
      documento.partitaIvaFornitore,

    numeroDocumento: documento.numeroDocumento,
    dataDocumento:
      documento.dataDocumento || oggiIso(),

    imponibile: documento.imponibile,
    iva: documento.iva,
    totaleDocumento: documento.totaleDocumento,

    righe:
      documento.righe.length > 0
        ? documento.righe
        : [creaRigaVuota()],

    avvisi: [
      'La lettura AI reale non è ancora collegata.',
      'Controlla e completa fornitore, articoli, quantità e categorie.',
    ],
  };
}

export function RicevimentoMerci({
  onBack,
}: {
  onBack?: () => void;
}) {
  const [documento, setDocumento] =
    useState<DocumentoRicevimento>(
      creaDocumentoVuoto()
    );

  const [stato, setStato] =
    useState<StatoRicevimento>('vuoto');

  const [avvisi, setAvvisi] = useState<string[]>([]);
  const [letturaInCorso, setLetturaInCorso] =
    useState(false);

  const [salvataggioInCorso, setSalvataggioInCorso] =
    useState(false);

  const [messaggioFinale, setMessaggioFinale] =
    useState('');

  useEffect(() => {
    return () => {
      if (documento.anteprimaUrl) {
        URL.revokeObjectURL(documento.anteprimaUrl);
      }
    };
  }, [documento.anteprimaUrl]);

  function riceviDocumentoCaricato(
    fileCaricato: DocumentoCaricato
  ) {
    if (documento.anteprimaUrl) {
      URL.revokeObjectURL(documento.anteprimaUrl);
    }

    setDocumento({
      ...creaDocumentoVuoto(),

      tipoFile: fileCaricato.tipoFile,
      nomeFile: fileCaricato.nomeFile,
      mimeType: fileCaricato.mimeType,
      anteprimaUrl: fileCaricato.anteprimaUrl,

      stato: 'documento-caricato',
    });

    setStato('documento-caricato');
    setAvvisi([]);
    setMessaggioFinale('');
  }

  function eliminaDocumento() {
    if (documento.anteprimaUrl) {
      URL.revokeObjectURL(documento.anteprimaUrl);
    }

    setDocumento(creaDocumentoVuoto());
    setStato('vuoto');
    setAvvisi([]);
    setMessaggioFinale('');
  }

  function sostituisciDocumento() {
    eliminaDocumento();
  }

  async function avviaLetturaAI() {
    setLetturaInCorso(true);
    setStato('lettura-in-corso');
    setMessaggioFinale('');

    try {
      const risultato =
        await eseguiLetturaAIProvvisoria(documento);

      if (!risultato.successo) {
        throw new Error(risultato.messaggio);
      }

      setDocumento((precedente) => ({
        ...precedente,

        fornitore: risultato.fornitore,
        partitaIvaFornitore:
          risultato.partitaIvaFornitore,

        numeroDocumento:
          risultato.numeroDocumento,

        dataDocumento:
          risultato.dataDocumento,

        imponibile: risultato.imponibile,
        iva: risultato.iva,
        totaleDocumento:
          risultato.totaleDocumento,

        righe: risultato.righe,

        stato: 'da-verificare',
      }));

      setAvvisi(risultato.avvisi);
      setStato('da-verificare');
    } catch (error) {
      setAvvisi([
        error instanceof Error
          ? error.message
          : 'Errore durante la lettura del documento.',
      ]);

      setStato('errore');
    } finally {
      setLetturaInCorso(false);
    }
  }

  function aggiornaRiga(
    id: string,
    campo: keyof RigaRicevimento,
    valore: string | number | boolean
  ) {
    setDocumento((precedente) => ({
      ...precedente,

      righe: precedente.righe.map((riga) => {
        if (riga.id !== id) return riga;

        const aggiornata = {
          ...riga,
          [campo]: valore,
        } as RigaRicevimento;

        if (
          campo === 'quantita' ||
          campo === 'prezzoUnitario'
        ) {
          aggiornata.totaleRiga =
            Number(aggiornata.quantita || 0) *
            Number(aggiornata.prezzoUnitario || 0);
        }

        if (campo === 'totaleRiga') {
          const quantita =
            Number(aggiornata.quantita || 0);

          if (quantita > 0) {
            aggiornata.prezzoUnitario =
              Number(aggiornata.totaleRiga || 0) /
              quantita;
          }
        }

        aggiornata.confermata =
          aggiornata.descrizione.trim().length > 0 &&
          aggiornata.quantita > 0 &&
          aggiornata.categoria !==
            'Da classificare';

        return aggiornata;
      }),
    }));
  }

  function aggiungiRiga() {
    setDocumento((precedente) => ({
      ...precedente,
      righe: [
        ...precedente.righe,
        creaRigaVuota(),
      ],
    }));
  }

  function eliminaRiga(id: string) {
    setDocumento((precedente) => ({
      ...precedente,
      righe: precedente.righe.filter(
        (riga) => riga.id !== id
      ),
    }));
  }

  function aggiornaTotaliDocumento() {
    setDocumento((precedente) => {
      const imponibile = precedente.righe.reduce(
        (somma, riga) =>
          somma + Number(riga.totaleRiga || 0),
        0
      );

      const iva = precedente.righe.reduce(
        (somma, riga) =>
          somma +
          Number(riga.totaleRiga || 0) *
            (Number(riga.aliquotaIva || 0) / 100),
        0
      );

      return {
        ...precedente,
        imponibile,
        iva,
        totaleDocumento: imponibile + iva,
      };
    });
  }

  function continuaAlCarico() {
    aggiornaTotaliDocumento();
    setStato('confermato');
  }

  function tornaAllaVerifica() {
    setStato('da-verificare');
  }

  async function confermaRicevimento() {
    setSalvataggioInCorso(true);
    setMessaggioFinale('');

    try {
      const documentoConfermato: DocumentoRicevimento = {
        ...documento,

        stato: 'confermato',
        confermatoIl:
          new Date().toLocaleString('it-IT'),

        righe: documento.righe.map((riga) => ({
          ...riga,
          confermata: true,
        })),
      };

      const esito = salvaRicevimentoCompleto(
        documentoConfermato
      );

      if (esito.duplicato) {
        throw new Error(
          'Questa bolla risulta già registrata. Nessun nuovo movimento di magazzino è stato creato.'
        );
      }

      setDocumento(documentoConfermato);

      const numeroMovimenti =
        esito.movimentiCreati.length;

      setMessaggioFinale(
        `Ricevimento merci registrato correttamente. Creati ${numeroMovimenti} movimenti di carico. La bolla è ora in attesa della fattura XML.`
      );
    } catch (error) {
      setMessaggioFinale(
        error instanceof Error
          ? error.message
          : 'Errore durante il salvataggio.'
      );
    } finally {
      setSalvataggioInCorso(false);
    }
  }

  function nuovoRicevimento() {
    eliminaDocumento();
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
              ← Controllo di Gestione
            </button>
          )}

          {messaggioFinale && (
            <button
              className="btn green"
              onClick={nuovoRicevimento}
            >
              ➕ Nuovo ricevimento
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2>📦 Ricevimento Merci AI</h2>

        <p className="muted">
          Fotografa la bolla, controlla i dati e conferma
          il carico.
        </p>
      </div>

      {messaggioFinale && (
        <div className="card">
          <h2>
            {messaggioFinale.includes('correttamente')
              ? '✅ Operazione completata'
              : '🔴 Attenzione'}
          </h2>

          <p>{messaggioFinale}</p>
        </div>
      )}

      {stato === 'vuoto' && (
        <CaricaDocumento
          onDocumentoCaricato={
            riceviDocumentoCaricato
          }
        />
      )}

      {(stato === 'documento-caricato' ||
        stato === 'lettura-in-corso' ||
        stato === 'errore') && (
        <AnteprimaDocumento
          nomeFile={documento.nomeFile}
          mimeType={documento.mimeType}
          anteprimaUrl={documento.anteprimaUrl}
          onSostituisci={sostituisciDocumento}
          onElimina={eliminaDocumento}
          onAvviaLettura={avviaLetturaAI}
          letturaInCorso={letturaInCorso}
        />
      )}

      {stato === 'errore' && avvisi.length > 0 && (
        <div className="card">
          <h2>🔴 Errore lettura</h2>

          {avvisi.map((avviso, indice) => (
            <p key={`${avviso}-${indice}`}>
              {avviso}
            </p>
          ))}
        </div>
      )}

      {stato === 'da-verificare' && (
        <LetturaAI
          fornitore={documento.fornitore}
          partitaIvaFornitore={
            documento.partitaIvaFornitore
          }
          numeroDocumento={
            documento.numeroDocumento
          }
          dataDocumento={documento.dataDocumento}
          imponibile={documento.imponibile}
          iva={documento.iva}
          totaleDocumento={
            documento.totaleDocumento
          }
          righe={documento.righe}
          avvisi={avvisi}
          onFornitoreChange={(value) =>
            setDocumento((precedente) => ({
              ...precedente,
              fornitore: value,
            }))
          }
          onPartitaIvaChange={(value) =>
            setDocumento((precedente) => ({
              ...precedente,
              partitaIvaFornitore: value,
            }))
          }
          onNumeroDocumentoChange={(value) =>
            setDocumento((precedente) => ({
              ...precedente,
              numeroDocumento: value,
            }))
          }
          onDataDocumentoChange={(value) =>
            setDocumento((precedente) => ({
              ...precedente,
              dataDocumento: value,
            }))
          }
          onRigaChange={aggiornaRiga}
          onAggiungiRiga={aggiungiRiga}
          onEliminaRiga={eliminaRiga}
          onAnnulla={() =>
            setStato('documento-caricato')
          }
          onContinua={continuaAlCarico}
        />
      )}

      {stato === 'confermato' &&
        !messaggioFinale && (
          <ConfermaCarico
            documento={documento}
            onIndietro={tornaAllaVerifica}
            onConferma={confermaRicevimento}
            salvataggioInCorso={
              salvataggioInCorso
            }
          />
        )}
    </section>
  );
}