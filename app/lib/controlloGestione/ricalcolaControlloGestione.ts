// app/lib/controlloGestione/ricalcolaControlloGestione.ts

export type LivelloSalute =
  | 'neutro'
  | 'positivo'
  | 'attenzione'
  | 'critico';

export type CostiControlloGestione = {
  materiePrime: number;
  personale: number;
  materialiConsumo: number;
  utenze: number;
  affitto: number;
  servizi: number;
  manutenzioni: number;
  altriCosti: number;
};

export type DatiPeriodoControlloGestione = {
  fatturato: number;
  coperti?: number;
  numeroGiornate?: number;
  numeroOperazioni?: number;

  /**
   * Valori già forniti da Bacco.
   * Il gestionale non li ricalcola: li conserva come input.
   */
  scontrinoMedioBacco?: number;
  mediaGiornalieraBacco?: number;

  costi?: Partial<CostiControlloGestione>;
};

export type InputControlloGestione = {
  periodoCorrente: DatiPeriodoControlloGestione;

  /**
   * Facoltativo.
   * Serve per confrontare la salute aziendale con il periodo precedente.
   */
  periodoPrecedente?: DatiPeriodoControlloGestione;

  /**
   * Obiettivi modificabili in futuro dalle impostazioni.
   */
  soglie?: Partial<SoglieControlloGestione>;
};

export type SoglieControlloGestione = {
  materiePrimeObiettivo: number;
  materiePrimeAttenzione: number;
  materiePrimeCritico: number;

  personaleObiettivo: number;
  personaleAttenzione: number;
  personaleCritico: number;

  costiTotaliAttenzione: number;
  costiTotaliCritico: number;

  marginePositivo: number;
  margineAttenzione: number;

  variazioneNegativaFatturato: number;
  variazioneCriticaFatturato: number;
};

export type PercentualiControlloGestione = {
  materiePrime: number;
  personale: number;
  materialiConsumo: number;
  utenze: number;
  affitto: number;
  servizi: number;
  manutenzioni: number;
  altriCosti: number;
  costiTotali: number;
  margine: number;
};

export type ConfrontoPeriodo = {
  fatturato: number | null;
  costiTotali: number | null;
  margine: number | null;
  materiePrime: number | null;
  personale: number | null;
};

export type IndicatoreSalute = {
  chiave:
    | 'fatturato'
    | 'materiePrime'
    | 'personale'
    | 'costiTotali'
    | 'margine';
  etichetta: string;
  livello: LivelloSalute;
  valore: number;
  unita: 'euro' | 'percentuale';
  messaggio: string;
};

export type SaluteAziendale = {
  livello: LivelloSalute;
  punteggio: number;
  titolo: string;
  sintesi: string;
  motivazioni: string[];
  attenzioni: string[];
  azioniConsigliate: string[];
  indicatorePeggiore?: IndicatoreSalute;
};

export type RisultatoControlloGestione = {
  fatturato: number;
  coperti: number;
  numeroGiornate: number;
  numeroOperazioni: number;

  /**
   * Copiati da Bacco, non ricalcolati.
   */
  scontrinoMedioBacco: number;
  mediaGiornalieraBacco: number;

  costi: CostiControlloGestione;
  costiTotali: number;
  margineOperativo: number;

  percentuali: PercentualiControlloGestione;
  confronto: ConfrontoPeriodo;
  indicatori: IndicatoreSalute[];
  salute: SaluteAziendale;
};

const COSTI_ZERO: CostiControlloGestione = {
  materiePrime: 0,
  personale: 0,
  materialiConsumo: 0,
  utenze: 0,
  affitto: 0,
  servizi: 0,
  manutenzioni: 0,
  altriCosti: 0,
};

const SOGLIE_DEFAULT: SoglieControlloGestione = {
  materiePrimeObiettivo: 30,
  materiePrimeAttenzione: 33,
  materiePrimeCritico: 36,

  personaleObiettivo: 30,
  personaleAttenzione: 33,
  personaleCritico: 36,

  costiTotaliAttenzione: 80,
  costiTotaliCritico: 90,

  marginePositivo: 20,
  margineAttenzione: 10,

  variazioneNegativaFatturato: -5,
  variazioneCriticaFatturato: -12,
};

