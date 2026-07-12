import JSZip from 'jszip';

/* =========================================================
   FILE E ARCHIVI
========================================================= */

export type FileFatturaEstratto = {
  nome: string;
  contenuto: string;
};

export type RisultatoArchivioFatture = {
  nomeArchivio: string;
  fatture: FileFatturaEstratto[];
  fileIgnorati: string[];
};

/* =========================================================
   RIGHE DELLA FATTURA
========================================================= */

export type RigaFatturaElettronica = {
  numeroLinea: number;

  codiceTipo: string;
  codiceValore: string;

  descrizione: string;

  quantita: number;
  unitaMisura: string;

  prezzoUnitario: number;
  prezzoTotale: number;

  aliquotaIva: number;
  naturaIva: string;

  scontoPercentuale: number;
  scontoImporto: number;

  categoriaProposta: string;
  affidabilita: number;
};

/* =========================================================
   PAGAMENTI E SCADENZE
========================================================= */

export type PagamentoFatturaElettronica = {
  condizioniPagamento: string;
  modalitaPagamento: string;

  dataRiferimentoTermini: string;
  giorniTerminiPagamento: number;
  dataScadenza: string;

  importo: number;

  iban: string;
  istitutoFinanziario: string;
  beneficiario: string;
};

/* =========================================================
   FATTURA ANALIZZATA
========================================================= */

export type FatturaElettronicaAnalizzata = {
  id: string;
  nomeFile: string;

  fornitore: string;
  partitaIva: string;
  codiceFiscale: string;

  data: string;
  numeroDocumento: string;
  tipoDocumento: string;
  divisa: string;

  imponibile: number;
  iva: number;
  totale: number;

  scadenza: string;

  descrizioni: string[];

  righe: RigaFatturaElettronica[];
  pagamenti: PagamentoFatturaElettronica[];
};

export type ErroreAnalisiFattura = {
  nomeFile: string;
  messaggio: string;
};

export type RisultatoAnalisiFatture = {
  fatture: FatturaElettronicaAnalizzata[];
  errori: ErroreAnalisiFattura[];

  totaleImponibile: number;
  totaleIva: number;
  totaleDocumenti: number;

  totaleScadenze: number;
};

/* =========================================================
   LETTURA ZIP / XML
========================================================= */

function leggiEstensione(nomeFile: string): string {
  const parti = nomeFile.toLowerCase().split('.');

  return parti.length > 1 ? parti.pop() || '' : '';
}

async function leggiSingoloXml(
  file: File
): Promise<RisultatoArchivioFatture> {
  const contenuto = await file.text();

  return {
    nomeArchivio: file.name,
    fatture: [
      {
        nome: file.name,
        contenuto,
      },
    ],
    fileIgnorati: [],
  };
}

async function leggiArchivioZip(
  file: File
): Promise<RisultatoArchivioFatture> {
  const buffer = await file.arrayBuffer();
  const archivio = await JSZip.loadAsync(buffer);

  const fatture: FileFatturaEstratto[] = [];
  const fileIgnorati: string[] = [];

  const elementiArchivio = Object.values(archivio.files);

  for (const elementoArchivio of elementiArchivio) {
    if (elementoArchivio.dir) continue;

    const nome = elementoArchivio.name;
    const estensione = leggiEstensione(nome);

    if (estensione === 'xml') {
      const contenuto = await elementoArchivio.async('string');

      fatture.push({
        nome,
        contenuto,
      });
    } else {
      fileIgnorati.push(nome);
    }
  }

  return {
    nomeArchivio: file.name,
    fatture,
    fileIgnorati,
  };
}

export async function estraiFattureDaFile(
  file: File
): Promise<RisultatoArchivioFatture> {
  const estensione = leggiEstensione(file.name);

  if (estensione === 'zip') {
    return leggiArchivioZip(file);
  }

  if (estensione === 'xml') {
    return leggiSingoloXml(file);
  }

  if (estensione === 'p7m') {
    throw new Error(
      'Il formato P7M non è ancora supportato. Per ora utilizza ZIP oppure XML.'
    );
  }

  throw new Error(
    'Formato non valido. Seleziona un archivio ZIP oppure una fattura XML.'
  );
}

