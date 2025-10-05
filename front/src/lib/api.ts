import type { SimInput, SimOutput } from './type';

export type SimPayload = {
  age: number;
  expected_pension?: number;
  gross_salary: number;
  include_sick_leave: boolean;
  postal_code?: string | null;
  quarter_award?: number;
  retire_year: number;
  sex: 'M' | 'K';
  start_year: number;
  zus_balance?: { konto?: number; subkonto?: number };
};

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let fallback = `${res.status} ${res.statusText}`;
    try {
      const x = await res.json();
      const d = (x as any)?.detail;

      // FastAPI/Starlette często zwraca:
      // - detail: string
      // - detail: [{loc, msg, type}, ...]
      // - detail: object
      let msg: string;

      if (typeof d === 'string') {
        msg = d;
      } else if (Array.isArray(d)) {
        // zbierz wszystkie msg
        msg = d.map((it: any) => it?.msg ?? JSON.stringify(it)).join('; ');
      } else if (d && typeof d === 'object') {
        try { msg = JSON.stringify(d); } catch { msg = fallback; }
      } else {
        // jeżeli nie ma "detail", spróbuj całe body
        try { msg = JSON.stringify(x); } catch { msg = fallback; }
      }

      throw new Error(msg);
    } catch (e) {
      // gdy json() się wywalił – rzuć fallback
      if (e instanceof Error && e.message) throw e;
      throw new Error(fallback);
    }
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetch(`${BASE}/health`).then((r)=> j<string>(r)),
  assumptions: () => fetch(`${BASE}/assumptions`).then((r)=> j<any>(r)),

  simulate: (body: SimPayload) =>
    fetch(`${BASE}/simulate`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    }).then((r) => j<any>(r)),

  timeline: (body: SimPayload, format?: string) =>
    fetch(`${BASE}/simulate/timeline${format ? `?format=${encodeURIComponent(format)}`:''}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    }).then((r)=> j<any>(r)),

  whatIf: (body: SimPayload, delays: number[] = [0, 1, 2, 5]) => {
  const qs = new URLSearchParams();
  delays.forEach((d) => qs.append('delays', String(d)));
  return fetch(`${BASE}/simulate/what-if?${qs.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => j<any>(r));
},

  explain: (body: SimPayload) =>
    fetch(`${BASE}/simulate/explain`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    }).then((r)=> j<any>(r)),

  buckets: (year?: number) =>
    fetch(`${BASE}/buckets${year ? `?year=${year}`:''}`).then((r)=> j<any>(r)),

  reportPdf: (body: SimPayload) =>
    fetch(`${BASE}/report/pdf`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    }).then(async (r)=> {
      if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const blob = await r.blob();
      return URL.createObjectURL(blob);
    }),
};

/** Nazwany eksport do wygodnego importu: import { downloadPdf } from '@/lib/api' */
export async function downloadPdf(body: SimPayload): Promise<string> {
  const r = await fetch(`${BASE}/report/pdf`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
  });
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}
