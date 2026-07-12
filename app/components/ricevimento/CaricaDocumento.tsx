'use client';

import {
  ChangeEvent,
  DragEvent,
  useRef,
  useState,
} from 'react';

import type {
  TipoDocumentoRicevimento,
} from './types';

type DocumentoCaricato = {
  file: File;
  nomeFile: string;
  mimeType: string;
  tipoFile: TipoDocumentoRicevimento;
  anteprimaUrl: string;
};

type CaricaDocumentoProps = {
  onDocumentoCaricato: (
    documento: DocumentoCaricato
  ) => void;
};

const DIMENSIONE_MASSIMA_MB = 15;

function riconosciTipoDocumento(
  file: File
): TipoDocumentoRicevimento {
  if (file.type === 'application/pdf') {
    return 'pdf';
  }

  if (file.type.startsWith('image/')) {
    return 'immagine';
  }

  throw new Error(
    'Formato non supportato. Carica una foto, un’immagine oppure un PDF.'
  );
}

function validaFile(file: File): void {
  const tipoValido =
    file.type.startsWith('image/') ||
    file.type === 'application/pdf';

  if (!tipoValido) {
    throw new Error(
      'Formato non valido. Sono accettati immagini e PDF.'
    );
  }

  const dimensioneMassima =
    DIMENSIONE_MASSIMA_MB * 1024 * 1024;

  if (file.size > dimensioneMassima) {
    throw new Error(
      `Il file supera ${DIMENSIONE_MASSIMA_MB} MB. Riduci la dimensione e riprova.`
    );
  }
}

function creaAnteprima(file: File): string {
  return URL.createObjectURL(file);
}

export function CaricaDocumento({
  onDocumentoCaricato,
}: CaricaDocumentoProps) {
  const inputFotocameraRef =
    useRef<HTMLInputElement | null>(null);

  const inputFileRef =
    useRef<HTMLInputElement | null>(null);

  const [errore, setErrore] = useState('');
  const [trascinamentoAttivo, setTrascinamentoAttivo] =
    useState(false);

  function gestisciFile(file: File) {
    setErrore('');

    try {
      validaFile(file);

      const tipoFile = riconosciTipoDocumento(file);
      const anteprimaUrl = creaAnteprima(file);

      onDocumentoCaricato({
        file,
        nomeFile: file.name,
        mimeType: file.type,
        tipoFile,
        anteprimaUrl,
      });
    } catch (error) {
      setErrore(
        error instanceof Error
          ? error.message
          : 'Errore durante il caricamento del documento.'
      );
    }
  }

  function selezionaFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    gestisciFile(file);
  }

  function trascinaSopra(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setTrascinamentoAttivo(true);
  }

  function esciTrascinamento(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setTrascinamentoAttivo(false);
  }

  function rilasciaFile(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setTrascinamentoAttivo(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) return;

    gestisciFile(file);
  }

  return (
    <section>
      <div className="card">
        <h2>📷 Carica documento</h2>

        <p className="muted">
          Scatta una foto della bolla oppure carica
          un’immagine o un PDF.
        </p>

        <div className="actions">
          <button
            className="btn green"
            onClick={() =>
              inputFotocameraRef.current?.click()
            }
          >
            📷 Scatta foto
          </button>

          <button
            className="btn gold"
            onClick={() =>
              inputFileRef.current?.click()
            }
          >
            📁 Apri file
          </button>
        </div>

        <input
          ref={inputFotocameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={selezionaFile}
          style={{ display: 'none' }}
        />

        <input
          ref={inputFileRef}
          type="file"
          accept="image/*,application/pdf,.pdf"
          onChange={selezionaFile}
          style={{ display: 'none' }}
        />
      </div>

      <div
        className="card"
        onDragOver={trascinaSopra}
        onDragLeave={esciTrascinamento}
        onDrop={rilasciaFile}
        style={{
          borderStyle: 'dashed',
          borderWidth: 2,
          opacity: trascinamentoAttivo ? 0.7 : 1,
          textAlign: 'center',
          cursor: 'pointer',
        }}
        onClick={() =>
          inputFileRef.current?.click()
        }
      >
        <h2>
          {trascinamentoAttivo
            ? '⬇️ Rilascia il documento'
            : '📄 Trascina qui la bolla'}
        </h2>

        <p className="muted">
          Formati accettati: JPG, PNG, HEIC e PDF.
          Dimensione massima: {DIMENSIONE_MASSIMA_MB} MB.
        </p>
      </div>

      {errore && (
        <div className="card">
          <h2>🔴 Documento non valido</h2>
          <p>{errore}</p>
        </div>
      )}
    </section>
  );
}