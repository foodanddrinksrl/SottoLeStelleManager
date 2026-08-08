import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

const PAGE_SIZE = 1000;

type ContactRow = {
  id?: string;
  name?: string | null;
  phone?: string;
  lot?: string | null;
  active?: boolean;
  whatsapp_valid?: boolean;
  created_at?: string;
};

function errorResponse(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const lot =
      url.searchParams
        .get('lot')
        ?.trim()
        .toUpperCase() || '';

    const onlyPhones =
      url.searchParams.get('phones') === '1';

    const supabase = getSupabaseAdmin();

    const contacts: ContactRow[] = [];

    let from = 0;

    while (true) {
      let query = supabase
        .from('marketing_contacts')
        .select(
          onlyPhones
            ? 'phone'
            : 'id,name,phone,lot,active,whatsapp_valid,created_at'
        )
        .eq('active', true)
        .eq('whatsapp_valid', true)
        .order('name', {
          ascending: true,
          nullsFirst: false,
        })
        .order('id', {
          ascending: true,
        })
        .range(
          from,
          from + PAGE_SIZE - 1
        );

      if (lot && lot !== 'TUTTI') {
        query = query.eq('lot', lot);
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        console.error(
          'Errore lettura contatti:',
          error
        );

        return errorResponse(
          error.message ||
            'Impossibile caricare i contatti.',
          500
        );
      }

      const page =
        (data ?? []) as ContactRow[];

      contacts.push(...page);

      if (page.length < PAGE_SIZE) {
        break;
      }

      from += PAGE_SIZE;
    }

    return NextResponse.json({
      ok: true,
      contacts,
      count: contacts.length,
    });
  } catch (error) {
    console.error(
      'Errore API contatti:',
      error
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : 'Errore interno durante il caricamento.',
      500
    );
  }
}