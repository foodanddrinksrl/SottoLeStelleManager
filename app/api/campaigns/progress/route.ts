import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

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

    const campaignId =
      url.searchParams
        .get('campaignId')
        ?.trim() || '';

    if (!campaignId) {
      return errorResponse(
        'ID campagna mancante.'
      );
    }

    const supabase = getSupabaseAdmin();

    const [
      totalResult,
      sentResult,
      failedResult,
      pendingResult,
    ] = await Promise.all([
      supabase
        .from('marketing_recipients')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('campaign_id', campaignId),

      supabase
        .from('marketing_recipients')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('campaign_id', campaignId)
        .eq('message_status', 'sent'),

      supabase
        .from('marketing_recipients')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('campaign_id', campaignId)
        .eq('message_status', 'failed'),

      supabase
        .from('marketing_recipients')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('campaign_id', campaignId)
        .eq('message_status', 'pending'),
    ]);

    const firstError =
      totalResult.error ||
      sentResult.error ||
      failedResult.error ||
      pendingResult.error;

    if (firstError) {
      console.error(
        'Errore lettura progresso campagna:',
        firstError
      );

      return errorResponse(
        firstError.message ||
          'Impossibile leggere il progresso.',
        500
      );
    }

    const total =
      totalResult.count ?? 0;

    const sent =
      sentResult.count ?? 0;

    const failed =
      failedResult.count ?? 0;

    const pending =
      pendingResult.count ?? 0;

    const processed =
      sent + failed;

    const percent =
      total > 0
        ? Math.min(
            100,
            Math.round(
              (processed / total) * 100
            )
          )
        : 0;

    return NextResponse.json({
      ok: true,
      campaignId,
      total,
      processed,
      sent,
      failed,
      pending,
      percent,
    });
  } catch (error) {
    console.error(
      'Errore API progresso campagna:',
      error
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : 'Errore interno durante il caricamento del progresso.',
      500
    );
  }
}