/* =========================================================
   FUNZIONI XML
========================================================= */

function elemento(
  nodo: Document | Element,
  nome: string
): Element | null {
  const conNamespace = nodo.getElementsByTagNameNS('*', nome);

  if (conNamespace.length > 0) {
    return conNamespace.item(0);
  }

  const senzaNamespace = nodo.getElementsByTagName(nome);

  return senzaNamespace.length > 0
    ? senzaNamespace.item(0)
    : null;
}

function elementi(
  nodo: Document | Element,
  nome: string
): Element[] {
  const conNamespace = Array.from(
    nodo.getElementsByTagNameNS('*', nome)
  );

  if (conNamespace.length > 0) {
    return conNamespace;
  }

  return Array.from(nodo.getElementsByTagName(nome));
}

function testoElemento(
  nodo: Document | Element,
  nome: string
): string {
  return elemento(nodo, nome)?.textContent?.trim() || '';
}

function numeroXml(valore: string): number {
  if (!valore) return 0;

  const normalizzato = valore
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');

  const risultato = Number(normalizzato);

  return Number.isFinite(risultato) ? risultato : 0;
}

function interoXml(valore: string): number {
  return Math.round(numeroXml(valore));
}

/* =========================================================
   ID ANTI-DUPLICATO
========================================================= */

