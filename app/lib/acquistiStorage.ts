export type CategoriaGestionale =
  | 'Da classificare'
  | 'Materie prime'
  | 'Materiale di consumo'
  | 'Bibite'
  | 'Imballaggi'
  | 'Detergenti'
  | 'Legna'
  | 'Utenze'
  | 'Affitti'
  | 'Consulenze'
  | 'Manutenzioni e riparazioni'
  | 'Costi straordinari'
  | 'Altri costi';

export type StatoPagamento =
  | 'Da pagare'
  | 'Parziale'
  | 'Pagata';

export type RigaAcquistoSalvata = {
  id: string;
  numeroLinea: number;
  codiceArticolo: string;
  descrizione: string;
  quantita: number;
  unitaMisura: string;
  prezzoUnitario: number;
  imponibile: number;
  aliquotaIva: number;
  categoria: CategoriaGestionale;
  affidabilita: number;
};

export type ScadenzaAcquistoSalvata = {
  id: string;
  dataScadenza: string;
  importo: number;
  modalitaPagamento: string;
  iban: string;
  stato: StatoPagamento;
};

export type DocumentoAcquistoSalvato = {
  id: string;
  chiaveDuplicato: string;

  tipoDocumento: string;
  segno: 1 | -1;

  fornitore: string;
  partitaIva: string;
  numeroDocumento: string;

  dataDocumento: string;
  dataRicezione: string;
  dataImportazione: string;

  imponibile: number;
  iva: number;
  totale: number;

  origine: 'XML' | 'ZIP/XML' | 'Manuale' | 'Bolla IA';

  righe: RigaAcquistoSalvata[];
  scadenze: ScadenzaAcquistoSalvata[];
};

export type BozzaImportazione = {
  id: string;
  nomeArchivio: string;
  salvataIl: string;
  dataRicezioneDal: string;
  dataRicezioneAl: string;
  documenti: DocumentoAcquistoSalvato[];
};

const DOCUMENTI_KEY = 'slm_v6_documenti_acquisto';
const BOZZA_KEY = 'slm_v6_bozza_importazione';
const REGOLE_KEY = 'slm_v6_regole_classificazione';

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

export function segnoTipoDocumento(
  tipoDocumento: string
): 1 | -1 {
  const tipo = tipoDocumento.trim().toUpperCase();

  // TD04 = nota di credito.
  // TD08 = nota di credito semplificata.
  if (tipo === 'TD04' || tipo === 'TD08') {
    return -1;
  }

  return 1;
}

export function applicaSegno(
  valore: number,
  tipoDocumento: string
): number {
  return Math.abs(valore) * segnoTipoDocumento(tipoDocumento);
}

