import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import {
  sincronizzaCatalogo,
} from '../../lib/catalogo/sincronizzaCatalogo';
type RigaRicevimentoApi = {
  id: string;
  codiceArticolo?: string;
  descrizione: string;
  quantita?: number;
  unitaMisura?: string;
  prezzoUnitario?: number;
  totaleRiga?: number;
  aliquotaIva?: number;
  categoria?: string;
  aggiornaMagazzino?: boolean;
  prodottoCollegatoId?: string;
  ultimoPrezzo?: number;
  prezzoMedio?: number;
  variazionePercentuale?: number;
  affidabilitaAI?: number;
};

type DocumentoRicevimentoApi = {
  id: string;

  fornitore: string;
  partitaIvaFornitore?: string;

  numeroDocumento?: string;
  dataDocumento: string;

  nomeFile?: string;
  mimeType?: string;
  tipoFile?: string;

  imponibile?: number;
  iva?: number;
  totaleDocumento?: number;

  note?: string;

  righe: RigaRicevimentoApi[];
};

function numero(value: unknown): number {
  const risultato = Number(value);

  return Number.isFinite(risultato)
    ? risultato
    : 0;
}

function normalizzaTesto(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9àèéìòù]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function creaChiaveDuplicato(
  documento: DocumentoRicevimentoApi
): string {
  return [
    normalizzaTesto(documento.fornitore),
    normalizzaTesto(
      documento.numeroDocumento || 'senza-numero'
    ),
    documento.dataDocumento,
    numero(documento.totaleDocumento).toFixed(2),
  ].join('|');
}

