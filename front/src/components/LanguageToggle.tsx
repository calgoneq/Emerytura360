'use client';
import React from 'react';
import { useT } from '@/i18n';

export function LanguageToggle() {
  const { lang, setLang } = useT();

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 50,
        border: '2px solid #0a0a0a10',
        background: '#fff',
        borderRadius: 12,
        padding: 4,
        display: 'inline-flex',
        gap: 4,
      }}
      aria-label={lang === 'pl' ? 'Przełącznik języka' : 'Language switcher'}
    >
      <button
        onClick={() => setLang('pl')}
        aria-pressed={lang === 'pl'}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 12,
          background: lang === 'pl' ? 'rgb(0,153,63)' : 'transparent',
          color: lang === 'pl' ? '#fff' : 'rgb(0,65,110)',
          border: '1px solid rgba(0,0,0,.1)',
          cursor: 'pointer',
        }}
      >
        PL
      </button>
      <button
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 12,
          background: lang === 'en' ? 'rgb(0,153,63)' : 'transparent',
          color: lang === 'en' ? '#fff' : 'rgb(0,65,110)',
          border: '1px solid rgba(0,0,0,.1)',
          cursor: 'pointer',
        }}
      >
        EN
      </button>
    </div>
  );
}
