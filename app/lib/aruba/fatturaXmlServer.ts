import { XMLParser } from 'fast-xml-parser';

export type RiferimentoDdt = { numero: string; data: string };

export type FatturaArubaAnalizzata = {
  fornitore: string;
  partitaIvaFornitore: string;
  codiceFiscaleFornitore: string;
  numeroDocumento: string;
  dataDocumento: string;
  tipoDocumento: string;
  divisa: string;
  imponibile: number;
  iva: number;
  totaleDocumento: number;
  scadenza: string;
  riferimentiDdt: RiferimentoDdt[];
};

function array<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function testo(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function numero(value: unknown): number {
  const risultato = Number(testo(value).replace(',', '.'));
  return Number.isFinite(risultato) ? risultato : 0;
}

function primaScadenza(corpo: any): string {
  const scadenze: string[] = [];
  for (const blocco of array(corpo?.DatiPagamento)) {
    for (const dettaglio of array(blocco?.DettaglioPagamento)) {
      const data = testo(dettaglio?.DataScadenzaPagamento);
      if (data) scadenze.push(data);
    }
  }
  return scadenze.sort()[0] || '';
}

function leggiRiferimentiDdt(datiGenerali: any): RiferimentoDdt[] {
  const riferimenti: RiferimentoDdt[] = [];
  for (const blocco of array(datiGenerali?.DatiDDT)) {
    const numeroDdt = testo(blocco?.NumeroDDT);
    const dataDdt = testo(blocco?.DataDDT);
    if (numeroDdt || dataDdt) riferimenti.push({ numero: numeroDdt, data: dataDdt });
  }
  return riferimenti;
}

export function analizzaXmlFatturaServer(xml: string): FatturaArubaAnalizzata {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true,
  });

  const radice = parser.parse(xml);
  const fattura = radice?.FatturaElettronica || radice?.FatturaElettronicaSemplificata;
  if (!fattura) throw new Error('Il file ricevuto non contiene una fattura elettronica valida.');

  const header = fattura?.FatturaElettronicaHeader;
  const body = array(fattura?.FatturaElettronicaBody)[0];
  if (!header || !body) throw new Error('Header o corpo della fattura non trovato.');

  const datiAnagrafici = header?.CedentePrestatore?.DatiAnagrafici;
  const anagrafica = datiAnagrafici?.Anagrafica;
  const fornitore = testo(anagrafica?.Denominazione) || [testo(anagrafica?.Nome), testo(anagrafica?.Cognome)].filter(Boolean).join(' ') || 'Fornitore non riconosciuto';
  const idIva = datiAnagrafici?.IdFiscaleIVA;
  const partitaIvaFornitore = `${testo(idIva?.IdPaese)}${testo(idIva?.IdCodice)}`;
  const codiceFiscaleFornitore = testo(datiAnagrafici?.CodiceFiscale);

  const datiGenerali = body?.DatiGenerali;
  const documento = datiGenerali?.DatiGeneraliDocumento;
  if (!documento) throw new Error('DatiGeneraliDocumento non trovato.');

  const riepiloghi = array(body?.DatiBeniServizi?.DatiRiepilogo);
  const imponibile = riepiloghi.reduce((somma, riga) => somma + numero(riga?.ImponibileImporto), 0);
  const iva = riepiloghi.reduce((somma, riga) => somma + numero(riga?.Imposta), 0);
  const totaleDichiarato = numero(documento?.ImportoTotaleDocumento);

  return {
    fornitore,
    partitaIvaFornitore,
    codiceFiscaleFornitore,
    numeroDocumento: testo(documento?.Numero),
    dataDocumento: testo(documento?.Data),
    tipoDocumento: testo(documento?.TipoDocumento),
    divisa: testo(documento?.Divisa) || 'EUR',
    imponibile,
    iva,
    totaleDocumento: totaleDichiarato > 0 ? totaleDichiarato : imponibile + iva,
    scadenza: primaScadenza(body),
    riferimentiDdt: leggiRiferimentiDdt(datiGenerali),
  };
}
