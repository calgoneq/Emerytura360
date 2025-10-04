'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export type CapitalPoint = { year: number; capital: number };

export default function CapitalLine({ data }: { data: CapitalPoint[] }) {
  return (
    <div className="w-full h-56">
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v)=> (typeof v==='number'? v.toLocaleString('pl-PL',{style:'currency',currency:'PLN'}) : v)} />
          <Line type="monotone" dataKey="capital" stroke="rgb(0,153,63)" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
