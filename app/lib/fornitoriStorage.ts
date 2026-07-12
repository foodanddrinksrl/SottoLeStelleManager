import type {
  DocumentoAcquistoSalvato,
  RigaAcquistoSalvata,
} from './acquistiStorage';

export type ArticoloFornitore = {
  id: string;
  codiceArticolo: string;
  descrizione: string;
  categoria: string;

  ultimaQuantita: number;
  unitaMisura: string;

  ultimoPrezzo: number;
  prezzoMedio: number;
  prezzoMinimo: number;
  prezzoMassimo: number;

  numeroAcquisti: number;
  ultimoAcquisto: string;
};

export type FornitoreSalvato = {
  id: string;

  ragioneSociale: string;
  partitaIva: string;

  iban: string[];
  categorie: string[];

  numeroDocumenti: number;
  totaleAcquistato: number;
  totaleNoteCredito: number;
  saldoNetto: number;

  primoAcquisto: string;
  ultimoAcquisto: string;

  articoli: ArticoloFornitore[];

  telefono: string;
  email: string;
  indirizzo: string;

  attivo: boolean;
  aggiornatoIl: string;
};

const FORNITORI_KEY = 'slm_v6_archivio_fornitori';

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

function normalizzaTesto(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9àèéìòù]+/gi, ' ')
    .replace(/\s+/g, ' ');
}