function numeroSicuro(value: unknown): number {
  const risultato = Number(value);

  return Number.isFinite(risultato)
    ? risultato
    : 0;
}

function importoNonNegativo(value: unknown): number {
  return Math.max(0, numeroSicuro(value));
}

function arrotonda(
  value: number,
  decimali = 2
): number {
  const fattore = 10 ** decimali;

  return (
    Math.round(
      (value + Number.EPSILON) * fattore
    ) / fattore
  );
}

function percentuale(
  valore: number,
  fatturato: number
): number {
  if (fatturato <= 0) {
    return 0;
  }

  return (valore / fatturato) * 100;
}

function variazionePercentuale(
  corrente: number,
  precedente: number
): number | null {
  if (precedente <= 0) {
    return null;
  }

  return arrotonda(
    ((corrente - precedente) / precedente) * 100
  );
}

function normalizzaCosti(
  costi?: Partial<CostiControlloGestione>
): CostiControlloGestione {
  return {
    materiePrime: importoNonNegativo(
      costi?.materiePrime
    ),
    personale: importoNonNegativo(
      costi?.personale
    ),
    materialiConsumo: importoNonNegativo(
      costi?.materialiConsumo
    ),
    utenze: importoNonNegativo(
      costi?.utenze
    ),
    affitto: importoNonNegativo(
      costi?.affitto
    ),
    servizi: importoNonNegativo(
      costi?.servizi
    ),
    manutenzioni: importoNonNegativo(
      costi?.manutenzioni
    ),
    altriCosti: importoNonNegativo(
      costi?.altriCosti
    ),
  };
}

function totaleCosti(
  costi: CostiControlloGestione
): number {
  return Object.values(costi).reduce(
    (somma, valore) => somma + valore,
    0
  );
}

function calcolaPercentuali({
  fatturato,
  costi,
}: {
  fatturato: number;
  costi: CostiControlloGestione;
}): PercentualiControlloGestione {
  const costiTotali = totaleCosti(costi);
  const margine = fatturato - costiTotali;

  return {
    materiePrime: arrotonda(
      percentuale(costi.materiePrime, fatturato)
    ),
    personale: arrotonda(
      percentuale(costi.personale, fatturato)
    ),
    materialiConsumo: arrotonda(
      percentuale(costi.materialiConsumo, fatturato)
    ),
    utenze: arrotonda(
      percentuale(costi.utenze, fatturato)
    ),
    affitto: arrotonda(
      percentuale(costi.affitto, fatturato)
    ),
    servizi: arrotonda(
      percentuale(costi.servizi, fatturato)
    ),
    manutenzioni: arrotonda(
      percentuale(costi.manutenzioni, fatturato)
    ),
    altriCosti: arrotonda(
      percentuale(costi.altriCosti, fatturato)
    ),
    costiTotali: arrotonda(
      percentuale(costiTotali, fatturato)
    ),
    margine: arrotonda(
      percentuale(margine, fatturato)
    ),
  };
}

function livelloCosto(
  valore: number,
  obiettivo: number,
  attenzione: number,
  critico: number
): LivelloSalute {
  if (valore >= critico) {
    return 'critico';
  }

  if (valore >= attenzione) {
    return 'attenzione';
  }

  if (valore <= obiettivo) {
    return 'positivo';
  }

  return 'attenzione';
}

function indicatoreMateriePrime(
  valore: number,
  soglie: SoglieControlloGestione
): IndicatoreSalute {
  const livello = livelloCosto(
    valore,
    soglie.materiePrimeObiettivo,
    soglie.materiePrimeAttenzione,
    soglie.materiePrimeCritico
  );

  return {
    chiave: 'materiePrime',
    etichetta: 'Materie prime',
    livello,
    valore,
    unita: 'percentuale',
    messaggio:
      livello === 'positivo'
        ? `Materie prime al ${valore.toFixed(1)}%: incidenza sotto controllo.`
        : livello === 'attenzione'
          ? `Materie prime al ${valore.toFixed(1)}%: valore da monitorare.`
          : `Materie prime al ${valore.toFixed(1)}%: incidenza troppo elevata.`,
  };
}

