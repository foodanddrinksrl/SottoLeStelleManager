import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FORMATI_IMMAGINE_AMMESSI = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const schemaBolla = {
  type: 'object',
  additionalProperties: false,
  properties: {
    successo: {
      type: 'boolean',
    },
    messaggio: {
      type: 'string',
    },
    fornitore: {
      type: 'string',
    },
    partitaIvaFornitore: {
      type: 'string',
    },
    numeroDocumento: {
      type: 'string',
    },
    dataDocumento: {
      type: 'string',
    },
    imponibile: {
      type: 'number',
    },
    iva: {
      type: 'number',
    },
    totaleDocumento: {
      type: 'number',
    },
    righe: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          codiceArticolo: {
            type: 'string',
          },
          descrizioneOriginale: {
            type: 'string',
          },
          descrizione: {
            type: 'string',
          },
          quantita: {
            type: 'number',
          },
          unitaMisura: {
            type: 'string',
          },
          prezzoUnitario: {
            type: 'number',
          },
          totaleRiga: {
            type: 'number',
          },
          aliquotaIva: {
            type: 'number',
          },
          categoria: {
            type: 'string',
            enum: [
              'Materie prime',
              'Materiali consumo',
              'Costi fissi',
              'Straordinari',
              'Da classificare',
            ],
          },
          aggiornaMagazzino: {
            type: 'boolean',
          },
          affidabilitaAI: {
            type: 'number',
          },
        },
        required: [
          'codiceArticolo',
          'descrizioneOriginale',
          'descrizione',
          'quantita',
          'unitaMisura',
          'prezzoUnitario',
          'totaleRiga',
          'aliquotaIva',
          'categoria',
          'aggiornaMagazzino',
          'affidabilitaAI',
        ],
      },
    },
    avvisi: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: [
    'successo',
    'messaggio',
    'fornitore',
    'partitaIvaFornitore',
    'numeroDocumento',
    'dataDocumento',
    'imponibile',
    'iva',
    'totaleDocumento',
    'righe',
    'avvisi',
  ],
} as const;

function rispostaErrore(
  messaggio: string,
  status = 400
): NextResponse {
  return NextResponse.json(
    {
      successo: false,
      messaggio,
    },
    {
      status,
    }
  );
}

export async function POST(
  request: Request
): Promise<NextResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return rispostaErrore(
        'OPENAI_API_KEY non configurata nel server.',
        500
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return rispostaErrore(
        'Nessuna immagine ricevuta. Il campo deve chiamarsi "file".'
      );
    }

    if (!FORMATI_IMMAGINE_AMMESSI.has(file.type)) {
      return rispostaErrore(
        'Formato non supportato. Usa JPG, PNG, WEBP o GIF.'
      );
    }

    const dimensioneMassima = 15 * 1024 * 1024;

    if (file.size > dimensioneMassima) {
      return rispostaErrore(
        'Immagine troppo grande. La dimensione massima è 15 MB.'
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    const modello =
      process.env.OPENAI_MODEL?.trim() || 'gpt-5.6';

    const response = await openai.responses.create({
      model: modello,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `
Analizza questa fotografia di una bolla, un buono di consegna
o un documento di ricevimento merci di un ristorante o pizzeria italiana.

Devi interpretare anche:
- scrittura a mano;
- abbreviazioni, per esempio "mozz" = mozzarella e "ric" = ricotta;
- virgola italiana come separatore decimale;
- quantità espresse in kg, g, l, ml, pezzi o cartoni;
- documenti con un solo totale complessivo e senza prezzi per ogni riga.

Regole:
1. Non inventare dati illeggibili.
2. Usa una stringa vuota o zero quando un dato non è presente.
3. In "descrizioneOriginale" conserva ciò che leggi sul documento.
4. In "descrizione" proponi il nome corretto e completo del prodotto.
5. Le merci alimentari sono normalmente "Materie prime".
6. Carta, detergenti, contenitori e monouso sono "Materiali consumo".
7. Se non sei sicuro usa "Da classificare".
8. "aggiornaMagazzino" deve essere true per le merci fisiche ricevute.
9. Inserisci in "avvisi" ogni dubbio o dato mancante.
10. La data deve essere nel formato YYYY-MM-DD.
11. "affidabilitaAI" deve essere compresa tra 0 e 100.
              `.trim(),
            },
            {
              type: 'input_image',
              image_url: dataUrl,
              detail: 'high',
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'lettura_bolla_ricevimento',
          description:
            'Dati strutturati estratti da una bolla di ricevimento merci.',
          strict: true,
          schema: schemaBolla,
        },
      },
    });

    if (!response.output_text) {
      return rispostaErrore(
        'Il modello non ha restituito dati leggibili.',
        502
      );
    }

    const risultato: unknown = JSON.parse(
      response.output_text
    );

    return NextResponse.json(risultato);
  } catch (error) {
    console.error('Errore ricevimento-ai:', error);

    const messaggio =
      error instanceof Error
        ? error.message
        : 'Errore sconosciuto durante la lettura AI.';

    return rispostaErrore(messaggio, 500);
  }
}
