'use client';
import React from 'react';
import { useT } from '@/i18n';

function Dot({ className }: { className: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${className}`} />;
}

/** 3 kropki + etykiety z i18n */
export function LegendDots() {
  const { t } = useT();
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[color:var(--zus-navy)]/80">
      <span className="inline-flex items-center gap-2">
        <Dot className="bg-[rgba(240,94,94,.9)]" />
        {t('group_below')}
      </span>
      <span className="inline-flex items-center gap-2">
        <Dot className="bg-[rgba(255,179,79,.9)]" />
        {t('group_around')}
      </span>
      <span className="inline-flex items-center gap-2">
        <Dot className="bg-[rgba(0,153,63,.9)]" />
        {t('group_above')}
      </span>
    </div>
  );
}
