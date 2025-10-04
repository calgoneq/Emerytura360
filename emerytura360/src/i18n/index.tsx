'use client';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { PL } from './pl';
import { EN } from './en';

export type Lang = 'pl' | 'en';

// 1) Klucze bierzemy z PL
type Keys = keyof typeof PL;

// 2) Słownik = te same klucze, ale wartości to zwykłe stringi (nie literały)
type Dict = Record<Keys, string>;

// 3) EN musi mieć te same klucze co PL (satisfies), wartości mogą być dowolnymi stringami
const PL_DICT: Dict = PL as unknown as Dict;
const EN_DICT: Dict = EN as unknown as Dict;
// alternatywnie (jeśli chcesz twardą weryfikację przy kompilacji):
// export const EN = { ... } satisfies Record<keyof typeof PL, string>;

const DICTS: Record<Lang, Dict> = { pl: PL_DICT, en: EN_DICT };

type I18nValue = {
  lang: Lang;
  t: (k: Keys) => string;
  setLang: (l: Lang) => void;
};

const I18nCtx = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('pl');
  const dict = lang === 'pl' ? DICTS.pl : DICTS.en;

  const v = useMemo<I18nValue>(() => ({
    lang,
    setLang,
    t: (k: Keys) => dict[k],
  }), [lang, dict]);

  return <I18nCtx.Provider value={v}>{children}</I18nCtx.Provider>;
}

export function useT() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error('useT outside provider');
  return c;
}
