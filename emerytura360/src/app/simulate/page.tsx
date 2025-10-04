'use client';

import React, { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useT } from '@/i18n';

/** Helpers */
const emptyToUndef = (v: unknown) => (v === '' ? undefined : v);
const nowYear = new Date().getFullYear();
const SS_KEY = 'sim.form.v1';
const EXPECTED_KEY = 'expected';
const toNum = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? undefined : n;
};
/** Zod schema – pozwala na puste inputy do czasu submitu */
const schema = z.object({
  age: z.preprocess(
    toNum,
    z.number({ invalid_type_error: 'Wpisz wiek' })
      .min(16, { message: 'Wiek musi być ≥ 16' })
      .max(80,  { message: 'Wiek musi być ≤ 80' })
  ),
  sex: z.enum(['M','K'], { errorMap: () => ({ message: 'Wybierz płeć' }) }).optional(),

  salary: z.preprocess(
    toNum,
    z.number({ invalid_type_error: 'Wpisz wynagrodzenie' })
      .min(1000,   { message: 'Wynagrodzenie musi być ≥ 1000 PLN' })
      .max(100000, { message: 'Wynagrodzenie musi być ≤ 100000 PLN' })
  ),

  startYear: z.preprocess(
    toNum,
    z.number({ invalid_type_error: 'Wpisz rok rozpoczęcia pracy' })
      .min(1970, { message: 'Nie wcześniej niż 1970' })
  ),

  retireYear: z.preprocess(
    toNum,
    z.number({ invalid_type_error: 'Wpisz rok zakończenia pracy' })
      .max(2100, { message: 'Nie później niż 2100' })
  ),

  includeSick: z.boolean().optional().default(false),

  zusBalance:  z.preprocess(toNum, z.number().nonnegative().optional()),
  subBalance:  z.preprocess(toNum, z.number().nonnegative().optional()),
  expected:    z.preprocess(toNum, z.number().nonnegative().optional()),
  quarterAward:z.preprocess(
    toNum,
    z.number({ invalid_type_error: 'Wybierz kwartał' })
      .min(1, { message: 'Kwart. 1–4' })
      .max(4, { message: 'Kwart. 1–4' })
  ),

  postalCode: z.string().optional().nullable(),
})
.refine(v => v.retireYear === undefined || v.retireYear >= nowYear, {
  path: ['retireYear'], message: 'Rok ≥ bieżący'
})
.refine(v => v.startYear === undefined || v.retireYear === undefined || v.startYear <= v.retireYear!, {
  path: ['startYear'], message: 'Start ≤ rok przejścia'
});

type FormData = z.infer<typeof schema>;