function creaIdMovimento(): string {
  return `movimento-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('ricevimenti')
      .select(`
        *,
        righe_ricevimento (*)
      `)
      .order('data_documento', {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      ricevimenti: data || [],
    });
  } catch (error) {
    const messaggio =
      error instanceof Error
        ? error.message
        : 'Errore durante la lettura dei ricevimenti.';

    return NextResponse.json(
      {
        ok: false,
        messaggio,
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  let ricevimentoId = '';

  try {
    const documento =
      (await request.json()) as DocumentoRicevimentoApi;

    if (!documento.id?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          messaggio:
            'Identificativo del ricevimento mancante.',
        },
        {
          status: 400,
        }
      );
    }

    if (!documento.fornitore?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          messaggio: 'Fornitore obbligatorio.',
        },
        {
          status: 400,
        }
      );
    }

    if (!documento.dataDocumento?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          messaggio:
            'Data del documento obbligatoria.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(documento.righe) ||
      documento.righe.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          messaggio:
            'Il ricevimento deve contenere almeno una riga.',
        },
        {
          status: 400,
        }
      );
    }

    const supabase = getSupabaseAdmin();

    ricevimentoId = documento.id;

    const chiaveDuplicato =
      creaChiaveDuplicato(documento);

    const { data: duplicato, error: erroreDuplicato } =
      await supabase
        .from('ricevimenti')
        .select('id')
        .eq('chiave_duplicato', chiaveDuplicato)
        .maybeSingle();

    if (erroreDuplicato) {
      throw erroreDuplicato;
    }

    if (duplicato) {
      return NextResponse.json(
        {
          ok: false,
          duplicato: true,
          messaggio:
            'Questa bolla risulta già registrata.',
        },
        {
          status: 409,
        }
      );
    }

    const { error: erroreRicevimento } =
      await supabase
        .from('ricevimenti')
        .insert({
          id: documento.id,
          chiave_duplicato: chiaveDuplicato,

          fornitore: documento.fornitore.trim(),
          partita_iva_fornitore:
            documento.partitaIvaFornitore?.trim() || '',

          numero_documento:
            documento.numeroDocumento?.trim() || '',
          data_documento: documento.dataDocumento,

          nome_file: documento.nomeFile || '',
          mime_type: documento.mimeType || '',
          tipo_file: documento.tipoFile || '',

          imponibile: numero(documento.imponibile),
          iva: numero(documento.iva),
          totale_documento: numero(
            documento.totaleDocumento
          ),

          stato_abbinamento: 'in-attesa',
          fattura_collegata_id: '',

          note: documento.note || '',
          confermato_il: new Date().toISOString(),
          creato_il: new Date().toISOString(),
        });

    if (erroreRicevimento) {
      throw erroreRicevimento;
    }

    const righeDatabase = documento.righe.map(
      (riga) => {
        const quantita = numero(riga.quantita);
        const prezzoUnitario = numero(
          riga.prezzoUnitario
        );

        const totaleRiga =
          numero(riga.totaleRiga) ||
          quantita * prezzoUnitario;

        return {
          id: riga.id,
          ricevimento_id: documento.id,

          codice_articolo:
            riga.codiceArticolo || '',
          descrizione: riga.descrizione.trim(),

          quantita,
          unita_misura:
            riga.unitaMisura || 'pz',

          prezzo_unitario: prezzoUnitario,
          totale_riga: totaleRiga,
          aliquota_iva: numero(
            riga.aliquotaIva
          ),

          categoria:
            riga.categoria || 'Da classificare',

          aggiorna_magazzino:
            riga.aggiornaMagazzino ?? true,

          prodotto_collegato_id:
            riga.prodottoCollegatoId || '',

          ultimo_prezzo: numero(
            riga.ultimoPrezzo
          ),
          prezzo_medio: numero(
            riga.prezzoMedio
          ),
          variazione_percentuale: numero(
            riga.variazionePercentuale
          ),

          affidabilita_ai: numero(
            riga.affidabilitaAI
          ),

          creato_il: new Date().toISOString(),
        };
      }
    );

    const { error: erroreRighe } =
      await supabase
        .from('righe_ricevimento')
        .insert(righeDatabase);

    if (erroreRighe) {
      throw erroreRighe;
    }

    const movimenti = documento.righe
      .filter(
        (riga) =>
          (riga.aggiornaMagazzino ?? true) &&
          numero(riga.quantita) > 0 &&
          riga.descrizione.trim().length > 0
      )
      .map((riga) => {
        const quantita = numero(riga.quantita);
        const prezzoUnitario = numero(
          riga.prezzoUnitario
        );

        const valoreTotale =
          numero(riga.totaleRiga) ||
          quantita * prezzoUnitario;

        return {
          id: creaIdMovimento(),

          ricevimento_id: documento.id,
          riga_ricevimento_id: riga.id,

          data: documento.dataDocumento,

          prodotto_id:
            riga.prodottoCollegatoId ||
            normalizzaTesto(riga.descrizione),

          descrizione: riga.descrizione,

          quantita,
          unita_misura:
            riga.unitaMisura || 'pz',

          prezzo_unitario: prezzoUnitario,
          valore_totale: valoreTotale,

          fornitore: documento.fornitore,
          numero_documento:
            documento.numeroDocumento || '',

          tipo_movimento: 'carico',
          creato_il: new Date().toISOString(),
        };
      });

    if (movimenti.length > 0) {
      const { error: erroreMovimenti } =
        await supabase
          .from('movimenti_magazzino')
          .insert(movimenti);

      if (erroreMovimenti) {
        throw erroreMovimenti;
      }
    }
const risultatoCatalogo =
  await sincronizzaCatalogo({
    supabase,
    righe: documento.righe,
    fornitore: documento.fornitore,
    dataDocumento: documento.dataDocumento,
  });
    return NextResponse.json({
      ok: true,
      duplicato: false,
      ricevimentoId: documento.id,
      movimentiCreati: movimenti.length,
      catalogo: risultatoCatalogo,
      messaggio:
        'Ricevimento salvato correttamente su Supabase.',
    });
  } catch (error) {
    if (ricevimentoId) {
      try {
        const supabase = getSupabaseAdmin();

        await supabase
          .from('ricevimenti')
          .delete()
          .eq('id', ricevimentoId);
      } catch {
        // Non sostituiamo l’errore originale.
      }
    }

    const messaggio =
      error instanceof Error
        ? error.message
        : 'Errore durante il salvataggio del ricevimento.';

    return NextResponse.json(
      {
        ok: false,
        duplicato: false,
        messaggio,
      },
      {
        status: 500,
      }
    );
  }
}
