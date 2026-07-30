import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

type ContactInput = {
  name?: string | null;
  phone?: string;
  whatsappValid?: boolean;
};

type NormalizedContact = {
  name: string | null;
  phone: string;
  lot: string;
  whatsapp_valid: boolean;
  active: boolean;
  updated_at: string;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message },
    { status }
  );
}

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

function chunkArray<T>(
  items: T[],
  size: number
): T[][] {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    chunks.push(
      items.slice(index, index + size)
    );
  }

  return chunks;
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as {
        contacts?: ContactInput[];
      };

    const contacts = body.contacts ?? [];

    if (
      !Array.isArray(contacts) ||
      contacts.length === 0
    ) {
      return errorResponse(
        'Nessun contatto ricevuto.'
      );
    }

    if (contacts.length > 5000) {
      return errorResponse(
        'Importazione troppo grande: massimo 5.000 contatti per richiesta.'
      );
    }

    const now = new Date().toISOString();

    /*
     * Tutti i file confluiscono nello stesso archivio.
     * Il valore ARCHIVIO viene usato solo internamente
     * per compatibilità con la colonna "lot" già presente
     * nella tabella Supabase.
     */
    const normalized: NormalizedContact[] =
      contacts
        .map((contact) => ({
          name:
            String(contact.name ?? '').trim() ||
            null,
          phone: normalizePhone(
            contact.phone
          ),
          lot: 'ARCHIVIO',
          whatsapp_valid:
            contact.whatsappValid !== false,
          active: true,
          updated_at: now,
        }))
        .filter((contact) =>
          isValidPhone(contact.phone)
        );

    const uniqueInFile = Array.from(
      new Map(
        normalized.map((contact) => [
          contact.phone,
          contact,
        ])
      ).values()
    );

    const duplicatesInFile =
      normalized.length -
      uniqueInFile.length;

    if (uniqueInFile.length === 0) {
      return errorResponse(
        'Nessun numero valido trovato nel file.'
      );
    }

    const supabase =
      getSupabaseAdmin();

    const phones = uniqueInFile.map(
      (contact) => contact.phone
    );

    const existingPhones =
      new Set<string>();

    for (
      const phoneChunk of chunkArray(
        phones,
        500
      )
    ) {
      const { data, error } =
        await supabase
          .from('marketing_contacts')
          .select('phone')
          .in('phone', phoneChunk);

      if (error) {
        console.error(
          'Errore controllo duplicati:',
          error
        );

        return errorResponse(
          error.message ||
            'Impossibile controllare i contatti già presenti.',
          500
        );
      }

      for (const row of data ?? []) {
        if (row.phone) {
          existingPhones.add(
            String(row.phone)
          );
        }
      }
    }

    const newContacts =
      uniqueInFile.filter(
        (contact) =>
          !existingPhones.has(
            contact.phone
          )
      );

    const duplicatesInArchive =
      uniqueInFile.length -
      newContacts.length;

    if (newContacts.length === 0) {
      return NextResponse.json({
        ok: true,
        received: contacts.length,
        valid: normalized.length,
        uniqueInFile:
          uniqueInFile.length,
        duplicatesInFile,
        duplicatesInArchive,
        inserted: 0,
        message:
          'Nessun nuovo contatto: tutti i numeri erano già presenti.',
      });
    }

    let inserted = 0;

    for (
      const contactChunk of chunkArray(
        newContacts,
        500
      )
    ) {
      const { data, error } =
        await supabase
          .from('marketing_contacts')
          .insert(contactChunk)
          .select('id');

      if (error) {
        console.error(
          'Errore import contatti:',
          error
        );

        return errorResponse(
          error.message ||
            'Importazione non riuscita.',
          500
        );
      }

      inserted +=
        data?.length ?? 0;
    }

    return NextResponse.json({
      ok: true,
      received: contacts.length,
      valid: normalized.length,
      uniqueInFile:
        uniqueInFile.length,
      duplicatesInFile,
      duplicatesInArchive,
      inserted,
      message: `${inserted} nuovi contatti inseriti. ${
        duplicatesInFile +
        duplicatesInArchive
      } doppioni ignorati.`,
    });
  } catch (error) {
    console.error(
      'Errore API import contatti:',
      error
    );

    return errorResponse(
      'Errore interno durante l’importazione.',
      500
    );
  }
}