function indicatorePersonale(
  valore: number,
  soglie: SoglieControlloGestione
): IndicatoreSalute {
  const livello = livelloCosto(
    valore,
    soglie.personaleObiettivo,
    soglie.personaleAttenzione,
    soglie.personaleCritico
  );

  return {
    chiave: 'personale',
    etichetta: 'Personale',
    livello,
    valore,
    unita: 'percentuale',
    messaggio:
      livello === 'positivo'
        ? `Personale al ${valore.toFixed(1)}%: costo sotto controllo.`
        : livello === 'attenzione'
          ? `Personale al ${valore.toFixed(1)}%: verificare turni e produttività.`
          : `Personale al ${valore.toFixed(1)}%: incidenza critica sul fatturato.`,
  };
}

function indicatoreCostiTotali(
  valore: number,
  soglie: SoglieControlloGestione
): IndicatoreSalute {
  const livello: LivelloSalute =
    valore >= soglie.costiTotaliCritico
      ? 'critico'
      : valore >= soglie.costiTotaliAttenzione
        ? 'attenzione'
        : 'positivo';

  return {
    chiave: 'costiTotali',
    etichetta: 'Costi totali',
    livello,
    valore,
    unita: 'percentuale',
    messaggio:
      livello === 'positivo'
        ? `I costi totali assorbono il ${valore.toFixed(1)}% del fatturato.`
        : livello === 'attenzione'
          ? `I costi totali assorbono il ${valore.toFixed(1)}%: margine ridotto.`
          : `I costi totali assorbono il ${valore.toFixed(1)}%: situazione critica.`,
  };
}

function indicatoreMargine(
  valore: number,
  soglie: SoglieControlloGestione
): IndicatoreSalute {
  const livello: LivelloSalute =
    valore >= soglie.marginePositivo
      ? 'positivo'
      : valore >= soglie.margineAttenzione
        ? 'attenzione'
        : 'critico';

  return {
    chiave: 'margine',
    etichetta: 'Margine operativo',
    livello,
    valore,
    unita: 'percentuale',
    messaggio:
      livello === 'positivo'
        ? `Margine operativo al ${valore.toFixed(1)}%: risultato positivo.`
        : livello === 'attenzione'
          ? `Margine operativo al ${valore.toFixed(1)}%: margine ridotto.`
          : `Margine operativo al ${valore.toFixed(1)}%: margine insufficiente.`,
  };
}

function indicatoreFatturato(
  variazione: number | null,
  fatturato: number,
  soglie: SoglieControlloGestione
): IndicatoreSalute {
  if (variazione === null) {
    return {
      chiave: 'fatturato',
      etichetta: 'Fatturato',
      livello: fatturato > 0 ? 'neutro' : 'critico',
      valore: fatturato,
      unita: 'euro',
      messaggio:
        fatturato > 0
          ? 'Fatturato disponibile, ma manca un periodo precedente confrontabile.'
          : 'Nessun fatturato disponibile nel periodo selezionato.',
    };
  }

  const livello: LivelloSalute =
    variazione <= soglie.variazioneCriticaFatturato
      ? 'critico'
      : variazione <= soglie.variazioneNegativaFatturato
        ? 'attenzione'
        : variazione > 0
          ? 'positivo'
          : 'neutro';

  return {
    chiave: 'fatturato',
    etichetta: 'Fatturato',
    livello,
    valore: variazione,
    unita: 'percentuale',
    messaggio:
      variazione > 0
        ? `Fatturato in crescita del ${variazione.toFixed(1)}%.`
        : variazione < 0
          ? `Fatturato in calo del ${Math.abs(variazione).toFixed(1)}%.`
          : 'Fatturato stabile rispetto al periodo precedente.',
  };
}

function pesoLivello(
  livello: LivelloSalute
): number {
  switch (livello) {
    case 'positivo':
      return 100;
    case 'neutro':
      return 70;
    case 'attenzione':
      return 45;
    case 'critico':
      return 15;
  }
}

function severita(
  livello: LivelloSalute
): number {
  switch (livello) {
    case 'critico':
      return 4;
    case 'attenzione':
      return 3;
    case 'neutro':
      return 2;
    case 'positivo':
      return 1;
  }
}

