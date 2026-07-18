import type { Dipendente, Reparto, WeekInfo } from '../types';
import { ck, emoji, giorni, k, reparti, makeWeekInfo } from '../lib/schedule';

const shiftIcon: Record<string, string> = {
  Pranzo: '🍽',
  Cena: '🌙',
};

export function CalendarSection({
  weekInfo,
  employees,
  schedule,
  closed,
  dayRests,
  setWeekInfo,
  setClosed,
  setDayRests,
  addSelect,
  updateSelect,
  removeSelect,
}: {
  weekInfo: WeekInfo;
  employees: Dipendente[];
  schedule: Record<string, string[]>;
  closed: Record<string, boolean>;
  dayRests: Record<string, string>;
  setWeekInfo: (weekInfo: WeekInfo) => void;
  setClosed: (closed: Record<string, boolean>) => void;
  setDayRests: (rests: Record<string, string>) => void;
  addSelect: (g: string, t: string, r: Reparto) => void;
  updateSelect: (g: string, t: string, r: Reparto, i: number, value: string) => void;
  removeSelect: (g: string, t: string, r: Reparto, i: number) => void;
}) {
  return (
    <section>
      <div className="card no-print">
        <div className="weekbar">
          <label className="field">
            <span>Dal</span>
            <input
              type="date"
              value={weekInfo.start}
              onChange={(e) => setWeekInfo(makeWeekInfo(new Date(e.target.value + 'T00:00:00')))}
            />
          </label>
          <label className="field">
            <span>Al</span>
            <input value={weekInfo.end} readOnly />
          </label>
          <label className="field">
            <span>Settimana</span>
            <input value={weekInfo.week} readOnly />
          </label>
        </div>
      </div>

      <div className="calendar">
        {giorni.map((g) => (
          <div className="day" key={g}>
            <h3>{g}</h3>

            <div className="rest">
  <input
    className="no-print"
    value={dayRests[g] || ''}
    onChange={(e) =>
      setDayRests({
        ...dayRests,
        [g]: e.target.value,
      })
    }
    placeholder="Riposo"
  />

  <div className="print-only">
    <strong>Riposo:</strong>
    <br />
    {dayRests[g]?.trim() || 'Nessuno'}
  </div>
</div>

            {['Pranzo', 'Cena'].map((t) => (
              <div className="shift" key={t}>
                <div className="shift-title">
                  <span>
                    {shiftIcon[t]} {t.toUpperCase()}
                  </span>
                  <label className="no-print">
                    <input
                      type="checkbox"
                      checked={!!closed[ck(g, t)]}
                      onChange={(e) => setClosed({ ...closed, [ck(g, t)]: e.target.checked })}
                    />{' '}
                    Chiuso
                  </label>
                </div>

                {closed[ck(g, t)] ? (
                  <div className="closed">CHIUSO</div>
                ) : (
                  <div className="reparti-grid">
                    {reparti.map((r) => {
                      const selected = schedule[k(g, t, r)]?.length ? schedule[k(g, t, r)] : [''];
                      const options = employees.filter((e) => e.reparto === r && e.nome).map((e) => e.nome);

                      return (
                        <div className="reparto-card" key={r}>
                          <strong>
                            {emoji(r)} {r}
                          </strong>

                          {selected.map((name, i) => (
                            <div className="select-row" key={i}>
                              <select value={name} onChange={(e) => updateSelect(g, t, r, i, e.target.value)}>
                                <option value="">Seleziona</option>
                                {options.map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                              </select>
                              <button className="small no-print" onClick={() => removeSelect(g, t, r, i)}>
                                ×
                              </button>
                            </div>
                          ))}

                          <button className="small no-print add-person" onClick={() => addSelect(g, t, r)}>
                            + {r}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}