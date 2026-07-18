import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

export const runtime = 'nodejs';

type CategoriaBacco = {
  codice: string;
  descrizione: string;
  quantita: number;
  importoLordo: number;
  importoNetto: number;
  prezzoMedio: number;
};

type RepartoBacco = {
  reparto: string;
  quantita: number;
  importoLordo: number;
  importoNetto: number;
};

type PagamentoBacco = {
  descrizione: string;
  quantita: number;
  totale: number;
};

type IvaBacco = {
  aliquota: number;
  descrizione: string;
  imponibile: number;
  imposta: number;
  totale: number;
};

function testo(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    const possibileTesto = value as {
      text?: string;
      result?: unknown;
    };

    if (possibileTesto.text) {
      return String(possibileTesto.text).trim();
    }

    if (possibileTesto.result !== undefined) {
      return String(possibileTesto.result).trim();
    }
  }

  return String(value).trim();
}

function numero(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  let valore = testo(value)
    .replace(/€/g, '')
    .replace(/\bE\./gi, '')
    .replace(/\s/g, '');

  if (!valore) {
    return 0;
  }

  /*
   * Formato italiano:
   * 16.375,70 → 16375.70
   */
  if (valore.includes(',')) {
    valore = valore
      .replace(/\./g, '')
      .replace(',', '.');
  }

  const risultato = Number(valore);

  return Number.isFinite(risultato)
    ? risultato
    : 0;
}

function intero(value: unknown): number {
  return Math.round(numero(value));
}

function dataIsoDaItaliana(value: string): string {
  const corrispondenza = value.match(
    /(\d{2})\/(\d{2})\/(\d{4})/
  );

  if (!corrispondenza) {
    throw new Error(
      `Data Bacco non riconosciuta: ${value}`
    );
  }

  const [, giorno, mese, anno] = corrispondenza;

  return `${anno}-${mese}-${giorno}`;
}

