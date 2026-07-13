import type {
  CategoriaMerce,
  DocumentoRicevimento,
  MovimentoMagazzinoRicevimento,
  RigaRicevimento,
} from '../components/ricevimento/types';

export type StatoAbbinamentoFattura =
  | 'in-attesa'
  | 'abbinata'
  | 'con-differenze'
  | 'chiusa';

export type RigaBollaSalvata = {
  id: string;

  codiceArticolo: string;
  descrizione: string;

  quantita: number;
  unitaMisura: string;

  prezzoUnitario: number;
  totaleRiga: number;
  aliquotaIva: number;

  categoria: CategoriaMerce;

  aggiornaMagazzino: boolean;

  prodottoCollegatoId: string;

  ultimoPrezzo: number;
  prezzoMedio: number;
  variazionePercentuale: number;

  affidabilitaAI: number;
};

export type BollaRicevimentoSalvata = {
  id: string;
  chiaveDuplicato: string;

  fornitore: string;
  partitaIvaFornitore: string;

  numeroDocumento: string;
  dataDocumento: string;

  nomeFile: string;
  mimeType: string;
  tipoFile: string;

  imponibile: number;
  iva: number;
  totaleDocumento: number;

  righe: RigaBollaSalvata[];

  statoAbbinamento: StatoAbbinamentoFattura;
  fatturaCollegataId: string;

  confermataIl: string;
  creataIl: string;

  note: string;
};

export type EsitoSalvataggioRicevimento = {
  bolla: BollaRicevimentoSalvata;
  movimentiCreati: MovimentoMagazzinoRicevimento[];
  duplicato: boolean;
};

const BOLLE_KEY = 'slm_v7_bolle_ricevimento';
const MOVIMENTI_KEY = 'slm_v7_movimenti_magazzino';

function leggiJson<T>(chiave: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const valore = localStorage.getItem(chiave);

    if (!valore) return fallback;

    return JSON.parse(valore) as T;
  } catch {
    return fallback;
  }
}

function salvaJson<T>(chiave: string, valore: T): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(chiave, JSON.stringify(valore));
}

