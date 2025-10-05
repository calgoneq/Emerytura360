// src/i18n/dict.ts
export const DICT = {
  pl: {
    hero_sub: "Zobacz, ile możesz otrzymać i dlaczego — z wyjaśnieniem waloryzacji, wpływu L4 i scenariuszami „co-jeśli”.",
    cta_start: "Rozpocznij symulację",
    cta_how: "Zobacz, jak to działa",
    expected_label: "Jaka emerytura Cię satysfakcjonuje? (PLN/m-c)",
    expected_hint: "Wpis nieobowiązkowy — użyjemy jako „celu” na wykresie."
    
  },
  en: {
    hero_sub: "See how much you may get and why — with indexation explainers, sick-leave impact and what-if scenarios.",
    cta_start: "Start simulation",
    cta_how: "See how it works",
    expected_label: "What pension would satisfy you? (PLN/month)",
    expected_hint: "Optional — we’ll use it as a “target” on the chart."
    
  }
} as const;
export type Lang = keyof typeof DICT;
