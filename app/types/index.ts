export type Reparto = 'Pizzeria' | 'Cucina' | 'Sala';

export type Dipendente = {
  nome: string;
  reparto: Reparto;
  costoTurno: number;
  riposo?: string;
  telefono?: string;
};

export type WeekInfo = {
  start: string;
  end: string;
  year: number;
  month: string;
  week: number;
};

export type Snapshot = {
  id: number;
  savedAt: string;
  weekInfo: WeekInfo;
  employees: Dipendente[];
  schedule: Record<string, string[]>;
  closed: Record<string, boolean>;
  dayRests: Record<string, string>;
};

export type SummaryRow = {
  nome: string;
  reparto: Reparto;
  pranzi: number;
  cene: number;
  ore: number;
  riposo: string;
  turni: number;
  costoTurno: number;
  costo: number;
};

export type Totals = {
  pranzi: number;
  cene: number;
  turni: number;
  costo: number;
};
