'use client';

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

export type CapitalPoint = { year: number; capital: number };

export default function CapitalLine({ data, height = 320 }: { data: CapitalPoint[]; height?: number | string }) {
  const green = 'var(--zus-green)';
  const grid = 'rgba(0,0,0,.06)';
  const navy = 'var(--zus-navy)';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={grid} />
        <XAxis dataKey="year" stroke={navy} tick={{ fill: 'rgba(0,0,0,.65)', fontSize: 12 }} />
        <YAxis stroke={navy} tick={{ fill: 'rgba(0,0,0,.65)', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,.08)' }}
          formatter={(v: number) => [`${Math.round(v).toLocaleString('pl-PL')} zł`, 'Kapitał']}
          labelFormatter={(l) => `Rok ${l}`}
        />
        <Line
          type="monotone"
          dataKey="capital"
          stroke={green}
          strokeWidth={2.5}
          dot={false}
          isAnimationActive
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
