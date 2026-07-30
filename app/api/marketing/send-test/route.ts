import { NextResponse } from 'next/server';

type SendTestBody = {
  phone?: string;
};

function normalizePhone(value?: string) {
  let phone = String(value ?? '').replace(/\D/g, '');

  if (phone.startsWith('0039')) {
    phone = phone.slice(2);
  }

  if (phone.startsWith('00')) {
    phone = phone.slice(2);
  }

  if (
    !phone.startsWith('39') &&
    phone.length === 10
  ) {
    phone = `39${phone}`;
  }

  return phone;
}

function isValidPhone(phone: string) {
  return phone.length >= 11 && phone.length <= 15;
}

export async function POST(request: Request) {
  try {
    const accessToken =
      process.env.WHATSAPP_ACCESS_TOKEN;

    const phoneNumberId =
      process.env.WHATSAPP_PHONE_NUMBER_ID;

    const graphApiVersion =
      process.env.WHATSAPP_GRAPH_API_VERSION ||
      'v25.0';

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Manca WHATSAPP_ACCESS_TOKEN nel file .env.local.',
        },
        { status: 500 }
      );
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Manca WHATSAPP_PHONE_NUMBER_ID nel file .env.local.',
        },
        { status: 500 }
      );
    }

    const body =
      (await request.json()) as SendTestBody;

    const phone =
      normalizePhone(body.phone);

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Inserisci un numero valido con prefisso internazionale.',
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          messaging_product:
            'whatsapp',
          recipient_type:
            'individual',
          to: phone,
          type: 'template',
          template: {
            name: 'hello_world',
            language: {
              code: 'en_US',
            },
          },
        }),
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      console.error(
        'Errore WhatsApp Cloud API:',
        result
      );

      const apiMessage =
        result?.error?.message ||
        'Meta non ha accettato il messaggio.';

      return NextResponse.json(
        {
          ok: false,
          error: apiMessage,
          details: result,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        'Messaggio di prova inviato.',
      whatsappMessageId:
        result?.messages?.[0]?.id ??
        null,
      result,
    });
  } catch (error) {
    console.error(
      'Errore invio test WhatsApp:',
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Errore interno durante l’invio.',
      },
      { status: 500 }
    );
  }
}
