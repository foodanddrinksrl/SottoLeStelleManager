import type {
  Dipendente,
  Reparto,
  WeekInfo,
} from '../types';

import {
  ck,
  emoji,
  giorni,
  itDate,
  k,
  reparti,
} from '../lib/schedule';

type PdfCollaboratoriProps = {
  weekInfo: WeekInfo;
  employees: Dipendente[];
  schedule: Record<string, string[]>;
  closed: Record<string, boolean>;
  dayRests: Record<string, string>;
};

export function PdfCollaboratori({
  weekInfo,
  employees,
  schedule,
  closed,
  dayRests,
}: PdfCollaboratoriProps) {
  return (
    <div
      id="pdf-collaboratori"
      className="pdf-collaboratori"
    >
      <div className="pdf-calendar">
        {giorni.map((giorno) => (
          <div className="pdf-day" key={giorno}>
            <h3>{giorno}</h3>

            <div className="pdf-rest">
              <strong>Riposo:</strong>
              <span>
                {dayRests[giorno]?.trim() || 'Nessuno'}
              </span>
            </div>

            {['Pranzo', 'Cena'].map((turno) => (
              <div className="pdf-shift" key={turno}>
                {closed[ck(giorno, turno)] ? (
                  <div className="pdf-closed">
                    CHIUSO
                  </div>
                ) : (
                  <>
                    {reparti.map((reparto: Reparto) => {
                      const nomi =
                        schedule[
                          k(giorno, turno, reparto)
                        ]?.filter(Boolean) || [];

                      if (nomi.length === 0) {
                        return null;
                      }

                      return (
                        <div
                          className="pdf-reparto"
                          key={reparto}
                        >
                          <strong>
                            {emoji(reparto)} {reparto}
                          </strong>

                          {nomi.map((nome, indice) => (
                            <span
                              className="pdf-persona"
                              key={`${nome}-${indice}`}
                            >
                              {nome}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="pdf-heading">
        <h1>
          Turni Collaboratori · Settimana{' '}
          {weekInfo.week}
        </h1>

        <p>
          Dal {itDate(weekInfo.start)} al{' '}
          {itDate(weekInfo.end)}
        </p>
      </div>
    </div>
  );
}