// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Bebas_Neue, Inter } from "next/font/google";
import { I18nProvider } from '@/i18n';
import { Header } from '../components/Header';

const display = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Emerytura 360",
  description: "Edukacyjny symulator emerytalny",
};

function Bg() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,            // zawsze pod wszystkimi
        pointerEvents: 'none', // nigdy nie blokuje klików
      }}
    >
      {/* zielono-niebieskie poświaty */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1200px 600px at 20% 10%, rgba(0,153,63,.10), transparent 60%),' +
            'radial-gradient(1200px 600px at 80% 0%, rgba(63,132,210,.10), transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      {/* subtelna siatka */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.06,
          mixBlendMode: 'multiply',
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,1) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(0,0,0,1) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }}
      />
      {/* noise */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.35'/></svg>\")",
          backgroundSize: '200px 200px',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}



export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased">
         <I18nProvider>
        <Header />
        <Bg />
        {children}
         </I18nProvider>
      </body>
    </html>
  );
}