function creaIdFornitore(
  partitaIva: string,
  ragioneSociale: string
): string {
  const base = partitaIva || normalizzaTesto(ragioneSociale);

  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function creaIdArticolo(
  fornitoreId: string,
  riga: RigaAcquistoSalvata
): string {
  const riferimento =
    riga.codiceArticolo ||
    normalizzaTesto(riga.descrizione);

  return `${fornitoreId}-${riferimento}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function dataMinima(
  dataAttuale: string,
  nuovaData: string
): string {
  if (!dataAttuale) return nuovaData;
  if (!nuovaData) return dataAttuale;

  return nuovaData < dataAttuale
    ? nuovaData
    : dataAttuale;
}

function dataMassima(
  dataAttuale: string,
  nuovaData: string
): string {
  if (!dataAttuale) return nuovaData;
  if (!nuovaData) return dataAttuale;

  return nuovaData > dataAttuale
    ? nuovaData
    : dataAttuale;
}

function aggiornaArticolo({
  articoloEsistente,
  riga,
  fornitoreId,
  dataDocumento,
  segno,
}: {
  articoloEsistente?: ArticoloFornitore;
  riga: RigaAcquistoSalvata;
  fornitoreId: string;
  dataDocumento: string;
  segno: 1 | -1;
}): ArticoloFornitore {
  const prezzo = Math.abs(riga.prezzoUnitario);
  const acquistoValidoPerMedia = segno === 1 && prezzo > 0;

  if (!articoloEsistente) {
    return {
      id: creaIdArticolo(fornitoreId, riga),
      codiceArticolo: riga.codiceArticolo,
      descrizione: riga.descrizione,
      categoria: riga.categoria,

      ultimaQuantita: riga.quantita,
      unitaMisura: riga.unitaMisura,

      ultimoPrezzo: prezzo,
      prezzoMedio: acquistoValidoPerMedia ? prezzo : 0,
      prezzoMinimo: acquistoValidoPerMedia ? prezzo : 0,
      prezzoMassimo: acquistoValidoPerMedia ? prezzo : 0,

      numeroAcquisti: acquistoValidoPerMedia ? 1 : 0,
      ultimoAcquisto: dataDocumento,
    };
  }

  let numeroAcquisti = articoloEsistente.numeroAcquisti;
  let prezzoMedio = articoloEsistente.prezzoMedio;
  let prezzoMinimo = articoloEsistente.prezzoMinimo;
  let prezzoMassimo = articoloEsistente.prezzoMassimo;

  if (acquistoValidoPerMedia) {
    const totaleStorico =
      articoloEsistente.prezzoMedio *
      articoloEsistente.numeroAcquisti;

    numeroAcquisti += 1;

    prezzoMedio =
      (totaleStorico + prezzo) /
      numeroAcquisti;

    prezzoMinimo =
      articoloEsistente.prezzoMinimo > 0
        ? Math.min(articoloEsistente.prezzoMinimo, prezzo)
        : prezzo;

    prezzoMassimo = Math.max(
      articoloEsistente.prezzoMassimo,
      prezzo
    );
  }

  return {
    ...articoloEsistente,

    codiceArticolo:
      riga.codiceArticolo ||
      articoloEsistente.codiceArticolo,

    descrizione:
      riga.descrizione ||
      articoloEsistente.descrizione,

    categoria: riga.categoria,

    ultimaQuantita: riga.quantita,
    unitaMisura:
      riga.unitaMisura ||
      articoloEsistente.unitaMisura,

    ultimoPrezzo:
      prezzo > 0
        ? prezzo
        : articoloEsistente.ultimoPrezzo,

    prezzoMedio,
    prezzoMinimo,
    prezzoMassimo,
    numeroAcquisti,

    ultimoAcquisto: dataMassima(
      articoloEsistente.ultimoAcquisto,
      dataDocumento
    ),
  };
}

export function caricaArchivioFornitori():
  FornitoreSalvato[] {
  return leggiJson<FornitoreSalvato[]>(
    FORNITORI_KEY,
    []
  );
}

export function salvaArchivioFornitori(
  fornitori: FornitoreSalvato[]
): void {
  salvaJson(FORNITORI_KEY, fornitori);
}

export function trovaFornitore(
  partitaIva: string
): FornitoreSalvato | null {
  const fornitori = caricaArchivioFornitori();

  return (
    fornitori.find(
      (fornitore) =>
        fornitore.partitaIva === partitaIva
    ) || null
  );
}

export function aggiornaArchivioFornitori(
  documenti: DocumentoAcquistoSalvato[]
): FornitoreSalvato[] {
  const archivioEsistente =
    caricaArchivioFornitori();

  const mappa = new Map<string, FornitoreSalvato>();

  archivioEsistente.forEach((fornitore) => {
    mappa.set(fornitore.id, fornitore);
  });

  documenti.forEach((documento) => {
    const fornitoreId = creaIdFornitore(
      documento.partitaIva,
      documento.fornitore
    );

    const esistente = mappa.get(fornitoreId);

    const ibanDocumento = documento.scadenze
      .map((scadenza) => scadenza.iban)
      .filter(Boolean);

    const iban = Array.from(
      new Set([
        ...(esistente?.iban || []),
        ...ibanDocumento,
      ])
    );

    const categorieDocumento = documento.righe
      .map((riga) => riga.categoria)
      .filter(
        (categoria) =>
          categoria &&
          categoria !== 'Da classificare'
      );

    const categorie = Array.from(
      new Set([
        ...(esistente?.categorie || []),
        ...categorieDocumento,
      ])
    );

    const articoliMappa = new Map<
      string,
      ArticoloFornitore
    >();

    (esistente?.articoli || []).forEach(
      (articolo) => {
        articoliMappa.set(articolo.id, articolo);
      }
    );

    documento.righe.forEach((riga) => {
      const articoloId = creaIdArticolo(
        fornitoreId,
        riga
      );

      const articoloAggiornato =
        aggiornaArticolo({
          articoloEsistente:
            articoliMappa.get(articoloId),

          riga,
          fornitoreId,
          dataDocumento:
            documento.dataDocumento,

          segno: documento.segno,
        });

      articoliMappa.set(
        articoloId,
        articoloAggiornato
      );
    });

    const totaleDocumento = Math.abs(
      documento.totale
    );

    const totaleAcquistato =
      (esistente?.totaleAcquistato || 0) +
      (documento.segno === 1
        ? totaleDocumento
        : 0);

    const totaleNoteCredito =
      (esistente?.totaleNoteCredito || 0) +
      (documento.segno === -1
        ? totaleDocumento
        : 0);

    const fornitoreAggiornato: FornitoreSalvato = {
      id: fornitoreId,

      ragioneSociale: documento.fornitore,
      partitaIva: documento.partitaIva,

      iban,
      categorie,

      numeroDocumenti:
        (esistente?.numeroDocumenti || 0) + 1,

      totaleAcquistato,
      totaleNoteCredito,

      saldoNetto:
        totaleAcquistato -
        totaleNoteCredito,

      primoAcquisto: dataMinima(
        esistente?.primoAcquisto || '',
        documento.dataDocumento
      ),

      ultimoAcquisto: dataMassima(
        esistente?.ultimoAcquisto || '',
        documento.dataDocumento
      ),

      articoli: Array.from(
        articoliMappa.values()
      ).sort((a, b) =>
        a.descrizione.localeCompare(b.descrizione)
      ),

      telefono: esistente?.telefono || '',
      email: esistente?.email || '',
      indirizzo: esistente?.indirizzo || '',

      attivo: esistente?.attivo ?? true,

      aggiornatoIl:
        new Date().toLocaleString('it-IT'),
    };

    mappa.set(
      fornitoreId,
      fornitoreAggiornato
    );
  });

  const risultato = Array.from(
    mappa.values()
  ).sort((a, b) =>
    a.ragioneSociale.localeCompare(
      b.ragioneSociale
    )
  );

  salvaArchivioFornitori(risultato);

  return risultato;
}

export function eliminaArchivioFornitori(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(FORNITORI_KEY);
}

export function articoliOrdinabili(
  fornitore: FornitoreSalvato
): ArticoloFornitore[] {
  return fornitore.articoli
    .filter(
      (articolo) =>
        articolo.categoria !==
        'Da classificare'
    )
    .sort((a, b) =>
      a.descrizione.localeCompare(
        b.descrizione
      )
    );
}