function creaSaluteAziendale({
  fatturato,
  indicatori,
}: {
  fatturato: number;
  indicatori: IndicatoreSalute[];
}): SaluteAziendale {
  if (fatturato <= 0) {
    return {
      livello: 'neutro',
      punteggio: 0,
      titolo: 'Dati insufficienti',
      sintesi:
        'Importa gli incassi Bacco e le fatture del periodo per calcolare la salute aziendale.',
      motivazioni: [],
      attenzioni: [
        'Manca il fatturato del periodo selezionato.',
      ],
      azioniConsigliate: [
        'Importa il report incassi giornalieri Bacco.',
        'Verifica che le fatture siano state classificate nel periodo corretto.',
      ],
    };
  }

  const punteggio = arrotonda(
    indicatori.reduce(
      (somma, indicatore) =>
        somma + pesoLivello(indicatore.livello),
      0
    ) / indicatori.length,
    0
  );

  const critici = indicatori.filter(
    (indicatore) =>
      indicatore.livello === 'critico'
  );

  const attenzioni = indicatori.filter(
    (indicatore) =>
      indicatore.livello === 'attenzione'
  );

  const positivi = indicatori.filter(
    (indicatore) =>
      indicatore.livello === 'positivo'
  );

  const indicatorePeggiore = [...indicatori].sort(
    (a, b) =>
      severita(b.livello) - severita(a.livello)
  )[0];

  let livello: LivelloSalute;
  let titolo: string;
  let sintesi: string;

  if (critici.length >= 2 || punteggio < 35) {
    livello = 'critico';
    titolo = 'Azienda in difficoltà';
    sintesi =
      'Uno o più costi stanno comprimendo seriamente il margine. Serve intervenire rapidamente.';
  } else if (
    critici.length === 1 ||
    attenzioni.length >= 2 ||
    punteggio < 65
  ) {
    livello = 'attenzione';
    titolo = 'Azienda da monitorare';
    sintesi =
      'La gestione è operativa, ma alcuni indicatori richiedono attenzione.';
  } else {
    livello = 'positivo';
    titolo = 'Azienda in salute';
    sintesi =
      'I principali indicatori economici risultano sotto controllo.';
  }

  const azioniConsigliate: string[] = [];

  if (
    indicatori.some(
      (indicatore) =>
        indicatore.chiave === 'materiePrime' &&
        indicatore.livello !== 'positivo'
    )
  ) {
    azioniConsigliate.push(
      'Controlla gli aumenti dei fornitori e le quantità acquistate.',
      'Verifica food cost, sprechi e differenze inventariali.'
    );
  }

  if (
    indicatori.some(
      (indicatore) =>
        indicatore.chiave === 'personale' &&
        indicatore.livello !== 'positivo'
    )
  ) {
    azioniConsigliate.push(
      'Confronta costo del personale, turni e fatturato per fascia oraria.'
    );
  }

  if (
    indicatori.some(
      (indicatore) =>
        indicatore.chiave === 'fatturato' &&
        indicatore.livello === 'critico'
    )
  ) {
    azioniConsigliate.push(
      'Analizza i giorni e le fasce con maggiore calo di fatturato.'
    );
  }

  if (
    indicatori.some(
      (indicatore) =>
        indicatore.chiave === 'margine' &&
        indicatore.livello !== 'positivo'
    )
  ) {
    azioniConsigliate.push(
      'Rivedi prezzi di vendita, costi fissi e prodotti con margine più basso.'
    );
  }

  return {
    livello,
    punteggio,
    titolo,
    sintesi,
    motivazioni: positivi.map(
      (indicatore) => indicatore.messaggio
    ),
    attenzioni: [...critici, ...attenzioni].map(
      (indicatore) => indicatore.messaggio
    ),
    azioniConsigliate:
      azioniConsigliate.length > 0
        ? Array.from(new Set(azioniConsigliate))
        : [
            'Continua a importare quotidianamente incassi e fatture.',
            'Confronta il periodo con quello precedente.',
          ],
    indicatorePeggiore,
  };
}

/**
 * Motore centrale del controllo di gestione.
 *
 * BACCO fornisce:
 * - fatturato;
 * - coperti;
 * - giornate;
 * - operazioni;
 * - scontrino medio;
 * - media giornaliera.
 *
 * Il gestionale aggiunge:
 * - costi da Aruba e personale;
 * - percentuali;
 * - margine;
 * - confronto con il periodo precedente;
 * - diagnosi della salute aziendale;
 * - azioni consigliate.
 */
