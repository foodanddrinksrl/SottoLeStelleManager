import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { analizzaXmlFatturaServer, type RiferimentoDdt } from '../../../lib/aruba/fatturaXmlServer';

export const runtime = 'nodejs';

type PayloadArubaCreateInvoice = {
  username?: string;
  countryCode?: string;
  vatCode?: string;
  fiscalCode?: string;
  sdiIdentification?: string;
  sdiInvoiceFileName?: string;
  invoiceXmlBase64?: string;
  sdiMetadataFileName?: string;
  metadataXmlBase64?: string;
};

type RicevimentoTrovato = {
  id: string;
  numero_documento: string;
  data_documento: string;
  fornitore: string;
  partita_iva_fornitore: string;
  stato_abbinamento: string;
};

function autorizzato(request: Request): boolean {
  const chiaveAttesa = process.env.ARUBA_WEBHOOK_API_KEY?.trim();
  if (!chiaveAttesa) throw new Error('Variabile ARUBA_WEBHOOK_API_KEY non configurata.');
  return (request.headers.get('authorization')?.trim() || '') === chiaveAttesa;
}

function decodificaBase64(value: string): string {
  return Buffer.from(value, 'base64').toString('utf8');
}

function normalizzaNumeroDocumento(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

async function cercaDdtCollegabili(riferimenti: RiferimentoDdt[], partitaIvaFornitore: string) {
  if (riferimenti.length === 0) return { trovati: [] as RicevimentoTrovato[], mancanti: [] as RiferimentoDdt[] };

  const supabase = getSupabaseAdmin();
  let query = supabase.from('ricevimenti').select('id,numero_documento,data_documento,fornitore,partita_iva_fornitore,stato_abbinamento');
  if (partitaIvaFornitore) query = query.eq('partita_iva_fornitore', partitaIvaFornitore);

  const { data, error } = await query;
  if (error) throw error;

  const ricevimenti = (data || []) as RicevimentoTrovato[];
  const trovati: RicevimentoTrovato[] = [];
  const mancanti: RiferimentoDdt[] = [];

  for (const riferimento of riferimenti) {
    const numeroAtteso = normalizzaNumeroDocumento(riferimento.numero);
    const trovato = ricevimenti.find((ricevimento) => {
      const stessoNumero = normalizzaNumeroDocumento(ricevimento.numero_documento || '') === numeroAtteso;
      const stessaData = !riferimento.data || ricevimento.data_documento === riferimento.data;
      return stessoNumero && stessaData;
    });
    if (trovato) trovati.push(trovato); else mancanti.push(riferimento);
  }

  return { trovati, mancanti };
}

function determinaCasistica(riferimentiDdt: RiferimentoDdt[], ddtTrovati: RicevimentoTrovato[], ddtMancanti: RiferimentoDdt[]) {
  if (riferimentiDdt.length === 0) return 'fattura-immediata';
  if (ddtTrovati.length > 0 && ddtMancanti.length === 0) return 'fattura-riepilogativa';
  if (ddtTrovati.length > 0 && ddtMancanti.length > 0) return 'fattura-parziale';
  return 'da-verificare';
}

export async function POST(request: Request) {
  try {
    if (!autorizzato(request)) {
      return NextResponse.json({ ok: false, messaggio: 'Autorizzazione Aruba non valida.' }, { status: 401 });
    }

    const payload = (await request.json()) as PayloadArubaCreateInvoice;
    const obbligatori = [payload.username, payload.countryCode, payload.vatCode, payload.fiscalCode, payload.sdiIdentification, payload.sdiInvoiceFileName, payload.invoiceXmlBase64, payload.sdiMetadataFileName, payload.metadataXmlBase64];
    if (obbligatori.some((campo) => !campo?.trim())) {
      return NextResponse.json({ ok: false, messaggio: 'Payload Aruba incompleto.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: duplicato, error: erroreDuplicato } = await supabase.from('aruba_fatture_ricevute').select('id').eq('sdi_identification', payload.sdiIdentification!).maybeSingle();
    if (erroreDuplicato) throw erroreDuplicato;
    if (duplicato) return NextResponse.json({ ok: true, duplicato: true, messaggio: 'Fattura Aruba già acquisita.' });

    const xmlFattura = decodificaBase64(payload.invoiceXmlBase64!);
    const xmlMetadati = decodificaBase64(payload.metadataXmlBase64!);
    const analisi = analizzaXmlFatturaServer(xmlFattura);
    const { trovati: ddtTrovati, mancanti: ddtMancanti } = await cercaDdtCollegabili(analisi.riferimentiDdt, analisi.partitaIvaFornitore);
    const casistica = determinaCasistica(analisi.riferimentiDdt, ddtTrovati, ddtMancanti);

    const generaAcquisto = casistica === 'fattura-immediata' || casistica === 'fattura-parziale';
    const generaMagazzino = generaAcquisto;

    const { data: nuovaFattura, error: erroreInserimento } = await supabase.from('aruba_fatture_ricevute').insert({
      sdi_identification: payload.sdiIdentification,
      sdi_invoice_filename: payload.sdiInvoiceFileName,
      sdi_metadata_filename: payload.sdiMetadataFileName,
      username_aruba: payload.username,
      ricevente_country_code: payload.countryCode,
      ricevente_vat_code: payload.vatCode,
      ricevente_fiscal_code: payload.fiscalCode,
      fornitore: analisi.fornitore,
      partita_iva_fornitore: analisi.partitaIvaFornitore,
      codice_fiscale_fornitore: analisi.codiceFiscaleFornitore,
      numero_documento: analisi.numeroDocumento,
      data_documento: analisi.dataDocumento,
      tipo_documento: analisi.tipoDocumento,
      divisa: analisi.divisa,
      imponibile: analisi.imponibile,
      iva: analisi.iva,
      totale_documento: analisi.totaleDocumento,
      scadenza: analisi.scadenza || null,
      casistica,
      stato: 'da-verificare',
      genera_acquisto: generaAcquisto,
      genera_magazzino: generaMagazzino,
      riferimenti_ddt: analisi.riferimentiDdt,
      ddt_trovati: ddtTrovati.map((ddt) => ({ id: ddt.id, numero: ddt.numero_documento, data: ddt.data_documento })),
      ddt_mancanti: ddtMancanti,
      xml_fattura: xmlFattura,
      xml_metadati: xmlMetadati,
      ricevuta_il: new Date().toISOString(),
      creato_il: new Date().toISOString(),
    }).select('id').single();

    if (erroreInserimento) throw erroreInserimento;

    if (ddtTrovati.length > 0) {
      const collegamenti = ddtTrovati.map((ddt) => ({
        fattura_aruba_id: nuovaFattura.id,
        ricevimento_id: ddt.id,
        stato: 'proposto',
        creato_il: new Date().toISOString(),
      }));
      const { error: erroreCollegamenti } = await supabase.from('aruba_fatture_ddt').insert(collegamenti);
      if (erroreCollegamenti) throw erroreCollegamenti;
    }

    return NextResponse.json({
      ok: true,
      duplicato: false,
      fatturaId: nuovaFattura.id,
      casistica,
      ddtRiconosciuti: ddtTrovati.length,
      ddtMancanti: ddtMancanti.length,
      messaggio: 'Fattura Aruba ricevuta e classificata. È pronta per la verifica.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, messaggio: error instanceof Error ? error.message : 'Errore interno durante la ricezione Aruba.' }, { status: 500 });
  }
}
