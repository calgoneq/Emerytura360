'use client';
import { useEffect, useState } from 'react';

export function RotatingFact({ facts, index }: { facts: string[]; index: number }) {
  const [prev, setPrev] = useState(index);
  const [phase, setPhase] = useState<'in'|'out'|'idle'>('in');

  useEffect(() => {
    // przy każdej zmianie index: najpierw animacja out, potem in
    setPhase('out');
    const t = setTimeout(() => {
      setPrev(index);
      setPhase('in');
    }, 180); // czas „wyjścia”
    return () => clearTimeout(t);
  }, [index]);

  // animka — CSS only (mocniejsza)
  const base = 'transition-all duration-200 will-change-transform';
  const out  = 'opacity-0 -translate-y-2 blur-[1px]';
  const into = 'opacity-100 translate-y-0 blur-0';

  return (
    <div
      className={[
        base,
        phase === 'out' ? out : into,
        'text-lg text-[color:var(--zus-navy)]',
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      {facts[prev]}
    </div>
  );
}
