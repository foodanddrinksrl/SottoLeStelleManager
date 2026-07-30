import type { Dipendente, Reparto, SummaryRow, WeekInfo } from '../types';

export const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
export const reparti: Reparto[] = ['Pizzeria', 'Cucina', 'Sala'];

export const defaultEmployees: Dipendente[] = [];

export const defaultSchedule: Record<string, string[]> = {
  'Lunedì_Cena_Pizzeria': ['Rosario', 'Luca'],
  'Lunedì_Cena_Cucina': ['Rosa', 'Gesuè'],
  'Lunedì_Cena_Sala': ['Maddalena', 'Miguel'],
  'Martedì_Cena_Pizzeria': ['Luigi', 'Luca', 'Gabriele'],
  'Martedì_Cena_Cucina': ['Roberta', 'Rosa', 'Gesuè'],
  'Martedì_Cena_Sala': ['Rosa', 'Miguel'],
  'Mercoledì_Cena_Pizzeria': ['Rosario', 'Gabriele'],
  'Mercoledì_Cena_Cucina': ['Rosa', 'Extra'],
  'Mercoledì_Cena_Sala': ['Maddalena', 'Miguel'],
  'Giovedì_Cena_Pizzeria': ['Rosario', 'Luca'],
  'Giovedì_Cena_Cucina': ['Roberta', 'Gesuè'],
  'Giovedì_Cena_Sala': ['Luigi', 'Miguel'],
  'Venerdì_Cena_Pizzeria': ['Rosario', 'Luca', 'Gabriele'],
  'Venerdì_Cena_Cucina': ['Rosa', 'Gesuè'],
  'Venerdì_Cena_Sala': ['Maddalena', 'Miguel'],
  'Sabato_Cena_Pizzeria': ['Rosario', 'Luca', 'Gabriele'],
  'Sabato_Cena_Cucina': ['Rosa', 'Roberta', 'Gesuè'],
  'Sabato_Cena_Sala': ['Miguel', 'Maddalena'],
  'Domenica_Cena_Pizzeria': ['Rosario', 'Luca'],
  'Domenica_Cena_Cucina': ['Rosa', 'Miguel'],
  'Domenica_Cena_Sala': ['Maddalena'],
};

export const defaultClosed = Object.fromEntries(giorni.map((g) => [`${g}_Pranzo`, true]));
export const defaultDayRests: Record<string, string> = {
  Lunedì: 'Luigi, Roberta',
  Martedì: 'Rosario',
  Mercoledì: 'Luca, Gesuè',
  Giovedì: 'Rosa',
};

export function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function itDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT');
}

export function monthName(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { month: 'long' });
}

export function weekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((+d - +y) / 86400000) + 1) / 7);
}

export function makeWeekInfo(date = new Date()): WeekInfo {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  const start = isoDate(d);
  return { start, end: addDays(start, 6), year: d.getFullYear(), month: monthName(start), week: weekNumber(d) };
}

export function k(g: string, t: string, r: string) {
  return `${g}_${t}_${r}`;
}

export function ck(g: string, t: string) {
  return `${g}_${t}`;
}

export function emoji(r: Reparto) {
  return r === 'Pizzeria' ? '🍕' : r === 'Cucina' ? '🍝' : '🍽';
}

export function calculateSummary(
  schedule: Record<string, string[]>,
  closed: Record<string, boolean>,
  employees: Dipendente[],
): SummaryRow[] {
  const stats: Record<string, any> = {};

  giorni.forEach((g) =>
    ['Pranzo', 'Cena'].forEach((t) => {
      if (closed[ck(g, t)]) return;
      reparti.forEach((r) =>
        (schedule[k(g, t, r)] || [])
          .filter(Boolean)
          .forEach((nome) => {
            const id = `${nome}__${r}`;
            if (!stats[id]) stats[id] = { nome, reparto: r, pranzi: 0, cene: 0, ore: 0 };
            if (t === 'Pranzo') {
              stats[id].pranzi++;
              stats[id].ore += 4;
            }
            if (t === 'Cena') {
              stats[id].cene++;
              stats[id].ore += 5.5;
            }
          }),
      );
    }),
  );

  return Object.values(stats).map((s: any) => {
    const emp =
      employees.find((e) => e.nome.toLowerCase() === s.nome.toLowerCase() && e.reparto === s.reparto) ||
      employees.find((e) => e.nome.toLowerCase() === s.nome.toLowerCase());
    const turni = s.pranzi + s.cene;
    const costoTurno = emp?.costoTurno || 0;
    return { ...s, riposo: emp?.riposo || '', turni, costoTurno, costo: turni * costoTurno };
  });
}

export function calculateTotals(summary: SummaryRow[]) {
  return summary.reduce(
    (a, b) => ({ pranzi: a.pranzi + b.pranzi, cene: a.cene + b.cene, turni: a.turni + b.turni, costo: a.costo + b.costo }),
    { pranzi: 0, cene: 0, turni: 0, costo: 0 },
  );
}