function generaId(prefisso: string): string {
  return `${prefisso}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function normalizzaTesto(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9àèéìòù]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function calcolaValoreRighe(
  righe: Array<{
    quantita: number;
    prezzoUnitario: number;
    totaleRiga: number;
    aggiornaMagazzino: boolean;
  }>
): number {
  return righe
    .filter((riga) => riga.aggiornaMagazzino)
    .reduce((somma, riga) => {
      const totaleRiga = Number(riga.totaleRiga || 0);

      if (totaleRiga > 0) {
        return somma + totaleRiga;
      }

      return (
        somma +
        Number(riga.quantita || 0) *
          Number(riga.prezzoUnitario || 0)
      );
    }, 0);
}

export function creaChiaveDuplicatoBolla({
  fornitore,
  numeroDocumento,
  dataDocumento,
  totaleDocumento,
}: {
  fornitore: string;
  numeroDocumento: string;
  dataDocumento: string;
  totaleDocumento: number;
}): string {
  return [
    normalizzaTesto(fornitore),
    normalizzaTesto(numeroDocumento || 'senza-numero'),
    dataDocumento,
    Number(totaleDocumento || 0).toFixed(2),
  ].join('|');
}

export function caricaBolleRicevimento():
  BollaRicevimentoSalvata[] {
  return leggiJson<BollaRicevimentoSalvata[]>(
    BOLLE_KEY,
    []
  );
}

export function salvaBolleRicevimento(
  bolle: BollaRicevimentoSalvata[]
): void {
  salvaJson(BOLLE_KEY, bolle);
}

export function caricaMovimentiMagazzino():
  MovimentoMagazzinoRicevimento[] {
  return leggiJson<MovimentoMagazzinoRicevimento[]>(
    MOVIMENTI_KEY,
    []
  );
}

export function salvaMovimentiMagazzino(
  movimenti: MovimentoMagazzinoRicevimento[]
): void {
  salvaJson(MOVIMENTI_KEY, movimenti);
}

function trasformaRiga(
  riga: RigaRicevimento
): RigaBollaSalvata {
  return {
    id: riga.id,

    codiceArticolo: riga.codiceArticolo,
    descrizione: riga.descrizione,

    quantita: Number(riga.quantita || 0),
    unitaMisura: riga.unitaMisura,

    prezzoUnitario: Number(riga.prezzoUnitario || 0),

    totaleRiga:
      Number(riga.totaleRiga || 0) ||
      Number(riga.quantita || 0) *
        Number(riga.prezzoUnitario || 0),

    aliquotaIva: Number(riga.aliquotaIva || 0),

    categoria: riga.categoria,

    aggiornaMagazzino: riga.aggiornaMagazzino,

    prodottoCollegatoId: riga.prodottoCollegatoId,

    ultimoPrezzo: Number(riga.ultimoPrezzo || 0),
    prezzoMedio: Number(riga.prezzoMedio || 0),

    variazionePercentuale: Number(
      riga.variazionePercentuale || 0
    ),

    affidabilitaAI: Number(riga.affidabilitaAI || 0),
  };
}

function creaMovimentiDaDocumento(
  documento: DocumentoRicevimento
): MovimentoMagazzinoRicevimento[] {
  return documento.righe
    .filter(
      (riga) =>
        riga.aggiornaMagazzino &&
        riga.quantita > 0 &&
        riga.descrizione.trim().length > 0
    )
    .map((riga) => {
      const valoreTotale =
        Number(riga.totaleRiga || 0) ||
        Number(riga.quantita || 0) *
          Number(riga.prezzoUnitario || 0);

      return {
        id: generaId('movimento'),

        ricevimentoId: documento.id,
        rigaRicevimentoId: riga.id,

        data: documento.dataDocumento,

        prodottoId:
          riga.prodottoCollegatoId ||
          normalizzaTesto(riga.descrizione),

        descrizione: riga.descrizione,

        quantita: Number(riga.quantita || 0),
        unitaMisura: riga.unitaMisura,

        prezzoUnitario: Number(
          riga.prezzoUnitario || 0
        ),

        valoreTotale,

        fornitore: documento.fornitore,
        numeroDocumento: documento.numeroDocumento,

        tipoMovimento: 'carico',
      };
    });
}

export function salvaRicevimentoCompleto(
  documento: DocumentoRicevimento
): EsitoSalvataggioRicevimento {
  const bolleEsistenti = caricaBolleRicevimento();

  const chiaveDuplicato = creaChiaveDuplicatoBolla({
    fornitore: documento.fornitore,
    numeroDocumento: documento.numeroDocumento,
    dataDocumento: documento.dataDocumento,
    totaleDocumento: documento.totaleDocumento,
  });

  const bollaEsistente = bolleEsistenti.find(
    (bolla) => bolla.chiaveDuplicato === chiaveDuplicato
  );

  if (bollaEsistente) {
    return {
      bolla: bollaEsistente,
      movimentiCreati: [],
      duplicato: true,
    };
  }

  const bolla: BollaRicevimentoSalvata = {
    id: documento.id || generaId('bolla'),
    chiaveDuplicato,

    fornitore: documento.fornitore,
    partitaIvaFornitore:
      documento.partitaIvaFornitore,

    numeroDocumento: documento.numeroDocumento,
    dataDocumento: documento.dataDocumento,

    nomeFile: documento.nomeFile,
    mimeType: documento.mimeType,
    tipoFile: documento.tipoFile,

    imponibile: Number(documento.imponibile || 0),
    iva: Number(documento.iva || 0),

    totaleDocumento: Number(
      documento.totaleDocumento || 0
    ),

    righe: documento.righe.map(trasformaRiga),

    statoAbbinamento: 'in-attesa',
    fatturaCollegataId: '',

    confermataIl:
      documento.confermatoIl ||
      new Date().toLocaleString('it-IT'),

    creataIl:
      documento.creatoIl ||
      new Date().toLocaleString('it-IT'),

    note: documento.note,
  };

  const movimentiCreati =
    creaMovimentiDaDocumento(documento);

  const movimentiEsistenti =
    caricaMovimentiMagazzino();

  salvaBolleRicevimento([
    bolla,
    ...bolleEsistenti,
  ]);

  salvaMovimentiMagazzino([
    ...movimentiCreati,
    ...movimentiEsistenti,
  ]);

  return {
    bolla,
    movimentiCreati,
    duplicato: false,
  };
}

export function trovaBollaPerId(
  id: string
): BollaRicevimentoSalvata | null {
  return (
    caricaBolleRicevimento().find(
      (bolla) => bolla.id === id
    ) || null
  );
}

export function aggiornaStatoBolla({
  bollaId,
  stato,
  fatturaCollegataId = '',
}: {
  bollaId: string;
  stato: StatoAbbinamentoFattura;
  fatturaCollegataId?: string;
}): void {
  const bolle = caricaBolleRicevimento();

  const aggiornate = bolle.map((bolla) =>
    bolla.id === bollaId
      ? {
          ...bolla,
          statoAbbinamento: stato,
          fatturaCollegataId,
        }
      : bolla
  );

  salvaBolleRicevimento(aggiornate);
}

export function eliminaRicevimento(
  bollaId: string
): void {
  const bolle = caricaBolleRicevimento();

  salvaBolleRicevimento(
    bolle.filter((bolla) => bolla.id !== bollaId)
  );

  const movimenti = caricaMovimentiMagazzino();

  salvaMovimentiMagazzino(
    movimenti.filter(
      (movimento) =>
        movimento.ricevimentoId !== bollaId
    )
  );
}

export function totaleCarichiMagazzino(): number {
  return caricaBolleRicevimento().reduce(
    (somma, bolla) => {
      const valoreRighe = calcolaValoreRighe(
        bolla.righe
      );

      const valoreRicevimento =
        valoreRighe > 0
          ? valoreRighe
          : Number(
              bolla.totaleDocumento || 0
            );

      return somma + valoreRicevimento;
    },
    0
  );
}
