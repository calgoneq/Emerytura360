'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n';
import { fmtPLN } from '@/lib/format';
import { api } from '@/lib/api';

const BenefitArea = dynamic(() => import('@/components/charts/BenefitArea'), { ssr: false });
const CapitalLine = dynamic(() => import('@/components/charts/CapitalLine'), { ssr: false });
const ScenariosBar = dynamic(() => import('@/components/charts/ScenariosBar'), { ssr: false });

type BenefitPoint = { year: number; real: number };
type CapitalPoint = { year: number; capital: number };

type SimInput = {
  age: number;
  sex: 'M' | 'K';
  gross_salary: number;
  start_year: number;
  retire_year: number;
  include_sick_leave: boolean;
  expected_pension?: number;
  postal_code?: string | null;
  quarter_award?: number;
  zus_balance?: { konto?: number; subkonto?: number };
};

type SimOutput = {
  benefit: { actual: number; real: number };
  effect_sick_leave?: { factor: number };
};

type ScenarioBlob = {
  baseline_retire_year: number;
  baseline_benefit: { actual: number; real: number };
  scenarios: Array<{
    delay_years: number;
    retire_year: number;
    benefit: { actual: number; real: number };
  }>;
};

function readJSON<T = any>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function findScenarioBlobFromSession(): ScenarioBlob | null {
  if (typeof window === 'undefined') return null;

  const candidates = [
    'sim:scenarios',
    'sim:whatif2',
    'sim:whatif_blob',
    'sim:result_scenarios',
  ];
  for (const key of candidates) {
    const val = readJSON<ScenarioBlob>(key);
    if (val && Array.isArray(val.scenarios)) return val;
  }

  try {
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (!key) continue;
      const val = readJSON<any>(key);
      if (val && Array.isArray(val.scenarios) && val.baseline_benefit) {
        return val as ScenarioBlob;
      }
    }
  } catch {}
  return null;
}

