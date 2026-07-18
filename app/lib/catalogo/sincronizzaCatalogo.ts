import type { SupabaseClient } from '@supabase/supabase-js';

export type RigaCatalogo = {
  descrizione: string;
  categoria?: string;
  unitaMisura?: string;
  quantita?: number;
  prezzoUnitario?: number;
};

type RisultatoCatalogo = {
  prodottiCreati: number;
  prodottiAggiornati: number;
  aliasCreati: number;
};

function numero(value: unknown): number {
  const risultato = Number(value);

  return Number.isFinite(risultato)
    ? risultato
    : 0;
}

function normalizzaNome(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function sincronizzaCatalogo({
  supabase,
  righe,
  fornitore,
  dataDocumento,
}: {
  supabase: SupabaseClient;
  righe: RigaCatalogo[];
  fornitore: string;
  dataDocumento: string;
}): Promise<RisultatoCatalogo> {
  let prodottiCreati = 0;
  let prodottiAggiornati = 0;
  let aliasCreati = 0;

  for (const riga of righe) {
    const descrizione = riga.descrizione?.trim();

    if (!descrizione) {
      continue;
    }

    const nomeNormalizzato =
      normalizzaNome(descrizione);

    if (!nomeNormalizzato) {
      continue;
    }

    const quantita = numero(riga.quantita);
    const prezzoUnitario = numero(
      riga.prezzoUnitario
    );

    /*
     * 1. Cerchiamo prima un alias già conosciuto.
     */
    const {
      data: aliasEsistente,
      error: erroreAlias,
    } = await supabase
      .from('prodotti_alias')
      .select('prodotto_id')
      .eq('alias', nomeNormalizzato)
      .maybeSingle();

    if (erroreAlias) {
      throw erroreAlias;
    }

    let prodottoId =
      aliasEsistente?.prodotto_id || '';

    /*
     * 2. Se non esiste un alias, cerchiamo il prodotto
     *    tramite il nome normalizzato.
     */
    if (!prodottoId) {
      const {
        data: prodottoEsistente,
        error: erroreRicercaProdotto,
      } = await supabase
        .from('prodotti')
        .select(`
          id,
          ultimo_prezzo,
          prezzo_medio,
          prezzo_minimo,
          prezzo_massimo,
          totale_acquisti,
          totale_quantita
        `)
        .eq(
          'nome_normalizzato',
          nomeNormalizzato
        )
        .maybeSingle();

      if (erroreRicercaProdotto) {
        throw erroreRicercaProdotto;
      }

      prodottoId =
        prodottoEsistente?.id || '';

      /*
       * 3. Se non esiste, creiamo il nuovo prodotto.
       */
      if (!prodottoId) {
        const prezzoIniziale =
          prezzoUnitario > 0
            ? prezzoUnitario
            : 0;

        const {
          data: nuovoProdotto,
          error: erroreCreazioneProdotto,
        } = await supabase
          .from('prodotti')
          .insert({
            nome: descrizione,
            nome_normalizzato:
              nomeNormalizzato,

            categoria:
              riga.categoria ||
              'Da classificare',

            unita_misura:
              riga.unitaMisura || 'pz',

            ultimo_prezzo:
              prezzoIniziale,
            prezzo_medio:
              prezzoIniziale,
            prezzo_minimo:
              prezzoIniziale,
            prezzo_massimo:
              prezzoIniziale,

            ultimo_fornitore:
              fornitore,

            ultima_data_acquisto:
              dataDocumento,

            totale_acquisti: 1,
            totale_quantita:
              quantita,

            creato_il:
              new Date().toISOString(),

            aggiornato_il:
              new Date().toISOString(),
          })
          .select('id')
          .single();

        if (erroreCreazioneProdotto) {
          throw erroreCreazioneProdotto;
        }

        prodottoId = nuovoProdotto.id;
        prodottiCreati += 1;
      } else {
        /*
         * 4. Il prodotto esiste:
         *    aggiorniamo prezzi e statistiche.
         */
        const acquistiPrecedenti = numero(
          prodottoEsistente?.totale_acquisti
        );

        const quantitaPrecedente = numero(
          prodottoEsistente?.totale_quantita
        );

        const prezzoMedioPrecedente = numero(
          prodottoEsistente?.prezzo_medio
        );

        const valorePrecedente =
          quantitaPrecedente *
          prezzoMedioPrecedente;

        const valoreNuovo =
          quantita * prezzoUnitario;

        const nuovaQuantitaTotale =
          quantitaPrecedente + quantita;

        const nuovoPrezzoMedio =
          nuovaQuantitaTotale > 0
            ? (
                valorePrecedente +
                valoreNuovo
              ) / nuovaQuantitaTotale
            : prezzoUnitario;

        const prezzoMinimoPrecedente =
          numero(
            prodottoEsistente?.prezzo_minimo
          );

        const prezzoMassimoPrecedente =
          numero(
            prodottoEsistente?.prezzo_massimo
          );

        const nuovoPrezzoMinimo =
          prezzoUnitario > 0
            ? prezzoMinimoPrecedente > 0
              ? Math.min(
                  prezzoMinimoPrecedente,
                  prezzoUnitario
                )
              : prezzoUnitario
            : prezzoMinimoPrecedente;

        const nuovoPrezzoMassimo =
          prezzoUnitario > 0
            ? Math.max(
                prezzoMassimoPrecedente,
                prezzoUnitario
              )
            : prezzoMassimoPrecedente;

        const {
          error: erroreAggiornamento,
        } = await supabase
          .from('prodotti')
          .update({
            categoria:
              riga.categoria ||
              'Da classificare',

            unita_misura:
              riga.unitaMisura || 'pz',

            ultimo_prezzo:
              prezzoUnitario,

            prezzo_medio:
              nuovoPrezzoMedio,

            prezzo_minimo:
              nuovoPrezzoMinimo,

            prezzo_massimo:
              nuovoPrezzoMassimo,

            ultimo_fornitore:
              fornitore,

            ultima_data_acquisto:
              dataDocumento,

            totale_acquisti:
              acquistiPrecedenti + 1,

            totale_quantita:
              nuovaQuantitaTotale,

            aggiornato_il:
              new Date().toISOString(),
          })
          .eq('id', prodottoId);

        if (erroreAggiornamento) {
          throw erroreAggiornamento;
        }

        prodottiAggiornati += 1;
      }
    } else {
      /*
       * 5. L’alias esiste già:
       *    leggiamo il prodotto collegato e aggiorniamo
       *    le sue statistiche.
       */
      const {
        data: prodottoAlias,
        error: erroreProdottoAlias,
      } = await supabase
        .from('prodotti')
        .select(`
          ultimo_prezzo,
          prezzo_medio,
          prezzo_minimo,
          prezzo_massimo,
          totale_acquisti,
          totale_quantita
        `)
        .eq('id', prodottoId)
        .single();

      if (erroreProdottoAlias) {
        throw erroreProdottoAlias;
      }

      const quantitaPrecedente = numero(
        prodottoAlias.totale_quantita
      );

      const prezzoMedioPrecedente = numero(
        prodottoAlias.prezzo_medio
      );

      const valorePrecedente =
        quantitaPrecedente *
        prezzoMedioPrecedente;

      const valoreNuovo =
        quantita * prezzoUnitario;

      const nuovaQuantitaTotale =
        quantitaPrecedente + quantita;

      const nuovoPrezzoMedio =
        nuovaQuantitaTotale > 0
          ? (
              valorePrecedente +
              valoreNuovo
            ) / nuovaQuantitaTotale
          : prezzoUnitario;

      const prezzoMinimoPrecedente =
        numero(
          prodottoAlias.prezzo_minimo
        );

      const prezzoMassimoPrecedente =
        numero(
          prodottoAlias.prezzo_massimo
        );

      const nuovoPrezzoMinimo =
        prezzoUnitario > 0
          ? prezzoMinimoPrecedente > 0
            ? Math.min(
                prezzoMinimoPrecedente,
                prezzoUnitario
              )
            : prezzoUnitario
          : prezzoMinimoPrecedente;

      const nuovoPrezzoMassimo =
        prezzoUnitario > 0
          ? Math.max(
              prezzoMassimoPrecedente,
              prezzoUnitario
            )
          : prezzoMassimoPrecedente;

      const {
        error: erroreAggiornamentoAlias,
      } = await supabase
        .from('prodotti')
        .update({
          ultimo_prezzo:
            prezzoUnitario,

          prezzo_medio:
            nuovoPrezzoMedio,

          prezzo_minimo:
            nuovoPrezzoMinimo,

          prezzo_massimo:
            nuovoPrezzoMassimo,

          ultimo_fornitore:
            fornitore,

          ultima_data_acquisto:
            dataDocumento,

          totale_acquisti:
            numero(
              prodottoAlias.totale_acquisti
            ) + 1,

          totale_quantita:
            nuovaQuantitaTotale,

          aggiornato_il:
            new Date().toISOString(),
        })
        .eq('id', prodottoId);

      if (erroreAggiornamentoAlias) {
        throw erroreAggiornamentoAlias;
      }

      prodottiAggiornati += 1;
    }

    /*
     * 6. Salviamo l’alias per riconoscere
     *    automaticamente questo nome in futuro.
     */
    if (!aliasEsistente && prodottoId) {
      const {
        error: erroreNuovoAlias,
      } = await supabase
        .from('prodotti_alias')
        .insert({
          alias: nomeNormalizzato,
          prodotto_id: prodottoId,
          affidabilita: 100,
          creato_il:
            new Date().toISOString(),
        });

      if (
        erroreNuovoAlias &&
        erroreNuovoAlias.code !== '23505'
      ) {
        throw erroreNuovoAlias;
      }

      if (!erroreNuovoAlias) {
        aliasCreati += 1;
      }
    }
  }

  return {
    prodottiCreati,
    prodottiAggiornati,
    aliasCreati,
  };
}