export function creaChiaveDuplicato({
  partitaIva,
  numeroDocumento,
  dataDocumento,
  tipoDocumento,
}: {
  partitaIva: string;
  numeroDocumento: string;
  dataDocumento: string;
  tipoDocumento: string;
}): string {
  return [
    partitaIva,
    numeroDocumento,
    dataDocumento,
    tipoDocumento,
  ]
    .join('|')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function caricaDocumentiAcquisto():
  DocumentoAcquistoSalvato[] {
  return leggiJson<DocumentoAcquistoSalvato[]>(
    DOCUMENTI_KEY,
    []
  );
}

export function salvaDocumentiAcquisto(
  documenti: DocumentoAcquistoSalvato[]
): void {
  salvaJson(DOCUMENTI_KEY, documenti);
}

export function importaDocumentiSenzaDuplicati(
  nuoviDocumenti: DocumentoAcquistoSalvato[]
): {
  documentiFinali: DocumentoAcquistoSalvato[];
  importati: number;
  duplicati: number;
} {
  const esistenti = caricaDocumentiAcquisto();

  const chiaviEsistenti = new Set(
    esistenti.map((documento) => documento.chiaveDuplicato)
  );

  const daImportare: DocumentoAcquistoSalvato[] = [];
  let duplicati = 0;

  nuoviDocumenti.forEach((documento) => {
    if (chiaviEsistenti.has(documento.chiaveDuplicato)) {
      duplicati += 1;
      return;
    }

    chiaviEsistenti.add(documento.chiaveDuplicato);
    daImportare.push(documento);
  });

  const documentiFinali = [...daImportare, ...esistenti];

  salvaDocumentiAcquisto(documentiFinali);

  return {
    documentiFinali,
    importati: daImportare.length,
    duplicati,
  };
}

export function salvaBozzaImportazione(
  bozza: BozzaImportazione
): void {
  salvaJson(BOZZA_KEY, bozza);
}

export function caricaBozzaImportazione():
  BozzaImportazione | null {
  return leggiJson<BozzaImportazione | null>(
    BOZZA_KEY,
    null
  );
}

export function eliminaBozzaImportazione(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(BOZZA_KEY);
}

export type RegoleClassificazione = Record<
  string,
  CategoriaGestionale
>;

export function creaChiaveClassificazione({
  partitaIva,
  codiceArticolo,
  descrizione,
}: {
  partitaIva: string;
  codiceArticolo: string;
  descrizione: string;
}): string {
  const descrizioneNormalizzata = descrizione
    .toLowerCase()
    .replace(/[^a-z0-9àèéìòù]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return [
    partitaIva.toLowerCase().trim(),
    codiceArticolo.toLowerCase().trim(),
    descrizioneNormalizzata,
  ].join('|');
}

export function caricaRegoleClassificazione():
  RegoleClassificazione {
  return leggiJson<RegoleClassificazione>(
    REGOLE_KEY,
    {}
  );
}

export function salvaRegoleClassificazione(
  regole: RegoleClassificazione
): void {
  salvaJson(REGOLE_KEY, regole);
}

export function memorizzaClassificazione({
  partitaIva,
  codiceArticolo,
  descrizione,
  categoria,
}: {
  partitaIva: string;
  codiceArticolo: string;
  descrizione: string;
  categoria: CategoriaGestionale;
}): void {
  const regole = caricaRegoleClassificazione();

  const chiave = creaChiaveClassificazione({
    partitaIva,
    codiceArticolo,
    descrizione,
  });

  regole[chiave] = categoria;

  salvaRegoleClassificazione(regole);
}

export function trovaClassificazioneMemorizzata({
  partitaIva,
  codiceArticolo,
  descrizione,
}: {
  partitaIva: string;
  codiceArticolo: string;
  descrizione: string;
}): CategoriaGestionale | null {
  const regole = caricaRegoleClassificazione();

  const chiave = creaChiaveClassificazione({
    partitaIva,
    codiceArticolo,
    descrizione,
  });

  return regole[chiave] || null;
}

export function totaleGestionale(
  documenti: DocumentoAcquistoSalvato[]
): number {
  return documenti.reduce(
    (somma, documento) => somma + documento.totale,
    0
  );
}

export function totalePerCategoria(
  documenti: DocumentoAcquistoSalvato[],
  categoria: CategoriaGestionale
): number {
  return documenti.reduce((totale, documento) => {
    const totaleRighe = documento.righe
      .filter((riga) => riga.categoria === categoria)
      .reduce(
        (somma, riga) =>
          somma + riga.imponibile * documento.segno,
        0
      );

    return totale + totaleRighe;
  }, 0);
}

export function filtraPerCompetenzaGestionale({
  documenti,
  anno,
  mese,
}: {
  documenti: DocumentoAcquistoSalvato[];
  anno: number;
  mese: number;
}): DocumentoAcquistoSalvato[] {
  const meseTesto = String(mese).padStart(2, '0');
  const prefisso = `${anno}-${meseTesto}`;

  // Il controllo di gestione usa sempre la data documento.
  return documenti.filter((documento) =>
    documento.dataDocumento.startsWith(prefisso)
  );
}

export function filtraPerRicezioneContabile({
  documenti,
  anno,
  mese,
}: {
  documenti: DocumentoAcquistoSalvato[];
  anno: number;
  mese: number;
}): DocumentoAcquistoSalvato[] {
  const meseTesto = String(mese).padStart(2, '0');
  const prefisso = `${anno}-${meseTesto}`;

  // Il controllo documentale usa la data di ricezione.
  return documenti.filter((documento) =>
    documento.dataRicezione.startsWith(prefisso)
  );
}