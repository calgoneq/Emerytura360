'use client';
import { ClipboardList, TrendingUp, Hourglass, Banknote, GitBranch } from 'lucide-react';
import { useT } from '@/i18n';

export function HowItWorks() {
  const { t } = useT();
  const steps = [
    { id:1, title:t('hiw_1_title'), desc:t('hiw_1_desc'), Icon: ClipboardList },
    { id:2, title:t('hiw_2_title'), desc:t('hiw_2_desc'), Icon: TrendingUp },
    { id:3, title:t('hiw_3_title'), desc:t('hiw_3_desc'), Icon: Hourglass },
    { id:4, title:t('hiw_4_title'), desc:t('hiw_4_desc'), Icon: Banknote },
    { id:5, title:t('hiw_5_title'), desc:t('hiw_5_desc'), Icon: GitBranch },
  ];

  
  return (
    <div className="relative">
      {/* elastyczna siatka: sm=2, md=3, lg=5 */}
      <ol className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm text-[color:var(--zus-black)]/85">
        {steps.map((s, i) => {
          const Icon = s.Icon;
          return (
            <li key={s.id} className="relative">
              {/* KARTA */}
              <div
                className="group rounded-2xl bg-white/95 backdrop-blur-[1px]
                           border border-black/5 shadow-[0_10px_28px_-14px_rgba(0,0,0,.18)]
                           p-4 h-full min-h-[132px]
                           transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-14px_rgba(0,0,0,.22)]
                           anim-in"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-start gap-3">
                  {/* Numer */}
                  <div className="shrink-0 grid place-items-center h-9 w-9 md:h-10 md:w-10 rounded-full
                                  bg-[rgba(0,153,63,.12)] ring-1 ring-[rgba(0,153,63,.22)]
                                  text-[rgb(0,110,45)] font-bold text-[13px] md:text-[14px]">
                    {s.id}
                  </div>

                  {/* Treść */}
                  <div className="w-full">
                    <div className="flex items-start gap-2.5 md:gap-3 font-semibold text-[color:var(--zus-navy)] leading-tight">
                      {/* KONTENER NA IKONĘ – spójny rozmiar dla każdej */}
                      <span className="shrink-0 grid place-items-center h-5 w-5 md:h-6 md:w-6">
                        <Icon
                          className="text-[color:var(--zus-navy)]/70"
                          size={20}              // 20px na mobile
                          strokeWidth={1.75}     // ten sam „grubość kresek”
                        />
                      </span>
                      <span className="whitespace-normal break-words underline decoration-[rgba(0,65,110,.25)] underline-offset-[3px]">
                        {s.title}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed opacity-80">{s.desc}</p>
                  </div>
                </div>
              </div>

              {/* STRZAŁKI – poziome tylko na lg+, pionowe na <lg */}
              {i < steps.length - 1 && (
                <>
                  <svg
                    className="hidden lg:block absolute right-[-18px] top-[calc(50%+1px)] -translate-y-1/2"
                    width="36" height="12" viewBox="0 0 36 12" fill="none" aria-hidden
                  >
                    <path d="M0 6h26" stroke="rgba(0,65,110,.30)" strokeWidth="2" strokeLinecap="round" />
                    <path d="M24 1l6 5-6 5" fill="none" stroke="rgba(0,65,110,.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  <svg
                    className="lg:hidden absolute left-1/2 -bottom-4 -translate-x-1/2"
                    width="12" height="36" viewBox="0 0 12 36" fill="none" aria-hidden
                  >
                    <path d="M6 0v26" stroke="rgba(0,65,110,.30)" strokeWidth="2" strokeLinecap="round" />
                    <path d="M1 24l5 6 5-6" fill="none" stroke="rgba(0,65,110,.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  )
};