function creaIdFattura(
  partitaIva: string,
  numeroDocumento: string,
  data: string,
  nomeFile: string
): string {
  const base =
    `${partitaIva}-${numeroDocumento}-${data}-${nomeFile}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  return base || `${Date.now()}-${Math.random()}`;
}

/* =========================================================
   FORNITORE
========================================================= */

function leggiFornitore(documento: Document): {
  fornitore: string;
  partitaIva: string;
  codiceFiscale: string;
} {
  const cedente = elemento(documento, 'CedentePrestatore');

  if (!cedente) {
    return {
      fornitore: 'Fornitore non riconosciuto',
      partitaIva: '',
      codiceFiscale: '',
    };
  }

  const datiAnagrafici =
    elemento(cedente, 'DatiAnagrafici') || cedente;

  const anagrafica =
    elemento(datiAnagrafici, 'Anagrafica') ||
    datiAnagrafici;

  const denominazione = testoElemento(
    anagrafica,
    'Denominazione'
  );

  const nome = testoElemento(anagrafica, 'Nome');
  const cognome = testoElemento(anagrafica, 'Cognome');

  const fornitore =
    denominazione ||
    [nome, cognome].filter(Boolean).join(' ') ||
    'Fornitore non riconosciuto';

  const idFiscaleIva = elemento(
    datiAnagrafici,
    'IdFiscaleIVA'
  );

  const paese = idFiscaleIva
    ? testoElemento(idFiscaleIva, 'IdPaese')
    : '';

  const codiceIva = idFiscaleIva
    ? testoElemento(idFiscaleIva, 'IdCodice')
    : '';

  return {
    fornitore,
    partitaIva: `${paese}${codiceIva}`,
    codiceFiscale: testoElemento(
      datiAnagrafici,
      'CodiceFiscale'
    ),
  };
}

/* =========================================================
   DATI GENERALI DOCUMENTO
========================================================= */

function leggiDatiDocumento(documento: Document): {
  data: string;
  numeroDocumento: string;
  tipoDocumento: string;
  divisa: string;
  totaleDichiarato: number;
} {
  const datiGeneraliDocumento = elemento(
    documento,
    'DatiGeneraliDocumento'
  );

  if (!datiGeneraliDocumento) {
    throw new Error(
      'Sezione DatiGeneraliDocumento non trovata.'
    );
  }

  return {
    data: testoElemento(datiGeneraliDocumento, 'Data'),

    numeroDocumento: testoElemento(
      datiGeneraliDocumento,
      'Numero'
    ),

    tipoDocumento: testoElemento(
      datiGeneraliDocumento,
      'TipoDocumento'
    ),

    divisa:
      testoElemento(datiGeneraliDocumento, 'Divisa') ||
      'EUR',

    totaleDichiarato: numeroXml(
      testoElemento(
        datiGeneraliDocumento,
        'ImportoTotaleDocumento'
      )
    ),
  };
}

/* =========================================================
   TOTALI IVA
========================================================= */

function leggiTotali(documento: Document): {
  imponibile: number;
  iva: number;
} {
  const riepiloghi = elementi(documento, 'DatiRiepilogo');

  let imponibile = 0;
  let iva = 0;

  riepiloghi.forEach((riepilogo) => {
    imponibile += numeroXml(
      testoElemento(riepilogo, 'ImponibileImporto')
    );

    iva += numeroXml(
      testoElemento(riepilogo, 'Imposta')
    );
  });

  return {
    imponibile,
    iva,
  };
}

/* =========================================================
   CODICE ARTICOLO
========================================================= */

function leggiCodiceArticolo(riga: Element): {
  codiceTipo: string;
  codiceValore: string;
} {
  const codici = elementi(riga, 'CodiceArticolo');

  if (codici.length === 0) {
    return {
      codiceTipo: '',
      codiceValore: '',
    };
  }

  const primoCodice = codici[0];

  return {
    codiceTipo: testoElemento(
      primoCodice,
      'CodiceTipo'
    ),

    codiceValore: testoElemento(
      primoCodice,
      'CodiceValore'
    ),
  };
}

/* =========================================================
   SCONTI E MAGGIORAZIONI
========================================================= */

function leggiSconti(riga: Element): {
  scontoPercentuale: number;
  scontoImporto: number;
} {
  const sconti = elementi(
    riga,
    'ScontoMaggiorazione'
  );

  let scontoPercentuale = 0;
  let scontoImporto = 0;

  sconti.forEach((sconto) => {
    const tipo = testoElemento(sconto, 'Tipo');

    const percentuale = numeroXml(
      testoElemento(sconto, 'Percentuale')
    );

    const importo = numeroXml(
      testoElemento(sconto, 'Importo')
    );

    if (tipo === 'SC') {
      scontoPercentuale += percentuale;
      scontoImporto += importo;
    }

    if (tipo === 'MG') {
      scontoPercentuale -= percentuale;
      scontoImporto -= importo;
    }
  });

  return {
    scontoPercentuale,
    scontoImporto,
  };
}

/* =========================================================
   PRIMA CLASSIFICAZIONE AUTOMATICA
========================================================= */

function proponiCategoria(
  descrizione: string
): {
  categoriaProposta: string;
  affidabilita: number;
} {
  const testo = descrizione.toLowerCase();

  const regole: Array<{
    parole: string[];
    categoria: string;
    affidabilita: number;
  }> = [
    {
      parole: [
        'mozzarella',
        'fiordilatte',
        'fior di latte',
        'provola',
        'ricotta',
        'formaggio',
        'latte',
        'panna',
        'burro',
      ],
      categoria: 'Materie prime',
      affidabilita: 95,
    },
    {
      parole: [
        'pomodoro',
        'pelati',
        'passata',
        'farina',
        'olio',
        'sale',
        'lievito',
        'prosciutto',
        'salame',
        'carne',
        'pollo',
        'verdura',
        'frutta',
        'pesce',
      ],
      categoria: 'Materie prime',
      affidabilita: 90,
    },
    {
      parole: [
        'acqua',
        'coca cola',
        'coca-cola',
        'birra',
        'vino',
        'bibita',
        'aranciata',
        'sprite',
      ],
      categoria: 'Bibite',
      affidabilita: 90,
    },
    {
      parole: [
        'vaschetta',
        'contenitore',
        'cartone pizza',
        'scatola pizza',
        'sacchetto',
        'busta',
        'bicchiere',
        'posata',
        'tovagliolo',
      ],
      categoria: 'Imballaggi',
      affidabilita: 90,
    },
    {
      parole: [
        'detergente',
        'detersivo',
        'sgrassatore',
        'candeggina',
        'sapone',
        'lavastoviglie',
        'disinfettante',
      ],
      categoria: 'Detergenti',
      affidabilita: 95,
    },
    {
      parole: [
        'carta forno',
        'carta igienica',
        'rotolo',
        'alluminio',
        'pellicola',
        'guanti',
      ],
      categoria: 'Materiale di consumo',
      affidabilita: 85,
    },
    {
      parole: [
        'legna',
        'pellet',
      ],
      categoria: 'Legna',
      affidabilita: 95,
    },
    {
      parole: [
        'energia elettrica',
        'fornitura energia',
        'gas naturale',
        'fornitura gas',
        'acqua',
        'telefonia',
        'internet',
      ],
      categoria: 'Utenze',
      affidabilita: 80,
    },
    {
      parole: [
        'riparazione',
        'manutenzione',
        'assistenza tecnica',
        'ricambio',
      ],
      categoria: 'Manutenzioni e riparazioni',
      affidabilita: 85,
    },
  ];

  for (const regola of regole) {
    const trovata = regola.parole.some((parola) =>
      testo.includes(parola)
    );

    if (trovata) {
      return {
        categoriaProposta: regola.categoria,
        affidabilita: regola.affidabilita,
      };
    }
  }

  return {
    categoriaProposta: 'Da classificare',
    affidabilita: 0,
  };
}

/* =========================================================
   RIGHE ARTICOLO
========================================================= */

function leggiRigheFattura(
  documento: Document
): RigaFatturaElettronica[] {
  const dettagliLinee = elementi(
    documento,
    'DettaglioLinee'
  );

  return dettagliLinee.map((riga, indice) => {
    const descrizione = testoElemento(
      riga,
      'Descrizione'
    );

    const codiceArticolo =
      leggiCodiceArticolo(riga);

    const sconti = leggiSconti(riga);

    const classificazione =
      proponiCategoria(descrizione);

    return {
      numeroLinea:
        interoXml(
          testoElemento(riga, 'NumeroLinea')
        ) || indice + 1,

      codiceTipo: codiceArticolo.codiceTipo,
      codiceValore: codiceArticolo.codiceValore,

      descrizione:
        descrizione || 'Descrizione non disponibile',

      quantita:
        numeroXml(
          testoElemento(riga, 'Quantita')
        ) || 1,

      unitaMisura: testoElemento(
        riga,
        'UnitaMisura'
      ),

      prezzoUnitario: numeroXml(
        testoElemento(riga, 'PrezzoUnitario')
      ),

      prezzoTotale: numeroXml(
        testoElemento(riga, 'PrezzoTotale')
      ),

      aliquotaIva: numeroXml(
        testoElemento(riga, 'AliquotaIVA')
      ),

      naturaIva: testoElemento(
        riga,
        'Natura'
      ),

      scontoPercentuale:
        sconti.scontoPercentuale,

      scontoImporto:
        sconti.scontoImporto,

      categoriaProposta:
        classificazione.categoriaProposta,

      affidabilita:
        classificazione.affidabilita,
    };
  });
}

/* =========================================================
   PAGAMENTI
========================================================= */

function leggiPagamenti(
  documento: Document
): PagamentoFatturaElettronica[] {
  const datiPagamento = elementi(
    documento,
    'DatiPagamento'
  );

  const pagamenti: PagamentoFatturaElettronica[] = [];

  datiPagamento.forEach((bloccoPagamento) => {
    const condizioniPagamento = testoElemento(
      bloccoPagamento,
      'CondizioniPagamento'
    );

    const dettagli = elementi(
      bloccoPagamento,
      'DettaglioPagamento'
    );

    dettagli.forEach((dettaglio) => {
      pagamenti.push({
        condizioniPagamento,

        modalitaPagamento: testoElemento(
          dettaglio,
          'ModalitaPagamento'
        ),

        dataRiferimentoTermini: testoElemento(
          dettaglio,
          'DataRiferimentoTerminiPagamento'
        ),

        giorniTerminiPagamento: interoXml(
          testoElemento(
            dettaglio,
            'GiorniTerminiPagamento'
          )
        ),

        dataScadenza: testoElemento(
          dettaglio,
          'DataScadenzaPagamento'
        ),

        importo: numeroXml(
          testoElemento(
            dettaglio,
            'ImportoPagamento'
          )
        ),

        iban: testoElemento(
          dettaglio,
          'IBAN'
        ),

        istitutoFinanziario: testoElemento(
          dettaglio,
          'IstitutoFinanziario'
        ),

        beneficiario: testoElemento(
          dettaglio,
          'Beneficiario'
        ),
      });
    });
  });

  return pagamenti;
}

function primaScadenza(
  pagamenti: PagamentoFatturaElettronica[]
): string {
  const scadenze = pagamenti
    .map((pagamento) => pagamento.dataScadenza)
    .filter(Boolean)
    .sort();

  return scadenze[0] || '';
}

/* =========================================================
   ANALISI SINGOLA FATTURA
========================================================= */

export function analizzaSingolaFattura(
  file: FileFatturaEstratto
): FatturaElettronicaAnalizzata {
  const parser = new DOMParser();

  const documento = parser.parseFromString(
    file.contenuto,
    'application/xml'
  );

  const erroreParser = elemento(
    documento,
    'parsererror'
  );

  if (erroreParser) {
    throw new Error(
      'XML non valido o non leggibile.'
    );
  }

  const datiFornitore =
    leggiFornitore(documento);

  const datiDocumento =
    leggiDatiDocumento(documento);

  const totali =
    leggiTotali(documento);

  const righe =
    leggiRigheFattura(documento);

  const pagamenti =
    leggiPagamenti(documento);

  const totaleCalcolato =
    totali.imponibile + totali.iva;

  const totale =
    datiDocumento.totaleDichiarato > 0
      ? datiDocumento.totaleDichiarato
      : totaleCalcolato;

  if (!datiDocumento.data) {
    throw new Error(
      'Data fattura non trovata.'
    );
  }

  if (!datiDocumento.numeroDocumento) {
    throw new Error(
      'Numero fattura non trovato.'
    );
  }

  return {
    id: creaIdFattura(
      datiFornitore.partitaIva,
      datiDocumento.numeroDocumento,
      datiDocumento.data,
      file.nome
    ),

    nomeFile: file.nome,

    fornitore: datiFornitore.fornitore,
    partitaIva: datiFornitore.partitaIva,
    codiceFiscale: datiFornitore.codiceFiscale,

    data: datiDocumento.data,
    numeroDocumento:
      datiDocumento.numeroDocumento,
    tipoDocumento:
      datiDocumento.tipoDocumento,
    divisa: datiDocumento.divisa,

    imponibile: totali.imponibile,
    iva: totali.iva,
    totale,

    scadenza: primaScadenza(pagamenti),

    descrizioni: righe.map(
      (riga) => riga.descrizione
    ),

    righe,
    pagamenti,
  };
}

/* =========================================================
   ANALISI DI TUTTE LE FATTURE
========================================================= */

export function analizzaFattureEstratte(
  files: FileFatturaEstratto[]
): RisultatoAnalisiFatture {
  const fatture: FatturaElettronicaAnalizzata[] = [];
  const errori: ErroreAnalisiFattura[] = [];

  files.forEach((file) => {
    try {
      fatture.push(
        analizzaSingolaFattura(file)
      );
    } catch (errore) {
      errori.push({
        nomeFile: file.nome,

        messaggio:
          errore instanceof Error
            ? errore.message
            : 'Errore sconosciuto durante la lettura.',
      });
    }
  });

  fatture.sort(
    (a, b) => b.data.localeCompare(a.data)
  );

  const totaleScadenze = fatture.reduce(
    (totale, fattura) => {
      const totalePagamenti =
        fattura.pagamenti.reduce(
          (somma, pagamento) =>
            somma + pagamento.importo,
          0
        );

      return totale + totalePagamenti;
    },
    0
  );

  return {
    fatture,
    errori,

    totaleImponibile: fatture.reduce(
      (somma, fattura) =>
        somma + fattura.imponibile,
      0
    ),

    totaleIva: fatture.reduce(
      (somma, fattura) =>
        somma + fattura.iva,
      0
    ),

    totaleDocumenti: fatture.reduce(
      (somma, fattura) =>
        somma + fattura.totale,
      0
    ),

    totaleScadenze,
  };
}