import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lot = url.searchParams.get('lot')?.trim().toUpperCase() || '';
    const onlyPhones = url.searchParams.get('phones') === '1';

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('marketing_contacts')
      .select(onlyPhones ? 'phone' : 'id,name,phone,lot,active,whatsapp_valid,created_at')
      .eq('active', true)
      .eq('whatsapp_valid', true)
      .order('name', { ascending: true });

    if (lot && lot !== 'TUTTI') query = query.eq('lot', lot);

    const { data, error } = await query;

    if (error) {
      console.error('Errore lettura contatti:', error);
      return errorResponse('Impossibile caricare i contatti.', 500);
    }

    return NextResponse.json({ ok: true, contacts: data ?? [], count: data?.length ?? 0 });
  } catch (error) {
    console.error('Errore API contatti:', error);
    return errorResponse('Errore interno durante il caricamento.', 500);
  }
}
