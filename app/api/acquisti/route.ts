import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

type DocumentoAcquisto = {
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
  righe: unknown[];
  scadenze: unknown[];
};

type SalvaDocumentiBody = {
  documenti?: DocumentoAcquisto[];
};

function rispostaErrore(
  errore: string,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error: errore,
    },
    { status }
  );
}

function convertiDocumentoDatabase(
  documento: DocumentoAcquisto
) {
  return {
    id: documento.id,
    chiave_duplicato: documento.chiaveDuplicato,
    tipo_documento: documento.tipoDocumento,
    segno: documento.segno,
    fornitore: documento.fornitore,
    partita_iva: documento.partitaIva,
    numero_documento: documento.numeroDocumento,
    data_documento: documento.dataDocumento || null,
    data_ricezione: documento.dataRicezione || null,
    data_importazione:
      documento.dataImportazione || new Date().toISOString(),
    imponibile: documento.imponibile,
    iva: documento.iva,
    totale: documento.totale,
    origine: documento.origine,
    righe: documento.righe || [],
    scadenze: documento.scadenze || [],
  };
}

function convertiDocumentoApplicazione(
  riga: Record<string, unknown>
): DocumentoAcquisto {
  return {
    id: String(riga.id || ''),
    chiaveDuplicato: String(riga.chiave_duplicato || ''),
    tipoDocumento: String(riga.tipo_documento || ''),
    segno: Number(riga.segno) === -1 ? -1 : 1,
    fornitore: String(riga.fornitore || ''),
    partitaIva: String(riga.partita_iva || ''),
    numeroDocumento: String(riga.numero_documento || ''),
    dataDocumento: String(riga.data_documento || ''),
    dataRicezione: String(riga.data_ricezione || ''),
    dataImportazione: String(riga.data_importazione || ''),
    imponibile: Number(riga.imponibile || 0),
    iva: Number(riga.iva || 0),
    totale: Number(riga.totale || 0),
    origine: String(
      riga.origine || 'XML'
    ) as DocumentoAcquisto['origine'],
    righe: Array.isArray(riga.righe)
      ? riga.righe
      : [],
    scadenze: Array.isArray(riga.scadenze)
      ? riga.scadenze
      : [],
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('acquisti_documenti')
      .select('*')
      .order('data_documento', {
        ascending: false,
        nullsFirst: false,
      });

    if (error) {
      console.error(
        'Errore lettura acquisti:',
        error
      );

      return rispostaErrore(
        `Impossibile leggere l’archivio acquisti: ${error.message}`,
        500
      );
    }

    const documenti = (data || []).map(
      (riga) =>
        convertiDocumentoApplicazione(
          riga as Record<string, unknown>
        )
    );

    return NextResponse.json({
      ok: true,
      documenti,
    });
  } catch (error) {
    console.error(
      'Errore API acquisti GET:',
      error
    );

    return rispostaErrore(
      error instanceof Error
        ? error.message
        : 'Errore durante la lettura degli acquisti.',
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as SalvaDocumentiBody;

    const documenti = Array.isArray(body.documenti)
      ? body.documenti
      : [];

    if (documenti.length === 0) {
      return rispostaErrore(
        'Nessun documento ricevuto.'
      );
    }

    const documentiValidi = documenti.filter(
      (documento) =>
        documento.id &&
        documento.chiaveDuplicato
    );

    if (documentiValidi.length === 0) {
      return rispostaErrore(
        'I documenti ricevuti non sono validi.'
      );
    }

    const supabase = getSupabaseAdmin();

    const righeDatabase =
      documentiValidi.map(
        convertiDocumentoDatabase
      );

    const { data, error } = await supabase
      .from('acquisti_documenti')
      .upsert(righeDatabase, {
        onConflict: 'chiave_duplicato',
        ignoreDuplicates: true,
      })
      .select('*');

    if (error) {
      console.error(
        'Errore salvataggio acquisti:',
        error
      );

      return rispostaErrore(
        `Impossibile salvare gli acquisti: ${error.message}`,
        500
      );
    }

    return NextResponse.json({
      ok: true,
      ricevuti: documenti.length,
      salvati: data?.length || 0,
    });
  } catch (error) {
    console.error(
      'Errore API acquisti POST:',
      error
    );

    return rispostaErrore(
      error instanceof Error
        ? error.message
        : 'Errore durante il salvataggio degli acquisti.',
      500
    );
  }
}