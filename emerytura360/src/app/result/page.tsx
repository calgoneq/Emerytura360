'use client';
import { useEffect, useMemo, useState } from 'react';
import { downloadPdf } from '@/lib/api';
import type { SimInput, SimOutput } from '@/lib/type';
import { fmtPLN } from '@/lib/format';
import BenefitArea, { BenefitPoint } from '@/components/charts/BenefitArea';
import ScenariosBar from '@/components/charts/ScenariosBar';
import CapitalLine, { CapitalPoint } from '@/components/charts/CapitalLine';

export default function Page(){
  const [input, setInput] = useState<SimInput|null>(null);
  const [out, setOut] = useState<SimOutput|null>(null);

  useEffect(()=>{
    const i = sessionStorage.getItem('sim:input');
    const o = sessionStorage.getItem('sim:output');
    if(i&&o){ setInput(JSON.parse(i)); setOut(JSON.parse(o)); }
  },[]);

  const areaData: BenefitPoint[] = useMemo(()=>{
    if(!input || !out) return [];
    const start = input.start_year;
    const end = (input.retire_year ?? new Date().getFullYear()+ (60 - input.age));
    const len = Math.max(1, end - start);
    const base = out.benefit.real;
    // syntetyczna ścieżka wzrostu do punktu docelowego:
    return Array.from({length: len}, (_,i)=>({
      year: start + i,
      real: Math.max(0, base * (i / (len-1||1)) * 0.9) // łagodny wzrost do ~90% docelowej kwoty
    }));
  },[input, out]);

  const capitalData: CapitalPoint[] = useMemo(()=>{
    if(!input || !out) return [];
    const start = input.start_year;
    const end = (input.retire_year ?? new Date().getFullYear()+ (60 - input.age));
    const len = Math.max(1, end - start);
    const finalCap = out.benefit.actual * 240; // przybliżenie kapitału (20 lat) do wizualizacji
    return Array.from({length: len}, (_,i)=>({
      year: start + i,
      capital: finalCap * (i / (len-1||1))
    }));
  },[input, out]);

  if(!input || !out) return <div className="p-6">Brak danych. Wróć do symulacji.</div>;

  const savePdf = async ()=>{
    const blob = await downloadPdf(input);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'raport_emerytura360.pdf'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-semibold">Wynik</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="border rounded p-4">
          <div className="text-sm opacity-70">Emerytura rzeczywista</div>
          <div className="text-4xl font-semibold">{fmtPLN(out.benefit.actual)}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm opacity-70">Emerytura urealniona</div>
          <div className="text-4xl font-semibold">{fmtPLN(out.benefit.real)}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm opacity-70">Efekt chorobowy</div>
          <div className="text-2xl">{Math.round((1 - out.effect_sick_leave.factor) * 100)}%</div>
        </div>
      </div>

      <section className="border rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">Ścieżka urealnionej emerytury</h2>
          {typeof window !== 'undefined' && sessionStorage.getItem('expected') ? (
            <span className="text-sm text-zus-green">Cel: {fmtPLN(Number(sessionStorage.getItem('expected') || 0))}</span>
          ) : null}
        </div>
        <BenefitArea
          data={areaData}
          target={typeof window !== 'undefined' ? Number(sessionStorage.getItem('expected') || 0) || undefined : undefined}
        />
      </section>

      {out.scenarios && (
        <section className="border rounded p-4">
          <h2 className="font-medium mb-2">Scenariusze opóźnienia</h2>
          <ScenariosBar scenarios={out.scenarios} />
        </section>
      )}

      <section className="border rounded p-4">
        <h2 className="font-medium mb-2">Kapitał na koncie/subkoncie (wizualizacja)</h2>
        <CapitalLine data={capitalData} />
      </section>

      <div className="flex gap-3">
        <button onClick={savePdf} className="bg-[rgb(63,132,210)] text-white px-4 py-2 rounded">Pobierz PDF</button>
      </div>
    </div>
  );
}