export default function ResultPage() {
  const { t, lang } = useT();
  const router = useRouter();

  const [input, setInput] = useState<SimInput | null>(null);
  const [out, setOut] = useState<SimOutput | null>(null);
  const [scBlob, setScBlob] = useState<ScenarioBlob | null>(null);

  const [expectedTarget, setExpectedTarget] = useState<number | undefined>(undefined);
  const [pdfErr, setPdfErr] = useState<string | null>(null);
  const [activeDelay, setActiveDelay] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // --- load from sessionStorage ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const i = readJSON<SimInput>('sim:input');
      const o = readJSON<SimOutput>('sim:output');
      if (i) setInput(i);
      if (o) setOut(o);
      const found = findScenarioBlobFromSession();
      setScBlob(found);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- target (only shown on first chart) ---
  useEffect(() => {
    const fromInput = Number(
      (out as any)?.expected_pension ??
        (input as any)?.expected_pension ??
        NaN
    );
    if (!Number.isNaN(fromInput) && fromInput > 0) {
      setExpectedTarget(fromInput);
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const s = window.sessionStorage.getItem('expected');
        const n = s ? Number(s) : NaN;
        setExpectedTarget(!Number.isNaN(n) && n > 0 ? n : undefined);
      } catch {
        setExpectedTarget(undefined);
      }
    }
  }, [input, out]);

  // --- charts: benefit path ---
  const areaData: BenefitPoint[] = useMemo(() => {
    if (input && out) {
      const start = input.start_year;
      const end = input.retire_year ?? start + 1;
      const len = Math.max(2, end - start + 1);
      const target = out.benefit.real;
      return Array.from({ length: len }, (_, i) => ({
        year: start + i,
        real: Math.max(0, target * (i / (len - 1))),
      }));
    }
    if (scBlob?.baseline_retire_year && scBlob?.baseline_benefit?.real != null) {
      const y = Number(scBlob.baseline_retire_year);
      const v = Number(scBlob.baseline_benefit.real);
      return [
        { year: y - 1, real: 0 },
        { year: y, real: v },
      ];
    }
    return [];
  }, [input, out, scBlob]);

  // --- charts: capital line ---
  const capitalData: CapitalPoint[] = useMemo(() => {
    if (out) {
      const start = input?.start_year ?? (scBlob?.baseline_retire_year ?? 2025) - 1;
      const end = input?.retire_year ?? scBlob?.baseline_retire_year ?? start + 1;
      const len = Math.max(2, end - start + 1);
      const finalCap = Number(out.benefit.actual ?? 0) * 240;
      return Array.from({ length: len }, (_, i) => ({
        year: start + i,
        capital: Math.max(0, finalCap * (i / (len - 1))),
      }));
    }
    if (scBlob?.baseline_retire_year && scBlob?.baseline_benefit?.actual != null) {
      const end = Number(scBlob.baseline_retire_year);
      const start = end - 1;
      const finalCap = Number(scBlob.baseline_benefit.actual ?? 0) * 240;
      return [
        { year: start, capital: 0 },
        { year: end, capital: finalCap },
      ];
    }
    return [];
  }, [out, input, scBlob]);

  // --- scenarios (map from scBlob) ---
  const scenariosFromBlob = useMemo(() => {
    const list = scBlob?.scenarios ?? [];
    return list.map((s) => ({
      delay: Number(s?.delay_years ?? 0),
      benefit: {
        real: Number(s?.benefit?.real ?? 0),
        actual: Number(s?.benefit?.actual ?? 0),
      },
      retire_year: Number(s?.retire_year ?? NaN),
    }));
  }, [scBlob]);

  // pełny zestaw (z bazą 0) do obliczeń…
  const scenariosForChart = scenariosFromBlob;
  // …ale na wykresie chcemy BEZ zera
  const displayScenarios = useMemo(
    () => (scenariosForChart ?? []).filter((s) => Number(s.delay) !== 0),
    [scenariosForChart]
  );

  // mapa do porównań (zawiera 0)
  const byDelay = useMemo(
    () => new Map<number, any>((scenariosForChart ?? []).map((w: any) => [Number(w.delay), w])),
    [scenariosForChart]
  );
  const baseScenario = byDelay.get(0);
  const activeScenario = byDelay.get(activeDelay) ?? baseScenario;

  // ustaw pierwszy dostępny (>0) jako aktywny, jeśli nadal 0
  useEffect(() => {
    if (activeDelay === 0 && displayScenarios.length > 0) {
      setActiveDelay(Number(displayScenarios[0].delay));
    }
  }, [displayScenarios, activeDelay]);

  // --- actions ---
  const savePdf = async () => {
    setPdfErr(null);
    try {
      const url = await api.reportPdf(input!);
      const win = window.open(url, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'raport_emerytura360.pdf';
        a.click();
      }
    } catch (e: any) {
      const msg =
        typeof e?.message === 'string'
          ? e.message
          : lang === 'pl'
          ? 'Błąd pobierania PDF'
          : 'PDF download error';
      setPdfErr(msg);
    }
  };

  const backToEdit = () => {
    try {
      if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
        router.back();
      } else {
        router.push('/simulate');
      }
    } catch {
      router.push('/');
    }
  };

  // --- skeleton ---
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(0,153,63,.06),transparent_60%)]">
        <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
          <div className="h-10 w-40 rounded-2xl bg-black/5 animate-pulse" />
          <div className="grid md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="h-4 w-24 bg-black/10 rounded mb-3 animate-pulse" />
                <div className="h-10 w-32 bg-black/10 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-[320px] rounded-2xl border border-black/10 bg-white animate-pulse" />
          <div className="h-[320px] rounded-2xl border border-black/10 bg-white animate-pulse" />
          <div className="h-[320px] rounded-2xl border border-black/10 bg-white animate-pulse" />
        </div>
      </div>
    );
  }

  // --- main ---
  return (
    <div className="min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom)+88px)] bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(0,153,63,.06),transparent_60%)]">
      <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8 space-y-6">
        {/* Back (desktop/tablet) */}
        <div className="hidden sm:flex items-center">
          <button
            onClick={backToEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-[color:var(--zus-navy)] hover:bg-black/5 transition"
          >
            ← {lang === 'pl' ? 'Wróć do edycji' : 'Back to edit'}
          </button>
        </div>

        {/* KPI */}
        <section className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-[color:var(--zus-navy)]/70 mb-1">{t('res_actual')}</div>
            <div className="text-4xl font-semibold tracking-tight text-[color:var(--zus-green)]">
              {fmtPLN(
                out?.benefit.actual ??
                  scBlob?.baseline_benefit?.actual ??
                  0
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-[color:var(--zus-navy)]/70 mb-1">{t('res_real')}</div>
            <div className="text-4xl font-semibold tracking-tight text-[color:var(--zus-green)]">
              {fmtPLN(
                out?.benefit.real ??
                  scBlob?.baseline_benefit?.real ??
                  0
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="text-sm text-[color:var(--zus-navy)]/70 mb-1">{t('res_sick')}</div>
            <div className="text-3xl font-semibold tracking-tight text-[color:var(--zus-green)]">
              {out?.effect_sick_leave?.factor
                ? `${Math.round((1 - out.effect_sick_leave.factor) * 100)}%`
                : '—'}
            </div>
          </div>
        </section>

        {/* Real pension path */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h2 className="text-lg font-semibold text-[color:var(--zus-navy)] tracking-tight">
              {lang === 'pl' ? 'Ścieżka urealnionej emerytury' : 'Real pension path'}
            </h2>
            {expectedTarget && (
              <span className="inline-flex items-center rounded-full bg-[color:var(--zus-green)]/10 px-3 py-1 text-xs text-[color:var(--zus-green)] border border-[color:var(--zus-green)]/30">
                {lang === 'pl' ? 'Cel' : 'Goal'}: {fmtPLN(expectedTarget)}
              </span>
            )}
          </div>
          <BenefitArea data={areaData} target={expectedTarget} />
        </section>

        {/* Scenarios (bez delay=0, bez przycisków) */}
        {displayScenarios.length > 0 && (
          <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-[color:var(--zus-navy)] tracking-tight">
                {lang === 'pl' ? 'Scenariusze opóźnienia' : 'Delay scenarios'}
              </h2>
            </div>

            <ScenariosBar
              // @ts-ignore (dynamic import type)
              scenarios={displayScenarios}
              use="actual"
              activeDelay={activeDelay}
              onDelayChange={(d: number) => setActiveDelay(d)}
              onActiveChange={(d: number) => setActiveDelay(d)}
            />

            {/* Delta vs baza (baza = delay 0, nie pokazywana na wykresie) */}
            {activeScenario && baseScenario && (
              <div className="mt-3 text-sm text-[color:var(--zus-navy)]/80">
                {lang === 'pl' ? 'Różnica względem bazowego: ' : 'Delta vs base: '}
                <span className="font-medium text-[color:var(--zus-green)]">
                  {fmtPLN(
  Number(activeScenario?.benefit?.actual ?? 0) -
  Number(baseScenario?.benefit?.actual ?? 0)
)}
                </span>
              </div>
            )}
          </section>
        )}

        {/* Capital line */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-[color:var(--zus-navy)] mb-3 tracking-tight">
            {lang === 'pl'
              ? 'Kapitał na koncie/subkoncie (wizualizacja)'
              : 'Account / sub-account capital (visualization)'}
          </h2>
          <CapitalLine data={capitalData} />
        </section>

        {/* Desktop actions */}
        <div className="hidden sm:flex flex-wrap items-center gap-3">
          <button
            onClick={savePdf}
            disabled={!input}
            className="inline-flex items-center rounded-2xl bg-[color:var(--zus-green)] px-5 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(0,153,63,.22)] hover:opacity-95 active:scale-[.99] transition disabled:opacity-50"
          >
            {lang === 'pl' ? 'Pobierz PDF' : 'Download PDF'}
          </button>
          {pdfErr && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {pdfErr}
            </div>
          )}
        </div>
      </div>

      {/* Sticky mobile bar */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 backdrop-blur supports-[padding:max(0px)]">
        <div className="mx-auto max-w-6xl px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] grid grid-cols-2 gap-3">
          <button
            onClick={backToEdit}
            className="w-full rounded-2xl border border-black/10 px-5 py-4 text-base font-semibold text-[color:var(--zus-navy)] active:scale-[.99] transition"
          >
            {lang === 'pl' ? 'Wróć do edycji' : 'Back to edit'}
          </button>
          <button
            onClick={savePdf}
            disabled={!input}
            className="w-full rounded-2xl bg-[color:var(--zus-green)] px-5 py-4 text-base font-semibold text-white shadow-[0_12px_28px_rgba(0,153,63,.22)] hover:opacity-95 active:scale-[.99] transition disabled:opacity-50"
          >
            {lang === 'pl' ? 'Pobierz PDF' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
