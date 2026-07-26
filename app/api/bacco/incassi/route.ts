import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

import {
  getSupabaseAdmin,
} from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

type RigaArea = {
  data: string;
  area: string;
  incasso: number;
  coperti: number;
};

type RigaGiornaliera = {
  data: string;
  incassoTotale: number;
  coperti: number;
};

const TESTI_DA_IGNORARE = [
  'TABELLA ANALITICA INCASSI E COPERTI',
  'TABELLA ANALITICA INCASSI',
  'INCASSI E COPERTI',
  'DA DATA',
];

function testo(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    const oggetto = value as {
      text?: string;
      result?: unknown;
    };

    if (oggetto.text !== undefined) {
      return String(oggetto.text).trim();
    }

    if (oggetto.result !== undefined) {
      return String(oggetto.result).trim();
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
    .replace(/\s/g, '');

  if (!valore) {
    return 0;
  }

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

function dataIso(data: Date): string {
  const anno = data.getFullYear();
  const mese = String(
    data.getMonth() + 1
  ).padStart(2, '0');
  const giorno = String(
    data.getDate()
  ).padStart(2, '0');

  return `${anno}-${mese}-${giorno}`;
}

function dataDaValore(
  value: unknown
): string | null {
  if (value instanceof Date) {
    return dataIso(value);
  }

  const valore = testo(value);

  const corrispondenza = valore.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (!corrispondenza) {
    return null;
  }

  const [, giorno, mese, anno] =
    corrispondenza;

  return `${anno}-${mese}-${giorno}`;
}

function estraiPeriodo(value: string): {
  periodoDa: string;
  periodoA: string;
} | null {
  const date = value.match(
    /Da Data\s+(\d{2}\/\d{2}\/\d{4})\s+a Data\s+(\d{2}\/\d{2}\/\d{4})/i
  );

  if (!date) {
    return null;
  }

  const converti = (data: string) => {
    const [giorno, mese, anno] =
      data.split('/');

    return `${anno}-${mese}-${giorno}`;
  };

  return {
    periodoDa: converti(date[1]),
    periodoA: converti(date[2]),
  };
}

function normalizzaArea(
  value: string
): string {
  const area = value
    .replace(/\s+/g, ' ')
    .trim();

  if (!area) {
    return 'NON CLASSIFICATO';
  }

  return area.toUpperCase();
}

function areaValida(value: string): boolean {
  const area = normalizzaArea(value);

  if (!area || area === 'NON CLASSIFICATO') {
    return false;
  }

  if (
    area === 'SALA' ||
    area === 'TOTALI'
  ) {
    return false;
  }

  return !TESTI_DA_IGNORARE.some((testoDaIgnorare) =>
    area.includes(testoDaIgnorare)
  );
}

function creaChiaveDuplicato({
  periodoDa,
  periodoA,
  totaleIncasso,
}: {
  periodoDa: string;
  periodoA: string;
  totaleIncasso: number;
}): string {
  return [
    'bacco-incassi',
    periodoDa,
    periodoA,
    totaleIncasso.toFixed(2),
  ].join('|');
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const url = new URL(request.url);
    const dataDa =
      url.searchParams.get('dataDa');
    const dataA =
      url.searchParams.get('dataA');

    let query = supabase
      .from('bacco_incassi_giornalieri')
      .select(`
        *,
        bacco_import_incassi (
          nome_file,
          periodo_da,
          periodo_a,
          importato_il
        )
      `)
      .order('data', {
        ascending: true,
      });

    if (dataDa) {
      query = query.gte('data', dataDa);
    }

    if (dataA) {
      query = query.lte('data', dataA);
    }

    const {
      data: giornate,
      error: erroreGiornate,
    } = await query;

    if (erroreGiornate) {
      throw erroreGiornate;
    }

    let queryAree = supabase
      .from('bacco_incassi_aree')
      .select('*')
      .order('data', {
        ascending: true,
      })
      .order('area', {
        ascending: true,
      });

    if (dataDa) {
      queryAree = queryAree.gte(
        'data',
        dataDa
      );
    }

    if (dataA) {
      queryAree = queryAree.lte(
        'data',
        dataA
      );
    }

    const {
      data: aree,
      error: erroreAree,
    } = await queryAree;

    if (erroreAree) {
      throw erroreAree;
    }

    const totaleIncasso = (
      giornate || []
    ).reduce(
      (somma, giornata) =>
        somma +
        Number(
          giornata.incasso_totale || 0
        ),
      0
    );

    const totaleCoperti = (
      giornate || []
    ).reduce(
      (somma, giornata) =>
        somma +
        Number(giornata.coperti || 0),
      0
    );

    return NextResponse.json({
      ok: true,
      filtro: {
        dataDa,
        dataA,
      },
      riepilogo: {
        totaleIncasso,
        totaleCoperti,
        numeroGiornate:
          giornate?.length || 0,
      },
      giornate: giornate || [],
      aree: aree || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        messaggio:
          error instanceof Error
            ? error.message
            : 'Errore nella lettura degli incassi giornalieri.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          messaggio:
            'Seleziona il report degli incassi giornalieri Bacco.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith('.xlsx')
    ) {
      return NextResponse.json(
        {
          ok: false,
          messaggio:
            'Il report deve essere in formato XLSX.',
        },
        {
          status: 400,
        }
      );
    }

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    const workbook =
      new ExcelJS.Workbook();

    await workbook.xlsx.load(
      buffer as any
    );

    const foglio =
      workbook.getWorksheet('Foglio1') ||
      workbook.worksheets[0];

    if (!foglio) {
      throw new Error(
        'Il file non contiene un foglio leggibile.'
      );
    }

    let periodoDa = '';
    let periodoA = '';
    let areaCorrente = '';

    const righeAree: RigaArea[] = [];

    foglio.eachRow((row) => {
      const colonnaA =
        row.getCell(1).value;

      const colonnaB =
        row.getCell(2).value;

      const colonnaD =
        row.getCell(4).value;

      const colonnaE =
        row.getCell(5).value;

      const valoreA = testo(colonnaA);
      const valoreNormalizzato =
        valoreA.toUpperCase();

      if (
        valoreA.includes('Da Data')
      ) {
        const periodo =
          estraiPeriodo(valoreA);

        if (periodo) {
          periodoDa =
            periodo.periodoDa;
          periodoA =
            periodo.periodoA;
        }

        return;
      }

      if (
        valoreNormalizzato === 'SALA' ||
        valoreNormalizzato === 'TOTALI'
      ) {
        return;
      }

      const data =
        dataDaValore(colonnaA);

      if (data) {
        if (!areaCorrente) {
          areaCorrente =
            'NON CLASSIFICATO';
        }

        const incasso =
          numero(colonnaD) ||
          numero(colonnaB);

        const coperti =
          Math.round(numero(colonnaE));

        if (
          incasso !== 0 ||
          coperti !== 0
        ) {
          righeAree.push({
            data,
            area: areaCorrente,
            incasso,
            coperti,
          });
        }

        return;
      }

      if (valoreA && areaValida(valoreA)) {
        areaCorrente =
          normalizzaArea(valoreA);
      }
    });

    if (!periodoDa || !periodoA) {
      throw new Error(
        'Periodo del report non riconosciuto.'
      );
    }

    if (righeAree.length === 0) {
      throw new Error(
        'Non sono stati trovati incassi giornalieri validi.'
      );
    }

    /*
     * Protezione aggiuntiva:
     * se nel file la stessa data/area compare più di una volta,
     * viene mantenuta una sola riga, evitando cumuli interni.
     */
    const mappaAree =
      new Map<string, RigaArea>();

    for (const riga of righeAree) {
      const chiave =
        `${riga.data}|${riga.area}`;

      mappaAree.set(chiave, riga);
    }

    const areeUniche =
      Array.from(mappaAree.values())
        .sort((a, b) =>
          `${a.data}|${a.area}`.localeCompare(
            `${b.data}|${b.area}`
          )
        );

    const mappaGiornate =
      new Map<string, RigaGiornaliera>();

    for (const riga of areeUniche) {
      const esistente =
        mappaGiornate.get(riga.data);

      if (esistente) {
        esistente.incassoTotale +=
          riga.incasso;

        esistente.coperti +=
          riga.coperti;
      } else {
        mappaGiornate.set(
          riga.data,
          {
            data: riga.data,
            incassoTotale:
              riga.incasso,
            coperti: riga.coperti,
          }
        );
      }
    }

    const giornate =
      Array.from(
        mappaGiornate.values()
      ).sort((a, b) =>
        a.data.localeCompare(b.data)
      );

    const totaleIncasso =
      giornate.reduce(
        (somma, giornata) =>
          somma +
          giornata.incassoTotale,
        0
      );

    const totaleCoperti =
      giornate.reduce(
        (somma, giornata) =>
          somma + giornata.coperti,
        0
      );

    const chiaveDuplicato =
      creaChiaveDuplicato({
        periodoDa,
        periodoA,
        totaleIncasso,
      });

    const supabase =
      getSupabaseAdmin();

    /*
     * Se lo stesso report esiste già, riutilizziamo il suo import_id.
     * Non blocchiamo l'utente: i dati giornalieri vengono aggiornati.
     */
    const {
      data: importEsistente,
      error: erroreRicercaImport,
    } = await supabase
      .from('bacco_import_incassi')
      .select('id')
      .eq(
        'chiave_duplicato',
        chiaveDuplicato
      )
      .maybeSingle();

    if (erroreRicercaImport) {
      throw erroreRicercaImport;
    }

    let importId =
      importEsistente?.id || '';

    if (importId) {
      const { error: erroreAggiornamento } =
        await supabase
          .from('bacco_import_incassi')
          .update({
            nome_file: file.name,
            periodo_da: periodoDa,
            periodo_a: periodoA,
            totale_incasso:
              totaleIncasso,
            totale_coperti:
              totaleCoperti,
            totale_operazioni: 0,
            importato_il:
              new Date().toISOString(),
          })
          .eq('id', importId);

      if (erroreAggiornamento) {
        throw erroreAggiornamento;
      }
    } else {
      const {
        data: nuovoImport,
        error: erroreImport,
      } = await supabase
        .from('bacco_import_incassi')
        .insert({
          chiave_duplicato:
            chiaveDuplicato,
          nome_file: file.name,
          periodo_da: periodoDa,
          periodo_a: periodoA,
          totale_incasso:
            totaleIncasso,
          totale_coperti:
            totaleCoperti,
          totale_operazioni: 0,
          importato_il:
            new Date().toISOString(),
        })
        .select('id')
        .single();

      if (erroreImport) {
        throw erroreImport;
      }

      importId = nuovoImport.id;
    }

    /*
     * UPSERT:
     * - data è unica nelle giornate;
     * - data + area sono uniche nel dettaglio aree.
     * In questo modo una nuova importazione sostituisce i valori
     * esistenti e non li somma.
     */
    const {
      error: erroreGiornate,
    } = await supabase
      .from(
        'bacco_incassi_giornalieri'
      )
      .upsert(
        giornate.map((giornata) => ({
          import_id: importId,
          data: giornata.data,
          incasso_totale:
            giornata.incassoTotale,
          coperti:
            giornata.coperti,
          operazioni: 0,
          creato_il:
            new Date().toISOString(),
        })),
        {
          onConflict: 'data',
        }
      );

    if (erroreGiornate) {
      throw erroreGiornate;
    }

    const {
      error: erroreAree,
    } = await supabase
      .from('bacco_incassi_aree')
      .upsert(
        areeUniche.map((riga) => ({
          import_id: importId,
          data: riga.data,
          area: riga.area,
          incasso: riga.incasso,
          coperti: riga.coperti,
          creato_il:
            new Date().toISOString(),
        })),
        {
          onConflict: 'data,area',
        }
      );

    if (erroreAree) {
      throw erroreAree;
    }

    return NextResponse.json({
      ok: true,
      duplicato:
        Boolean(importEsistente),
      importId,
      riepilogo: {
        nomeFile: file.name,
        periodoDa,
        periodoA,
        totaleIncasso,
        totaleCoperti,
        giornateImportate:
          giornate.length,
        areeImportate:
          areeUniche.length,
      },
      messaggio:
        importEsistente
          ? `Incassi aggiornati senza duplicazioni: ` +
            `${totaleIncasso.toFixed(2)} €, ` +
            `${totaleCoperti} coperti e ` +
            `${giornate.length} giornate.`
          : `Incassi importati: ` +
            `${totaleIncasso.toFixed(2)} €, ` +
            `${totaleCoperti} coperti e ` +
            `${giornate.length} giornate.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        duplicato: false,
        messaggio:
          error instanceof Error
            ? error.message
            : 'Errore durante l’importazione degli incassi giornalieri.',
      },
      {
        status: 500,
      }
    );
  }
}
