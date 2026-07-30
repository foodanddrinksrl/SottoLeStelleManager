import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed';

type CreateCampaignBody = {
  name?: string;
  message?: string;
  recipients?: string[];
  imageUrl?: string | null;
  buttonText?: string;
  buttonUrl?: string | null;
  status?: CampaignStatus;
  scheduledAt?: string | null;
};

const STATI_CONSENTITI: CampaignStatus[] = [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'failed',
];

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

function normalizzaTelefono(value: string) {
  let numero = String(value ?? '').replace(/\D/g, '');

  if (numero.startsWith('0039')) {
    numero = numero.slice(2);
  } else if (numero.startsWith('00')) {
    numero = numero.slice(2);
  }

  if (
    !numero.startsWith('39') &&
    numero.length === 10
  ) {
    numero = `39${numero}`;
  }

  return numero;
}

function telefonoValido(phone: string) {
  return phone.length >= 11 && phone.length <= 15;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select(`
        *,
        marketing_recipients (
          id,
          phone,
          customer_name,
          message_status
        )
      `)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(
        'Errore caricamento campagne:',
        error
      );

      return rispostaErrore(
        error.message ||
          'Impossibile caricare le campagne.',
        500
      );
    }

    return NextResponse.json({
      ok: true,
      campaigns: data ?? [],
    });
  } catch (error) {
    console.error(
      'Errore interno campagne:',
      error
    );

    return rispostaErrore(
      'Errore interno durante il caricamento.',
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as CreateCampaignBody;

    const name = body.name?.trim();
    const message = body.message?.trim();

    if (!name) {
      return rispostaErrore(
        'Inserisci il nome della campagna.'
      );
    }

    if (!message) {
      return rispostaErrore(
        'Inserisci il messaggio della campagna.'
      );
    }

    const status = body.status ?? 'draft';

    if (!STATI_CONSENTITI.includes(status)) {
      return rispostaErrore(
        'Stato della campagna non valido.'
      );
    }

    if (
      status === 'scheduled' &&
      !body.scheduledAt
    ) {
      return rispostaErrore(
        'Seleziona data e ora della programmazione.'
      );
    }

    const recipients = Array.from(
      new Set(
        (body.recipients ?? [])
          .map(normalizzaTelefono)
          .filter(telefonoValido)
      )
    );

    if (recipients.length === 0) {
      return rispostaErrore(
        'Inserisci almeno un destinatario valido.'
      );
    }

    if (recipients.length > 5000) {
      return rispostaErrore(
        'Sono consentiti al massimo 5.000 destinatari per campagna.'
      );
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: campaign, error: campaignError } =
      await supabase
        .from('marketing_campaigns')
        .insert({
          name,
          message,
          image_url:
            body.imageUrl?.trim() || null,
          button_text:
            body.buttonText?.trim() ||
            'Prenota il tavolo',
          button_url:
            body.buttonUrl?.trim() || null,
          status,
          scheduled_at:
            status === 'scheduled'
              ? body.scheduledAt
              : null,
          updated_at: now,
        })
        .select('*')
        .single();

    if (campaignError || !campaign) {
      console.error(
        'Errore creazione campagna:',
        campaignError
      );

      return rispostaErrore(
        campaignError?.message ||
          'Impossibile salvare la campagna.',
        500
      );
    }

    const righeDestinatari = recipients.map(
      (phone) => ({
        campaign_id: campaign.id,
        phone,
        message_status: 'pending',
      })
    );

    const {
      data: recipientsCreated,
      error: recipientsError,
    } = await supabase
      .from('marketing_recipients')
      .insert(righeDestinatari)
      .select('*');

    if (recipientsError) {
      console.error(
        'Errore creazione destinatari:',
        recipientsError
      );

      await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', campaign.id);

      return rispostaErrore(
        recipientsError.message ||
          'Impossibile salvare i destinatari.',
        500
      );
    }

    return NextResponse.json(
      {
        ok: true,
        campaign: {
          ...campaign,
          marketing_recipients:
            recipientsCreated ?? [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      'Errore POST campagne:',
      error
    );

    return rispostaErrore(
      'Richiesta non valida o errore interno.',
      500
    );
  }
}
