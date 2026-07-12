export type StatoRicevimento =
  | 'vuoto'
  | 'documento-caricato'
  | 'lettura-in-corso'
  | 'da-verificare'
  | 'confermato'
  | 'errore';

export type TipoDocumentoRicevimento =
  | 'foto'
  | 'immagine'
  | 'pdf';

export type CategoriaMerce =
  | 'Da classificare'
  | 'Materie prime'
  | 'Bibite'
  | 'Imballaggi'
  | 'Detergenti'
  | 'Materiale di consumo'
  | 'Legna'
  | 'Altri prodotti';

export type RigaRicevimento = {
  id: string;

  codiceArticolo: string;
  descrizione: string;

  quantita: number;
  unitaMisura: string;

  prezzoUnitario: number;
  totaleRiga: number;

  aliquotaIva: number;

  categoria: CategoriaMerce;

  prodottoCollegatoId: string;
  aggiornaMagazzino: boolean;

  ultimoPrezzo: number;
  prezzoMedio: number;
  variazionePercentuale: number;

  affidabilitaAI: number;
  confermata: boolean;
};

export type DocumentoRicevimento = {
  id: string;

  tipoFile: TipoDocumentoRicevimento;
  nomeFile: string;
  mimeType: string;

  anteprimaUrl: string;

  fornitore: string;
  partitaIvaFornitore: string;

  numeroDocumento: string;
  dataDocumento: string;

  imponibile: number;
  iva: number;
  totaleDocumento: number;

  righe: RigaRicevimento[];

  stato: StatoRicevimento;

  creatoIl: string;
  confermatoIl: string;

  note: string;
};

export type MovimentoMagazzinoRicevimento = {
  id: string;

  ricevimentoId: string;
  rigaRicevimentoId: string;

  data: string;

  prodottoId: string;
  descrizione: string;

  quantita: number;
  unitaMisura: string;

  prezzoUnitario: number;
  valoreTotale: number;

  fornitore: string;
  numeroDocumento: string;

  tipoMovimento: 'carico';
};

export type RisultatoLetturaAI = {
  successo: boolean;
  messaggio: string;

  fornitore: string;
  partitaIvaFornitore: string;

  numeroDocumento: string;
  dataDocumento: string;

  imponibile: number;
  iva: number;
  totaleDocumento: number;

  righe: RigaRicevimento[];

  avvisi: string[];
};

export const categorieMerce: CategoriaMerce[] = [
  'Da classificare',
  'Materie prime',
  'Bibite',
  'Imballaggi',
  'Detergenti',
  'Materiale di consumo',
  'Legna',
  'Altri prodotti',
];