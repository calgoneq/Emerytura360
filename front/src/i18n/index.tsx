'use client';

import * as React from 'react';
import { z, type ZodErrorMap } from 'zod';

/* =========================
   SŁOWNIKI
========================= */

type Dict = Record<string, string>;

const PL: Dict = {
  // Header / Hero
  hero_sub:
    'Zobacz, ile możesz otrzymać i dlaczego — z wyjaśnieniem waloryzacji, wpływu L4 i scenariuszami „co-jeśli”.',
  cta_start: 'Rozpocznij symulację',
  cta_how: 'Zobacz, jak to działa',
  expected_label: 'Oczekiwana emerytura (PLN/m-c)',
  expected_hint: 'Możesz to pole pominąć – posłuży jedynie jako „cel” w wizualizacji.',
  // Simulate page
  sim_btn: 'Zaprognozuj',
  sim_page_title: 'Symulacja emerytury',
  form_basic: 'Dane obowiązkowe',
  form_age: 'Wiek',
  form_sex: 'Płeć',
  sex_k: 'Kobieta',
  sex_m: 'Mężczyzna',
  form_salary: 'Wynagrodzenie brutto (mies.)',
  form_start: 'Rok rozpoczęcia pracy',
  form_retire: 'Rok zakończenia pracy',
  form_zus_konto: 'Saldo na koncie (ZUS) (opcjonalnie)',
  form_zus_sub: 'Saldo na subkoncie (ZUS) (opcjonalnie)',
  form_expected: 'Oczekiwana emerytura (opcjonalnie)',
  form_postal: 'Kod pocztowy (opcjonalnie)',
  form_quarter: 'Kwartał waloryzacji (domyślnie III)',
  // Result page (przykładowe)
  res_actual: 'Emerytura rzeczywista',
  res_real: 'Emerytura urealniona',
  res_sick: 'Efekt chorobowy',
  // Inne
  opt: 'Opcje',
  // global
  app_tag: 'Edukacyjny symulator',
  did_you_know: 'Czy wiesz, że…',
  how_it_works: 'Jak to działa?',
  start: 'Rozpocznij symulację',
  see_how: 'Zobacz, jak to działa',

  // hero
  hero_title: 'Emerytura 360',
  expected_ok: 'OK',

  // groups/badges
  group_below:  'Poniżej minimum',
  group_around: 'W okolicach średniej',
  group_above:  'Powyżej średniej',
  group_below_desc: 'Niższa aktywność zawodowa; brak gwarancji minimalnej.',
  group_around_desc: 'Zbliżona do przeciętnego świadczenia w roku przejścia.',
  group_above_desc: 'Wyższa niż przeciętna: dłuższa praca lub wyższe składki.',

  // chart
  chart_title: 'Poglądowa wizualizacja wzrostu (waloryzacja + składki)',
  chart_disclaimer: 'Przykład poglądowy. Rzeczywiste wyniki zależą od Twoich danych i wskaźników ZUS/GUS.',

  // how it works (kroki)
  hiw_1_title: 'Podajesz dane',
  hiw_1_desc: 'Wiek, płeć, pensję, lata pracy, L4.',
  hiw_2_title: 'Liczymy waloryzacje',
  hiw_2_desc: 'Roczne + kwartalne składek.',
  hiw_3_title: 'Prognoza miesięcy życia',
  hiw_3_desc: 'Dzielimy przez oczekiwane m-ce.',
  hiw_4_title: 'Kwota „rzeczywista” i „urealniona”',
  hiw_4_desc: 'Dwie liczby + porównania.',
  hiw_5_title: 'Scenariusze „co-jeśli”',
  hiw_5_desc: '+1/+2/+5 lat z wyjaśnieniami.',


};

