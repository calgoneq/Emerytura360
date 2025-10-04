'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export type BenefitPoint = { year: number; real: number };

export default function BenefitArea({
  data,
  target,
  height = 340,
}: {
  data: BenefitPoint[];
  target?: number;
  height?: number | string;
}) {
  const green = 'var(--zus-green)';
  const grid = 'rgba(0,0,0,.06)';
  const navy = 'var(--zus-navy)';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={green} stopOpacity={0.35} />
            <stop offset="95%" stopColor={green} stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} />
        <XAxis dataKey="year" stroke={navy} tick={{ fill: 'rgba(0,0,0,.65)', fontSize: 12 }} />
        <YAxis stroke={navy} tick={{ fill: 'rgba(0,0,0,.65)', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,.08)' }}
          formatter={(v: number) => [`${Math.round(v).toLocaleString('pl-PL')} zł`, 'Urealniona']}
          labelFormatter={(l) => `Rok ${l}`}
        />
        <Area
          type="monotone"
          dataKey="real"
          stroke={green}
          strokeWidth={2.5}
          fill="url(#areaGreen)"
          dot={false}
          isAnimationActive
        />
        {typeof target === 'number' && target > 0 && (
          <ReferenceLine
            y={target}
            stroke="rgba(0,0,0,.35)"
            strokeDasharray="4 6"
            label={{
              value: `Cel: ${Math.round(target).toLocaleString('pl-PL')} zł`,
              position: 'right',
              fill: 'rgba(0,0,0,.6)',
              fontSize: 12,
            }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
