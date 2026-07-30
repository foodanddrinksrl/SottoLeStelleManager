import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

type StatoGestionale = {
  employees: unknown[];
  schedule: Record<string, string[]>;
  closed: Record<string, boolean>;
  rests: Record<string, string>;
  weekInfo: Record<string, unknown>;
  history: unknown[];
};

type SalvaStatoBody = Partial<StatoGestionale>;

function rispostaErrore(
  error: string,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    { status }
  );
}

function valoreArray(
  valore: unknown
): unknown[] {
  return Array.isArray(valore) ? valore : [];
}

function valoreOggetto<T extends Record<string, unknown>>(
  valore: unknown
): T {
  if (
    valore &&
    typeof valore === 'object' &&
    !Array.isArray(valore)
  ) {
    return valore as T;
  }

  return {} as T;
}

function convertiStatoDatabase(
  riga: Record<string, unknown>
): StatoGestionale {
  return {
    employees: valoreArray(riga.employees),

    schedule: valoreOggetto<
      Record<string, string[]>
    >(riga.schedule),

    closed: valoreOggetto<
      Record<string, boolean>
    >(riga.closed),

    rests: valoreOggetto<
      Record<string, string>
    >(riga.rests),

    weekInfo: valoreOggetto<
      Record<string, unknown>
    >(riga.week_info),

    history: valoreArray(riga.history),
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('gestionale_stato')
      .select('*')
      .eq('id', 'principale')
      .single();

    if (error) {
      console.error(
        'Errore lettura stato gestionale:',
        error
      );

      return rispostaErrore(
        `Impossibile leggere il gestionale: ${error.message}`,
        500
      );
    }

    return NextResponse.json({
      ok: true,
      stato: convertiStatoDatabase(
        data as Record<string, unknown>
      ),
    });
  } catch (error) {
    console.error(
      'Errore API gestionale GET:',
      error
    );

    return rispostaErrore(
      error instanceof Error
        ? error.message
        : 'Errore durante la lettura del gestionale.',
      500
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body =
      (await request.json()) as SalvaStatoBody;

    const supabase = getSupabaseAdmin();

    const datiDaSalvare = {
      id: 'principale',

      employees: valoreArray(
        body.employees
      ),

      schedule: valoreOggetto<
        Record<string, string[]>
      >(body.schedule),

      closed: valoreOggetto<
        Record<string, boolean>
      >(body.closed),

      rests: valoreOggetto<
        Record<string, string>
      >(body.rests),

      week_info: valoreOggetto<
        Record<string, unknown>
      >(body.weekInfo),

      history: valoreArray(
        body.history
      ),
    };

    const { data, error } = await supabase
      .from('gestionale_stato')
      .upsert(datiDaSalvare, {
        onConflict: 'id',
      })
      .select('*')
      .single();

    if (error) {
      console.error(
        'Errore salvataggio stato gestionale:',
        error
      );

      return rispostaErrore(
        `Impossibile salvare il gestionale: ${error.message}`,
        500
      );
    }

    return NextResponse.json({
      ok: true,
      stato: convertiStatoDatabase(
        data as Record<string, unknown>
      ),
    });
  } catch (error) {
    console.error(
      'Errore API gestionale PUT:',
      error
    );

    return rispostaErrore(
      error instanceof Error
        ? error.message
        : 'Errore durante il salvataggio del gestionale.',
      500
    );
  }
}