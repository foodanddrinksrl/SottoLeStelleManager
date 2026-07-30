import type {
  DocumentoAcquistoSalvato,
  StoricoImportazioneAcquisti,
} from './acquistiStorage';

type RispostaBase = {
  ok?: boolean;
  error?: string;
};

type RispostaAcquisti = RispostaBase & {
  documenti?: DocumentoAcquistoSalvato[];
};

type RispostaSalvataggioAcquisti = RispostaBase & {
  ricevuti?: number;
  salvati?: number;
};

export type RisultatoSalvataggioAcquisti = {
  ricevuti: number;
  salvati: number;
};

async function leggiRispostaJson<T>(
  risposta: Response
): Promise<T> {
  try {
    return (await risposta.json()) as T;
  } catch {
    throw new Error(
      'Il server ha restituito una risposta non valida.'
    );
  }
}

async function richiestaApi<T>(
  url: string,
  opzioni?: RequestInit
): Promise<T> {
  const risposta = await fetch(url, {
    cache: 'no-store',
    ...opzioni,
    headers: {
      'Content-Type': 'application/json',
      ...(opzioni?.headers || {}),
    },
  });

  const risultato = await leggiRispostaJson<
    T & RispostaBase
  >(risposta);

  if (!risposta.ok || risultato.ok === false) {
    throw new Error(
      risultato.error ||
        `Errore nella richiesta al server (${risposta.status}).`
    );
  }

  return risultato;
}

async function caricaAcquisti():
  Promise<DocumentoAcquistoSalvato[]> {
  const risultato =
    await richiestaApi<RispostaAcquisti>(
      '/api/acquisti'
    );

  return Array.isArray(risultato.documenti)
    ? risultato.documenti
    : [];
}

async function salvaAcquisti(
  documenti: DocumentoAcquistoSalvato[]
): Promise<RisultatoSalvataggioAcquisti> {
  if (!Array.isArray(documenti) || documenti.length === 0) {
    throw new Error(
      'Non ci sono documenti da salvare.'
    );
  }

  const risultato =
    await richiestaApi<RispostaSalvataggioAcquisti>(
      '/api/acquisti',
      {
        method: 'POST',
        body: JSON.stringify({
          documenti,
        }),
      }
    );

  return {
    ricevuti: risultato.ricevuti || 0,
    salvati: risultato.salvati || 0,
  };
}

/*
 * Questa sarà l’unica porta utilizzata dai componenti
 * del gestionale per leggere e salvare i dati.
 *
 * Aggiungeremo progressivamente:
 * database.dipendenti
 * database.turni
 * database.incassi
 * database.produzione
 * database.marketing
 */
export const database = {
  acquisti: {
    caricaTutti: caricaAcquisti,
    salva: salvaAcquisti,
  },
};

/*
 * Tipo già predisposto per collegare successivamente
 * lo storico delle importazioni a Supabase.
 */
export type StoricoAcquistiDatabase =
  StoricoImportazioneAcquisti;