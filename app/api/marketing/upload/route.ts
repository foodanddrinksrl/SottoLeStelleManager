import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

const BUCKET_NAME = 'marketing-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function sanitizeFileName(fileName: string) {
  const extension = fileName.includes('.')
    ? `.${fileName.split('.').pop()?.toLowerCase()}`
    : '';

  const nameWithoutExtension = fileName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${nameWithoutExtension || 'immagine'}${extension}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return errorResponse(
        'Nessuna immagine ricevuta.'
      );
    }

    if (!file.type.startsWith('image/')) {
      return errorResponse(
        'Il file selezionato non è un’immagine valida.'
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(
        'L’immagine non può superare 5 MB.'
      );
    }

    const supabase = getSupabaseAdmin();

    const safeFileName = sanitizeFileName(file.name);

    const filePath = [
      new Date().getFullYear(),
      String(new Date().getMonth() + 1).padStart(2, '0'),
      `${Date.now()}-${safeFileName}`,
    ].join('/');

    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } =
      await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

    if (uploadError) {
      console.error(
        'Errore caricamento immagine:',
        uploadError
      );

      return errorResponse(
        uploadError.message ||
          'Non è stato possibile caricare l’immagine.',
        500
      );
    }

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json(
      {
        ok: true,
        imageUrl: data.publicUrl,
        path: filePath,
        fileName: safeFileName,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      'Errore API upload marketing:',
      error
    );

    return errorResponse(
      'Errore interno durante il caricamento.',
      500
    );
  }
}