function normalizzaDescrizione(value: string): string {
  return value
    .replace(/^-+|-+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function creaChiaveDuplicato({
  periodoDa,
  periodoA,
  produzioneNetta,
}: {
  periodoDa: string;
  periodoA: string;
  produzioneNetta: number;
}): string {
  return [
    'bacco',
    periodoDa,
    periodoA,
    produzioneNetta.toFixed(2),
  ].join('|');
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('import_bacco')
      .select(`
        *,
        bacco_categorie (*),
        bacco_reparti (*),
        bacco_pagamenti (*),
        bacco_iva (*)
      `)
      .order('periodo_a', {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      importazioni: data || [],
    });
  } catch (error) {
    const messaggio =
      error instanceof Error
        ? error.message
        : 'Errore durante la lettura degli import Bacco.';

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
  let importId = '';

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          messaggio:
            'Seleziona un file Excel Bacco.',
        },
        {
          status: 400,
        }
      );
    }

    const nomeFile = file.name || 'report-bacco.xlsx';

    if (
      !nomeFile.toLowerCase().endsWith('.xlsx')
    ) {
      return NextResponse.json(
        {
          ok: false,
          messaggio:
            'Il report Bacco deve essere in formato XLSX.',
        },
        {
          status: 400,
        }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(buffer as any);

    const foglio =
      workbook.getWorksheet('Foglio1') ||
      workbook.worksheets[0];

    if (!foglio) {
      throw new Error(
        'Il file Excel non contiene fogli leggibili.'
      );
    }

    let periodoDa = '';
    let periodoA = '';

    let produzioneLorda = 0;
    let produzioneNetta = 0;
    let sconti = 0;

    let coperti = 0;
    let mediaNettaCoperto = 0;

    let numeroOperazioni = 0;
    let totalePagamenti = 0;

    const categorie: CategoriaBacco[] = [];
    const reparti: RepartoBacco[] = [];
    const pagamenti: PagamentoBacco[] = [];
    const iva: IvaBacco[] = [];

    let sezione:
      | ''
      | 'categorie'
      | 'reparti'
      | 'corrispettivi'
      | 'iva'
      | 'pagamenti' = '';

    foglio.eachRow((row) => {
      const valori = Array.from(
        { length: 9 },
        (_, indice) =>
          row.getCell(indice + 1).value
      );

      const colonnaA = testo(valori[0]);
      const colonnaB = testo(valori[1]);

      const testoRiga = valori
        .map((valore) => testo(valore))
        .join(' ')
        .trim();

      if (
        testoRiga
          .toUpperCase()
          .startsWith('DA ')
      ) {
        const date = testoRiga.match(
          /DA\s+(\d{2}\/\d{2}\/\d{4})\s+A\s+(\d{2}\/\d{2}\/\d{4})/i
        );

        if (date) {
          periodoDa = dataIsoDaItaliana(date[1]);
          periodoA = dataIsoDaItaliana(date[2]);
        }

        return;
      }

      if (colonnaA === 'Produzione dettagliata') {
        sezione = 'categorie';
        return;
      }

      if (colonnaA === 'Produzione reparti') {
        sezione = 'reparti';
        return;
      }

      if (colonnaA === 'Corrispettivi:') {
        sezione = 'corrispettivi';
        return;
      }

      if (colonnaA === 'ALIQUOTA') {
        sezione = 'iva';
        return;
      }

      if (colonnaA === 'Forme di pagamento:') {
        sezione = 'pagamenti';
        return;
      }

      if (colonnaA === 'Coperti:') {
        coperti = intero(
          colonnaB.replace(/[^\d,.-]/g, '')
        );
        sezione = '';
        return;
      }

      if (colonnaA === 'Produzione:') {
        produzioneLorda = numero(colonnaB);
        return;
      }

      if (colonnaA === 'Con sconti:') {
        produzioneNetta = numero(colonnaB);
        return;
      }

      if (
        colonnaA === 'Media netta a coperto:'
      ) {
        mediaNettaCoperto = numero(colonnaB);
        return;
      }

      if (sezione === 'categorie') {
        const codice = testo(valori[0]);
        const descrizione =
          normalizzaDescrizione(
            testo(valori[1])
          );

        const quantita = numero(valori[2]);
        const lordo = numero(valori[3]);
        const netto = numero(valori[4]);
        const prezzoMedio = numero(valori[5]);

        if (
          codice &&
          descrizione &&
          codice.toLowerCase() !== 'codice'
        ) {
          categorie.push({
            codice,
            descrizione,
            quantita,
            importoLordo: lordo,
            importoNetto: netto,
            prezzoMedio,
          });
        }

        return;
      }

      if (sezione === 'reparti') {
        const reparto = testo(valori[0]);

        if (
          reparto &&
          reparto.toLowerCase() !== 'reparto'
        ) {
          reparti.push({
            reparto,
            quantita: numero(valori[1]),
            importoLordo: numero(valori[2]),
            importoNetto: numero(valori[3]),
          });
        }

        return;
      }

      if (sezione === 'corrispettivi') {
        if (colonnaA === 'TOTALI') {
          numeroOperazioni = intero(valori[3]);
          totalePagamenti = numero(valori[6]);
          sconti = numero(valori[7]);

          if (!produzioneLorda) {
            produzioneLorda = numero(valori[8]);
          }

          if (!produzioneNetta) {
            produzioneNetta = numero(valori[6]);
          }
        }

        return;
      }

      if (sezione === 'iva') {
        const aliquota = numero(valori[0]);
        const descrizione = testo(valori[1]);

        if (
          aliquota > 0 &&
          descrizione &&
          colonnaA !== 'TOTALI'
        ) {
          iva.push({
            aliquota,
            descrizione,
            imponibile: numero(valori[3]),
            imposta: numero(valori[4]),
            totale: numero(valori[5]),
          });
        }

        return;
      }

      if (sezione === 'pagamenti') {
        const quantita = intero(valori[0]);
        const descrizione = testo(valori[1]);
        const totale = numero(valori[3]);

        if (
          descrizione &&
          descrizione.toUpperCase() !==
            'DESCRIZIONE' &&
          descrizione.toUpperCase() !== 'TOTALE'
        ) {
          pagamenti.push({
            descrizione,
            quantita,
            totale,
          });
        }
      }
    });

    if (!periodoDa || !periodoA) {
      throw new Error(
        'Periodo del report Bacco non trovato.'
      );
    }

    if (produzioneNetta <= 0) {
      throw new Error(
        'Produzione netta Bacco non trovata.'
      );
    }

    const chiaveDuplicato =
      creaChiaveDuplicato({
        periodoDa,
        periodoA,
        produzioneNetta,
      });

    const supabase = getSupabaseAdmin();

    const {
      data: importEsistente,
      error: erroreDuplicato,
    } = await supabase
      .from('import_bacco')
      .select('id')
      .eq('chiave_duplicato', chiaveDuplicato)
      .maybeSingle();

    if (erroreDuplicato) {
      throw erroreDuplicato;
    }

    if (importEsistente) {
      return NextResponse.json(
        {
          ok: false,
          duplicato: true,
          messaggio:
            'Questo report Bacco risulta già importato.',
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: nuovoImport,
      error: erroreImport,
    } = await supabase
      .from('import_bacco')
      .insert({
        chiave_duplicato: chiaveDuplicato,
        nome_file: nomeFile,

        periodo_da: periodoDa,
        periodo_a: periodoA,

        produzione_lorda: produzioneLorda,
        produzione_netta: produzioneNetta,
        sconti,

        coperti,
        media_netta_coperto:
          mediaNettaCoperto,

        numero_operazioni: numeroOperazioni,
        totale_pagamenti:
          totalePagamenti || produzioneNetta,

        importato_il:
          new Date().toISOString(),
      })
      .select('id')
      .single();

    if (erroreImport) {
      throw erroreImport;
    }

    importId = nuovoImport.id;

    if (categorie.length > 0) {
      const { error } = await supabase
        .from('bacco_categorie')
        .insert(
          categorie.map((categoria) => ({
            import_id: importId,
            codice: categoria.codice,
            descrizione:
              categoria.descrizione,
            quantita: categoria.quantita,
            importo_lordo:
              categoria.importoLordo,
            importo_netto:
              categoria.importoNetto,
            prezzo_medio:
              categoria.prezzoMedio,
          }))
        );

      if (error) {
        throw error;
      }
    }

    if (reparti.length > 0) {
      const { error } = await supabase
        .from('bacco_reparti')
        .insert(
          reparti.map((reparto) => ({
            import_id: importId,
            reparto: reparto.reparto,
            quantita: reparto.quantita,
            importo_lordo:
              reparto.importoLordo,
            importo_netto:
              reparto.importoNetto,
          }))
        );

      if (error) {
        throw error;
      }
    }

    if (pagamenti.length > 0) {
      const { error } = await supabase
        .from('bacco_pagamenti')
        .insert(
          pagamenti.map((pagamento) => ({
            import_id: importId,
            descrizione:
              pagamento.descrizione,
            quantita: pagamento.quantita,
            totale: pagamento.totale,
          }))
        );

      if (error) {
        throw error;
      }
    }

    if (iva.length > 0) {
      const { error } = await supabase
        .from('bacco_iva')
        .insert(
          iva.map((rigaIva) => ({
            import_id: importId,
            aliquota: rigaIva.aliquota,
            descrizione:
              rigaIva.descrizione,
            imponibile: rigaIva.imponibile,
            imposta: rigaIva.imposta,
            totale: rigaIva.totale,
          }))
        );

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({
      ok: true,
      duplicato: false,
      importId,

      riepilogo: {
        nomeFile,
        periodoDa,
        periodoA,
        produzioneLorda,
        produzioneNetta,
        sconti,
        coperti,
        mediaNettaCoperto,
        numeroOperazioni,
        totalePagamenti:
          totalePagamenti || produzioneNetta,

        categorieImportate:
          categorie.length,
        repartiImportati:
          reparti.length,
        pagamentiImportati:
          pagamenti.length,
        righeIvaImportate:
          iva.length,
      },

      messaggio:
        `Report Bacco importato: ${produzioneNetta.toFixed(
          2
        )} €, ${coperti} coperti e ${
          categorie.length
        } categorie.`,
    });
  } catch (error) {
    if (importId) {
      try {
        const supabase = getSupabaseAdmin();

        await supabase
          .from('import_bacco')
          .delete()
          .eq('id', importId);
      } catch {
        // Conserviamo l’errore originale.
      }
    }

    const messaggio =
      error instanceof Error
        ? error.message
        : 'Errore durante l’importazione del report Bacco.';

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