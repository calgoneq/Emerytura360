'use client';
import Image from 'next/image';
import Link from 'next/link';
import { LanguageToggle } from '@/components/LanguageToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-[1000] bg-white/80 backdrop-blur-md border-b border-black/5">
      <div className="mx-auto max-w-[1200px] px-5 h-14 flex items-center justify-between relative">
        <Link
          href="https://www.zus.pl"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Strona ZUS"
          className="inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--zus-green)] rounded"
        >
          <Image src="/zus-logo.png" alt="ZUS" width={90} height={22} priority />
        </Link>

        {/* 🔒 Toggle na wierzchu i klikalny */}
        <div className="relative z-[1100] pointer-events-auto">
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
