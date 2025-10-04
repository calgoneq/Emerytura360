export type Sex = 'K' | 'M';

export interface SimInput {
  age: number; sex: Sex; gross_salary: number;
  start_year: number; retire_year?: number;
  include_sick_leave: boolean;
  zus_balance?: { konto?: number | null; subkonto?: number | null };
  custom_wage_timeline?: Record<number, number> | null;
  quarter?: 1|2|3|4;
}

export interface SimOutput {
  benefit: { actual: number; real: number };
  replacement_rate?: number | null;
  effect_sick_leave: { factor: number };
  scenarios?: Record<string, number>;
  assumptions_used?: Record<string, unknown>;
}

// nowy bezpieczny alias słownika (unikaj any)
export type Dict = Record<string, unknown>;
