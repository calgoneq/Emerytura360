'use client';

import React, { useMemo } from 'react';

export type Scenario = {
  delay: number; // 1,2,5...
  benefit?: { nominal?: number; real?: number; actual?: number };
};

type Props = {
  scenarios: Scenario[];                 // UWAGA: tu już podawaj BEZ delay=0 (albo przefiltruję)
  use?: 'real' | 'actual' | 'nominal';
  activeDelay?: number;
  onActiveChange?: (d: number) => void;  // wspieram obie nazwy
  onDelayChange?: (d: number) => void;
  unit?: string;                         // 'zł/m-c'
};

export default function ScenariosBar({
  scenarios,
  use = 'real',
  activeDelay,
  onActiveChange,
  onDelayChange,
  unit = 'zł/m-c',
}: Props) {
  const green = 'var(--zus-green)';
  const navy = 'var(--zus-navy)';

  // Normalizacja + wywalamy delay=0 z widoku
  const rows = useMemo(() => {
    const data = (Array.isArray(scenarios) ? scenarios : [])
      .filter((s) => Number(s?.delay ?? 0) !== 0)
      .map((s) => {
        const v = Number(
          use === 'real'
            ? s?.benefit?.real
            : use === 'actual'
            ? s?.benefit?.actual
            : s?.benefit?.nominal
        ) || 0;

        const d = Number(s?.delay ?? 0);
        return {
          key: String(d),
          label: `+${d}`,
          value: v,
          delay: d,
        };
      });

    const max = Math.max(...data.map((d) => d.value), 1);
    return { data, max };
  }, [scenarios, use]);

  const fireChange = (d: number) => {
    onActiveChange?.(d);
    onDelayChange?.(d);
  };

  if (!rows.data.length) return null;

  return (
    <div className="space-y-3">
      {rows.data.map(({ key, label, value, delay }) => {
        const pct = Math.max(0, Math.round((value / rows.max) * 100));
        const isActive = Number(activeDelay) === Number(delay);

        return (
          <div key={key} className="flex items-center gap-2 sm:gap-3 select-none">

            {/* etykieta */}
            <div
              className="w-16 sm:w-20 shrink-0 text-sm"
              style={{ color: 'color-mix(in oklab, var(--zus-navy) 85%, black 15%)' }}
            >
              {label}
            </div>

            {/* pasek (klik) */}
            <button
              type="button"
              onClick={() => fireChange(delay)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fireChange(delay);
                }
              }}
              aria-pressed={isActive}
              title={`${value.toLocaleString('pl-PL')} ${unit}`}
              className={[
                "group relative flex-1 h-6 sm:h-5 rounded-full overflow-hidden border transition",
                isActive
                  ? 'border-[color:var(--zus-green)] ring-2 ring-[color:var(--zus-green)]/20'
                  : 'border-black/10 hover:border-black/15',
              ].join(' ')}
              style={{
                background: 'color-mix(in oklab, var(--zus-green) 10%, white)',
              }}
            >
              <div
                className="h-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${pct}%`,
                  background: isActive
                    ? green
                    : 'color-mix(in oklab, var(--zus-green) 40%, white)',
                }}
              />
              <span className="pointer-events-none absolute inset-0 rounded-full ring-0 group-hover:ring-1 group-hover:ring-black/5" />
            </button>

            {/* wartość */}
            <div className="w-24 sm:w-28 shrink-0 text-right text-xs sm:text-sm font-medium" style={{ color: navy }}>
              {value.toLocaleString('pl-PL')} {unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}
