'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n';
import { FACTS_PL, FACTS_EN } from '@/lib/facts';
import { useInterval } from '@/lib/useInterval';

import {
  Sparkles,
  Info as InfoIcon,
  Play,
  ArrowRight,
  Info,
} from 'lucide-react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { HowItWorks } from '@/components/HowItWorks';
import { RotatingFact } from '@/components/RotatingFact';
import dynamic from 'next/dynamic';
const HeroGrowthChart = dynamic(() => import('@/components/HeroGrowthChart'), {
  ssr: false,
});
import { LegendDots } from '@/components/LegendDots';

/* --- helper components --- */
function SectionChip({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-[color:var(--zus-navy)] backdrop-blur">
      {children}
    </div>
  );
}

/* --- existing groups / state / effects ... */

const groups: Array<{
  key: string;
  level: 'below' | 'around' | 'above';
  desc: string;
}> = [
  {
    key: 'below-min',
    level: 'below',
    desc: 'Niższa aktywność zawodowa; brak gwarancji minimalnej.',
  },
  {
    key: 'around-avg',
    level: 'around',
    desc: 'Zbliżona do przeciętnego świadczenia w roku przejścia.',
  },
  {
    key: 'above-avg',
    level: 'above',
    desc: 'Wyższa niż przeciętna: dłuższa praca lub wyższe składki.',
  },
];

export default function Home() {
  const { t, lang } = useT();
  const router = useRouter();

  const [expected, setExpected] = useState<string>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('expected') || '' : ''
  );

  const [factIdx, setFactIdx] = useState(0);

  const facts = lang === 'pl' ? FACTS_PL : FACTS_EN;
  useInterval(() => setFactIdx((i) => (i + 1) % facts.length), 3500);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('expected', expected || '');
    }
  }, [expected]);

  const scrollToBottom = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-[100dvh] relative z-10">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* tło zostaje jak masz */}

        <div className="section pt-10 pb-8">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-10 xl:gap-14 items-start">
            {/* LEWA kolumna: nagłówek i CTA */}
            <div className="space-y-4">
              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/70 px-3 py-1 text-xs text-[color:var(--zus-navy)] backdrop-blur">
                <Sparkles className="h-4 w-4" /> {t('app_tag')}
              </div>

              <h1
                className="h-display [text-transform:none] font-normal tracking-tight leading-[0.9]
                       text-[color:var(--zus-green)] drop-shadow-[0_6px_24px_rgba(0,153,63,.18)]
                       text-[clamp(52px,9vw,132px)]"
              >
                {t('hero_title')}
              </h1>

              <p className="mt-2 max-w-2xl text-lg text-[color:var(--zus-navy)]/80 flex items-start gap-2">
                <InfoIcon className="mt-1 h-5 w-5 text-[color:var(--zus-navy)]/50" />
                <span>{t('hero_sub')}</span>
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push('/simulate')}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold
                                   text-white bg-[var(--zus-green)]
                                   shadow-[0_10px_24px_rgba(0,153,63,.18)]
                                   hover:opacity-90 focus-visible:outline focus-visible:outline-2
                                   focus-visible:outline-[var(--zus-green)]"
                >
                  <Play className="h-5 w-5" /> {t('cta_start')}
                </button>

                <button
                  onClick={scrollToBottom}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold
                                   text-[color:var(--zus-navy)] bg-white border border-[color:var(--zus-gray)]/60
                                   hover:bg-[color:var(--zus-gray)]/20 focus-visible:outline focus-visible:outline-2
                                   focus-visible:outline-[var(--zus-green)]"
                >
                  {t('cta_how')} <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              {/* Oczekiwana kwota */}
              <div className="mt-6 w-full max-w-md">
                <label className="block text-sm font-medium text-zus-navy mb-2">
                  {t('expected_label')}
                </label>

                {/* cały ring/border na WRAPPERZE */}
                <div className="group flex items-stretch overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm focus-within:ring-2 focus-within:ring-[color:var(--zus-green)]">
                  <input
                    aria-label={t('expected_label')}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={expected}
                    onChange={(e)=> setExpected(e.target.value)}
                    placeholder="np. 5000"
                    className="w-full px-4 py-3 outline-none border-0 focus:outline-none focus:ring-0"
                  />
                  {/* delikatny separator między inputem a przyciskiem */}
                  <div className="w-px self-stretch bg-black/10" />
                  <button
                    onClick={()=> router.push('/simulate')}
                    className="px-5 py-3 text-white bg-[color:var(--zus-green)] hover:opacity-90 focus:outline-none"
                  >
                    {t('expected_ok')}
                  </button>
                </div>

                <p className="mt-2 text-xs text-zus-black/60 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> {t('expected_hint')}
                </p>
              </div>
            </div>

            {/* PRAWA kolumna: DUŻY wykres, wyrównany do treści */}
            <div className="hidden lg:block self-center -mt-6">
              {/* Wysokość: większa na dużych ekranach – przekazujemy jako prop */}
              <HeroGrowthChart
                base={1000}
                growth={0.06}
                years={18}
                height={400}
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAKTY + GRUPY */}
      <section className="section pb-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
          {/* Fakty */}
          <div className="lg:col-span-1 card-visual p-6">
            <div className="mb-3">
              <SectionChip>
                <Sparkles className="h-4 w-4" /> {t('did_you_know')}
              </SectionChip>
            </div>
            <RotatingFact facts={facts} index={factIdx} />
            <LegendDots />
          </div>

          {/* Grupy */}
          <div className="lg:col-span-2 grid sm:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g.key} className="card-visual p-5">
                <div className="flex items-center justify-between mb-3">
                  <CategoryBadge level={g.level} />
                  <Info className="h-4 w-4 text-black/30" />
                </div>
                <p className="text-[color:var(--zus-navy)] font-medium">
                  {g.level === 'below'
                    ? t('group_below_desc')
                    : g.level === 'around'
                    ? t('group_around_desc')
                    : t('group_above_desc')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px w-full my-10 bg-gradient-to-r from-transparent via-[rgba(0,65,110,.15)] to-transparent" />

      {/* Jak to działa */}
      <section className="section pb-24">
        <div className="max-w-6xl mx-auto card-visual p-6 lg:p-8">
          <div className="mb-3">
            <SectionChip>
              <Sparkles className="h-4 w-4" /> {t('how_it_works')}
            </SectionChip>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* Sticky CTA – mobile */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[900] sm:hidden">
        <button
          onClick={() => router.push('/simulate')}
          className="shadow-[0_10px_24px_rgba(0,153,63,.25)] bg-[var(--zus-green)] text-white px-5 py-3 rounded-full font-semibold"
        >
          {t('cta_start')}
        </button>
      </div>
    </main>
  );
}

