import type { Dipendente, Reparto, WeekInfo } from '../types';
import { ck, giorni, itDate, k, reparti } from './schedule';

type ScheduleMap = Record<string, string[]>;
type ClosedMap = Record<string, boolean>;

export function normalizePhoneNumber(phone?: string) {
  let normalized = (phone || '').replace(/\D/g, '');

  if (!normalized) return '';

  if (normalized.startsWith('0039')) {
    normalized = normalized.slice(2);
  }

  if (normalized.startsWith('39') && normalized.length >= 11) {
    return normalized;
  }

  if (normalized.length === 10) {
    return `39${normalized}`;
  }

  return normalized;
}

export function getEmployeeTurns(
  employee: Dipendente,
  schedule: ScheduleMap,
  closed: ClosedMap,
) {
  return giorni.map((giorno) => {
    const turni = ['Pranzo', 'Cena'].filter((turno) => {
      if (closed[ck(giorno, turno)]) return false;
      return reparti.some((reparto) => {
        if (reparto !== employee.reparto) return false;
        return (schedule[k(giorno, turno, reparto)] || []).includes(employee.nome);
      });
    });

    return {
      giorno,
      turni,
    };
  });
}

export function formatEmployeeTurnsMessage(
  employee: Dipendente,
  weekInfo: WeekInfo,
  schedule: ScheduleMap,
  closed: ClosedMap,
) {
  const rows = getEmployeeTurns(employee, schedule, closed)
    .map(({ giorno, turni }) => {
      const label = giorno.slice(0, 3).toUpperCase();
      const value = turni.length ? turni.join(' • ') : 'Riposo';
      return `${label}   ${value}`;
    })
    .join('\n');

  return [
    '🍕 Sotto le Stelle',
    '',
    `Ciao ${employee.nome}!`,
    '',
    `Turni settimana ${weekInfo.week}`,
    `Dal ${itDate(weekInfo.start)} al ${itDate(weekInfo.end)}`,
    '',
    rows,
    '',
    'Buon lavoro!',
  ].join('\n');
}

export function whatsappLink(phone: string, message: string) {
  const normalized = normalizePhoneNumber(phone);

  if (!normalized) {
    return '';
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function employeeKey(employee: Dipendente, index: number) {
  return `${employee.nome}__${employee.reparto}__${index}`;
}

export function repartoLabel(reparto: Reparto | 'Tutti') {
  return reparto === 'Tutti' ? 'Tutto lo staff' : reparto;
}