export function ricalcolaControlloGestione(
  input: InputControlloGestione
): RisultatoControlloGestione {
  const soglie: SoglieControlloGestione = {
    ...SOGLIE_DEFAULT,
    ...input.soglie,
  };

  const corrente = input.periodoCorrente;
  const precedente = input.periodoPrecedente;

  const fatturato = importoNonNegativo(
    corrente.fatturato
  );

  const coperti = Math.round(
    importoNonNegativo(corrente.coperti)
  );

  const numeroGiornate = Math.round(
    importoNonNegativo(
      corrente.numeroGiornate
    )
  );

  const numeroOperazioni = Math.round(
    importoNonNegativo(
      corrente.numeroOperazioni
    )
  );

  const scontrinoMedioBacco =
    importoNonNegativo(
      corrente.scontrinoMedioBacco
    );

  const mediaGiornalieraBacco =
    importoNonNegativo(
      corrente.mediaGiornalieraBacco
    );

  const costi = normalizzaCosti(
    corrente.costi
  );

  const costiTotali = totaleCosti(costi);
  const margineOperativo =
    fatturato - costiTotali;

  const percentuali =
    calcolaPercentuali({
      fatturato,
      costi,
    });

  const costiPrecedenti = precedente
    ? normalizzaCosti(precedente.costi)
    : COSTI_ZERO;

  const totaleCostiPrecedente = precedente
    ? totaleCosti(costiPrecedenti)
    : 0;

  const marginePrecedente = precedente
    ? importoNonNegativo(
        precedente.fatturato
      ) - totaleCostiPrecedente
    : 0;

  const confronto: ConfrontoPeriodo = {
    fatturato: precedente
      ? variazionePercentuale(
          fatturato,
          importoNonNegativo(
            precedente.fatturato
          )
        )
      : null,

    costiTotali: precedente
      ? variazionePercentuale(
          costiTotali,
          totaleCostiPrecedente
        )
      : null,

    margine: precedente
      ? variazionePercentuale(
          margineOperativo,
          marginePrecedente
        )
      : null,

    materiePrime: precedente
      ? arrotonda(
          percentuali.materiePrime -
            calcolaPercentuali({
              fatturato:
                importoNonNegativo(
                  precedente.fatturato
                ),
              costi: costiPrecedenti,
            }).materiePrime
        )
      : null,

    personale: precedente
      ? arrotonda(
          percentuali.personale -
            calcolaPercentuali({
              fatturato:
                importoNonNegativo(
                  precedente.fatturato
                ),
              costi: costiPrecedenti,
            }).personale
        )
      : null,
  };

  const indicatori: IndicatoreSalute[] = [
    indicatoreFatturato(
      confronto.fatturato,
      fatturato,
      soglie
    ),
    indicatoreMateriePrime(
      percentuali.materiePrime,
      soglie
    ),
    indicatorePersonale(
      percentuali.personale,
      soglie
    ),
    indicatoreCostiTotali(
      percentuali.costiTotali,
      soglie
    ),
    indicatoreMargine(
      percentuali.margine,
      soglie
    ),
  ];

  const salute = creaSaluteAziendale({
    fatturato,
    indicatori,
  });

  return {
    fatturato: arrotonda(fatturato),
    coperti,
    numeroGiornate,
    numeroOperazioni,

    scontrinoMedioBacco: arrotonda(
      scontrinoMedioBacco
    ),

    mediaGiornalieraBacco: arrotonda(
      mediaGiornalieraBacco
    ),

    costi: {
      materiePrime: arrotonda(
        costi.materiePrime
      ),
      personale: arrotonda(
        costi.personale
      ),
      materialiConsumo: arrotonda(
        costi.materialiConsumo
      ),
      utenze: arrotonda(costi.utenze),
      affitto: arrotonda(costi.affitto),
      servizi: arrotonda(costi.servizi),
      manutenzioni: arrotonda(
        costi.manutenzioni
      ),
      altriCosti: arrotonda(
        costi.altriCosti
      ),
    },

    costiTotali: arrotonda(costiTotali),
    margineOperativo: arrotonda(
      margineOperativo
    ),

    percentuali,
    confronto,
    indicatori,
    salute,
  };
}
