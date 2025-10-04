'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useT } from '@/i18n';
import { Info } from 'lucide-react';

const HeroGrowthChart = dynamic(() => import('@/components/HeroGrowthChart'), { ssr: false });


const schema = z.object({
  age: z.number().min(16).max(80),
  sex: z.enum(['F', 'M']),
  salary: z.number().min(1000).max(100000),
  startYear: z.number().min(1970).max(new Date().getFullYear()),
  retireYear: z.number().min(new Date().getFullYear()).max(2100),
  includeSick: z.boolean(),                 // <-- wymagane
  zusBalance: z.number().optional(),
  subBalance: z.number().optional(),
});
type FormData = z.infer<typeof schema>;

export default function SimulatePage() {
  const { t, lang } = useT();
  const [result, setResult] = useState<null | {
    actual: number; real: number; rr: number; avg: number; series: { year: number; value: number }[];
  }>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      age: 30,
      sex: 'M',
      salary: 8000,
      startYear: 2015,
      retireYear: new Date().getFullYear() + 37,
      includeSick: true,
      zusBalance: undefined,
      subBalance: undefined,
    }
  });

  // POGGLĄDOWA kalkulacja – podmieńcie na wywołanie backendu
  async function onSubmit(values: FormData) {
    const years = Math.max(0, values.retireYear - new Date().getFullYear());
    const growth = 0.06; // do podmiany: wskaźniki z XLS
    const base = values.salary * 0.38; // „przybliżone składkowanie” / edukacyjne
    const includeSickPenalty = values.includeSick ? 0.97 : 1;

    let v = (values.zusBalance ?? 0) + (values.subBalance ?? 0) + base;
    const series: { year: number; value: number }[] = [{ year: 0, value: Math.round(v) }];
    for (let i = 1; i <= years; i++) {
      v = v * (1 + growth) * includeSickPenalty;
      series.push({ year: i, value: Math.round(v) });
    }
    const capital = v;
    const monthsLife = 240; // do podmiany: z aktuariatu
    const actual = Math.round(capital / monthsLife);
    const inflation = 0.03; // do podmiany: GUS
    const real = Math.round(actual / Math.pow(1 + inflation, years));
    const avg = Math.round(actual * 0.95);
    const rr = Math.round((actual / (values.salary || 1)) * 100);

    setResult({ actual, real, rr, avg, series });
  }

  const nf = new Intl.NumberFormat(lang === 'pl' ? 'pl-PL' : 'en-GB');

  return (
    <main className="section py-8">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-10">
        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <h1 className="text-2xl font-semibold text-[color:var(--zus-navy)]">
            {lang === 'pl' ? 'Symulacja emerytury' : 'Pension simulation'}
          </h1>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Wiek */}
            <Field label={lang==='pl'?'Wiek':'Age'} error={errors.age?.message}>
              <InputNumber {...register('age', { valueAsNumber: true })} />
            </Field>

            {/* Płeć */}
            <Field label={lang==='pl'?'Płeć':'Sex'}>
              <select className="input" {...register('sex')}>
                <option value="M">{lang==='pl'?'Mężczyzna':'Male'}</option>
                <option value="F">{lang==='pl'?'Kobieta':'Female'}</option>
              </select>
            </Field>

            {/* Wynagrodzenie brutto */}
            <Field label={lang==='pl'?'Wynagrodzenie brutto (PLN/m-c)':'Gross salary (PLN/mo)'} error={errors.salary?.message}>
              <InputNumber {...register('salary', { valueAsNumber: true })} />
            </Field>

            {/* Rok startu pracy */}
            <Field label={lang==='pl'?'Rok rozpoczęcia pracy':'Year started working'} error={errors.startYear?.message}>
              <InputNumber {...register('startYear', { valueAsNumber: true })} />
            </Field>

            {/* Rok zakończenia (domyślnie wiek emerytalny) */}
            <Field label={lang==='pl'?'Planowany rok zakończenia pracy':'Planned retirement year'} error={errors.retireYear?.message}>
              <InputNumber {...register('retireYear', { valueAsNumber: true })} />
            </Field>

            {/* Środki (opcjonalnie) */}
            <Field label={lang==='pl'?'Saldo na koncie ZUS (opcjonalnie)':'ZUS account balance (optional)'} error={errors.zusBalance?.message}>
              <InputNumber {...register('zusBalance', { valueAsNumber: true })} />
            </Field>
            <Field label={lang==='pl'?'Saldo na subkoncie (opcjonalnie)':'Sub-account balance (optional)'} error={errors.subBalance?.message}>
              <InputNumber {...register('subBalance', { valueAsNumber: true })} />
            </Field>
          </div>

          {/* L4 toggle */}
          <label className="flex items-center gap-3 select-none">
            <input type="checkbox" className="h-4 w-4 accent-[color:var(--zus-green)]" {...register('includeSick')} />
            <span className="text-[color:var(--zus-navy)]/90">
              {lang==='pl'?'Uwzględniaj typowe okresy L4':'Include typical sick-leave periods'}
            </span>
          </label>

          {/* Submit */}
          <button disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold
                             text-white bg-[var(--zus-green)] hover:opacity-90 disabled:opacity-60">
            {isSubmitting ? (lang==='pl'?'Liczenie…':'Computing…') : (lang==='pl'?'Zaprognozuj moją przyszłą emeryturę':'Forecast my future pension')}
          </button>

          <p className="text-xs text-[color:var(--zus-navy)]/60 flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            {lang==='pl'
              ? 'Rok rozpoczęcia i zakończenia odnoszą się zawsze do stycznia.'
              : 'Start and end year always refer to January.'}
          </p>
        </form>

        {/* WYNIK */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[color:var(--zus-navy)]">
            {lang==='pl'?'Wynik':'Result'}
          </h2>

          {/* karty liczb */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Stat title={lang==='pl'?'Kwota „rzeczywista”':'Actual amount'}
                  value={result ? nf.format(result.actual)+' PLN' : '—'} />
            <Stat title={lang==='pl'?'Kwota „urealniona”':'Real (inflation-adjusted)'}
                  value={result ? nf.format(result.real)+' PLN' : '—'} />
            <Stat title={lang==='pl'?'Stopa zastąpienia':'Replacement rate'}
                  value={result ? result.rr+' %' : '—'} />
            <Stat title={lang==='pl'?'Prognozowane świadczenie średnie':'Projected average benefit'}
                  value={result ? nf.format(result.avg)+' PLN' : '—'} />
          </div>

          {/* wykres kapitału do emerytury */}
          {result && (
            <div className="mt-2">
              <HeroGrowthChart
                base={result.series[0].value}
                years={result.series.length-1}
                growth={0.01} // tu nieistotne: wykres poglądowy po wyniku
                height={360}
              />
            </div>
          )}

          {!result && (
            <div className="rounded-2xl bg-white/70 border border-black/5 p-6 text-[color:var(--zus-navy)]/70">
              {lang==='pl'
                ? 'Uzupełnij dane i kliknij „Zaprognozuj…”, aby zobaczyć wynik i wykres.'
                : 'Fill the form and click “Forecast…” to see the result and chart.'}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ---------- mini-komponenty ---------- */

function Field({ label, error, children }:{ label:string; error?:string; children:React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[color:var(--zus-navy)] mb-1">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const InputNumber = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input type="number" {...props}
         className="input w-full"
         inputMode="numeric" pattern="[0-9]*" />
);

function Stat({ title, value }:{ title:string; value:string }) {
  return (
    <div className="rounded-2xl bg-white/95 border border-black/5 p-4 shadow-[0_10px_28px_-14px_rgba(0,0,0,.18)]">
      <div className="text-sm text-[color:var(--zus-navy)]/70">{title}</div>
      <div className="text-2xl font-semibold text-[color:var(--zus-navy)] mt-1">{value}</div>
    </div>
  );
}
