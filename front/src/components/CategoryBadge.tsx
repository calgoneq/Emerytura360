'use client';

import React from 'react';
import { useT } from '@/i18n';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export type Level = 'below' | 'around' | 'above';

const cfg: Record<Level, { bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  below: {
    bg: 'bg-[rgba(240,94,94,.12)]',
    border: 'border-[rgba(240,94,94,.28)]',
    text: 'text-[rgb(200,60,60)]',
    icon: TrendingDown,
  },
  around: {
    bg: 'bg-[rgba(255,179,79,.16)]',
    border: 'border-[rgba(255,179,79,.28)]',
    text: 'text-[rgb(185,120,20)]',
    icon: Activity,
  },
  above: {
    bg: 'bg-[rgba(0,153,63,.12)]',
    border: 'border-[rgba(0,153,63,.22)]',
    text: 'text-[rgb(0,110,45)]',
    icon: TrendingUp,
  },
};

export function CategoryBadge({ level, className = '' }: { level: Level; className?: string }) {
  const { t } = useT();
  const s = cfg[level];
  const Icon = s.icon;

  const label =
    level === 'below' ? t('group_below') : level === 'around' ? t('group_around') : t('group_above');

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${s.bg} ${s.border} ${s.text} ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span className="tracking-[.01em]">{label}</span>
    </span>
  );
}
