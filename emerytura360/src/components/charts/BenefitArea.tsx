'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export type BenefitPoint = { year: number; real: number };

export default function BenefitArea({ data, target }: { data: BenefitPoint[]; target?: number }) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(63,132,210)" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="rgb(63,132,210)" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v)=> (typeof v==='number'? v.toLocaleString('pl-PL',{style:'currency',currency:'PLN'}) : v)} />
          {target ? (
            <ReferenceLine y={target} stroke="rgb(0,153,63)" strokeDasharray="4 4" label={{ value: 'Oczekiwana', position: 'top', fill: 'rgb(0,153,63)'}} />
          ) : null}
          <Area type="monotone" dataKey="real" stroke="rgb(63,132,210)" fill="url(#grad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