export default function SimulatePage() {
  const { t, lang } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver<FormData>(schema),
    defaultValues: {
    // … Twoje inne pola
    quarterAward: 3   // ⬅️ domyślnie III kwartał
  },
  });

  /** Pobierz age/salary do lżejszego watcha (użyjemy w syncu URL) */
  const age = watch('age');
  const salary = watch('salary');

  /** Load z sessionStorage + URL (bez wciskania 0) */
  useEffect(() => {
    
    if (typeof window === 'undefined') return;

    // sesja – zeskrob "historyczne zera"
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        
        const scrubbed: any = { ...saved };
        if (scrubbed.age === 0 || scrubbed.age === '0') scrubbed.age = undefined;
        if (scrubbed.salary === 0 || scrubbed.salary === '0') scrubbed.salary = undefined;
        if (scrubbed.startYear === 0 || scrubbed.startYear === '0') scrubbed.startYear = undefined;
        if (scrubbed.retireYear === 0 || scrubbed.retireYear === '0') scrubbed.retireYear = undefined;
        const expRaw = sessionStorage.getItem(EXPECTED_KEY ?? 'expected');
const expNum = expRaw !== null && expRaw.trim() !== '' && !Number.isNaN(Number(expRaw))
  ? Number(expRaw)
  : undefined;
if (expNum !== undefined) scrubbed.expected = expNum;
        reset({ ...getValues(), ...scrubbed });
      } catch {}
    }

    // URL – tylko gdy niepusty i != 0
    const ageQ = params.get('age');
    if (ageQ !== null && ageQ.trim() !== '' && !Number.isNaN(Number(ageQ)) && Number(ageQ) !== 0) {
      setValue('age', Number(ageQ) as any);
    }
    const salQ = params.get('salary');
    if (salQ !== null && salQ.trim() !== '' && !Number.isNaN(Number(salQ)) && Number(salQ) !== 0) {
      setValue('salary', Number(salQ) as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, params]);

  /** Save do sessionStorage (debounce) */
  const all = watch();
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        sessionStorage.setItem(SS_KEY, JSON.stringify(all));
      } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [all]);

  /** Sync do URL – tylko gdy realna zmiana (brak pętli / ciągłego refetch) */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nextQS = new URLSearchParams();
    const hasAge = age !== undefined && age !== null && String(age).trim() !== '';
    const hasSal = salary !== undefined && salary !== null && String(salary).trim() !== '';

    if (hasAge) nextQS.set('age', String(age));
    if (hasSal) nextQS.set('salary', String(salary));

    const next = nextQS.toString();
    const prev = window.location.search.startsWith('?')
      ? window.location.search.slice(1)
      : window.location.search;

    if (next !== prev) {
      const id = setTimeout(() => {
        router.replace(`${pathname}${next ? `?${next}` : ''}`, { scroll: false });
      }, 250);
      return () => clearTimeout(id);
    }
  }, [age, salary, router, pathname]);

  /** Mapowanie na payload backendu */
  const toPayload = (v: FormData) =>
    ({
      age: v.age!,
      expected_pension: v.expected,
      gross_salary: v.salary!,
      include_sick_leave: !!v.includeSick,
      postal_code: v.postalCode ?? null,
      quarter_award: v.quarterAward!,
      retire_year: v.retireYear!,
      sex: (v.sex ?? 'K') as 'M' | 'K',
      start_year: v.startYear!,
      zus_balance: { konto: v.zusBalance ?? 0, subkonto: v.subBalance ?? 0 },
    } as const);

  /** Submit */
  const onSubmit: SubmitHandler<FormData> = async (values) => {
    setSubmitError(null);
    const payload = toPayload(values);
    if (values.expected !== undefined && values.expected !== null && values.expected !== '') {
  try { sessionStorage.setItem('expected', String(values.expected)); } catch {}
} else {
  try { sessionStorage.removeItem('expected'); } catch {}
}

    try {
      const sim = await api.simulate(payload);
      const tl = await api.timeline(payload);

      let wi: any = null;
      try {
        wi = await api.whatIf(payload);
      } catch (e: any) {
        console.warn('what-if failed:', e?.message ?? e);
        if (lang === 'pl') {
          setSubmitError((prev) => (prev ? prev + ' | ' : '') + 'Nie udało się policzyć scenariuszy (what-if).');
        } else {
          setSubmitError((prev) => (prev ? prev + ' | ' : '') + 'Failed to compute what-if scenarios.');
        }
      }

      // zapisz dla /result
      sessionStorage.setItem('sim:input', JSON.stringify(payload));
      sessionStorage.setItem('sim:output', JSON.stringify(sim));
      sessionStorage.setItem('sim:timeline', JSON.stringify(tl));
      sessionStorage.setItem('sim:whatif', JSON.stringify(wi ?? [])); 
      if (wi) sessionStorage.setItem('sim:whatif', JSON.stringify(wi));

      router.push('/result');
    } catch (e: any) {
      const msg =
        typeof e?.message === 'string'
          ? e.message
          : typeof e === 'string'
          ? e
          : (() => {
              try {
                return JSON.stringify(e);
              } catch {
                return lang === 'pl' ? 'Błąd API' : 'API error';
              }
            })();
      setSubmitError(msg);
    }
  };

  /** UI style helpers */
  const ctl =
    'w-full rounded-xl border border-black/10 bg-white/80 backdrop-blur px-4 py-3 ' +
    'text-[15px] leading-6 shadow-sm focus:outline-none focus:ring-2 ' +
    'focus:ring-[color:var(--zus-green)] focus:border-[color:var(--zus-green)] placeholder:text-black/40';

  const card = 'rounded-2xl border border-black/10 bg-white/70 shadow-sm p-6 md:p-7';

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(0,153,63,.06),transparent_60%)]">
      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-10">
        {/* nagłówek */}
        <header className="mb-6 md:mb-8">
        
          <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-[color:var(--zus-green)]">
            {t('sim_page_title') ?? 'Symulacja emerytury'}
          </h1>
          <p className="mt-1.5 text-[15px] text-[color:var(--zus-navy)]/75">
            {lang === 'pl'
              ? 'Wypełnij podstawy po lewej i opcje po prawej. Możesz wrócić i edytować w każdej chwili.'
              : 'Fill in the basics on the left and options on the right. You can come back and edit anytime.'}
          </p>
        </header>

        {/* siatka 2 kolumny */}
        <form onSubmit={handleSubmit(onSubmit)} className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* LEWA KOLUMNA – dane podstawowe */}
          <section className={card}>
            <h2 className="text-lg font-medium text-[color:var(--zus-navy)]">{t('form_basic') ?? 'Dane obowiązkowe'}</h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* wiek */}
              <div>
                <label className="block text-sm text-[color:var(--zus-navy)]/80 mb-1">{t('form_age')}</label>
                <input type="number" inputMode="numeric" placeholder="28" {...register('age')} className={ctl} />
                {errors.age && <p className="mt-1 text-xs text-red-600">{String(errors.age.message)}</p>}
              </div>

              {/* płeć */}
              <div>
                <label className="block text-sm text-[color:var(--zus-navy)]/80 mb-1">{t('form_sex')}</label>
                <select {...register('sex')} className={ctl} defaultValue="">
                  <option value="" disabled>
                    {lang === 'pl' ? '— wybierz —' : '— select —'}
                  </option>
                  <option value="K">{t('sex_k')}</option>
                  <option value="M">{t('sex_m')}</option>
                </select>
                {errors.sex && <p className="mt-1 text-xs text-red-600">{String(errors.sex.message)}</p>}
              </div>

              {/* wynagrodzenie */}
              <div className="sm:col-span-2">
                <label className="block text-sm text-[color:var(--zus-navy)]/80 mb-1">{t('form_salary')}</label>
                <div className="relative">
                  <input type="number" inputMode="numeric" placeholder="8500" {...register('salary')} className={ctl + ' pr-14'} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-black/50">
                    PLN/m-c
                  </span>
                </div>
                {errors.salary && <p className="mt-1 text-xs text-red-600">{String(errors.salary.message)}</p>}
              </div>

              {/* start year */}
              <div>
                <label className="block text-sm text-[color:var(--zus-navy)]/80 mb-1">{t('form_start')}</label>
                <input type="number" inputMode="numeric" placeholder="YYYY" {...register('startYear')} className={ctl} />
                {errors.startYear && <p className="mt-1 text-xs text-red-600">{String(errors.startYear.message)}</p>}
              </div>

              {/* retire year */}
              <div>
                <label className="block text-sm text-[color:var(--zus-navy)]/80 mb-1">{t('form_retire')}</label>
                <input type="number" inputMode="numeric" placeholder="YYYY" {...register('retireYear')} className={ctl} />
                {errors.retireYear && <p className="mt-1 text-xs text-red-600">{String(errors.retireYear.message)}</p>}
              </div>
            </div>
          </section>

          {/* PRAWA KOLUMNA – opcje */}
          <aside className={card}>
            <h2 className="text-lg font-medium text-[color:var(--zus-navy)]">{lang === 'pl' ? 'Opcjonalne' : 'Optionals'}</h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* saldo konto */}
              <div>
                <label className="block text-sm text-[color:var(--zus-navy)]/80 mb-1">{t('form_zus_konto')}</label>
                <input type="number" inputMode="numeric" placeholder="0" {...register('zusBalance')} className={ctl} />
              </div>

              {/* saldo subkonto */}
              <div>
                <label className="block text-xs text-[color:var(--zus-navy)]/80 mb-1">{t('form_zus_sub')}</label>
                <input type="number" inputMode="numeric" placeholder="0" {...register('subBalance')} className={ctl} />
              </div>

              {/* expected */}
              <div className="sm:col-span-2">
                <label className="block text-sm text-[color:var(--zus-navy)]/80 mb-1">{t('form_expected')}</label>
                <div className="relative">
                  <input type="number" inputMode="numeric" placeholder="5000" {...register('expected')} className={ctl + ' pr-12'} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-black/50">PLN/m-c</span>
                </div>
              </div>

              {/* postal */}
              <div>
                <label className="block text-sm text-[color:var(--zus-navy)]/80 mb-1">{t('form_postal')}</label>
                <input {...register('postalCode')} placeholder="np. 31-234" className={ctl} />
              </div>

              {/* kwartał */}
              <div>
                <label className="block text-sm text-[color:var(--zus-navy)]/80 mb-1">{t('form_quarter')}</label>
                <select {...register('quarterAward')} className={ctl} defaultValue={3} >
                  
                  <option value={1}>I</option>
                  <option value={2}>II</option>
                  <option value={3}>III</option>
                  <option value={4}>IV</option>
                </select>
                {errors.quarterAward && <p className="mt-1 text-xs text-red-600">{String(errors.quarterAward.message)}</p>}
              </div>

              {/* checkbox L4 */}
              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-3 text-[15px] text-[color:var(--zus-navy)]/85">
                  <input
                    type="checkbox"
                    {...register('includeSick')}
                    className="h-4 w-4 rounded border-black/20 accent-[color:var(--zus-green)] text-[color:var(--zus-green)] focus:ring-[color:var(--zus-green)]"
                  />
                  {lang === 'pl' ? 'Uwzględniaj średnie L4' : 'Include average sick leave'}
                </label>
              </div>
            </div>

            {/* błąd & CTA */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="hidden lg:inline-flex items-center justify-center rounded-xl bg-[color:var(--zus-green)] px-5 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(0,153,63,.18)] hover:opacity-90 disabled:opacity-70"
              >
                {isSubmitting
                  ? lang === 'pl'
                    ? 'Liczymy…'
                    : 'Calculating…'
                  : t('sim_btn') ?? (lang === 'pl' ? 'Zaprognozuj' : 'Forecast')}
              </button>

              {typeof submitError !== 'undefined' && submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>
              )}
            </div>
          </aside>
        </form>

        {/* sticky CTA – mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white/95 backdrop-blur px-4 py-3">
          <div className="max-w-6xl mx-auto flex gap-3">
            <button
              onClick={() => handleSubmit(onSubmit)()}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[color:var(--zus-green)] text-white font-semibold py-3 disabled:opacity-70"
            >
              {isSubmitting ? (lang === 'pl' ? 'Liczymy…' : 'Calculating…') : lang === 'pl' ? 'Zaprognozuj' : 'Forecast'}
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-4 rounded-xl border border-black/10"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