const EN: Dict = {
  // Header / Hero
  hero_sub:
    'See how much you could receive and why — with explanations of indexation, sick leave impact, and what-if scenarios.',
  cta_start: 'Start simulation',
  cta_how: 'See how it works',
  expected_label: 'Expected pension (PLN/month)',
  expected_hint: 'Optional — used as a „target” in the visualization.',
  // Simulate page
  sim_btn: 'Forecast',
  sim_page_title: 'Pension simulation',
  form_basic: 'Required data',
  form_age: 'Age',
  form_sex: 'Sex',
  sex_k: 'Female',
  sex_m: 'Male',
  form_salary: 'Gross salary (monthly)',
  form_start: 'Start year',
  form_retire: 'Retirement year',
  form_zus_konto: 'Account balance (ZUS) (optional)',
  form_zus_sub: 'Sub-account balance (ZUS) (optional)',
  form_expected: 'Expected pension (optional)',
  form_postal: 'Postal code (optional)',
  form_quarter: 'Quarter of indexation (default III)',
  // Result page (sample)
  res_actual: 'Actual pension',
  res_real: 'Real (inflation-adjusted) pension',
  res_sick: 'Sick-leave effect',
  // Other
  opt: 'Options',
    // global
  app_tag: 'Educational simulator',
  did_you_know: 'Did you know…',
  how_it_works: 'How it works',
  start: 'Start simulation',
  see_how: 'See how it works',

  // hero
  hero_title: 'Retirement 360',

  expected_ok: 'OK',

  // groups/badges
  group_below:  'Below minimum',
  group_around: 'Around average',
  group_above:  'Above average',
  group_below_desc: 'Lower work activity; no minimum guarantee.',
  group_around_desc: 'Close to the average benefit in your retirement year.',
  group_above_desc: 'Higher than average: longer career or higher contributions.',

  // chart
  chart_title: 'Illustrative growth visualization (valorization + contributions)',
  chart_disclaimer: 'Illustrative example. Actual results depend on your data and official ZUS/GUS indices.',

  // how it works (steps)
  hiw_1_title: 'Provide your data',
  hiw_1_desc: 'Age, sex, salary, years worked, sick leave.',
  hiw_2_title: 'Compute valorization',
  hiw_2_desc: 'Annual + quarterly of contributions.',
  hiw_3_title: 'Life-months forecast',
  hiw_3_desc: 'Divide by expected months.',
  hiw_4_title: '“Actual” & “real” amounts',
  hiw_4_desc: 'Two numbers + comparisons.',
  hiw_5_title: 'What-if scenarios',
  hiw_5_desc: '+1/+2/+5 years with explanations.',



};

/* =========================
   ZOD ERROR MAPS (PL/EN)
========================= */

export const plErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case 'too_small':
      if (issue.minimum !== undefined) return { message: `Za mało: minimum ${issue.minimum}` };
      return { message: 'Za mało' };
    case 'too_big':
      if (issue.maximum !== undefined) return { message: `Za dużo: maksimum ${issue.maximum}` };
      return { message: 'Za dużo' };
    case 'invalid_type':
      return { message: 'Nieprawidłowy typ (wpisz liczbę)' };
    case 'invalid_enum_value':
      return { message: 'Wybierz jedną z opcji' };
    default:
      return { message: ctx?.defaultError ?? 'Nieprawidłowa wartość' };
  }
};

export const enErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case 'too_small':
      if (issue.minimum !== undefined) return { message: `Too small: min ${issue.minimum}` };
      return { message: 'Too small' };
    case 'too_big':
      if (issue.maximum !== undefined) return { message: `Too big: max ${issue.maximum}` };
      return { message: 'Too big' };
    case 'invalid_type':
      return { message: 'Invalid type (enter a number)' };
    case 'invalid_enum_value':
      return { message: 'Select one of the options' };
    default:
      return { message: ctx?.defaultError ?? 'Invalid value' };
  }
};

/* =========================
   KONTEXT I HOOK
========================= */

type I18nCtxValue = {
  lang: 'pl' | 'en';
  setLang: (l: 'pl' | 'en') => void;
  t: (key: string) => string;
  dict: Dict;
};

const I18nCtx = React.createContext<I18nCtxValue | null>(null);

/** Provider – trzyma język i przełącza mapę błędów Zoda */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<'pl' | 'en'>('pl');

  const dict = React.useMemo(() => (lang === 'pl' ? PL : EN), [lang]);

  // Ustawiamy mapę błędów Zoda przy zmianie języka
  React.useEffect(() => {
    z.setErrorMap(lang === 'pl' ? plErrorMap : enErrorMap);
  }, [lang]);

  const t = React.useCallback(
    (key: string) => {
      // proste tłumaczenie; jeżeli klucz nie istnieje, zwróć sam klucz
      return dict[key] ?? key;
    },
    [dict]
  );

  const value = React.useMemo<I18nCtxValue>(() => ({ lang, setLang, t, dict }), [lang, t, dict]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useT() {
  const c = React.useContext(I18nCtx);
  if (!c) throw new Error('useT must be used within <I18nProvider>');
  return c;
}
