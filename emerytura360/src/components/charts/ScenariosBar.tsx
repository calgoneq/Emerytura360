'use client';
import React from 'react';

export default function ScenariosBar({ scenarios }: { scenarios: Record<string, number> }) {
  if (!scenarios) return null;
  const entries = Object.entries(scenarios);
  const max = Math.max(...entries.map(([,v])=>v), 1);

  return (
    <div className="space-y-3">
      {entries.map(([k, v]) => {
        const pct = Math.round((v / max) * 100);
        return (
          <div key={k} className="flex items-center gap-3">
            <div className="w-24 text-sm text-[color:var(--zus-navy)]/90">{k}</div>
            <div className="flex-1 bg-black/5 rounded-full h-4 overflow-hidden">
              <div
                style={{ width: `${pct}%` }}
                className="h-4 bg-[rgb(63,132,210)]"
                title={`${v}%`}
              />
            </div>
            <div className="w-16 text-right text-sm font-medium">
              {typeof v === 'number' ? `${v}%` : String(v)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
