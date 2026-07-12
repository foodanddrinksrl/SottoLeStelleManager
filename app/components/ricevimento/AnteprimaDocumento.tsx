'use client';

type AnteprimaDocumentoProps = {
  nomeFile: string;
  mimeType: string;
  anteprimaUrl: string;
  onSostituisci: () => void;
  onElimina: () => void;
  onAvviaLettura: () => void;
  letturaInCorso?: boolean;
};

export function AnteprimaDocumento({
  nomeFile,
  mimeType,
  anteprimaUrl,
  onSostituisci,
  onElimina,
  onAvviaLettura,
  letturaInCorso = false,
}: AnteprimaDocumentoProps) {
  const isPdf = mimeType === 'application/pdf';
  const isImmagine = mimeType.startsWith('image/');

  return (
    <section>
      <div className="card">
        <h2>👁 Anteprima documento</h2>

        <p className="muted">
          Controlla che la bolla sia leggibile e completa prima di
          avviare l’analisi.
        </p>

        <div
          style={{
            border: '1px solid rgba(212,170,35,0.35)',
            borderRadius: 14,
            overflow: 'hidden',
            background: '#0b120e',
            minHeight: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isImmagine && (
            <img
              src={anteprimaUrl}
              alt={nomeFile}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: 720,
                objectFit: 'contain',
              }}
            />
          )}

          {isPdf && (
            <iframe
              src={anteprimaUrl}
              title={nomeFile}
              style={{
                width: '100%',
                height: 680,
                border: 0,
                background: '#fff',
              }}
            />
          )}

          {!isPdf && !isImmagine && (
            <p>Anteprima non disponibile.</p>
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong>{nomeFile}</strong>
            <div className="muted">{mimeType || 'Tipo non riconosciuto'}</div>
          </div>

          <div className="actions">
            <button
              className="btn"
              onClick={onSostituisci}
              disabled={letturaInCorso}
            >
              🔁 Sostituisci
            </button>

            <button
              className="btn danger"
              onClick={onElimina}
              disabled={letturaInCorso}
            >
              🗑 Elimina
            </button>

            <button
              className="btn green"
              onClick={onAvviaLettura}
              disabled={letturaInCorso}
            >
              {letturaInCorso
                ? '⏳ Analisi in corso…'
                : '🤖 Avvia lettura AI'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>📸 Controllo qualità foto</h2>

        <div className="quick-grid">
          <div className="card">
            <strong>Documento completo</strong>
            <p className="muted">
              Devono essere visibili intestazione, righe e totale.
            </p>
          </div>

          <div className="card">
            <strong>Foto nitida</strong>
            <p className="muted">
              Evita sfocature, ombre forti e riflessi.
            </p>
          </div>

          <div className="card">
            <strong>Documento dritto</strong>
            <p className="muted">
              Cerca di fotografare la bolla il più possibile dall’alto.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}