import type { SimInput, SimOutput } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === '1';

export async function simulate(payload: SimInput): Promise<SimOutput> {
  if (USE_MOCK) {
    return {
      benefit: { actual: 7340, real: 4100 },
      effect_sick_leave: { factor: 0.95 },
      scenarios: { "+1": 6.5, "+2": 9.8, "+5": 18.7 }
    };
  }
  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload), cache: 'no-store'
  });
  if (!res.ok) throw new Error('Simulation failed');
  return res.json();
}

export async function downloadPdf(payload: SimInput) {
  const res = await fetch(`${API_BASE}/report/pdf`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('PDF failed');
  return res.blob();
}

export async function downloadXls(params?: {from?: string; to?: string}) {
  const url = new URL(`${API_BASE}/admin/export-xls`);
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to)   url.searchParams.set('to', params.to);
  const res = await fetch(url);
  if (!res.ok) throw new Error('XLS failed');
  return res.blob();
}
