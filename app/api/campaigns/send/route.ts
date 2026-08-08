import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

type SendCampaignBody = {
  campaignId?: string;
  maxRecipients?: number;
};

type MetaResult = {
  messages?: Array<{
    id?: string;
  }>;
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    error_data?: {
      details?: string;
    };
  };
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  image_url?: string | null;
};

type RecipientRow = {
  id: string;
  phone: string;
  customer_name?: string | null;
  message_status: string;
};

const TEMPLATE_NAME = 'ritorna_da_noi';

const TEMPLATE_LANGUAGE =
  process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'it';

const MAX_TEST_RECIPIENTS = 10000;

function rispostaErrore(
  error: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      details,
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

function telefonoValido(numero: string) {
  return numero.length >= 11 && numero.length <= 15;
}

function normalizzaNome(value?: string | null) {
  const nome = String(value ?? '').trim();

  if (!nome) {
    return 'Cliente';
  }

  return nome.slice(0, 60);
}

async function inviaTemplate({
  phone,
  customerName,
  imageUrl,
  accessToken,
  phoneNumberId,
  graphApiVersion,
}: {
  phone: string;
  customerName: string;
  imageUrl: string;
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
}) {
  const response = await fetch(
    `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: TEMPLATE_NAME,
          language: {
            code: TEMPLATE_LANGUAGE,
          },
          components: [
            {
              type: 'header',
              parameters: [
                {
                  type: 'image',
                  image: {
                    link: imageUrl,
                  },
                },
              ],
            },
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: customerName,
                },
              ],
            },
          ],
        },
      }),
    }
  );

  const result = (await response.json()) as MetaResult;

  return {
    ok: response.ok,
    status: response.status,
    result,
  };
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  try {
    const accessToken =
      process.env.WHATSAPP_ACCESS_TOKEN;

    const phoneNumberId =
      process.env.WHATSAPP_PHONE_NUMBER_ID;

    const graphApiVersion =
      process.env.WHATSAPP_GRAPH_API_VERSION ||
      'v25.0';

    if (!accessToken || !phoneNumberId) {
      return rispostaErrore(
        'Credenziali WhatsApp mancanti. Controlla WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID.',
        500
      );
    }

    const body =
      (await request.json()) as SendCampaignBody;

    const campaignId =
      String(body.campaignId ?? '').trim();

    const requestedLimit =
      Number(
        body.maxRecipients ??
          MAX_TEST_RECIPIENTS
      );

    const maxRecipients = Math.min(
      Math.max(
        Number.isFinite(requestedLimit)
          ? Math.floor(requestedLimit)
          : MAX_TEST_RECIPIENTS,
        1
      ),
      MAX_TEST_RECIPIENTS
    );

    if (!campaignId) {
      return rispostaErrore(
        'ID campagna mancante.'
      );
    }

    const {
      data: campaignData,
      error: campaignError,
    } = await supabase
      .from('marketing_campaigns')
      .select(
        'id, name, status, image_url'
      )
      .eq('id', campaignId)
      .single();

    const campaign =
      campaignData as CampaignRow | null;

    if (campaignError || !campaign) {
      return rispostaErrore(
        campaignError?.message ||
          'Campagna non trovata.',
        404
      );
    }

    const imageUrl =
      String(campaign.image_url ?? '').trim();

    if (!imageUrl) {
      return rispostaErrore(
        'Questa campagna non contiene un’immagine. Il template ritorna_da_noi richiede un’immagine nell’intestazione.'
      );
    }

    if (!imageUrl.startsWith('https://')) {
      return rispostaErrore(
        'L’immagine della campagna deve avere un indirizzo pubblico HTTPS.'
      );
    }

    const {
      data: recipientsData,
      error: recipientsError,
    } = await supabase
      .from('marketing_recipients')
      .select(
        'id, phone, customer_name, message_status'
      )
      .eq('campaign_id', campaignId)
      .eq('message_status', 'pending')
      .limit(maxRecipients);

    const recipients =
      (recipientsData ?? []) as RecipientRow[];

    if (recipientsError) {
      return rispostaErrore(
        recipientsError.message ||
          'Impossibile caricare i destinatari.',
        500
      );
    }

    if (recipients.length === 0) {
      return rispostaErrore(
        'Non ci sono destinatari in attesa per questa campagna.'
      );
    }

    await supabase
      .from('marketing_campaigns')
      .update({
        status: 'sending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    let sent = 0;
    let failed = 0;

    const errors: Array<{
      phone: string;
      error: string;
    }> = [];

    for (const recipient of recipients) {
      const phone =
        normalizzaTelefono(recipient.phone);

      const customerName =
        normalizzaNome(
          recipient.customer_name
        );

      if (!telefonoValido(phone)) {
        failed += 1;

        const errorMessage =
          'Numero di telefono non valido.';

        errors.push({
          phone:
            recipient.phone ||
            'numero mancante',
          error: errorMessage,
        });

        await supabase
          .from('marketing_recipients')
          .update({
            message_status: 'failed',
          })
          .eq('id', recipient.id);

        continue;
      }

      try {
        const metaResponse =
          await inviaTemplate({
            phone,
            customerName,
            imageUrl,
            accessToken,
            phoneNumberId,
            graphApiVersion,
          });

        if (metaResponse.ok) {
          sent += 1;

          await supabase
            .from('marketing_recipients')
            .update({
              message_status: 'sent',
            })
            .eq('id', recipient.id);
        } else {
          failed += 1;

          const errorMessage =
            metaResponse.result.error
              ?.error_data?.details ||
            metaResponse.result.error
              ?.message ||
            `Errore Meta HTTP ${metaResponse.status}`;

          errors.push({
            phone,
            error: errorMessage,
          });

          await supabase
            .from('marketing_recipients')
            .update({
              message_status: 'failed',
            })
            .eq('id', recipient.id);
        }
      } catch (error) {
        failed += 1;

        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Errore sconosciuto';

        errors.push({
          phone,
          error: errorMessage,
        });

        await supabase
          .from('marketing_recipients')
          .update({
            message_status: 'failed',
          })
          .eq('id', recipient.id);
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );
    }

    const {
      count: pendingCount,
      error: pendingError,
    } = await supabase
      .from('marketing_recipients')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('campaign_id', campaignId)
      .eq('message_status', 'pending');

    if (pendingError) {
      console.error(
        'Errore conteggio destinatari in attesa:',
        pendingError
      );
    }

    const remaining = pendingCount ?? 0;

    const finalStatus =
      sent === 0
        ? 'failed'
        : remaining > 0
          ? 'draft'
          : 'sent';

    await supabase
      .from('marketing_campaigns')
      .update({
        status: finalStatus,
        sent_at:
          remaining === 0 && sent > 0
            ? new Date().toISOString()
            : null,
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', campaignId);

    return NextResponse.json({
      ok: sent > 0,
      campaignId,
      template: TEMPLATE_NAME,
      attempted: recipients.length,
      sent,
      failed,
      remaining,
      status: finalStatus,
      errors,
      message:
        remaining > 0
          ? `${sent} messaggi inviati, ${failed} errori. Restano ${remaining} destinatari.`
          : `${sent} messaggi inviati, ${failed} errori. Invio completato.`,
    });
  } catch (error) {
    console.error(
      'Errore invio campagna WhatsApp:',
      error
    );

    return rispostaErrore(
      error instanceof Error
        ? error.message
        : 'Errore interno durante l’invio.',
      500
    );
  }
}
